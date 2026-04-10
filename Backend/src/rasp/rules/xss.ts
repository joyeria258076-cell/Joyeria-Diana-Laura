// src/rasp/rules/xss.ts
import { getCurrentContext, markBlocked, addSuspiciousScore } from '../RASPContext';
import { defaultConfig } from '../config';
import { RASPReporter } from '../RASPReporter';

const XSS_PATTERNS = [
  /<script[^>]*>[\s\S]*?<\/script>/i,
  /javascript:/i,
  /on\w+\s*=\s*['"]?[^'">]*['"]?/i,
  /<iframe[^>]*>/i,
  /<object[^>]*>/i,
  /<embed[^>]*>/i,
  /<link[^>]*>/i,
  /<meta[^>]*>/i,
  /expression\s*\(/i,
  /vbscript:/i,
  /data:text\/html/i,
];

export function detectXSS(value: string, field: string): boolean {
  if (!defaultConfig.xss.enabled) return false;
  if (!value || typeof value !== 'string') return false;
  
  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(value)) {
      const ctx = getCurrentContext();
      const shouldBlock = defaultConfig.xss.block && !defaultConfig.logOnlyMode;
      
      if (shouldBlock) {
        markBlocked(`XSS en campo ${field}`);
      }
      
      addSuspiciousScore(40);
      
      // ✅ REGISTRAR HALLAZGO
      if (ctx) {
        RASPReporter.recordFinding({
          severity: 'MEDIUM',
          type: 'XSS',
          ip: ctx.ip,
          path: ctx.path,
          method: ctx.method,
          field,
          payload: value.substring(0, 200),
          blocked: shouldBlock,
          description: `Intento de XSS detectado en el campo ${field}`,
        });
      }
      
      console.log(`[RASP] 🚫 XSS detectada en ${field}: ${value.substring(0, 100)}`);
      return true;
    }
  }
  return false;
}

export function sanitizeInput(value: string): string {
  if (!defaultConfig.xss.sanitizeOutput) return value;
  // Escapar caracteres HTML
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  if (!defaultConfig.xss.sanitizeOutput) return obj;
  
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = sanitizeInput(value);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeObject(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}