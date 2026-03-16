// Ruta: Backend/src/services/BackupSchedulerService.ts

import * as cron from 'node-cron';
import { spawn } from 'child_process';
import pool from '../config/database';
import cloudinary from '../config/cloudinary';


/**
 * Devuelve fecha/hora en zona horaria correcta según entorno.
 * Producción (Render corre en UTC) → fuerza America/Mexico_City.
 * Local → respeta el timezone del sistema (ya es México).
 */
const getFechaLocal = (fecha: Date): string => {
  const opciones: Intl.DateTimeFormatOptions = {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
    ...(process.env.NODE_ENV === 'production' && { timeZone: 'America/Mexico_City' }),
  };
  return fecha.toLocaleString('es-MX', opciones);
};

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
  private static taskCada5min: ReturnType<typeof cron.schedule> | null = null;
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
          public_id: fileName,
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

  // ─── HELPER: extraer public_id de URL de Cloudinary ──────────────────────
  private static extractPublicIdFromCloudinary(url: string): string | null {
    const match = url.match(/\/joyeria_backups\/(.+)$/);
    return match ? `joyeria_backups/${match[1]}` : null;
  }

  // ─── EJECUTAR UN RESPALDO AUTOMÁTICO ─────────────────────────────────────
  static async runScheduledBackup(): Promise<void> {
    if (this.isRunning) {
      console.log('⏸️  Backup automático ya en ejecución, omitiendo...');
      return;
    }
    this.isRunning = true;

    const ahora = new Date();
    const nombreLimpio = getFechaLocal(ahora)
      .replace(/\//g, '-')
      .replace(/, /g, '_')
      .replace(/:/g, '-');

    const fileName = `respaldo_auto_${nombreLimpio}.dump`;

    let logAcumulado = `--- RESPALDO AUTOMÁTICO: ${getFechaLocal(ahora)} ---\n`;
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

        dump.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
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

      // ── Limpieza de registros viejos ──────────────────────────────────
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

/**
   * ─── LIMPIAR REGISTROS VIEJOS EN BD + CLOUDINARY ─────────────────────────
   *
   * Reglas:
   * 1. Si solo hay 1 respaldo automático → no se borra nada (conservar siempre el último).
   * 2. Si hay más de 1 → se elimina DE UNO EN UNO el más antiguo que ya haya vencido.
   * 3. Si ninguno ha vencido aún → no se borra nada.
   */
  static async cleanOldDbRecords(configOverride?: SchedulerConfig): Promise<{ deleted: number }> {
    try {
      const config = configOverride ?? await this.getConfig();

      console.log(`🧹 [Limpieza] Verificando retención de ${config.retencion_dias} días...`);

      // Regla 1: contar cuántos respaldos automáticos existen
      const countResult = await pool.query(
        `SELECT COUNT(*) as total FROM respaldos_historial WHERE tipo = 'automatico'`
      );
      const total = parseInt(countResult.rows[0].total, 10);

      if (total <= 1) {
        console.log(`🧹 [Limpieza] Solo hay ${total} respaldo(s) — se conserva siempre el último. Sin eliminaciones.`);
        return { deleted: 0 };
      }

      // Regla 2 y 3: buscar el MÁS ANTIGUO que ya venció, solo 1
      const vencido = await pool.query(
        `SELECT id, url_archivo, nombre_archivo FROM respaldos_historial
         WHERE tipo = 'automatico'
           AND fecha_creacion < NOW() - (interval '1 day' * $1::float)
         ORDER BY fecha_creacion ASC
         LIMIT 1`,
        [config.retencion_dias]
      );

      if (vencido.rows.length === 0) {
        console.log(`🧹 [Limpieza] Ningún respaldo ha vencido aún. Sin eliminaciones.`);
        return { deleted: 0 };
      }

      const registro = vencido.rows[0];

      // Eliminar de Cloudinary si tiene URL
      if (registro.url_archivo) {
        try {
          const publicId = this.extractPublicIdFromCloudinary(registro.url_archivo);
          if (publicId) {
            await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
            console.log(`☁️  [Limpieza] Eliminado de Cloudinary: ${publicId} (${registro.nombre_archivo})`);
          }
        } catch (cloudErr) {
          console.error(`⚠️  [Limpieza] Error al eliminar de Cloudinary (id=${registro.id}):`, cloudErr);
        }
      }

      // Eliminar de BD — solo 1 registro
      await pool.query(`DELETE FROM respaldos_historial WHERE id = $1`, [registro.id]);

      console.log(`🧹 [Limpieza] 1 respaldo eliminado: ${registro.nombre_archivo}. Quedan ${total - 1} en total.`);
      return { deleted: 1 };

    } catch (err) {
      console.error('⚠️  [BackupScheduler] Error limpiando registros:', err);
      return { deleted: 0 };
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
    [this.taskDiario, this.taskSemanal, this.taskMensual, this.taskCada5min, this.taskLimpieza].forEach(t => {
      if (t) t.stop();
    });
    this.taskDiario = this.taskSemanal = this.taskMensual = this.taskCada5min = this.taskLimpieza = null;
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
    console.log(`⏰ [BackupScheduler] Programando respaldo ${config.frecuencia} → cron: "${cronExpr}"`);

    const task = cron.schedule(cronExpr, async () => {
      console.log(`\n🤖 [BackupScheduler] Disparando respaldo ${config.frecuencia}...`);
      await this.runScheduledBackup();
    }, { timezone: 'America/Mexico_City' });

    if (config.frecuencia === 'diario')        this.taskDiario   = task;
    else if (config.frecuencia === 'semanal')  this.taskSemanal  = task;
    else if (config.frecuencia === 'cada5min') this.taskCada5min = task;
    else                                       this.taskMensual  = task;

    // Limpieza: si retención < 1 día → cada hora; si no → diario a las 4AM
    const cronLimpieza = config.retencion_dias < 1 ? '0 * * * *' : '0 4 * * *';
    this.taskLimpieza = cron.schedule(cronLimpieza, async () => {
      console.log('🧹 [BackupScheduler] Ejecutando limpieza programada...');
      await this.cleanOldDbRecords(config);
    }, { timezone: 'America/Mexico_City' });

    console.log(`✅ [BackupScheduler] Iniciado. Retención: ${config.retencion_dias} días — limpieza cron: ${cronLimpieza}`);
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
    const hasTask = !!(this.taskDiario || this.taskSemanal || this.taskMensual || this.taskCada5min);

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