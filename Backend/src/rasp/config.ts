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

// Leer variables de entorno
const getLogOnlyMode = (): boolean => {
  // Si existe variable RASP_LOG_ONLY, usarla
  if (process.env.RASP_LOG_ONLY !== undefined) {
    return process.env.RASP_LOG_ONLY === 'true';
  }
  // Si existe RASP_BLOCK_MODE, invertir (si es true, logOnlyMode=false)
  if (process.env.RASP_BLOCK_MODE !== undefined) {
    return process.env.RASP_BLOCK_MODE !== 'true';
  }
  // Por defecto: modo log only en desarrollo, bloqueo en producción
  return process.env.NODE_ENV === 'development';
};

const getEnabled = (): boolean => {
  if (process.env.RASP_ENABLED !== undefined) {
    return process.env.RASP_ENABLED === 'true';
  }
  return true; // Activado por defecto
};

export const defaultConfig: RASPConfig = {
  enabled: getEnabled(),
  blockOnDetection: true,
  logOnlyMode: getLogOnlyMode(),
  
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: parseInt(process.env.RASP_RATE_LIMIT_MAX || '200'),
    skipSuccessfulRequests: false,
  },
  
  sqlInjection: {
    enabled: true,
    block: true,
    patterns: [
      /(\bSELECT\b.*\bFROM\b|\bUNION\b.*\bSELECT\b)/i,
      /('|")\s*(OR|AND)\s*('|")\s*=\s*('|")/i,
      /(--|;|\/\*|\*\/)/i,
    ],
  },

  xss: {
    enabled: true,
    block: true,
    sanitizeOutput: false,
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
    enabled: false,
    block: false,
    patterns: [
      /(\||;|\$\(|`|\${|\&|\n|\r)/,
      /\b(exec|system|eval|child_process|require|fs\.|process\.|__dirname|__filename)\b/i,
      /(curl|wget|nc|bash|sh|powershell|cmd\.exe)/i,
    ],
  },
  
  anomalies: {
    enabled: true,
    blockIp: false,
    maxConsecutiveBlocks: 5,
    blockDurationMinutes: 30,
  },
};