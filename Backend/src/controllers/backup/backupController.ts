import { Request, Response } from 'express';
import { spawn } from 'child_process';
import pool from '../../config/database';
import { BackupSchedulerService } from '../../services/BackupSchedulerService'; // ← NUEVO

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
// ENDPOINTS DE AUTOMATIZACIÓN — NUEVOS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/backups/scheduler/status
 * Devuelve el estado actual del scheduler y su configuración
 */
export const getSchedulerStatus = async (req: Request, res: Response) => {
    try {
        const status = await BackupSchedulerService.getStatus();
        res.json({ success: true, data: status });
    } catch (error) {
        console.error('Error obteniendo estado del scheduler:', error);
        res.status(500).json({ error: 'No se pudo obtener el estado' });
    }
};

/**
 * POST /api/backups/scheduler/config
 * Actualiza la configuración del scheduler y lo reinicia
 * Body: { enabled, frecuencia, hora, retencion_dias }
 */
export const updateSchedulerConfig = async (req: Request, res: Response) => {
    try {
        const { enabled, frecuencia, hora, retencion_dias } = req.body;

        if (typeof enabled !== 'boolean')
            return res.status(400).json({ error: 'El campo "enabled" debe ser boolean' });
        if (!['diario', 'semanal', 'mensual'].includes(frecuencia))
            return res.status(400).json({ error: 'frecuencia debe ser: diario, semanal o mensual' });
        if (!/^\d{2}:\d{2}$/.test(hora))
            return res.status(400).json({ error: 'hora debe tener formato HH:MM (ej: 03:00)' });
        if (typeof retencion_dias !== 'number' || retencion_dias < 1 || retencion_dias > 365)
            return res.status(400).json({ error: 'retencion_dias debe ser un número entre 1 y 365' });

        const newConfig = { enabled, frecuencia, hora, retencion_dias };
        await BackupSchedulerService.restart(newConfig);

        res.json({
            success: true,
            message: enabled
                ? `✅ Respaldo automático ${frecuencia} activado a las ${hora}`
                : '⏹️ Respaldo automático desactivado',
            config: newConfig,
        });
    } catch (error) {
        console.error('Error actualizando configuración del scheduler:', error);
        res.status(500).json({ error: 'No se pudo actualizar la configuración' });
    }
};

/**
 * POST /api/backups/scheduler/run-now
 * Ejecuta un respaldo automático inmediatamente (para pruebas)
 */
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