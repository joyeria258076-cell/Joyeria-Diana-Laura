// src/rasp/rules/sqlInjection.ts
import { getCurrentContext, markBlocked, addSuspiciousScore } from '../RASPContext';
import { defaultConfig } from '../config';
import { RASPReporter } from '../RASPReporter';

const SQL_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|UNION|EXEC|EXECUTE)\b.*\b(FROM|INTO|SET|VALUES)\b)/i,
  /('|")\s*(OR|AND)\s*('|")\s*=\s*('|")/i,
  /(--|;|\/\*|\*\/|\bOR\b.*=.*\bOR\b)/i,
  /(\bWHERE\b.*=.*'.*OR.*'.*=.+')/i,
  /(\bSLEEP\s*\(\s*\d+\s*\)|WAITFOR\s+DELAY)/i,
];

export function detectSQLInjection(value: string, field: string): boolean {
  if (!defaultConfig.sqlInjection.enabled) return false;
  if (!value || typeof value !== 'string') return false;
  
  for (const pattern of SQL_PATTERNS) {
    if (pattern.test(value)) {
      const ctx = getCurrentContext();
      const shouldBlock = defaultConfig.sqlInjection.block && !defaultConfig.logOnlyMode;
      
      if (shouldBlock) {
        markBlocked(`SQL Injection en campo ${field}`);
      }
      
      addSuspiciousScore(50);
      
      // ✅ REGISTRAR HALLAZGO
      if (ctx) {
        RASPReporter.recordFinding({
          severity: 'HIGH',
          type: 'SQL Injection',
          ip: ctx.ip,
          path: ctx.path,
          method: ctx.method,
          field,
          payload: value.substring(0, 200),
          blocked: shouldBlock,
          description: `Intento de inyección SQL detectado en el campo ${field}`,
        });
      }
      
      console.log(`[RASP] 🚫 SQL Injection detectada en ${field}: ${value.substring(0, 100)}`);
      return true;
    }
  }
  return false;
}