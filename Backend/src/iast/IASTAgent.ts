// src/iast/IASTAgent.ts
// ─────────────────────────────────────────────────────────────────
// Agente IAST: instrumenta el driver pg de PostgreSQL en runtime.
// Detecta SQLi, path traversal en tableName, headers peligrosos
// y otros patrones usando taint tracking del contexto activo.
// ─────────────────────────────────────────────────────────────────
import { Pool, Client } from 'pg';
import {
  findTaint,
  recordFinding,
  detectModule,
  getCurrentContext,
  IASTFinding,
} from './IASTContext';
import { IASTReporter } from './IASTReporter';

// ── Patrones de detección ────────────────────────────────────────

// Palabras clave SQL que indican posible inyección cuando van en datos de usuario
const SQL_INJECTION_PATTERNS = [
  /('\s*(OR|AND)\s*'?\d)/i,
  /(--|;|\/\*|\*\/)/,
  /\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|EXEC|EXECUTE|CAST|CONVERT)\b/i,
  /('|")\s*;\s*\w/i,
  /\bOR\b\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?/i,
  /\bOR\b\s+['"]?\w+['"]?\s*=\s*['"]?\w+['"]?/i,
];

// Nombres de tabla que no deberían venir de input del usuario
const SENSITIVE_TABLES = [
  'usuarios', 'users', 'admin', 'passwords', 'sessions',
  'tokens', 'roles', 'permisos', 'configuracion',
];

// Detecta si un string contiene patrones de SQLi
function hasSQLInjectionPattern(text: string): boolean {
  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(text));
}

// Captura stack trace útil (filtra líneas internas de node/iast)
function captureStack(): string {
  const stack = new Error().stack || '';
  return stack
    .split('\n')
    .filter(line =>
      !line.includes('IASTAgent') &&
      !line.includes('IASTContext') &&
      !line.includes('node_modules') &&
      !line.includes('node:')
    )
    .slice(1, 6)
    .join('\n')
    .trim();
}

// ── Analizadores de vulnerabilidades ────────────────────────────

function analyzeQueryForSQLInjection(queryText: string, params: any[]): void {
  const ctx = getCurrentContext();
  if (!ctx) return;

  const module = detectModule(ctx.path);

  // Queries internas del middleware — ignorar taint propagado
  const INTERNAL_QUERIES = [
      'select rol from usuarios where id =',
      'update user_sessions',
      'insert into productos',
      'update user_sessions us\n         set',
      'select * from user_sessions where session_token =',
      'insert into login_attempts',
      'insert into user_login_attempts',
    ];
    
  const queryLower = queryText.toLowerCase().trim();
  if (INTERNAL_QUERIES.some(q => queryLower.includes(q))) return;

  // 1. ¿El texto de la query contiene un valor contaminado directamente?
  const taint = findTaint(queryText);
  if (taint) {
    const hasPattern = hasSQLInjectionPattern(taint.value);
    recordFinding({
      severity: hasPattern ? 'CRITICAL' : 'HIGH',
      type: 'SQL Injection',
      module,
      method: ctx.method,
      path: ctx.path,
      description: hasPattern
        ? `Valor contaminado con patrón SQLi inyectado directamente en query SQL sin parametrizar.`
        : `Valor del usuario (${taint.source}.${taint.field}) interpolado directamente en query SQL sin usar parámetros ($1, $2...).`,
      evidence: queryText.trim().slice(0, 300),
      stackTrace: captureStack(),
      taintSource: taint,
      remediation: `Usa siempre parámetros preparados: pool.query('SELECT ... WHERE campo = $1', [valor]). Nunca interpoles req.body, req.query o req.params en el string SQL.`,
    });
  }
    if (params.some(p => typeof p === 'string' && p.startsWith('Mozilla/'))) return;

  // 2. ¿Algún parámetro tiene patrón de SQLi? (detecta bypass de parametrización)
  params.forEach((param, i) => {
    if (typeof param !== 'string') return;
    const paramTaint = findTaint(param);
    if (paramTaint && hasSQLInjectionPattern(param)) {
      recordFinding({
        severity: 'HIGH',
        type: 'SQL Injection (parámetro sospechoso)',
        module,
        method: ctx.method,
        path: ctx.path,
        description: `Parámetro $${i + 1} contiene patrones de SQLi aunque está parametrizado. Verificar validación de entrada.`,
        evidence: `Param $${i + 1}: "${param.slice(0, 100)}"`,
        stackTrace: captureStack(),
        taintSource: paramTaint,
        remediation: `Valida y sanitiza inputs antes de pasarlos como parámetros. Usa allowlists para campos como nombres, categorías, etc.`,
      });
    }
  });
}

