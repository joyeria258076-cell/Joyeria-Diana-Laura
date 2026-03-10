// Ruta: Backend/src/services/BackupSchedulerService.ts

import * as cron from 'node-cron';
import { spawn } from 'child_process';
import pool from '../config/database';
import cloudinary from '../config/cloudinary';

interface SchedulerConfig {
  enabled: boolean;
  frecuencia: 'cada5min' | 'diario' | 'semanal' | 'mensual';
  hora: string;
  retencion_dias: number;
}

export class BackupSchedulerService {
  private static taskDiario:   ReturnType<typeof cron.schedule> | null = null;
  private static taskSemanal:  ReturnType<typeof cron.schedule> | null = null;
  private static taskMensual:  ReturnType<typeof cron.schedule> | null = null;
  private static taskLimpieza: ReturnType<typeof cron.schedule> | null = null;
  private static isRunning = false;

  // ─── LEER CONFIG DESDE LA BD ─────────────────────────────────────────────
  static async getConfig(): Promise<SchedulerConfig> {
    try {
      const result = await pool.query(
        `SELECT valor FROM configuracion_sistema WHERE clave = 'backup_scheduler' LIMIT 1`
      );
      if (result.rows.length > 0) {
        return JSON.parse(result.rows[0].valor) as SchedulerConfig;
      }
    } catch (_) { /* tabla no existe aún, usamos defaults */ }

    return {
      enabled: false,
      frecuencia: 'diario',
      hora: '03:00',
      retencion_dias: 7,
    };
  }

  // ─── GUARDAR CONFIG EN LA BD ──────────────────────────────────────────────
  static async saveConfig(config: SchedulerConfig): Promise<void> {
    await pool.query(
      `INSERT INTO configuracion_sistema (clave, valor)
       VALUES ('backup_scheduler', $1)
       ON CONFLICT (clave) DO UPDATE SET valor = $1`,
      [JSON.stringify(config)]
    );
  }

