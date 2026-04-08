// src/controllers/admin/metricsController.ts
import { Request, Response } from 'express';
import pool from '../../config/database';

// Todas las fechas se convierten a America/Mexico_City EN EL BACKEND.
// El frontend las muestra directamente sin conversión adicional.
// Esto funciona igual en local y en producción (Render).
const TZ = 'America/Mexico_City';

// ─── 1. Resumen ───────────────────────────────────────────────────────────────
export const getResumen = async (_req: Request, res: Response): Promise<void> => {
  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*)                                                   AS total_requests,
        COUNT(DISTINCT CASE WHEN status_code >= 400 
        THEN endpoint || method || status_code::text END)          AS total_errores,
        ROUND(AVG(duration_ms))                                    AS avg_respuesta_ms,
        COUNT(*) FILTER (WHERE duration_ms > 1000)                 AS requests_lentos,
        ROUND(AVG(memoria_mb)::numeric, 2)                         AS avg_memoria_mb
      FROM request_logs
      WHERE fecha >= NOW() - INTERVAL '24 hours'
    `);
    const { rows: sesiones } = await pool.query(`
      SELECT COUNT(*) AS sesiones_activas FROM user_sessions
      WHERE is_revoked = FALSE AND expires_at > NOW()
    `);
    const { rows: errSistema } = await pool.query(`
      SELECT COUNT(*) AS errores_sin_resolver FROM system_errors WHERE resuelta = FALSE
    `);
    res.json({
      ...rows[0],
      sesiones_activas:     sesiones[0].sesiones_activas,
      errores_sin_resolver: errSistema[0].errores_sin_resolver,
    });
  } catch (err) {
    console.error('[metricsController] getResumen:', err);
    res.status(500).json({ error: 'Error obteniendo resumen' });
  }
};

// ─── 2. Rendimiento por hora ──────────────────────────────────────────────────
// Las fechas se agrupan y devuelven en hora México
export const getRendimiento = async (req: Request, res: Response): Promise<void> => {
  try {
    const horas = Math.min(Number.parseInt(req.query.horas as string) || 24, 168);
    const { rows } = await pool.query(`
      SELECT
        DATE_TRUNC('hour', fecha AT TIME ZONE 'UTC' AT TIME ZONE $2) AS hora,
        COUNT(*)                                                       AS total_requests,
        ROUND(AVG(duration_ms))                                        AS avg_ms,
        MAX(duration_ms)                                               AS max_ms,
        COUNT(*) FILTER (WHERE status_code >= 400)                     AS errores,
        ROUND(AVG(memoria_mb)::numeric, 2)                             AS avg_memoria_mb
      FROM request_logs
      WHERE fecha >= NOW() - ($1 || ' hours')::INTERVAL
      GROUP BY DATE_TRUNC('hour', fecha AT TIME ZONE 'UTC' AT TIME ZONE $2)
      ORDER BY hora ASC
    `, [horas, TZ]);
    res.json(rows);
  } catch (err) {
    console.error('[metricsController] getRendimiento:', err);
    res.status(500).json({ error: 'Error obteniendo rendimiento' });
  }
};

// ─── 3. Endpoints más lentos ──────────────────────────────────────────────────
export const getEndpointsLentos = async (req: Request, res: Response): Promise<void> => {
  try {
    const limite = Math.min(Number.parseInt(req.query.limite as string) || 10, 50);
    const { rows } = await pool.query(`
      SELECT endpoint, method,
        COUNT(*)                                   AS total_llamadas,
        ROUND(AVG(duration_ms))                    AS avg_ms,
        MAX(duration_ms)                           AS max_ms,
        COUNT(*) FILTER (WHERE status_code >= 400) AS errores
      FROM request_logs
      WHERE fecha >= NOW() - INTERVAL '7 days'
      GROUP BY endpoint, method
      ORDER BY avg_ms DESC
      LIMIT $1
    `, [limite]);
    res.json(rows);
  } catch (err) {
    console.error('[metricsController] getEndpointsLentos:', err);
    res.status(500).json({ error: 'Error obteniendo endpoints lentos' });
  }
};

// ─── 4. Errores con paginación ────────────────────────────────────────────────
// Fechas convertidas a México en el backend
export const getErrores = async (req: Request, res: Response): Promise<void> => {
  try {
    const page            = Math.max(Number.parseInt(req.query.page as string) || 1, 1);
    const limit           = Math.min(Number.parseInt(req.query.limit as string) || 15, 50);
    const offset          = (page - 1) * limit;
    const soloNoResueltos = req.query.soloNoResueltos === 'true';

    const { rows: countRows } = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM system_errors WHERE ($1 = FALSE OR resuelta = FALSE)) +
        (SELECT COUNT(DISTINCT (endpoint, method, status_code))
         FROM request_logs WHERE status_code >= 400
           AND fecha >= NOW() - INTERVAL '24 hours' AND $1 = FALSE)
        AS total
    `, [soloNoResueltos]);

    const total      = Number.parseInt(countRows[0].total);
    const totalPages = Math.ceil(total / limit);

    const { rows: errSistema } = await pool.query(`
      SELECT se.id, 'sistema' AS fuente, se.tipo, se.mensaje, se.endpoint, se.method,
        se.resuelta,
        (se.fecha AT TIME ZONE 'UTC' AT TIME ZONE $1) AS fecha,
        u.email AS usuario_email, NULL::integer AS status_code,
        NULL::integer AS duration_ms, 1 AS ocurrencias
      FROM system_errors se
      LEFT JOIN usuarios u ON u.id = se.user_id
      WHERE ($2 = FALSE OR se.resuelta = FALSE)
      ORDER BY se.fecha DESC
    `, [TZ, soloNoResueltos]);

    let errHTTP: any[] = [];
    if (!soloNoResueltos) {
      const { rows } = await pool.query(`
        SELECT
          MIN(rl.id)                                              AS id,
          'http'                                                  AS fuente,
          (rl.status_code::text || ' ' || rl.method)              AS tipo,
          COALESCE(MIN(rl.error_message), 'Sin detalle')          AS mensaje,
          rl.endpoint, rl.method, FALSE AS resuelta,
          MAX(rl.fecha AT TIME ZONE 'UTC' AT TIME ZONE $1)        AS fecha,
          NULL                                                    AS usuario_email,
          rl.status_code, NULL::integer AS duration_ms,
          COUNT(*)::integer                                       AS ocurrencias
        FROM request_logs rl
        WHERE rl.status_code >= 400
          AND rl.fecha >= NOW() - INTERVAL '24 hours'
        GROUP BY rl.endpoint, rl.method, rl.status_code
        ORDER BY MAX(rl.fecha) DESC
      `, [TZ]);
      errHTTP = rows;
    }

    const todos = [...errSistema, ...errHTTP]
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      .slice(offset, offset + limit);

    res.json({ data: todos, total, page, totalPages, limit });
  } catch (err) {
    console.error('[metricsController] getErrores:', err);
    res.status(500).json({ error: 'Error obteniendo errores' });
  }
};

