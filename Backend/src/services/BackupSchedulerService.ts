// Ruta: Backend/src/services/BackupSchedulerService.ts

import * as cron from 'node-cron';
import { spawn } from 'child_process';
import pool from '../config/database';
import path from 'path';
import fs from 'fs';
import cloudinary from '../config/cloudinary'; // ← NUEVO

interface SchedulerConfig {
  enabled: boolean;
  frecuencia: 'diario' | 'semanal' | 'mensual';
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

  // ─── SUBIR ARCHIVO A CLOUDINARY ───────────────────────────────────────────
  private static async uploadToCloudinary(filePath: string, fileName: string): Promise<string> {
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: 'raw',
      folder: 'joyeria_backups',
      public_id: fileName.replace('.dump', ''),
      use_filename: true,
      unique_filename: false,
    });
    return result.secure_url;
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

    const backupDir = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups_automaticos');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    const filePath = path.join(backupDir, fileName);

    let logAcumulado = `--- RESPALDO AUTOMÁTICO: ${ahora.toLocaleString()} ---\n`;
    logAcumulado += `Servidor: ${process.env.DB_HOST || 'supabase.com'}\n`;

    console.log(`\n🤖 [BackupScheduler] Iniciando respaldo automático: ${fileName}`);

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
      logAcumulado += `\n--- PROCESO PG_DUMP ---\n`;

      await new Promise<void>((resolve, reject) => {
        const pgDumpPath = process.env.NODE_ENV === 'production'
          ? 'pg_dump'
          : `C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe`;

        const outStream = fs.createWriteStream(filePath);

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

        dump.stdout.pipe(outStream);

        dump.stderr.on('data', (data: Buffer) => {
          logAcumulado += data.toString().replace(/pg_dump: /g, '');
        });

        dump.on('close', (code: number | null) => {
          if (code === 0) resolve();
          else reject(new Error(`pg_dump salió con código ${code}`));
        });

        dump.on('error', reject);
      });

      const fileSizeBytes = fs.statSync(filePath).size;
      const fileSizeMB = (fileSizeBytes / 1024 / 1024).toFixed(2);

      logAcumulado += `\n--- FINALIZADO A LAS ${new Date().toLocaleTimeString()} ---`;
      logAcumulado += `\nTamaño generado: ${fileSizeMB} MB`;

      // ── SUBIR A CLOUDINARY ──────────────────────────────────────────────
      let urlArchivo: string | null = null;
      try {
        console.log(`☁️  [BackupScheduler] Subiendo a Cloudinary...`);
        urlArchivo = await this.uploadToCloudinary(filePath, fileName);
        logAcumulado += `\nCloudinary URL: ${urlArchivo}`;
        console.log(`✅ [BackupScheduler] Subido a Cloudinary: ${urlArchivo}`);
        // Borrar archivo local tras subida exitosa
        //fs.unlinkSync(filePath);
        //console.log(`🗑️  [BackupScheduler] Archivo local eliminado tras subida exitosa`);
      } catch (cloudErr: any) {
        // Si falla Cloudinary no es crítico — el archivo queda local como respaldo
        console.error(`⚠️  [BackupScheduler] No se pudo subir a Cloudinary:`, cloudErr.message);
        logAcumulado += `\n⚠️ Cloudinary falló: ${cloudErr.message} — archivo conservado localmente`;
      }
      // ───────────────────────────────────────────────────────────────────

      await pool.query(
        `INSERT INTO respaldos_historial
          (nombre_archivo, tipo, estado, tamano, usuario_id, detalles_log, url_archivo)
         VALUES ($1, 'automatico', 'completed', $2, NULL, $3, $4)`,
        [fileName, fileSizeMB, logAcumulado, urlArchivo]
      );

      console.log(`✅ [BackupScheduler] Respaldo completado: ${fileName} (${fileSizeMB} MB)`);

      await this.cleanOldFiles(backupDir);

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

      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    } finally {
      this.isRunning = false;
    }
  }

  // ─── LIMPIAR ARCHIVOS VIEJOS EN DISCO ─────────────────────────────────────
  static async cleanOldFiles(dir: string): Promise<void> {
    try {
      const config = await this.getConfig();
      const cutoff = Date.now() - config.retencion_dias * 24 * 60 * 60 * 1000;
      const files = fs.readdirSync(dir);
      let deleted = 0;
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.mtimeMs < cutoff) {
          fs.unlinkSync(filePath);
          deleted++;
          console.log(`🗑️  [BackupScheduler] Archivo eliminado por retención: ${file}`);
        }
      }
      if (deleted > 0) {
        console.log(`🧹 [BackupScheduler] ${deleted} archivos eliminados por política de retención`);
      }
    } catch (err) {
      console.error('⚠️  [BackupScheduler] Error limpiando archivos viejos:', err);
    }
  }

  // ─── LIMPIAR REGISTROS VIEJOS EN BD ──────────────────────────────────────
  static async cleanOldDbRecords(): Promise<void> {
    try {
      const config = await this.getConfig();
      const result = await pool.query(
        `DELETE FROM respaldos_historial
         WHERE tipo = 'automatico'
           AND fecha_creacion < NOW() - INTERVAL '${config.retencion_dias} days'`
      );
      if (result.rowCount && result.rowCount > 0) {
        console.log(`🧹 [BackupScheduler] ${result.rowCount} registros BD eliminados por retención`);
      }
    } catch (err) {
      console.error('⚠️  [BackupScheduler] Error limpiando registros BD:', err);
    }
  }

  // ─── CONVERTIR HORA "HH:MM" A EXPRESIÓN CRON ─────────────────────────────
  private static timeToCron(hora: string, frecuencia: string): string {
    const [h, m] = hora.split(':').map(Number);
    switch (frecuencia) {
      case 'diario':  return `${m} ${h} * * *`;
      case 'semanal': return `${m} ${h} * * 0`;
      case 'mensual': return `${m} ${h} 1 * *`;
      default:        return `${m} ${h} * * *`;
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
    else                                       this.taskMensual = task;

    this.taskLimpieza = cron.schedule('0 4 * * *', async () => {
      console.log('🧹 [BackupScheduler] Ejecutando limpieza programada...');
      const backupDir = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups_automaticos');
      if (fs.existsSync(backupDir)) await this.cleanOldFiles(backupDir);
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
      nextRun: config.enabled ? `Próximo: ${config.frecuencia} a las ${config.hora}` : null,
      lastRun,
    };
  }
}