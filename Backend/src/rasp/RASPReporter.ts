// src/rasp/RASPReporter.ts
import * as fs from 'fs';
import * as path from 'path';

export interface RASPBlockEvent {
  id: string;
  timestamp: string;
  ip: string;
  path: string;
  method: string;
  reason: string;
  suspiciousScore: number;
  blocked: boolean;
}

export interface RASPAlert {
  id: string;
  timestamp: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  type: string;
  ip: string;
  path: string;
  method: string;
  description: string;
  evidence: string;
  blocked: boolean;
}

export interface RASPFinding {
  id: string;
  timestamp: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  type: string;
  ip: string;
  path: string;
  method: string;
  field: string;
  payload: string;
  blocked: boolean;
  description: string;
}

// ✅ MISMA LÓGICA QUE IAST: usar /tmp en Render
const IS_RENDER = !!process.env.RENDER;
const REPORTS_DIR = IS_RENDER ? '/tmp/rasp-reports' : path.join(process.cwd(), 'rasp-reports');
const FINDINGS_FILE = path.join(REPORTS_DIR, 'rasp-findings.json');
const BLOCK_LOG_FILE = path.join(REPORTS_DIR, 'rasp-blocks.json');
const ALERT_FILE = path.join(REPORTS_DIR, 'rasp-alerts.json');
const MAX_EVENTS_IN_MEMORY = 500;

export class RASPReporter {
  private static findings: RASPFinding[] = [];
  private static blockEvents: RASPBlockEvent[] = [];
  private static alerts: RASPAlert[] = [];
  private static initialized = false;
  private static sseClients: Set<any> = new Set();

  static initialize(): void {
    if (this.initialized) return;
    this.initialized = true;

    // ✅ Crear directorio igual que IAST
    if (!fs.existsSync(REPORTS_DIR)) {
      try {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
        console.log(`[RASP] 📁 Carpeta creada: ${REPORTS_DIR}`);
      } catch (err) {
        console.error(`[RASP] ❌ Error creando carpeta: ${REPORTS_DIR}`, err);
      }
    }

    // ✅ Cargar hallazgos previos (igual que IAST)
    if (fs.existsSync(FINDINGS_FILE)) {
      try {
        const data = fs.readFileSync(FINDINGS_FILE, 'utf-8');
        this.findings = JSON.parse(data);
        console.log(`[RASP] 📂 Cargados ${this.findings.length} hallazgos previos`);
      } catch (err) {
        console.error('[RASP] Error cargando hallazgos:', err);
        this.findings = [];
      }
    }

    console.log('[RASP] 📊 Reporter inicializado');
    console.log(`[RASP] 📁 Reportes guardados en: ${REPORTS_DIR}`);
  }

  static recordFinding(finding: Omit<RASPFinding, 'id' | 'timestamp'>): void {
    try {
      const fullFinding: RASPFinding = {
        ...finding,
        id: `finding_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        timestamp: new Date().toISOString(),
      };

      // ✅ Leer hallazgos existentes (misma lógica que IAST)
      let existingFindings: RASPFinding[] = [];
      if (fs.existsSync(FINDINGS_FILE)) {
        try {
          const data = fs.readFileSync(FINDINGS_FILE, 'utf-8');
          existingFindings = JSON.parse(data);
        } catch (err) {
          console.error('[RASP] Error leyendo hallazgos existentes:', err);
        }
      }

      // Agregar nuevo hallazgo
      existingFindings.unshift(fullFinding);
      
      // Limitar tamaño
      if (existingFindings.length > MAX_EVENTS_IN_MEMORY) {
        existingFindings = existingFindings.slice(0, MAX_EVENTS_IN_MEMORY);
      }
      
      // ✅ Guardar (misma lógica que IAST)
      fs.writeFileSync(FINDINGS_FILE, JSON.stringify(existingFindings, null, 2), 'utf-8');
      
      // Actualizar memoria
      this.findings = existingFindings;
      
      // Emitir via SSE
      this.broadcastFinding(fullFinding);

      const severityColor = {
        CRITICAL: '\x1b[41m\x1b[37m',
        HIGH: '\x1b[31m',
        MEDIUM: '\x1b[33m',
        LOW: '\x1b[36m',
      }[finding.severity] || '';

      console.log(`[RASP] ${severityColor}[${finding.severity}]${'\x1b[0m'} Hallazgo: ${finding.type} | ${finding.path} | ${finding.field}`);
      console.log(`[RASP] 💾 Hallazgo guardado en: ${FINDINGS_FILE}`);
    } catch (err) {
      console.error('[RASP] Error registrando hallazgo:', err);
    }
  }

  static recordBlock(event: Omit<RASPBlockEvent, 'id' | 'timestamp'> & { blocked?: boolean }): void {
    try {
      const fullEvent: RASPBlockEvent = {
        ...event,
        id: `block_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        timestamp: new Date().toISOString(),
        blocked: event.blocked !== undefined ? event.blocked : true,
      };

      let existingBlocks: RASPBlockEvent[] = [];
      if (fs.existsSync(BLOCK_LOG_FILE)) {
        try {
          const data = fs.readFileSync(BLOCK_LOG_FILE, 'utf-8');
          existingBlocks = JSON.parse(data);
        } catch (err) {}
      }

      existingBlocks.unshift(fullEvent);
      if (existingBlocks.length > MAX_EVENTS_IN_MEMORY) {
        existingBlocks = existingBlocks.slice(0, MAX_EVENTS_IN_MEMORY);
      }
      
      fs.writeFileSync(BLOCK_LOG_FILE, JSON.stringify(existingBlocks, null, 2), 'utf-8');
      this.blockEvents = existingBlocks;
      this.broadcastBlock(fullEvent);

      console.log(`[RASP] 🔒 Bloqueo registrado: ${fullEvent.reason} | IP: ${fullEvent.ip}`);
    } catch (err) {
      console.error('[RASP] Error registrando bloqueo:', err);
    }
  }