// ─── 5. Resolver error ────────────────────────────────────────────────────────
export const resolverError = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId || (req as any).user?.id;
    await pool.query(`
      UPDATE system_errors SET resuelta = TRUE, resuelta_por = $1, fecha_resolucion = NOW() WHERE id = $2
    `, [userId, id]);
    res.json({ mensaje: 'Error marcado como resuelto' });
  } catch (err) {
    console.error('[metricsController] resolverError:', err);
    res.status(500).json({ error: 'Error actualizando estado' });
  }
};

// ─── 6. Actividad con paginación ─────────────────────────────────────────────
// Fechas convertidas a México en el backend
export const getActividad = async (req: Request, res: Response): Promise<void> => {
  try {
    const dias     = Math.min(Number.parseInt(req.query.dias as string) || 7, 30);
    const pageSes  = Math.max(Number.parseInt(req.query.pageSes as string) || 1, 1);
    const pageAud  = Math.max(Number.parseInt(req.query.pageAud as string) || 1, 1);
    const limitSes = 10;
    const limitAud = 10;

    const { rows: totalSesRows } = await pool.query(
      `SELECT COUNT(*) AS total FROM user_sessions WHERE is_revoked = FALSE AND expires_at > NOW()`
    );
    const { rows: totalAudRows } = await pool.query(
      `SELECT COUNT(*) AS total FROM auditoria`
    );

    const { rows: sesionesActivas } = await pool.query(`
      SELECT us.id, u.email, u.nombre, u.rol,
        COALESCE(us.device_name, 'Desconocido') AS device_name,
        COALESCE(us.browser, '—')               AS browser,
        COALESCE(us.os, '—')                    AS os,
        us.ip_address,
        (us.created_at  AT TIME ZONE 'UTC' AT TIME ZONE $3) AS created_at,
        (us.last_activity AT TIME ZONE 'UTC' AT TIME ZONE $3) AS last_activity,
        (us.expires_at  AT TIME ZONE 'UTC' AT TIME ZONE $3) AS expires_at
      FROM user_sessions us
      JOIN usuarios u ON u.id = us.user_id
      WHERE us.is_revoked = FALSE AND us.expires_at > NOW()
      ORDER BY us.last_activity DESC
      LIMIT $1 OFFSET $2
    `, [limitSes, (pageSes - 1) * limitSes, TZ]);

    const { rows: auditoria } = await pool.query(`
      SELECT a.operacion, a.tabla, a.usuario_email, a.ip_address,
        (a.fecha_operacion AT TIME ZONE 'UTC' AT TIME ZONE $3) AS fecha_operacion
      FROM auditoria a
      ORDER BY a.fecha_operacion DESC
      LIMIT $1 OFFSET $2
    `, [limitAud, (pageAud - 1) * limitAud, TZ]);

    const { rows: logins } = await pool.query(`
      SELECT
        DATE_TRUNC('day', attempt_time AT TIME ZONE 'UTC' AT TIME ZONE $2) AS dia,
        COUNT(*) FILTER (WHERE success = TRUE)  AS exitosos,
        COUNT(*) FILTER (WHERE success = FALSE) AS fallidos
      FROM login_attempts
      WHERE attempt_time >= NOW() - ($1 || ' days')::INTERVAL
      GROUP BY DATE_TRUNC('day', attempt_time AT TIME ZONE 'UTC' AT TIME ZONE $2)
      ORDER BY dia ASC
    `, [dias, TZ]);

    const { rows: sesiones } = await pool.query(`
      SELECT
        DATE_TRUNC('day', created_at AT TIME ZONE 'UTC' AT TIME ZONE $2) AS dia,
        COUNT(*)                      AS nuevas_sesiones,
        COUNT(DISTINCT user_id)       AS usuarios_unicos
      FROM user_sessions
      WHERE created_at >= NOW() - ($1 || ' days')::INTERVAL
      GROUP BY DATE_TRUNC('day', created_at AT TIME ZONE 'UTC' AT TIME ZONE $2)
      ORDER BY dia ASC
    `, [dias, TZ]);

    res.json({
      sesiones,
      logins,
      auditoria,
      sesionesActivas,
      paginacion: {
        sesiones: {
          total:      Number.parseInt(totalSesRows[0].total),
          page:       pageSes,
          totalPages: Math.ceil(Number.parseInt(totalSesRows[0].total) / limitSes),
          limit:      limitSes,
        },
        auditoria: {
          total:      Number.parseInt(totalAudRows[0].total),
          page:       pageAud,
          totalPages: Math.ceil(Number.parseInt(totalAudRows[0].total) / limitAud),
          limit:      limitAud,
        },
      },
    });
  } catch (err) {
    console.error('[metricsController] getActividad:', err);
    res.status(500).json({ error: 'Error obteniendo actividad' });
  }
};

