// src/rasp/rules/anomalies.ts
import { getCurrentContext, markBlocked, addSuspiciousScore } from '../RASPContext';
import { defaultConfig } from '../config';
import { RASPReporter } from '../RASPReporter';

interface IPBlock {
  blockedUntil: Date;
  consecutiveBlocks: number;
}

const ipBlocks = new Map<string, IPBlock>();

export function detectAnomalies(value: any, field: string): boolean {
  if (!defaultConfig.anomalies.enabled) return false;
  
  let detected = false;
  
  // Solo detectar valores extremadamente largos
  if (typeof value === 'string' && value.length > 10000) {
    console.log(`[RASP] ⚠️ Valor extremadamente largo en ${field}: ${value.length} caracteres`);
    addSuspiciousScore(20);
    detected = true;
  }
  
  // Caracteres de control (excluyendo saltos de línea comunes)
  if (typeof value === 'string' && /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(value) && 
      !value.includes('\n') && !value.includes('\r') && !value.includes('\t')) {
    console.log(`[RASP] ⚠️ Caracteres no imprimibles en ${field}`);
    addSuspiciousScore(30);
    detected = true;
  }
  
  return detected;
}

export function isIPBlocked(ip: string): boolean {
  if (!defaultConfig.anomalies.blockIp) return false;
  
  const block = ipBlocks.get(ip);
  if (!block) return false;
  if (new Date() > block.blockedUntil) {
    ipBlocks.delete(ip);
    return false;
  }
  return true;
}

export function blockIP(ip: string): void {
  if (!defaultConfig.anomalies.blockIp) return;
  
  const existing = ipBlocks.get(ip);
  const consecutiveBlocks = (existing?.consecutiveBlocks || 0) + 1;
  
  const blockDuration = defaultConfig.anomalies.blockDurationMinutes * 60 * 1000;
  
  ipBlocks.set(ip, {
    blockedUntil: new Date(Date.now() + blockDuration),
    consecutiveBlocks,
  });
  
  console.log(`[RASP] 🚫 IP ${ip} bloqueada por ${defaultConfig.anomalies.blockDurationMinutes} minutos`);
  
  RASPReporter.recordBlock({
    ip,
    path: 'system',
    method: 'RATE_LIMIT',
    reason: 'Comportamiento anómalo',
    suspiciousScore: 50 * consecutiveBlocks,
    blocked: true,
  });
}

export function recordSuspiciousIP(ip: string, score: number): void {
  if (score >= 70 && defaultConfig.anomalies.blockIp) {
    blockIP(ip);
    const ctx = getCurrentContext();
    if (ctx && !defaultConfig.logOnlyMode) {
      markBlocked(`Puntuación sospechosa ${score} alcanzada`);
    }
  }
}