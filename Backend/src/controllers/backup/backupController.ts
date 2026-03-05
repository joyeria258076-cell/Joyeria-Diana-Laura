// Ruta: Backend/src/controllers/backup/backupController.ts
import { Request, Response } from 'express';
import { spawn } from 'child_process';

export const generateDirectBackup = (req: Request, res: Response) => {
    const pgDumpPath = `C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe`;
    
    // 1. OBTENER FECHA Y HORA LOCAL DINÁMICA
    const ahora = new Date();
    
    // Formateamos usando la zona horaria local (ej. México)
    // Esto nos da un formato tipo: "5/3/2026, 15:30:45"
    const opciones: Intl.DateTimeFormatOptions = {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
    };

    const localString = ahora.toLocaleString('es-MX', opciones);
    
    // Limpiamos el string para que sea un nombre de archivo válido
    // Convertimos "05/03/2026, 15:30:45" en "05-03-2026_15-30-45"
    const nombreLimpio = localString
        .replace(/\//g, '-')   // Cambia barras / por guiones -
        .replace(/, /g, '_')   // Cambia la coma y espacio por guion bajo _
        .replace(/:/g, '-');   // Cambia los : por guiones - (Windows no acepta :)

    const fileName = `respaldo_joyeria_${nombreLimpio}.dump`;

    // 2. Cabeceras para archivo binario .dump
    res.setHeader('Content-disposition', `attachment; filename=${fileName}`);
    res.setHeader('Content-Type', 'application/octet-stream');

    console.log(`⏳ Iniciando stream de backup: ${fileName}`);

    // 3. Ejecutar pg_dump
    const dump = spawn(pgDumpPath, [
        '-h', process.env.DB_HOST || 'aws-1-us-east-2.pooler.supabase.com',
        '-p', process.env.DB_PORT || '6543',
        '-U', process.env.DB_USER || '',
        '-d', process.env.DB_NAME || 'postgres',
        '-F', 'c' 
    ], {
        env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD }
    });

    // 4. Conectar la salida al navegador
    dump.stdout.pipe(res);

    dump.stderr.on('data', (data) => {
        console.error(`[pg_dump error]: ${data}`);
    });

    dump.on('error', (err) => {
        console.error('❌ Error al ejecutar pg_dump:', err.message);
        if (!res.headersSent) {
            res.status(500).json({ 
                error: 'Error al ejecutar pg_dump', 
                detail: err.message 
            });
        }
    });

    dump.on('close', (code) => {
        if (code === 0) {
            console.log(`✅ Respaldo ${fileName} generado con éxito.`);
        } else {
            console.error(`❌ pg_dump falló con código: ${code}`);
        }
    });
};