  // ─── SUBIR BUFFER A CLOUDINARY (sin archivo local) ────────────────────────
  private static uploadBufferToCloudinary(buffer: Buffer, fileName: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'raw',
          folder: 'joyeria_backups',
          public_id: fileName, // incluimos .dump — Cloudinary raw conserva la extensión
          use_filename: true,
          unique_filename: false,
        },
        (error, result) => {
          if (error || !result) return reject(error ?? new Error('Cloudinary no devolvió resultado'));
          resolve(result.secure_url);
        }
      );
      uploadStream.end(buffer);
    });
  }

  // ─── EJECUTAR UN RESPALDO AUTOMÁTICO ─────────────────────────────────────
  static async runScheduledBackup(): Promise<void> {
    if (this.isRunning) {
      console.log('⏸️  Backup automático ya en ejecución, omitiendo...');
      return;
    }
    this.isRunning = true;

    const ahora = new Date();
    const nombreLimpio = ahora
      .toLocaleString('es-MX', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false,
      })
      .replace(/\//g, '-')
      .replace(/, /g, '_')
      .replace(/:/g, '-');

    const fileName = `respaldo_auto_${nombreLimpio}.dump`;

    let logAcumulado = `--- RESPALDO AUTOMÁTICO: ${ahora.toLocaleString()} ---\n`;
    logAcumulado += `Servidor: ${process.env.DB_HOST || 'supabase.com'}\n`;

    console.log(`\n🤖 [BackupScheduler] Iniciando respaldo automático: ${fileName}`);

    try {
      // ── Resumen de tablas ──────────────────────────────────────────────
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
      logAcumulado += `\n--- PROCESO PG_DUMP ---\n`;

      // ── pg_dump directo a buffer en memoria ───────────────────────────
      const dumpBuffer = await new Promise<Buffer>((resolve, reject) => {
        const pgDumpPath = process.env.NODE_ENV === 'production'
          ? 'pg_dump'
          : `C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe`;

        const chunks: Buffer[] = [];

        const dump = spawn(pgDumpPath, [
          '-h', process.env.DB_HOST || 'aws-1-us-east-2.pooler.supabase.com',
          '-p', process.env.DB_PORT || '6543',
          '-U', process.env.DB_USER || '',
          '-d', process.env.DB_NAME || 'postgres',
          '-v',
          '-F', 'c',
        ], {
          env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD },
        });

        // stdout → acumulamos chunks en memoria
        dump.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));

        // stderr → log
        dump.stderr.on('data', (data: Buffer) => {
          logAcumulado += data.toString().replace(/pg_dump: /g, '');
        });

        dump.on('close', (code: number | null) => {
          if (code === 0) resolve(Buffer.concat(chunks));
          else reject(new Error(`pg_dump salió con código ${code}`));
        });

        dump.on('error', reject);
      });

      const fileSizeMB = (dumpBuffer.length / 1024 / 1024).toFixed(2);
      logAcumulado += `\n--- FINALIZADO A LAS ${new Date().toLocaleTimeString()} ---`;
      logAcumulado += `\nTamaño generado: ${fileSizeMB} MB`;

      // ── Subir buffer a Cloudinary ──────────────────────────────────────
      console.log(`☁️  [BackupScheduler] Subiendo a Cloudinary... (${fileSizeMB} MB)`);
      const urlArchivo = await this.uploadBufferToCloudinary(dumpBuffer, fileName);
      logAcumulado += `\nCloudinary URL: ${urlArchivo}`;
      console.log(`✅ [BackupScheduler] Subido a Cloudinary: ${urlArchivo}`);

      // ── Guardar registro en BD ─────────────────────────────────────────
      await pool.query(
        `INSERT INTO respaldos_historial
          (nombre_archivo, tipo, estado, tamano, usuario_id, detalles_log, url_archivo)
         VALUES ($1, 'automatico', 'completed', $2, NULL, $3, $4)`,
        [fileName, fileSizeMB, logAcumulado, urlArchivo]
      );

      console.log(`✅ [BackupScheduler] Respaldo completado: ${fileName} (${fileSizeMB} MB)`);

      // ── Limpieza de registros viejos en BD ────────────────────────────
      await this.cleanOldDbRecords();

    } catch (error: any) {
      logAcumulado += `\n\n❌ ERROR: ${error.message}`;
      console.error(`❌ [BackupScheduler] Error en respaldo automático:`, error.message);

      try {
        await pool.query(
          `INSERT INTO respaldos_historial
            (nombre_archivo, tipo, estado, usuario_id, detalles_log)
           VALUES ($1, 'automatico', 'failed', NULL, $2)`,
          [fileName, logAcumulado]
        );
      } catch (dbErr) {
        console.error('❌ [BackupScheduler] No se pudo guardar el error en BD:', dbErr);
      }

    } finally {
      this.isRunning = false;
    }
  }

  // ─── LIMPIAR REGISTROS VIEJOS EN BD ──────────────────────────────────────
  static async cleanOldDbRecords(): Promise<void> {
    try {
      const config = await this.getConfig();
      const result = await pool.query(
        `DELETE FROM respaldos_historial
         WHERE tipo = 'automatico'
           AND fecha_creacion < NOW() - (interval '1 day' * $1)`,
        [config.retencion_dias]
      );
      if (result.rowCount && result.rowCount > 0) {
        console.log(`🧹 [BackupScheduler] ${result.rowCount} registros BD eliminados por retención (${config.retencion_dias} días)`);
      }
    } catch (err) {
      console.error('⚠️  [BackupScheduler] Error limpiando registros BD:', err);
    }
  }

  // ─── CONVERTIR HORA "HH:MM" A EXPRESIÓN CRON ─────────────────────────────
  private static timeToCron(hora: string, frecuencia: string): string {
    const [h, m] = hora.split(':').map(Number);
    switch (frecuencia) {
      case 'cada5min': return `*/5 * * * *`;
      case 'diario':   return `${m} ${h} * * *`;
      case 'semanal':  return `${m} ${h} * * 0`;
      case 'mensual':  return `${m} ${h} 1 * *`;
      default:         return `${m} ${h} * * *`;
    }
  }

  // ─── DETENER TODOS LOS TASKS ──────────────────────────────────────────────
  static stopAll(): void {
    [this.taskDiario, this.taskSemanal, this.taskMensual, this.taskLimpieza].forEach(t => {
      if (t) t.stop();
    });
    this.taskDiario = this.taskSemanal = this.taskMensual = this.taskLimpieza = null;
    console.log('⏹️  [BackupScheduler] Todos los cron jobs detenidos');
  }

  // ─── INICIAR SCHEDULER ────────────────────────────────────────────────────
  static async initialize(): Promise<void> {
    const config = await this.getConfig();
    this.stopAll();

    if (!config.enabled) {
      console.log('ℹ️  [BackupScheduler] Automatización desactivada en configuración');
      return;
    }

    const cronExpr = this.timeToCron(config.hora, config.frecuencia);
    console.log(`⏰ [BackupScheduler] Programando respaldo ${config.frecuencia} a las ${config.hora} → cron: "${cronExpr}"`);

    const task = cron.schedule(cronExpr, async () => {
      console.log(`\n🤖 [BackupScheduler] Disparando respaldo ${config.frecuencia}...`);
      await this.runScheduledBackup();
    }, { timezone: 'America/Mexico_City' });

    if (config.frecuencia === 'diario')       this.taskDiario  = task;
    else if (config.frecuencia === 'semanal') this.taskSemanal = task;
    else                                      this.taskMensual = task;

    // Limpieza diaria de registros viejos en BD a las 4:00 AM
    this.taskLimpieza = cron.schedule('0 4 * * *', async () => {
      console.log('🧹 [BackupScheduler] Ejecutando limpieza programada...');
      await this.cleanOldDbRecords();
    }, { timezone: 'America/Mexico_City' });

    console.log(`✅ [BackupScheduler] Iniciado. Retención: ${config.retencion_dias} días`);
  }

  // ─── RE-INICIAR DESPUÉS DE CAMBIO DE CONFIG ───────────────────────────────
  static async restart(newConfig: SchedulerConfig): Promise<void> {
    await this.saveConfig(newConfig);
    await this.initialize();
    console.log('🔄 [BackupScheduler] Reiniciado con nueva configuración');
  }

  // ─── ESTADO ACTUAL ────────────────────────────────────────────────────────
  static async getStatus(): Promise<{
    running: boolean;
    config: SchedulerConfig;
    nextRun: string | null;
    lastRun: string | null;
  }> {
    const config = await this.getConfig();
    const hasTask = !!(this.taskDiario || this.taskSemanal || this.taskMensual);

    let lastRun: string | null = null;
    try {
      const res = await pool.query(
        `SELECT to_char(fecha_creacion AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD HH24:MI:SS') as fecha
         FROM respaldos_historial
         WHERE tipo = 'automatico'
         ORDER BY fecha_creacion DESC LIMIT 1`
      );
      if (res.rows.length > 0) lastRun = res.rows[0].fecha;
    } catch (_) { /* tabla no existe */ }

    return {
      running: config.enabled && hasTask,
      config,
      nextRun: config.enabled
        ? config.frecuencia === 'cada5min'
          ? 'Próximo: cada 5 minutos'
          : `Próximo: ${config.frecuencia} a las ${config.hora}`
        : null,
      lastRun,
    };
  }
}