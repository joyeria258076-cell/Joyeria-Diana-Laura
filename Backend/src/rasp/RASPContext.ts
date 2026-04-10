// src/rasp/RASPContext.ts
import { AsyncLocalStorage } from 'async_hooks';
import crypto from 'crypto';

export interface RASPRequestContext {
  requestId: string;
  method: string;
  path: string;
  ip: string;
  startTime: number;
  blocked: boolean;
  blockReason?: string;
  suspiciousScore: number;
}

export const raspStorage = new AsyncLocalStorage<RASPRequestContext>();

export function generateRequestId(): string {
  return `req_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
}

export function getCurrentContext(): RASPRequestContext | undefined {
  return raspStorage.getStore();
}

export function markBlocked(reason: string): void {
  const ctx = getCurrentContext();
  if (ctx) {
    ctx.blocked = true;
    ctx.blockReason = reason;
  }
}

export function addSuspiciousScore(points: number): void {
  const ctx = getCurrentContext();
  if (ctx) {
    ctx.suspiciousScore += points;
  }
}