// Ruta: Backend/src/controllers/backup/backupController.ts
import { Request, Response } from 'express';
import { spawn } from 'child_process';

export const generateDirectBackup = (req: Request, res: Response) => {
    const pgDumpPath = `C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe`;
    
    // 1. Cambiamos la extensión a .dump (formato nativo de Postgres)
    const fileName = `respaldo_joyeria_${new Date().toISOString().split('T')[0]}.dump`;

    // 2. Cabeceras para archivo binario .dump
    res.setHeader('Content-disposition', `attachment; filename=${fileName}`);
    res.setHeader('Content-Type', 'application/octet-stream');

    console.log('⏳ Iniciando stream en formato DUMP (Custom Format) desde PostgreSQL 17...');

    // 3. Ejecutar pg_dump con el flag -F c (Custom Format)
    // El formato 'c' es binario, comprimido y compatible con pg_restore
    const dump = spawn(pgDumpPath, [
        '-h', process.env.DB_HOST || 'aws-1-us-east-2.pooler.supabase.com',
        '-p', process.env.DB_PORT || '6543',
        '-U', process.env.DB_USER || '',
        '-d', process.env.DB_NAME || 'postgres',
        '-F', 'c' // <--- CLAVE: Formato Custom (genera el .dump)
    ], {
        env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD }
    });

    // 4. Conectamos la salida directa al navegador
    // No usamos zlib porque el formato 'c' ya comprime los datos por sí mismo
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

    dump.on('close', (code) => {
        if (code === 0) {
            console.log('✅ Respaldo .dump enviado con éxito.');
        } else {
            console.error(`❌ pg_dump falló con código: ${code}`);
        }
    });
};