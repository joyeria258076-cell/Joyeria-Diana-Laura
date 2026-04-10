// src/rasp/rules/pathTraversal.ts
import path from 'path';
import { getCurrentContext, markBlocked, addSuspiciousScore } from '../RASPContext';
import { defaultConfig } from '../config';
import { RASPReporter } from '../RASPReporter';

const PATH_PATTERNS = [
  /\.\.\/|\.\.\\/,
  /\/etc\/passwd|\/etc\/shadow/,
  /\.env|\.git\/|\.config\//,
  /\/proc\/self\/environ/,
  /\/var\/log\//,
];

export function detectPathTraversal(value: string, field: string): boolean {
  if (!defaultConfig.pathTraversal.enabled) return false;
  if (!value || typeof value !== 'string') return false;
  
  const normalized = value.replace(/\\/g, '/');
  
  for (const pattern of PATH_PATTERNS) {
    if (pattern.test(normalized)) {
      const ctx = getCurrentContext();
      const shouldBlock = defaultConfig.pathTraversal.block && !defaultConfig.logOnlyMode;
      
      if (shouldBlock) {
        markBlocked(`Path Traversal en campo ${field}`);
      }
      
      addSuspiciousScore(30);
      
      // ✅ REGISTRAR HALLAZGO
      if (ctx) {
        RASPReporter.recordFinding({
          severity: 'MEDIUM',
          type: 'Path Traversal',
          ip: ctx.ip,
          path: ctx.path,
          method: ctx.method,
          field,
          payload: value.substring(0, 200),
          blocked: shouldBlock,
          description: `Intento de Path Traversal detectado en el campo ${field}`,
        });
      }
      
      console.log(`[RASP] 🚫 Path Traversal detectada en ${field}: ${value}`);
      return true;
    }
  }
  return false;
}