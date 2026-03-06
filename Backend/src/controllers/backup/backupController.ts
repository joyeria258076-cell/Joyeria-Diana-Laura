import { Request, Response } from 'express';
import { spawn } from 'child_process';
import pool from '../../config/database'; // Asegúrate de que esta sea la ruta a tu conexión de PostgreSQL (pg)

export const generateDirectBackup = (req: Request, res: Response) => {
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

    res.setHeader('Content-disposition', `attachment; filename=${fileName}`);
    res.setHeader('Content-Type', 'application/octet-stream');

    console.log(`⏳ Iniciando stream de backup: ${fileName}`);

    const dump = spawn(pgDumpPath, [
        '-h', process.env.DB_HOST || 'aws-1-us-east-2.pooler.supabase.com',
        '-p', process.env.DB_PORT || '6543',
        '-U', process.env.DB_USER || '',
        '-d', process.env.DB_NAME || 'postgres',
        '-F', 'c' 
    ], {
        env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD }
    });

    dump.stdout.pipe(res);

    dump.stderr.on('data', (data) => {
        console.error(`[pg_dump error]: ${data}`);
    });

    dump.on('error', (err) => {
        console.error('❌ Error al ejecutar pg_dump:', err.message);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Error al ejecutar pg_dump', detail: err.message });
        }
    });

    dump.on('close', async (code) => {
        if (code === 0) {
            console.log(`✅ Respaldo ${fileName} generado con éxito.`);
            
            // --- REGISTRO EN LA BASE DE DATOS (AUDITORÍA) ---
            try {
                // Aquí capturamos el usuario de la sesión (si usas middleware de auth)
                // Si no tienes auth aún, puedes dejarlo como null o un ID quemado por ahora
                const usuario_id = (req as any).user?.id || null; 

                await pool.query(
                    `INSERT INTO respaldos_historial 
                    (nombre_archivo, tipo, estado, usuario_id) 
                    VALUES ($1, $2, $3, $4)`,
                    [fileName, 'manual', 'completed', usuario_id]
                );
                console.log('📝 Registro guardado en respaldos_historial');
            } catch (dbErr) {
                console.error('❌ Error al guardar en bitácora:', dbErr);
            }
        } else {
            console.error(`❌ pg_dump falló con código: ${code}`);
        }
    });
};

/**
 * Obtiene el historial real desde la base de datos
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
                -- Convertimos de UTC a la hora de Ciudad de México
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
        res.status(500).json({ error: 'No se pudo obtener el historial de la base de datos' });
    }
};