  static recordAlert(alert: Omit<RASPAlert, 'id' | 'timestamp'> & { blocked?: boolean }): void {
    try {
      const fullAlert: RASPAlert = {
        ...alert,
        id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        timestamp: new Date().toISOString(),
        blocked: alert.blocked !== undefined ? alert.blocked : false,
      };

      let existingAlerts: RASPAlert[] = [];
      if (fs.existsSync(ALERT_FILE)) {
        try {
          const data = fs.readFileSync(ALERT_FILE, 'utf-8');
          existingAlerts = JSON.parse(data);
        } catch (err) {}
      }

      existingAlerts.unshift(fullAlert);
      if (existingAlerts.length > MAX_EVENTS_IN_MEMORY) {
        existingAlerts = existingAlerts.slice(0, MAX_EVENTS_IN_MEMORY);
      }
      
      fs.writeFileSync(ALERT_FILE, JSON.stringify(existingAlerts, null, 2), 'utf-8');
      this.alerts = existingAlerts;
      this.broadcastAlert(fullAlert);
    } catch (err) {
      console.error('[RASP] Error registrando alerta:', err);
    }
  }

  // ✅ MÉTODOS SSE (igual que IAST)
  static addSSEClient(res: any): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    this.sseClients.add(res);
    console.log(`[RASP] 🔌 Cliente SSE conectado (total: ${this.sseClients.size})`);

    // Enviar hallazgos existentes
    const init = JSON.stringify({ type: 'init', findings: this.findings });
    res.write(`data: ${init}\n\n`);

    const keepAlive = setInterval(() => {
      if (!res.writableEnded) {
        res.write(': keep-alive\n\n');
      } else {
        clearInterval(keepAlive);
      }
    }, 25000);

    res.on('close', () => {
      clearInterval(keepAlive);
      this.sseClients.delete(res);
      console.log(`[RASP] 🔌 Cliente SSE desconectado (total: ${this.sseClients.size})`);
    });
  }

  private static broadcastFinding(finding: RASPFinding): void {
    if (this.sseClients.size === 0) return;
    const payload = JSON.stringify({ type: 'finding', finding });
    this.broadcast(payload);
  }

  private static broadcastBlock(block: RASPBlockEvent): void {
    if (this.sseClients.size === 0) return;
    const payload = JSON.stringify({ type: 'block', block });
    this.broadcast(payload);
  }

  private static broadcastAlert(alert: RASPAlert): void {
    if (this.sseClients.size === 0) return;
    const payload = JSON.stringify({ type: 'alert', alert });
    this.broadcast(payload);
  }

  private static broadcast(payload: string): void {
    const deadClients: any[] = [];
    this.sseClients.forEach(client => {
      if (client.writableEnded) {
        deadClients.push(client);
      } else {
        client.write(`data: ${payload}\n\n`);
      }
    });
    deadClients.forEach(c => this.sseClients.delete(c));
  }

  // Getters
  static getAllFindings(): RASPFinding[] {
    return [...this.findings];
  }

  static getBlocks(limit?: number): RASPBlockEvent[] {
    return limit ? this.blockEvents.slice(0, limit) : [...this.blockEvents];
  }

  static getAlerts(severity?: string, limit?: number): RASPAlert[] {
    let filtered = this.alerts;
    if (severity) {
      filtered = filtered.filter(a => a.severity === severity);
    }
    return limit ? filtered.slice(0, limit) : [...filtered];
  }

  static getSummary() {
    const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    this.findings.forEach(f => {
      counts[f.severity] = (counts[f.severity] || 0) + 1;
    });

    return {
      totalFindings: this.findings.length,
      totalBlocks: this.blockEvents.length,
      totalAlerts: this.alerts.length,
      bySeverity: counts,
      lastFinding: this.findings[0] || null,
    };
  }

  static clearAll(): void {
    this.findings = [];
    this.blockEvents = [];
    this.alerts = [];
    if (fs.existsSync(FINDINGS_FILE)) fs.unlinkSync(FINDINGS_FILE);
    if (fs.existsSync(BLOCK_LOG_FILE)) fs.unlinkSync(BLOCK_LOG_FILE);
    if (fs.existsSync(ALERT_FILE)) fs.unlinkSync(ALERT_FILE);
    console.log('[RASP] 🗑️ Todos los registros limpiados');
  }
}