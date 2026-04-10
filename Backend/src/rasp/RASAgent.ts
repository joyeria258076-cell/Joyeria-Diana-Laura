// src/rasp/RASAgent.ts
import { defaultConfig } from './config';
import { RASPReporter } from './RASPReporter';
import { isIPBlocked, blockIP, recordSuspiciousIP } from './rules/anomalies';

export class RASAgent {
  private static instance: RASAgent;
  private isRunning = false;

  private constructor() {}

  static getInstance(): RASAgent {
    if (!RASAgent.instance) {
      RASAgent.instance = new RASAgent();
    }
    return RASAgent.instance;
  }

  initialize(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    RASPReporter.initialize();
    
    console.log('[RASP] 🤖 Agente RASP activo');
    console.log(`[RASP] Modo: ${defaultConfig.logOnlyMode ? 'SOLO LOG' : 'BLOQUEO ACTIVO'}`);
    
    if (defaultConfig.logOnlyMode) {
      console.log('[RASP] ⚠️ ADVERTENCIA: Modo "log only" activado - las amenazas NO serán bloqueadas');
    }
  }

  isIPBlocked(ip: string): boolean {
    return isIPBlocked(ip);
  }

  blockIP(ip: string, reason?: string): void {
    blockIP(ip);
    // ✅ CORREGIDO: agregar propiedad 'blocked'
    RASPReporter.recordBlock({
      ip,
      path: 'system',
      method: 'MANUAL',
      reason: reason || 'Bloqueo manual',
      suspiciousScore: 100,
      blocked: true,  // 👈 AGREGAR ESTA LÍNEA
    });
    console.log(`[RASP] 🔒 IP ${ip} bloqueada manualmente: ${reason || 'sin motivo'}`);
  }

  recordSuspicious(ip: string, score: number, path: string, method: string, reason: string): void {
    recordSuspiciousIP(ip, score);
    
    if (score >= 30) {
      // ✅ CORREGIDO: agregar propiedad 'blocked'
      RASPReporter.recordAlert({
        severity: score >= 70 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW',
        type: 'Comportamiento sospechoso',
        ip,
        path,
        method,
        description: `Puntuación sospechosa ${score} alcanzada: ${reason}`,
        evidence: `Score: ${score}`,
        blocked: false,  // 👈 AGREGAR ESTA LÍNEA
      });
    }
  }

  getStatus() {
    return {
      running: this.isRunning,
      mode: defaultConfig.logOnlyMode ? 'log_only' : 'blocking',
      enabled: defaultConfig.enabled,
      rules: {
        sqlInjection: defaultConfig.sqlInjection.enabled,
        xss: defaultConfig.xss.enabled,
        pathTraversal: defaultConfig.pathTraversal.enabled,
        commandInjection: defaultConfig.commandInjection.enabled,
        rateLimit: true,
      },
    };
  }
}

export const raspAgent = RASAgent.getInstance();