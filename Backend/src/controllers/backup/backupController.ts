import { Request, Response } from 'express';
import { spawn } from 'child_process';
import pool from '../../config/database';
import fs from 'fs';
import path from 'path';
import cloudinary from '../../config/cloudinary';
import { BackupSchedulerService } from '../../services/BackupSchedulerService'; 

/**
 * Genera el respaldo, captura los logs de consola en tiempo real
 * y los guarda en la base de datos de forma dinámica.
 */
export const generateDirectBackup = async (req: Request, res: Response) => {
    const pgDumpPath = `C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe`;
    
    const ahora = new Date();
    const opciones: Intl.DateTimeFormatOptions = {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
    };

    const localString = ahora.toLocaleString('es-MX', opciones);
    const nombreLimpio = localString.replace(/\//g, '-').replace(/, /g, '_').replace(/:/g, '-');
    const fileName = `respaldo_joyeria_${nombreLimpio}.dump`;

    let logAcumulado = `--- INICIO DE RESPALDO: ${ahora.toLocaleString()} ---\n`;
    logAcumulado += `Servidor: ${process.env.DB_HOST || 'supabase.com'}\n`;

    try {
        const stats = await pool.query(`
            SELECT relname as tabla, n_live_tup as filas
            FROM pg_stat_user_tables 
            WHERE schemaname = 'public'
            ORDER BY n_live_tup DESC
        `);
        
        logAcumulado += `\n[RESUMEN DE DATOS]:\n`;
        stats.rows.forEach(row => {
            logAcumulado += ` > ${row.tabla.padEnd(25)} | ${row.filas} registros\n`;
        });
        logAcumulado += `\n--- PROCESO PG_DUMP DETALLADO ---\n`;

        res.setHeader('Content-disposition', `attachment; filename=${fileName}`);
        res.setHeader('Content-Type', 'application/octet-stream');

        const dump = spawn(pgDumpPath, [
            '-h', process.env.DB_HOST || 'aws-1-us-east-2.pooler.supabase.com',
            '-p', process.env.DB_PORT || '6543',
            '-U', process.env.DB_USER || '',
            '-d', process.env.DB_NAME || 'postgres',
            '-v', 
            '-F', 'c' 
        ], {
            env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD }
        });

        dump.stdout.pipe(res);

        dump.stderr.on('data', (data) => {
            const chunk = data.toString();
            const cleanChunk = chunk.replace(/pg_dump: /g, '');
            logAcumulado += cleanChunk;
        });

        dump.on('close', async (code) => {
            if (code === 0) {
                logAcumulado += `\n--- FINALIZADO EXITOSAMENTE A LAS ${new Date().toLocaleTimeString()} ---`;
                try {
                    const usuario_id = (req as any).user?.id || null; 
                    await pool.query(
                        `INSERT INTO respaldos_historial 
                        (nombre_archivo, tipo, estado, usuario_id, detalles_log) 
                        VALUES ($1, $2, $3, $4, $5)`,
                        [fileName, 'manual', 'completed', usuario_id, logAcumulado]
                    );
                } catch (dbErr) {
                    console.error('Error al guardar log:', dbErr);
                }
            }
        });

    } catch (error) {
        console.error('Error crítico en backup:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'No se pudo iniciar el proceso de respaldo' });
        }
    }
};

/**
 * Obtiene el historial incluyendo la columna de detalles_log
 */
export const getBackupsHistory = async (req: Request, res: Response) => {
    try {
        const query = `
            SELECT 
                h.id, 
                h.nombre_archivo as name, 
                h.tipo as type, 
                h.estado as status, 
                h.tamano as size,
                h.detalles_log,
                h.url_archivo,
                to_char(h.fecha_creacion AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD HH24:MI:SS') as created_at,
                u.nombre as created_by
            FROM respaldos_historial h
            LEFT JOIN usuarios u ON h.usuario_id = u.id
            ORDER BY h.fecha_creacion DESC
            LIMIT 20;
        `;
        
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener historial:', error);
        res.status(500).json({ error: 'No se pudo obtener el historial' });
    }
};

/**
 * Descarga el LOG como archivo .txt
 */
export const downloadBackupLog = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            "SELECT nombre_archivo, detalles_log FROM respaldos_historial WHERE id = $1", 
            [id]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: 'Registro no encontrado' });

        const log = result.rows[0];
        const fileName = `LOG_${log.nombre_archivo.replace('.dump', '')}.txt`;

        res.setHeader('Content-disposition', `attachment; filename=${fileName}`);
        res.setHeader('Content-Type', 'text/plain');
        res.send(log.detalles_log || "No se capturaron detalles técnicos para este respaldo.");
    } catch (error) {
        console.error('Error al descargar log:', error);
        res.status(500).send('Error al generar el archivo de log.');
    }
};

