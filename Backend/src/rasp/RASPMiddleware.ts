// src/rasp/RASPMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { getCachedAnalysis, setCachedAnalysis } from './RASPCache';
import { raspStorage, generateRequestId, getCurrentContext, markBlocked } from './RASPContext';
import { defaultConfig } from './config';
import { detectSQLInjection } from './rules/sqlInjection';
import { detectXSS, sanitizeObject } from './rules/xss';
import { detectPathTraversal } from './rules/pathTraversal';
import { detectCommandInjection } from './rules/commandInjection';
import { detectAnomalies, recordSuspiciousIP } from './rules/anomalies';
import { RASPReporter } from './RASPReporter';

// Rutas que no requieren validación estricta
const SKIP_PATHS = [
  '/api/health', '/api/db-test', '/api/test',
  '/iast/', '/rasp/', '/favicon', 
  '/api/auth/login', '/api/auth/validate-session', '/api/auth/update-activity',
  '/api/products', '/api/products/categorias', '/api/products/recent',
  '/api/carrito', '/api/carrito/count',
  '/api/content/paginas', '/api/configuracion',
  '/api/users', '/api/security',
];

function shouldSkip(path: string): boolean {
  return SKIP_PATHS.some(skip => path.startsWith(skip));
}

// Lista blanca de User-Agent permitidos (evita falsos positivos)
const ALLOWED_USER_AGENTS = [
  'Mozilla/5.0', 'Chrome/', 'Firefox/', 'Safari/', 'Edge/',
  'PostmanRuntime', 'curl/', 'axios/', 'node-fetch',
];

function isAllowedUserAgent(userAgent: string): boolean {
  if (!userAgent) return false;
  return ALLOWED_USER_AGENTS.some(allowed => userAgent.includes(allowed));
}

function analyzeAllInputs(req: Request): boolean {
  console.log(`[RASP DEBUG] Analizando: ${req.method} ${req.path}`);
  console.log(`[RASP DEBUG] Query:`, req.query);
  console.log(`[RASP DEBUG] Body:`, req.body);
    // Si es GET sin query params, no analizar
  if (req.method === 'GET' && Object.keys(req.query).length === 0) {
    return false;
  }
  
  // Si es POST sin body, no analizar
  if (req.method === 'POST' && (!req.body || Object.keys(req.body).length === 0)) {
    return false;
  }

  // Crear clave única para esta petición
  const cacheKey = `${req.method}:${req.path}:${JSON.stringify(req.query)}:${JSON.stringify(req.params)}`;
  
  // Verificar caché
  const cached = getCachedAnalysis(cacheKey);
  if (cached !== null) {
    return cached;
  }
  
  let detected = false;
  
  // Solo analizar si la petición tiene parámetros
  const hasParams = Object.keys(req.query).length > 0 || 
                    Object.keys(req.body).length > 0 || 
                    Object.keys(req.params).length > 0;
  
  if (!hasParams) {
    setCachedAnalysis(cacheKey, false);
    return false;
  }
  
  // Query params (solo si hay)
  if (req.query && Object.keys(req.query).length > 0) {
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string' && value.length > 0 && value.length < 500) {
        if (detectSQLInjection(value, `query.${key}`)) detected = true;
        if (detectXSS(value, `query.${key}`)) detected = true;
        if (detectPathTraversal(value, `query.${key}`)) detected = true;
      }
    }
  }
  
  // Body (solo si hay)
  if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
    const checkObject = (obj: any, prefix: string) => {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string' && value.length > 0 && value.length < 500) {
          if (detectSQLInjection(value, `${prefix}.${key}`)) detected = true;
          if (detectXSS(value, `${prefix}.${key}`)) detected = true;
          if (detectPathTraversal(value, `${prefix}.${key}`)) detected = true;
        } else if (typeof value === 'object' && value !== null) {
          checkObject(value, `${prefix}.${key}`);
        }
      }
    };
    checkObject(req.body, 'body');
  }
  
  setCachedAnalysis(cacheKey, detected);
  return detected;
}

// Middleware principal RASP
export function raspMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Saltar rutas ignoradas
  if (shouldSkip(req.path)) {
    return next();
  }
  
  const clientIP = req.ip || req.socket.remoteAddress || 'unknown';
  
  const context = {
    requestId: generateRequestId(),
    method: req.method,
    path: req.path,
    ip: clientIP,
    startTime: Date.now(),
    blocked: false,
    blockReason: undefined,
    suspiciousScore: 0,
  };
  
  raspStorage.run(context, () => {
    // Analizar inputs
    const hasAttack = analyzeAllInputs(req);
    
    const ctx = getCurrentContext();
    
    if (ctx?.blocked) {
      console.log(`[RASP] 🚫 Request bloqueada: ${ctx.blockReason}`);
      recordSuspiciousIP(clientIP, ctx.suspiciousScore);
      res.status(403).json({
        success: false,
        message: 'Solicitud bloqueada por razones de seguridad',
        reason: ctx.blockReason,
        requestId: ctx.requestId,
      });
      return;
    }
    
    if (ctx && ctx.suspiciousScore > 30 && !defaultConfig.logOnlyMode) {
      console.log(`[RASP] ⚠️ Puntuación sospechosa ${ctx.suspiciousScore} para IP ${clientIP}`);
    }
    
    // Interceptar JSON response para sanitizar XSS
    const originalJson = res.json;
    res.json = function(body: any): Response {
      if (defaultConfig.xss.sanitizeOutput && body && typeof body === 'object') {
        body = sanitizeObject(body);
      }
      return originalJson.call(this, body);
    };
    
    next();
  });
}

// Rate limiting por IP - sin keyGenerator personalizado
export const rateLimitMiddleware = rateLimit({
  windowMs: defaultConfig.rateLimit.windowMs,
  max: defaultConfig.rateLimit.max,
  skipSuccessfulRequests: defaultConfig.rateLimit.skipSuccessfulRequests,
  handler: (req, res) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    console.log(`[RASP] 🚫 Rate limit excedido para IP ${ip}`);
    res.status(429).json({
      success: false,
      message: 'Demasiadas solicitudes. Intente más tarde.',
    });
  },
  // No usar keyGenerator personalizado - usar el por defecto
});

// Helmet para headers de seguridad
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      scriptSrcAttr: ["'unsafe-inline'"],  // 👈 Permitir event handlers inline
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  crossOriginEmbedderPolicy: false,
});

// Inicialización
export function initializeRASP(): void {
  console.log('[RASP] 🛡️ Agente RASP inicializado');
  console.log('[RASP] Reglas activas:');
  console.log(`  - SQL Injection: ${defaultConfig.sqlInjection.enabled ? '✅' : '❌'} (block: ${defaultConfig.sqlInjection.block})`);
  console.log(`  - XSS: ${defaultConfig.xss.enabled ? '✅' : '❌'} (block: ${defaultConfig.xss.block})`);
  console.log(`  - Path Traversal: ${defaultConfig.pathTraversal.enabled ? '✅' : '❌'} (block: ${defaultConfig.pathTraversal.block})`);
  console.log(`  - Command Injection: ${defaultConfig.commandInjection.enabled ? '✅' : '❌'} (block: ${defaultConfig.commandInjection.block})`);
  console.log(`  - Rate Limit: ${defaultConfig.rateLimit.max} req / ${defaultConfig.rateLimit.windowMs / 1000}s`);
  console.log(`  - Modo: ${defaultConfig.logOnlyMode ? 'LOG ONLY' : 'BLOQUEO ACTIVO'}`);
}

// Re-exportar utilidades
export { defaultConfig };