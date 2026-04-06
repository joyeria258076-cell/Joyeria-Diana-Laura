// src/middleware/metricsMiddleware.ts
// Intercepta cada petición HTTP y guarda métricas en Supabase

import { Request, Response, NextFunction } from 'express';
import pool from '../config/database';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getMemoriaMB(): number {
  const mem = process.memoryUsage();
  return parseFloat((mem.heapUsed / 1024 / 1024).toFixed(2));
}

function getClientIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress ?? 'desconocida';
}

// Rutas que NO queremos loggear (evitar ruido en la tabla)
const RUTAS_IGNORADAS = [
  '/favicon.ico',
  '/health',
  '/api/metrics',
];

// ─── Middleware principal ────────────────────────────────────────────────────

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (RUTAS_IGNORADAS.some(r => req.path.startsWith(r))) {
    return next();
  }

  const inicio = Date.now();

  res.on('finish', async () => {
    const duracion = Date.now() - inicio;
    const statusCode = res.statusCode;
    const userId = (req as any).user?.id ?? null;

    try {
      // ✅ CORREGIDO: agregar esquema auditoria
      await pool.query(
        `INSERT INTO auditoria.request_logs
           (method, endpoint, status_code, duration_ms, user_id, ip_address, user_agent, error_message, memoria_mb)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          req.method,
          req.path,
          statusCode,
          duracion,
          userId,
          getClientIP(req),
          req.headers['user-agent'] ?? null,
          statusCode >= 400 ? (res.locals.errorMessage ?? null) : null,
          getMemoriaMB(),
        ]
      );
    } catch (err) {
      console.error('[metricsMiddleware] Error guardando log:', err);
    }
  });

  next();
}

export function setupErrorMonitoring(): void {
  process.on('unhandledRejection', async (reason: any) => {
    console.error('[Monitor] unhandledRejection:', reason);
    await saveSystemError('unhandledRejection', reason);
  });

  process.on('uncaughtException', async (error: Error) => {
    console.error('[Monitor] uncaughtException:', error);
    await saveSystemError('uncaughtException', error);
  });
}

async function saveSystemError(tipo: string, error: any): Promise<void> {
  try {
    const mensaje = error instanceof Error ? error.message : String(error);
    const stack   = error instanceof Error ? error.stack   : null;

    // ✅ CORREGIDO: agregar esquema auditoria
    await pool.query(
      `INSERT INTO auditoria.system_errors (tipo, mensaje, stack_trace)
       VALUES ($1, $2, $3)`,
      [tipo, mensaje, stack]
    );
  } catch (err) {
    console.error('[Monitor] No se pudo guardar el error del sistema:', err);
  }
}

export function expressErrorMiddleware(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const userId = (req as any).user?.id ?? null;

  // ✅ CORREGIDO: agregar esquema auditoria
  pool.query(
    `INSERT INTO auditoria.system_errors (tipo, mensaje, stack_trace, endpoint, method, user_id, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      err.name ?? 'Error',
      err.message ?? 'Error desconocido',
      err.stack ?? null,
      req.path,
      req.method,
      userId,
      req.socket?.remoteAddress ?? null,
    ]
  ).catch(e => console.error('[Monitor] Error guardando excepción:', e));

  res.locals.errorMessage = err.message ?? 'Error interno';

  res.status(err.status ?? 500).json({
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
}

export async function cleanupOldLogs(): Promise<void> {
  try {
    // ✅ CORREGIDO: agregar esquema auditoria
    await pool.query(`
      DELETE FROM auditoria.request_logs 
      WHERE fecha < NOW() - INTERVAL '7 days'
    `);
    await pool.query(`
      DELETE FROM auditoria.request_logs 
      WHERE status_code >= 400 
        AND fecha < NOW() - INTERVAL '3 days'
    `);
    console.log('🧹 Logs antiguos limpiados');

    setTimeout(cleanupOldLogs, 24 * 60 * 60 * 1000);
  } catch (e) {
    console.error('[Monitor] Error limpiando logs:', e);
  }
}