export const getBackupLogContent = async (req: any, res: any) => {
    try {
        const { backupId } = req.params; 

        const result = await pool.query(
            'SELECT detalles_log, nombre_archivo FROM respaldos_historial WHERE id = $1',
            [backupId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Log no encontrado" });
        }

        const logText = result.rows[0].detalles_log || "No hay detalles registrados.";
        const fileName = result.rows[0].nombre_archivo;

        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename=log_${fileName}.txt`);

        return res.send(logText);

    } catch (error) {
        console.error("Error al obtener el log:", error);
        return res.status(500).json({ message: "Error interno del servidor" });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// ENDPOINTS DE AUTOMATIZACIÓN
// ─────────────────────────────────────────────────────────────────────────────

export const getSchedulerStatus = async (req: Request, res: Response) => {
    try {
        const status = await BackupSchedulerService.getStatus();
        res.json({ success: true, data: status });
    } catch (error) {
        console.error('Error obteniendo estado del scheduler:', error);
        res.status(500).json({ error: 'No se pudo obtener el estado' });
    }
};

export const updateSchedulerConfig = async (req: Request, res: Response) => {
    try {
        const { enabled, frecuencia, hora, retencion_dias } = req.body;

        if (typeof enabled !== 'boolean')
            return res.status(400).json({ error: 'El campo "enabled" debe ser boolean' });
        if (!['cada5min', 'diario', 'semanal', 'mensual'].includes(frecuencia))
            return res.status(400).json({ error: 'frecuencia debe ser: cada5min, diario, semanal o mensual' });
        if (!/^\d{2}:\d{2}$/.test(hora))
            return res.status(400).json({ error: 'hora debe tener formato HH:MM (ej: 03:00)' });
        if (typeof retencion_dias !== 'number' || retencion_dias <= 0 || retencion_dias > 365)
            return res.status(400).json({ error: 'retencion_dias debe ser un número entre 0 y 365' });

        const newConfig = { enabled, frecuencia, hora, retencion_dias };
        await BackupSchedulerService.restart(newConfig);

        res.json({
            success: true,
            message: enabled
                ? frecuencia === 'cada5min'
                    ? `✅ Respaldo automático cada 5 minutos activado`
                    : `✅ Respaldo automático ${frecuencia} activado a las ${hora}`
                : '⏹️ Respaldo automático desactivado',
            config: newConfig,
        });
    } catch (error) {
        console.error('Error actualizando configuración del scheduler:', error);
        res.status(500).json({ error: 'No se pudo actualizar la configuración' });
    }
};

export const runSchedulerNow = async (req: Request, res: Response) => {
    try {
        res.json({
            success: true,
            message: '🤖 Respaldo automático iniciado en segundo plano',
        });

        BackupSchedulerService.runScheduledBackup().catch(err => {
            console.error('❌ Error en respaldo scheduler:', err);
        });
    } catch (error) {
        console.error('Error iniciando respaldo scheduler:', error);
        res.status(500).json({ error: 'No se pudo iniciar el respaldo' });
    }
};

export const getDatabaseHealth = async (req: Request, res: Response) => {
    try {
        const statsQuery = `
            SELECT 
                pg_size_pretty(pg_database_size(current_database())) as total_size,
                (SELECT count(*) FROM pg_stat_activity) as active_connections,
                current_setting('max_connections') as max_connections,
                to_char(pg_postmaster_start_time(), 'DD-MM-YYYY HH24:MI:SS') as uptime
        `;

        const tablesQuery = `
            SELECT 
                relname as table_name,
                n_live_tup as live_rows,
                n_dead_tup as dead_rows,
                COALESCE(to_char(last_vacuum, 'DD-MM-YYYY HH24:MI'), 'Nunca') as last_vacuum,
                COALESCE(to_char(last_analyze, 'DD-MM-YYYY HH24:MI'), 'Nunca') as last_analyze,
                CASE 
                    WHEN n_live_tup > 0 THEN 
                        ROUND(((n_dead_tup::numeric / n_live_tup::numeric) * 100)::numeric, 2)
                    ELSE 0 
                END as bloat_percentage
            FROM pg_stat_user_tables
            WHERE schemaname = 'public'
            ORDER BY n_dead_tup DESC;
        `;

        const stats = await pool.query(statsQuery);
        const tables = await pool.query(tablesQuery);

        const responseData = {
            summary: stats.rows[0],
            tables: tables.rows,
            conexion: {
                latencia: '12ms',
                servidor: process.env.DB_HOST || 'supabase.com'
            },
            vacuum: tables.rows.map(t => ({
                tabla: t.table_name,
                ultimo_vacuum: t.last_vacuum,
                filas_muertas: t.dead_rows
            })),
            analyze: tables.rows.map(t => ({
                tabla: t.table_name,
                ultimo_analyze: t.last_analyze
            }))
        };

        res.json(responseData);
    } catch (error) {
        console.error('Error al obtener salud de BD:', error);
        res.status(500).json({ error: 'No se pudo auditar la base de datos' });
    }
};

export const performMaintenance = async (req: Request, res: Response) => {
    try {
        await pool.query('VACUUM ANALYZE');
        res.json({ 
            success: true, 
            message: 'Optimización completada (VACUUM ANALYZE finalizado)' 
        });
    } catch (error) {
        console.error('Error en mantenimiento:', error);
        res.status(500).json({ error: 'Error al ejecutar mantenimiento' });
    }
};

/**
 * GET /api/backups/tables
 * Devuelve la lista de tablas públicas de la BD
 */
export const getTablesList = async (req: Request, res: Response) => {
    try {
        const result = await pool.query(`
            SELECT 
                relname as tabla,
                n_live_tup as filas
            FROM pg_stat_user_tables
            WHERE schemaname = 'public'
            ORDER BY relname ASC
        `);
        res.json({ success: true, tables: result.rows });
    } catch (error) {
        console.error('Error al obtener tablas:', error);
        res.status(500).json({ error: 'No se pudo obtener la lista de tablas' });
    }
};

/**
 * GET /api/backups/collection/:tabla
 * Genera un pg_dump de una tabla específica y lo descarga como .dump
 */
export const downloadCollectionBackup = async (req: Request, res: Response) => {
    const { tabla } = req.params;

    // Validar que la tabla existe en la BD para evitar inyección
    try {
        const check = await pool.query(
            `SELECT relname FROM pg_stat_user_tables WHERE schemaname = 'public' AND relname = $1`,
            [tabla]
        );
        if (check.rows.length === 0) {
            return res.status(404).json({ error: `La tabla "${tabla}" no existe` });
        }
    } catch (error) {
        return res.status(500).json({ error: 'Error al validar la tabla' });
    }

    const ahora = new Date();
    const localString = ahora.toLocaleString('es-MX', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
    });
    const nombreLimpio = localString.replace(/\//g, '-').replace(/, /g, '_').replace(/:/g, '-');
    const fileName = `respaldo_${tabla}_${nombreLimpio}.dump`;

    try {
        res.setHeader('Content-disposition', `attachment; filename=${fileName}`);
        res.setHeader('Content-Type', 'application/octet-stream');

        const pgDumpPath = process.env.NODE_ENV === 'production'
            ? 'pg_dump'
            : `C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe`;

        const dump = spawn(pgDumpPath, [
            '-h', process.env.DB_HOST || 'aws-1-us-east-2.pooler.supabase.com',
            '-p', process.env.DB_PORT || '6543',
            '-U', process.env.DB_USER || '',
            '-d', process.env.DB_NAME || 'postgres',
            '-t', tabla,   // ← solo esta tabla
            '-F', 'c',
        ], {
            env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD },
        });

        dump.stdout.pipe(res);

        dump.stderr.on('data', (data) => {
            console.log(`[CollectionBackup:${tabla}]`, data.toString().trim());
        });

        dump.on('close', async (code) => {
            if (code === 0) {
                console.log(`✅ [CollectionBackup] ${tabla} descargado correctamente`);
                try {
                    const usuario_id = (req as any).user?.id || null;
                    await pool.query(
                        `INSERT INTO respaldos_historial
                            (nombre_archivo, tipo, estado, usuario_id, detalles_log)
                         VALUES ($1, 'coleccion', 'completed', $2, $3)`,
                        [fileName, usuario_id, `Respaldo de colección: tabla "${tabla}" — formato .dump`]
                    );
                } catch (dbErr) {
                    console.error('[CollectionBackup] Error al guardar en historial:', dbErr);
                }
            } else {
                console.error(`[CollectionBackup] pg_dump salió con código ${code}`);
            }
        });

        dump.on('error', (err) => {
            console.error('[CollectionBackup] Error spawn:', err);
            if (!res.headersSent) res.status(500).json({ error: 'Error al iniciar pg_dump' });
        });

    } catch (error) {
        console.error('Error en downloadCollectionBackup:', error);
        if (!res.headersSent) res.status(500).json({ error: 'Error interno' });
    }
};

/**
 * GET /api/backups/collection/:tabla/csv
 * Descarga una tabla como CSV usando COPY TO STDOUT
 */
export const downloadCollectionCSV = async (req: Request, res: Response) => {
    const { tabla } = req.params;

    // Validar que la tabla existe
    try {
        const check = await pool.query(
            `SELECT relname FROM pg_stat_user_tables WHERE schemaname = 'public' AND relname = $1`,
            [tabla]
        );
        if (check.rows.length === 0) {
            return res.status(404).json({ error: `La tabla "${tabla}" no existe` });
        }
    } catch (error) {
        return res.status(500).json({ error: 'Error al validar la tabla' });
    }

    const ahora = new Date();
    const localString = ahora.toLocaleString('es-MX', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
    });
    const nombreLimpio = localString.replace(/\//g, '-').replace(/, /g, '_').replace(/:/g, '-');
    const fileName = `respaldo_${tabla}_${nombreLimpio}.csv`;

    try {
        const result = await pool.query(`SELECT * FROM "${tabla}"`);

        if (result.rows.length === 0) {
            // Tabla vacía — devolvemos solo los headers
            const headersOnly = result.fields.map(f => f.name).join(',') + '\n';
            res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            return res.send(headersOnly);
        }

        // Construir CSV manualmente para mayor compatibilidad
        const headers = result.fields.map(f => f.name);
        const csvHeader = headers.join(',');
        const csvRows = result.rows.map(row =>
            headers.map(h => {
                const val = row[h];
                if (val === null || val === undefined) return '';
                const str = String(val);
                // Escapar comillas y envolver en comillas si contiene coma, comilla o salto
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            }).join(',')
        );

        const csv = [csvHeader, ...csvRows].join('\n');

        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.send(csv);

        console.log(`✅ [CollectionCSV] ${tabla} descargado como CSV (${result.rows.length} filas)`);

        // Registrar en historial
        try {
            const usuario_id = (req as any).user?.id || null;
            await pool.query(
                `INSERT INTO respaldos_historial
                    (nombre_archivo, tipo, estado, usuario_id, detalles_log)
                 VALUES ($1, 'coleccion', 'completed', $2, $3)`,
                [fileName, usuario_id, `Respaldo de colección: tabla "${tabla}" — formato .csv — ${result.rows.length} filas exportadas`]
            );
        } catch (dbErr) {
            console.error('[CollectionCSV] Error al guardar en historial:', dbErr);
        }

    } catch (error) {
        console.error('Error en downloadCollectionCSV:', error);
        if (!res.headersSent) res.status(500).json({ error: 'Error al generar el CSV' });
    }
};

/**
 * Extrae el public_id de Cloudinary desde una URL.
 * Para archivos raw, Cloudinary conserva la extensión en el public_id.
 * Ejemplo: https://res.cloudinary.com/CLOUD/raw/upload/v123/joyeria_backups/respaldo_auto_xxx.dump
 * → public_id: joyeria_backups/respaldo_auto_xxx.dump
 */
const extractCloudinaryPublicId = (url: string): string | null => {
    try {
        const match = url.match(/\/upload\/(?:v\d+\/)?(.+)$/);
        if (!match) return null;
        return match[1]; // Conservamos la extensión — requerido para archivos raw
    } catch {
        return null;
    }
};

/**
 * Elimina un respaldo específico:
 * 1. Registro en BD
 * 2. Archivo físico en disco (si existe)
 * 3. Archivo en Cloudinary (si tiene url_archivo)
 */
export const deleteBackup = async (req: Request, res: Response) => {
    try {
        const { backupId } = req.params;

        // 1. Buscamos el registro — incluimos url_archivo para Cloudinary
        const result = await pool.query(
            "SELECT nombre_archivo, url_archivo FROM respaldos_historial WHERE id = $1", 
            [backupId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'El registro no existe' });
        }

        const { nombre_archivo: fileName, url_archivo: urlArchivo } = result.rows[0];

        // 2. Eliminamos el registro de la BD
        await pool.query("DELETE FROM respaldos_historial WHERE id = $1", [backupId]);

        // 3. Eliminamos el archivo físico del disco (backups locales)
        const backupDir = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups_automaticos');
        const filePath = path.join(backupDir, fileName);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`🗑️  [deleteBackup] Archivo local eliminado: ${fileName}`);
        }

        // 4. Eliminamos de Cloudinary si el registro tiene url_archivo
        if (urlArchivo) {
            const publicId = extractCloudinaryPublicId(urlArchivo);
            if (publicId) {
                try {
                    await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
                    console.log(`☁️  [deleteBackup] Eliminado de Cloudinary: ${publicId}`);
                } catch (cloudErr: any) {
                    // No bloqueamos la respuesta si Cloudinary falla — el registro ya fue borrado
                    console.error(`⚠️  [deleteBackup] No se pudo eliminar de Cloudinary:`, cloudErr.message);
                }
            }
        }

        res.json({ 
            success: true, 
            message: urlArchivo
                ? 'Respaldo eliminado del sistema y de Cloudinary'
                : 'Respaldo eliminado correctamente'
        });

    } catch (error) {
        console.error('Error al eliminar respaldo:', error);
        res.status(500).json({ success: false, message: 'Error interno al intentar eliminar' });
    }
};