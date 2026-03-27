// src/iast/IASTContext.ts
// ─────────────────────────────────────────────────────────────────
// Núcleo del agente IAST: rastrea datos contaminados (taint tracking)
// a través de llamadas asíncronas usando AsyncLocalStorage de Node.js
// ─────────────────────────────────────────────────────────────────
import { AsyncLocalStorage } from 'async_hooks';

export type TaintSource =
  | 'body'
  | 'query'
  | 'params'
  | 'headers'
  | 'cookies';

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
  // Mapa de valores contaminados: clave = valor original del usuario
  taintedValues: Map<string, TaintedValue>;
  // Hallazgos detectados en esta request
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
}

// Storage global — sobrevive entre middlewares y callbacks async
export const iastStorage = new AsyncLocalStorage<IASTRequestContext>();

// Genera un ID único por request
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Obtiene el contexto actual de forma segura
export function getCurrentContext(): IASTRequestContext | undefined {
  return iastStorage.getStore();
}

// Marca un valor como contaminado en el contexto actual
export function taintValue(value: string, source: TaintSource, field: string): void {
  const ctx = getCurrentContext();
  if (!ctx || !value || typeof value !== 'string') return;
  ctx.taintedValues.set(value, { value, source, field });
}

// Verifica si un string contiene algún valor contaminado
// Retorna el TaintedValue si encuentra coincidencia, undefined si no
export function findTaint(text: string): TaintedValue | undefined {
  const ctx = getCurrentContext();
  if (!ctx || !text) return undefined;

  for (const [taintedVal, taintInfo] of ctx.taintedValues) {
    if (taintedVal && text.includes(taintedVal)) {
      return taintInfo;
    }
  }
  return undefined;
}

// Registra un hallazgo en el contexto actual
export function recordFinding(finding: Omit<IASTFinding, 'id' | 'timestamp'>): void {
  const ctx = getCurrentContext();
  if (!ctx) return;

  const full: IASTFinding = {
    ...finding,
    id: `finding_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
  };

  ctx.findings.push(full);
}

// Determina el módulo afectado según la ruta de la request
export function detectModule(path: string): string {
  if (path.includes('/auth') || path.includes('/login') || path.includes('/register')) {
    return 'Auth / Login';
  }
  if (path.includes('/products') || path.includes('/inventario') || path.includes('/admin/products')) {
    return 'Inventario / Productos';
  }
  if (path.includes('/users') || path.includes('/admin/users')) {
    return 'Usuarios';
  }
  if (path.includes('/carrito')) {
    return 'Carrito';
  }
  if (path.includes('/admin')) {
    return 'Panel Admin';
  }
  if (path.includes('/proveedores')) {
    return 'Proveedores';
  }
  return 'General';
}