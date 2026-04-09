// src/iast/IASTContext.ts
import { AsyncLocalStorage } from 'async_hooks';
import crypto from 'crypto';

export type TaintSource = 'body' | 'query' | 'params' | 'headers' | 'cookies';

export interface TaintedValue {
  value: string;
  source: TaintSource;
  field: string;
}

export interface IASTRequestContext {
  requestId: string;
  method: string;
  path: string;
  ip: string;
  startTime: number;
  taintedValues: Map<string, TaintedValue>;
  findings: IASTFinding[];
}

export interface IASTFinding {
  id: string;
  timestamp: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  type: string;
  module: string;
  method: string;
  path: string;
  description: string;
  evidence: string;
  stackTrace?: string;
  taintSource?: TaintedValue;
  remediation: string;
  // Nuevos campos para resolución automática
  lastDetected?: string;    // última vez que se detectó activamente
  resolved?: boolean;       // si está resuelto
  resolvedAt?: string;      // fecha de resolución
  resolvedReason?: string;  // 'auto' o 'manual'
}

export const iastStorage = new AsyncLocalStorage<IASTRequestContext>();

export function generateRequestId(): string {
  return `req_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
}

export function getCurrentContext(): IASTRequestContext | undefined {
  return iastStorage.getStore();
}

export function taintValue(value: string, source: TaintSource, field: string): void {
  const ctx = getCurrentContext();
  if (!ctx || !value || typeof value !== 'string') return;
  ctx.taintedValues.set(value, { value, source, field });
}

export function findTaint(text: string): TaintedValue | undefined {
  const ctx = getCurrentContext();
  if (!ctx || !text) return undefined;
  for (const [taintedVal, taintInfo] of ctx.taintedValues) {
    if (taintedVal && text.includes(taintedVal)) return taintInfo;
  }
  return undefined;
}

export function recordFinding(finding: Omit<IASTFinding, 'id' | 'timestamp'>): void {
  const ctx = getCurrentContext();
  if (!ctx) return;
  const full: IASTFinding = {
    ...finding,
    id: `finding_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
    timestamp: new Date().toISOString(),
    lastDetected: new Date().toISOString(),
    resolved: false,
  };
  ctx.findings.push(full);
}

export function detectModule(path: string): string {
  // ── API Routes → grupos lógicos ──────────────────────────────

  // Auth
  if (path.startsWith('/api/auth') || path.includes('/check-account-lock') ||
      path.includes('/get-security-question') || path.includes('/security-question') ||
      path.startsWith('/api/security')) return 'Auth';

  // Admin - Base de datos
  if (path.startsWith('/api/export') || path.startsWith('/api/bulk-update') ||
      path.startsWith('/api/import') || path.startsWith('/api/backups') ||
      path.startsWith('/api/templates')) return 'AdminBaseDatos';

  // Admin - Contenido
  if (path.startsWith('/api/content')) return 'AdminContenido';

  // Admin - Configuración
  if (path.startsWith('/api/configuracion')) return 'AdminConfiguracion';

  // Admin - Proveedores
  if (path.startsWith('/api/proveedores')) return 'AdminProveedores';

  // Admin - Métricas y predicción (admin general)
  if (path.startsWith('/api/admin') || path.startsWith('/api/metrics') ||
      path.startsWith('/api/prediccion') || path.startsWith('/api/users') ||
      path.startsWith('/api/upload')) return 'Admin';

  // Cliente / Carrito
  if (path.startsWith('/api/carrito')) return 'Cliente';

  // Productos públicos
  if (path.startsWith('/api/products')) return 'Publico';

  // ── Frontend paths ────────────────────────────────────────────
  if (path.match(/\/(inicio|publico|catalogo|detalle-producto|contacto|ayuda|noticias|ubicacion)/i)) return 'Publico';
  if (path.match(/\/(login|register|mfa|recuperacion|reiniciar|pregunta-seguridad)/i)) return 'Auth';
  if (path.match(/\/(cliente|mis-pedidos|mi-perfil)/i)) return 'Cliente';
  if (path.match(/\/trabajador/i)) return 'Trabajador';
  if (path.match(/\/admin/i)) return 'Admin';

  return 'General';
}