// src/rasp/config.ts
export interface RASPConfig {
  enabled: boolean;
  blockOnDetection: boolean;
  logOnlyMode: boolean;
  rateLimit: {
    windowMs: number;
    max: number;
    skipSuccessfulRequests: boolean;
  };
  sqlInjection: {
    enabled: boolean;
    block: boolean;
    patterns: RegExp[];
  };
  xss: {
    enabled: boolean;
    block: boolean;
    sanitizeOutput: boolean;
  };
  pathTraversal: {
    enabled: boolean;
    block: boolean;
    sensitivePaths: string[];
  };
  commandInjection: {
    enabled: boolean;
    block: boolean;
    patterns: RegExp[];
  };
  anomalies: {
    enabled: boolean;
    blockIp: boolean;
    maxConsecutiveBlocks: number;
    blockDurationMinutes: number;
  };
}

export const defaultConfig: RASPConfig = {
  enabled: false,
  blockOnDetection: true,
  logOnlyMode: true,
  
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 200,
    skipSuccessfulRequests: false,
  },
  
  sqlInjection: {
    enabled: true,
    block: true,
    patterns: [
      /(\bSELECT\b.*\bFROM\b|\bUNION\b.*\bSELECT\b)/i,  // Más específico
      /('|")\s*(OR|AND)\s*('|")\s*=\s*('|")/i,
      /(--|;|\/\*|\*\/)/i,
    ],
  },

  xss: {
    enabled: true,
    block: true,
    sanitizeOutput: false,  // 👈 Desactivar sanitización (más rápido)
  },
  
  pathTraversal: {
    enabled: true,
    block: true,
    sensitivePaths: [
      '/etc/passwd', '/etc/shadow', '.env', '../', '..\\',
      'config/', 'database', 'backup', '.git/', 'iast-reports/',
    ],
  },
  
  commandInjection: {
    enabled: false, // DESACTIVADO para evitar falsos positivos en User-Agent
    block: false,
    patterns: [
      /(\||;|\$\(|`|\${|\&|\n|\r)/,
      /\b(exec|system|eval|child_process|require|fs\.|process\.|__dirname|__filename)\b/i,
      /(curl|wget|nc|bash|sh|powershell|cmd\.exe)/i,
    ],
  },
  
  anomalies: {
    enabled: true,
    blockIp: false, // DESACTIVADO para no bloquear IPs
    maxConsecutiveBlocks: 5,
    blockDurationMinutes: 30,
  },
};