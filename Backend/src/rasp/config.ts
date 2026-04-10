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

// ✅ Leer variables de entorno como IAST
const getLogOnlyMode = (): boolean => {
  if (process.env.RASP_LOG_ONLY !== undefined) {
    return process.env.RASP_LOG_ONLY === 'true';
  }
  if (process.env.RASP_BLOCK_MODE !== undefined) {
    return process.env.RASP_BLOCK_MODE !== 'true';
  }
  return process.env.NODE_ENV === 'development';
};

const getEnabled = (): boolean => {
  if (process.env.RASP_ENABLED !== undefined) {
    return process.env.RASP_ENABLED === 'true';
  }
  return true;
};

export const defaultConfig: RASPConfig = {
  enabled: getEnabled(),
  blockOnDetection: true,
  logOnlyMode: getLogOnlyMode(),
  
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: parseInt(process.env.RASP_RATE_LIMIT_MAX || '500'),
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
    patterns: [],
  },
  
  anomalies: {
    enabled: true,
    blockIp: false,
    maxConsecutiveBlocks: 5,
    blockDurationMinutes: 30,
  },
};