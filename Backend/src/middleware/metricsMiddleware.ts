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
  '/api/metrics', // las propias rutas de métricas no se auto-loggean
];

// ─── Middleware principal ────────────────────────────────────────────────────

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Ignorar rutas de bajo interés
  if (RUTAS_IGNORADAS.some(r => req.path.startsWith(r))) {
    return next();
  }

  const inicio = Date.now();

  // Capturar respuesta cuando termina
  res.on('finish', async () => {
    const duracion = Date.now() - inicio;
    const statusCode = res.statusCode;
    const userId = (req as any).user?.id ?? null; // viene del authMiddleware

    try {
      await pool.query(
        `INSERT INTO request_logs
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
      // Nunca debe romper la aplicación si falla el log
      console.error('[metricsMiddleware] Error guardando log:', err);
    }
  });

  next();
}

// ─── Capturador de errores no controlados ────────────────────────────────────
// Llama a setupErrorMonitoring() una sola vez en server.ts

export function setupErrorMonitoring(): void {
  process.on('unhandledRejection', async (reason: any) => {
    console.error('[Monitor] unhandledRejection:', reason);
    await saveSystemError('unhandledRejection', reason);
  });

  process.on('uncaughtException', async (error: Error) => {
    console.error('[Monitor] uncaughtException:', error);
    await saveSystemError('uncaughtException', error);
    // No cerramos el proceso para no derribar el servidor en producción
  });
}

async function saveSystemError(tipo: string, error: any): Promise<void> {
  try {
    const mensaje = error instanceof Error ? error.message : String(error);
    const stack   = error instanceof Error ? error.stack   : null;

    await pool.query(
      `INSERT INTO system_errors (tipo, mensaje, stack_trace)
       VALUES ($1, $2, $3)`,
      [tipo, mensaje, stack]
    );
  } catch (err) {
    console.error('[Monitor] No se pudo guardar el error del sistema:', err);
  }
}

// ─── Middleware de errores Express (para rutas que lanzan excepciones) ───────
// Agregar DESPUÉS de todas las rutas en server.ts:
//   app.use(expressErrorMiddleware);

export function expressErrorMiddleware(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const userId = (req as any).user?.id ?? null;

  // Guardar en system_errors con contexto de la ruta
  pool.query(
    `INSERT INTO system_errors (tipo, mensaje, stack_trace, endpoint, method, user_id, ip_address)
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

  // Pasar el mensaje al metricsMiddleware para que lo incluya en request_logs
  res.locals.errorMessage = err.message ?? 'Error interno';

  res.status(err.status ?? 500).json({
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
}

// Al final de metricsMiddleware.ts
export async function cleanupOldLogs(): Promise<void> {
  try {
    await pool.query(`
      DELETE FROM request_logs 
      WHERE fecha < NOW() - INTERVAL '7 days'
    `);
    await pool.query(`
      DELETE FROM request_logs 
      WHERE status_code >= 400 
        AND fecha < NOW() - INTERVAL '3 days'
    `);
    console.log('🧹 Logs antiguos limpiados');

    // Repetir cada 24 horas sin necesidad de reiniciar
    setTimeout(cleanupOldLogs, 24 * 60 * 60 * 1000);
  } catch (e) {
    console.error('[Monitor] Error limpiando logs:', e);
  }
}