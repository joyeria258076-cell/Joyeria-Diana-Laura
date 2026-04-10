// src/rasp/rules/commandInjection.ts
import { getCurrentContext, markBlocked, addSuspiciousScore } from '../RASPContext';
import { defaultConfig } from '../config';
import { RASPReporter } from '../RASPReporter';

// Patrones más restrictivos (solo comandos claramente maliciosos)
const COMMAND_PATTERNS = [
  /(\|\s*(rm|del|format|shutdown|reboot)\s+)/i,
  /(\$\{IFS\}|;.*\$\(|\|.*\||`.*`)/,
  /(\brm\s+-rf\s+\/|\bdel\s+\/f\s+\/s|\bformat\s+[c-z]:)/i,
];

export function detectCommandInjection(value: string, field: string): boolean {
  if (!defaultConfig.commandInjection.enabled) return false;
  if (!value || typeof value !== 'string') return false;
  
  // Ignorar User-Agent (causa muchos falsos positivos)
  if (field === 'headers.user-agent') return false;
  
  for (const pattern of COMMAND_PATTERNS) {
    if (pattern.test(value)) {
      const ctx = getCurrentContext();
      const shouldBlock = defaultConfig.commandInjection.block && !defaultConfig.logOnlyMode;
      
      if (shouldBlock) {
        markBlocked(`Command Injection en campo ${field}`);
      }
      
      addSuspiciousScore(70);
      
      if (ctx) {
        RASPReporter.recordFinding({
          severity: 'HIGH',
          type: 'Command Injection',
          ip: ctx.ip,
          path: ctx.path,
          method: ctx.method,
          field,
          payload: value.substring(0, 200),
          blocked: shouldBlock,
          description: `Intento de inyección de comandos detectado en ${field}`,
        });
      }
      
      console.log(`[RASP] 🚫 Command Injection detectada en ${field}: ${value.substring(0, 100)}`);
      return true;
    }
  }
  return false;
}