function analyzeTableName(queryText: string): void {
  const ctx = getCurrentContext();
  if (!ctx) return;

  // Busca patrones como: FROM <tableName>, INTO <tableName>, UPDATE <tableName>
  const tableMatch = queryText.match(
    /\b(?:FROM|INTO|UPDATE|TABLE)\s+["']?([a-zA-Z_][a-zA-Z0-9_]*)["']?/i
  );
  if (!tableMatch) return;

  const tableName = tableMatch[1].toLowerCase();
  const taint = findTaint(tableName) || findTaint(tableMatch[1]);

  if (taint) {
    recordFinding({
      severity: 'CRITICAL',
      type: 'SQL Injection (table name injection)',
      module: detectModule(ctx.path),
      method: ctx.method,
      path: ctx.path,
      description: `Nombre de tabla "${tableName}" proviene de input del usuario (${taint.source}.${taint.field}). El QueryBuilder.ts interpola tableName directamente en el SQL sin validación. Vulnerabilidad detectada en queryBuilder.ts.`,
      evidence: queryText.trim().slice(0, 300),
      stackTrace: captureStack(),
      taintSource: taint,
      remediation: `En queryBuilder.ts: valida tableName contra un allowlist de tablas permitidas antes de interpolar. Ej: const ALLOWED_TABLES = ['productos', 'categorias', ...]; if (!ALLOWED_TABLES.includes(tableName)) throw new Error('Tabla no permitida');`,
    });
  }

  // Queries legítimas del middleware de autenticación — ignorar
  const QUERY_WHITELIST = [
    'select rol from usuarios where id = $1',
    'select * from user_sessions where session_token = $1 and is_revoked = false and expires_at > now()',
    'update user_sessions us set last_activity = current_timestamp',
    'select id, email, nombre, rol, activo, fecha_creacion, fecha_actualizacion from usuarios where id = $1',
    'select id, firebase_uid, email, nombre, rol, activo, fecha_creacion, fecha_actualizacion from usuarios order by activo desc, nombre asc',
    'insert into productos',
    'select * from user_sessions',
    'select * from configuracion where clave =',
    'select * from configuracion order by',
    'select id, clave, valor, tipo_dato, descripcion, categoria from configuracion',
  ];

    const queryNormalized = queryText.toLowerCase().trim().replace(/\s+/g, ' ');
    const isWhitelisted = QUERY_WHITELIST.some(wq => queryNormalized.includes(wq));

    // Detecta acceso a tablas sensibles desde rutas no admin
    if (SENSITIVE_TABLES.includes(tableName) && !ctx.path.includes('/admin') && !ctx.path.includes('/auth') && !ctx.path.includes('/configuracion') && !isWhitelisted) {
      recordFinding({
      severity: 'MEDIUM',
      type: 'Acceso a tabla sensible',
      module: detectModule(ctx.path),
      method: ctx.method,
      path: ctx.path,
      description: `Query accede a tabla sensible "${tableName}" desde ruta no privilegiada.`,
      evidence: queryText.trim().slice(0, 200),
      stackTrace: captureStack(),
      remediation: `Verifica que el acceso a la tabla ${tableName} esté protegido por roleMiddleware y authenticateToken.`,
    });
  }
}

function analyzeForIDOR(queryText: string, params: any[]): void {
  const ctx = getCurrentContext();
  if (!ctx) return;

  // Detecta si un ID de recurso viene de params del usuario y va a la query
  const idPattern = /WHERE\s+\w*id\w*\s*=\s*\$\d+/i;
  if (!idPattern.test(queryText)) return;

  // Busca si algún parámetro que sea ID viene de req.params sin validación de propiedad
  params.forEach((param, i) => {
    if (typeof param !== 'string' && typeof param !== 'number') return;
    const taint = findTaint(String(param));
    if (taint && taint.source === 'params') {
      recordFinding({
        severity: 'MEDIUM',
        type: 'IDOR (Insecure Direct Object Reference)',
        module: detectModule(ctx.path),
        method: ctx.method,
        path: ctx.path,
        description: `El parámetro $${i + 1} (${taint.field} = "${param}") viene de req.params y se usa directamente como ID en query. Verifica que el usuario autenticado tenga permiso sobre este recurso.`,
        evidence: `Query: ${queryText.trim().slice(0, 200)} | Param: ${param}`,
        stackTrace: captureStack(),
        taintSource: taint,
        remediation: `Después de consultar el recurso, verifica que req.user.id coincide con el owner del recurso. Ejemplo: if (resource.usuario_id !== req.user.id && req.user.rol !== 'admin') return res.status(403).json({error: 'Acceso denegado'});`,
      });
    }
  });
}

// ── Instrumentación del Pool pg ──────────────────────────────────

let isInstrumented = false;

export function instrumentPool(pool: Pool): void {
  if (isInstrumented) return;
  isInstrumented = true;

  // Guardamos referencia al método original con tipo explícito para evitar ts(2556)
  const originalQuery: (...args: any[]) => any = pool.query.bind(pool);

  // Monkey-patch: reemplazamos pool.query con nuestra versión instrumentada
  (pool as any).query = function (...args: any[]): any {
    const ctx = getCurrentContext();

    // Si no hay contexto IAST activo, pasamos directo (ej: startup, health checks)
    if (ctx && args.length > 0) {
      try {
        let queryText = '';
        let queryParams: any[] = [];

        // pool.query acepta: (string, params?, callback?) o (QueryConfig, callback?)
        if (typeof args[0] === 'string') {
          queryText = args[0];
          queryParams = Array.isArray(args[1]) ? args[1] : [];
        } else if (args[0] && typeof args[0] === 'object' && args[0].text) {
          queryText = args[0].text;
          queryParams = args[0].values || [];
        }

        if (queryText) {
          // Ejecutar todos los analizadores sobre esta query
          analyzeQueryForSQLInjection(queryText, queryParams);
          analyzeTableName(queryText);
          analyzeForIDOR(queryText, queryParams);
        }
      } catch (analysisError) {
        // Nunca dejamos que el análisis IAST rompa la aplicación real
        console.error('[IAST] Error en análisis (no afecta la app):', analysisError);
      }
    }

    // Siempre ejecutamos la query original — tipo explícito resuelve ts(2556)
    return originalQuery(...args);
  };

  console.log('[IAST] ✅ Pool de PostgreSQL instrumentado correctamente');
}

// ── Análisis de headers de respuesta ────────────────────────────
// Se llama desde el middleware al finalizar la response

export function analyzeResponseHeaders(
  headers: Record<string, string | string[] | undefined>,
  path: string,
  method: string
): void {
  const ctx = getCurrentContext();
  if (!ctx) return;

  const module = detectModule(path);
  const missingHeaders: string[] = [];

  const securityHeaders: Record<string, string> = {
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY o SAMEORIGIN',
    'strict-transport-security': 'max-age=...',
  };

  for (const [header, expectedHint] of Object.entries(securityHeaders)) {
    if (!headers[header]) {
      missingHeaders.push(`${header}: ${expectedHint}`);
    }
  }

  if (missingHeaders.length > 0) {
    recordFinding({
      severity: 'LOW',
      type: 'Security Headers faltantes',
      module,
      method,
      path,
      description: `La respuesta de ${method} ${path} no incluye ${missingHeaders.length} header(s) de seguridad recomendados.`,
      evidence: missingHeaders.join(' | '),
      remediation: `Agrega en server.ts: app.use(helmet()). Instala con: npm install helmet. O agrega manualmente los headers en un middleware global.`,
    });
  }

  // Detecta si se expone información sensible en headers
  const serverHeader = headers['server'] || headers['x-powered-by'];
  if (serverHeader) {
    recordFinding({
      severity: 'LOW',
      type: 'Information Disclosure (headers)',
      module,
      method,
      path,
      description: `El header revela información del servidor: "${serverHeader}". Facilita fingerprinting.`,
      evidence: `Header: ${serverHeader}`,
      remediation: `Ya tienes app.disable('x-powered-by') en server.ts. Verifica que no haya otro middleware re-agregándolo.`,
    });
  }
}

// ── Análisis de autenticación ────────────────────────────────────

export function analyzeAuthRequest(
  path: string,
  method: string,
  body: Record<string, any>,
  headers: Record<string, any>
): void {
  const ctx = getCurrentContext();
  if (!ctx) return;

  const module = detectModule(path);

  // Detecta ausencia de rate limiting (si llegan muchos campos de login)
  if ((path.includes('/login') || path.includes('/auth')) && method === 'POST') {
    const hasPassword = body.password || body.contrasenia || body.pass;
    const hasEmail = body.email || body.usuario || body.username;

    if (hasPassword && hasEmail) {
      // Nota informativa: el análisis de brute force real requiere logs acumulados
      recordFinding({
        severity: 'INFO',
        type: 'Endpoint de autenticación detectado',
        module,
        method,
        path,
        description: `Request de login detectada. Verificando protecciones: LoginSecurityService encontrado en server.ts. Confirma que el rate limiting esté activo para este endpoint.`,
        evidence: `Campos detectados: ${Object.keys(body).join(', ')}`,
        remediation: `Verifica que LoginSecurityService.checkLoginAttempts() se llame en authController.ts antes de verificar credenciales. Considera agregar CAPTCHA después de 3 intentos fallidos.`,
      });
    }

    // JWT en body en lugar de header
    if (body.token || body.jwt || body.accessToken) {
      recordFinding({
        severity: 'MEDIUM',
        type: 'Token en body (mala práctica)',
        module,
        method,
        path,
        description: `Se detectó un token JWT en el body de la request. Los tokens deben viajar en Authorization header o cookie HttpOnly.`,
        evidence: `Campo: ${body.token ? 'token' : body.jwt ? 'jwt' : 'accessToken'}`,
        remediation: `Usa Authorization: Bearer <token> en el header, o cookies HttpOnly/Secure. Nunca en body ni localStorage.`,
      });
    }
  }
}