// ─── 7. Base de datos ─────────────────────────────────────────────────────────
export const getDatabase = async (_req: Request, res: Response): Promise<void> => {
  try {
    const { rows: dbSize } = await pool.query(`
      SELECT pg_size_pretty(pg_database_size(current_database())) AS tamano_total,
             pg_database_size(current_database()) AS tamano_bytes
    `);

    const { rows: tablas } = await pool.query(`
      SELECT t.table_name AS tabla,
        pg_size_pretty(pg_total_relation_size(quote_ident(t.table_schema)||'.'||quote_ident(t.table_name))) AS tamano,
        pg_total_relation_size(quote_ident(t.table_schema)||'.'||quote_ident(t.table_name)) AS tamano_bytes,
        COALESCE(s.n_live_tup, 0) AS filas_aprox,
        COALESCE(s.n_dead_tup, 0) AS filas_muertas,
        COALESCE(s.seq_scan,   0) AS escaneos_secuenciales,
        COALESCE(s.idx_scan,   0) AS escaneos_indice,
        to_char(
          GREATEST(s.last_vacuum, s.last_autovacuum)::timestamptz AT TIME ZONE 'America/Mexico_City',
          'DD-Mon HH24:MI'
        ) AS ultimo_vacuum
      FROM information_schema.tables t
      LEFT JOIN pg_stat_user_tables s ON s.relname = t.table_name
      WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
      ORDER BY tamano_bytes DESC NULLS LAST LIMIT 15
    `);

    const { rows: conexiones } = await pool.query(`
      SELECT COUNT(*) AS total_conexiones,
        COUNT(*) FILTER (WHERE state = 'active')              AS activas,
        COUNT(*) FILTER (WHERE state = 'idle')                AS inactivas,
        COUNT(*) FILTER (WHERE state = 'idle in transaction') AS idle_in_transaction
      FROM pg_stat_activity WHERE datname = current_database()
    `);

    const { rows: indices } = await pool.query(`
      SELECT relname AS tabla, indexrelname AS indice, idx_scan AS usos,
        pg_size_pretty(pg_relation_size(indexrelid)) AS tamano
      FROM pg_stat_user_indexes ORDER BY idx_scan DESC LIMIT 10
    `);

    const { rows: cache } = await pool.query(`
      SELECT ROUND(sum(heap_blks_hit)*100.0/NULLIF(sum(heap_blks_hit)+sum(heap_blks_read),0),2) AS cache_hit_rate
      FROM pg_statio_user_tables
    `);

    const { rows: negocio } = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM usuarios)     AS total_usuarios,
        (SELECT COUNT(*) FROM productos)    AS total_productos,
        (SELECT COUNT(*) FROM ventas)       AS total_ventas,
        (SELECT COUNT(*) FROM request_logs) AS total_logs,
        (SELECT COUNT(*) FROM user_sessions WHERE is_revoked = FALSE AND expires_at > NOW()) AS sesiones_activas
    `);

    res.json({
      tamano_db:      dbSize[0],
      tablas,
      conexiones:     conexiones[0],
      indices,
      cache_hit_rate: cache[0]?.cache_hit_rate ?? null,
      negocio:        negocio[0],
    });
  } catch (err) {
    console.error('[metricsController] getDatabase:', err);
    res.status(500).json({ error: 'Error obteniendo estadísticas de base de datos' });
  }
};

// ─── 8. VACUUM ────────────────────────────────────────────────────────────────
export const runVacuum = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tabla } = req.body;
    if (tabla) {
      const { rows: check } = await pool.query(`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = $1
      `, [tabla]);
      if (check.length === 0) { res.status(400).json({ error: `Tabla "${tabla}" no encontrada` }); return; }
      await pool.query(`VACUUM ANALYZE public."${tabla}"`);
      res.json({ mensaje: `VACUUM ANALYZE ejecutado en tabla: ${tabla}` });
    } else {
      const { rows: tablas } = await pool.query(`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      `);
      for (const t of tablas) { await pool.query(`VACUUM ANALYZE public."${t.table_name}"`); }
      res.json({ mensaje: `VACUUM ANALYZE ejecutado en ${tablas.length} tablas` });
    }
  } catch (err: any) {
    console.error('[metricsController] runVacuum:', err);
    if (err.message?.includes('superuser') || err.message?.includes('must be owner')) {
      res.status(403).json({ error: 'Supabase gestiona VACUUM automáticamente (autovacuum activo).' });
    } else {
      res.status(500).json({ error: 'Error ejecutando VACUUM: ' + err.message });
    }
  }
};

// ─── 9. ANALYZE ───────────────────────────────────────────────────────────────
export const runAnalyze = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tabla } = req.body;
    if (tabla) {
      const { rows: check } = await pool.query(`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = $1
      `, [tabla]);
      if (check.length === 0) { res.status(400).json({ error: `Tabla "${tabla}" no encontrada` }); return; }
      await pool.query(`ANALYZE public."${tabla}"`);
      res.json({ mensaje: `ANALYZE ejecutado en tabla: ${tabla}` });
    } else {
      const { rows: tablas } = await pool.query(`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      `);
      for (const t of tablas) { await pool.query(`ANALYZE public."${t.table_name}"`); }
      res.json({ mensaje: `ANALYZE ejecutado en ${tablas.length} tablas` });
    }
  } catch (err: any) {
    console.error('[metricsController] runAnalyze:', err);
    res.status(500).json({ error: 'Error ejecutando ANALYZE: ' + err.message });
  }
};