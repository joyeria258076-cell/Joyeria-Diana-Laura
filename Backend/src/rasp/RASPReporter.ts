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

const IS_RENDER = !!process.env.RENDER;
const REPORTS_DIR = IS_RENDER ? '/tmp' : path.join(process.cwd(), 'rasp-reports');
const BLOCK_LOG_FILE = path.join(REPORTS_DIR, 'rasp-blocks.json');
const ALERT_FILE = path.join(REPORTS_DIR, 'rasp-alerts.json');
const FINDINGS_FILE = path.join(REPORTS_DIR, 'rasp-findings.json');
const MAX_EVENTS_IN_MEMORY = 500;

export class RASPReporter {
  private static blockEvents: RASPBlockEvent[] = [];
  private static alerts: RASPAlert[] = [];
  private static findings: RASPFinding[] = [];
  private static initialized = false;
  private static sseClients: Set<any> = new Set();

  static initialize(): void {
    if (this.initialized) return;
    this.initialized = true;

    // ✅ Crear directorio si no existe
    if (!fs.existsSync(REPORTS_DIR)) {
      try { 
        fs.mkdirSync(REPORTS_DIR, { recursive: true }); 
        console.log(`[RASP] 📁 Carpeta creada: ${REPORTS_DIR}`);
      } catch (err) { 
        console.error(`[RASP] ❌ Error creando carpeta: ${err}`);
      }
    }

    // Cargar hallazgos previos
    if (fs.existsSync(FINDINGS_FILE)) {
      try {
        const data = fs.readFileSync(FINDINGS_FILE, 'utf-8');
        this.findings = JSON.parse(data);
        console.log(`[RASP] 📂 Cargados ${this.findings.length} hallazgos previos`);
      } catch (err) { 
        console.error('[RASP] Error cargando hallazgos:', err);
        this.findings = []; 
      }
    } else {
      // ✅ Crear archivo vacío si no existe
      this.persistFindings();
    }

    // Cargar bloqueos
    if (fs.existsSync(BLOCK_LOG_FILE)) {
      try {
        const data = fs.readFileSync(BLOCK_LOG_FILE, 'utf-8');
        this.blockEvents = JSON.parse(data);
        console.log(`[RASP] 📂 Cargados ${this.blockEvents.length} eventos de bloqueo`);
      } catch { this.blockEvents = []; }
    } else {
      this.persistBlocks();
    }

    console.log('[RASP] 📊 Reporter inicializado');
    console.log(`[RASP] 📁 Reportes guardados en: ${REPORTS_DIR}`);
  }

  static recordFinding(finding: Omit<RASPFinding, 'id' | 'timestamp'>): void {
    const fullFinding: RASPFinding = {
      ...finding,
      id: `finding_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      timestamp: new Date().toISOString(),
    };

    this.findings.unshift(fullFinding);
    
    // Limitar tamaño
    if (this.findings.length > MAX_EVENTS_IN_MEMORY) {
      this.findings = this.findings.slice(0, MAX_EVENTS_IN_MEMORY);
    }
    
    this.persistFindings();
    this.broadcastFinding(fullFinding);

    const severityColor = {
      CRITICAL: '\x1b[41m\x1b[37m',
      HIGH: '\x1b[31m',
      MEDIUM: '\x1b[33m',
      LOW: '\x1b[36m',
    }[finding.severity] || '';

    console.log(`[RASP] ${severityColor}[${finding.severity}]${'\x1b[0m'} Hallazgo: ${finding.type} | ${finding.path} | ${finding.field}`);
  }

  static recordBlock(event: Omit<RASPBlockEvent, 'id' | 'timestamp'> & { blocked?: boolean }): void {
    const fullEvent: RASPBlockEvent = {
      ...event,
      id: `block_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      timestamp: new Date().toISOString(),
      blocked: event.blocked !== undefined ? event.blocked : true, // Valor por defecto true
    };

    if (this.blockEvents.length >= MAX_EVENTS_IN_MEMORY) {
      this.blockEvents = this.blockEvents.slice(-MAX_EVENTS_IN_MEMORY + 1);
    }

    this.blockEvents.unshift(fullEvent);
    this.persistBlocks();
    this.broadcastBlock(fullEvent);

    console.log(`[RASP] 🔒 Bloqueo registrado: ${fullEvent.reason} | IP: ${fullEvent.ip}`);
  }

  static recordAlert(alert: Omit<RASPAlert, 'id' | 'timestamp'>): void {
    const fullAlert: RASPAlert = {
      ...alert,
      id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      timestamp: new Date().toISOString(),
    };

    if (this.alerts.length >= MAX_EVENTS_IN_MEMORY) {
      this.alerts = this.alerts.slice(-MAX_EVENTS_IN_MEMORY + 1);
    }

    this.alerts.unshift(fullAlert);
    this.persistAlerts();
    this.broadcastAlert(fullAlert);

    const severityColor = {
      CRITICAL: '\x1b[41m\x1b[37m',
      HIGH: '\x1b[31m',
      MEDIUM: '\x1b[33m',
      LOW: '\x1b[36m',
    }[alert.severity] || '';

    console.log(`[RASP] ${severityColor}[${alert.severity}]${'\x1b[0m'} Alerta: ${alert.type} | ${alert.ip}`);
  }

  static persistFindings(): void {
    try {
      fs.writeFileSync(FINDINGS_FILE, JSON.stringify(this.findings, null, 2), 'utf-8');
      console.log(`[RASP] 💾 Hallazgos guardados (${this.findings.length})`);
    } catch (err) {
      console.error('[RASP] Error persistiendo hallazgos:', err);
    }
  }

  private static persistBlocks(): void {
    try {
      fs.writeFileSync(BLOCK_LOG_FILE, JSON.stringify(this.blockEvents, null, 2), 'utf-8');
    } catch (err) {
      console.error('[RASP] Error persistiendo bloqueos:', err);
    }
  }

  private static persistAlerts(): void {
    try {
      fs.writeFileSync(ALERT_FILE, JSON.stringify(this.alerts, null, 2), 'utf-8');
    } catch (err) {
      console.error('[RASP] Error persistiendo alertas:', err);
    }
  }

  // SSE para tiempo real
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

  // Getters para el dashboard
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
    const blocksBySeverity = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    const findingsByType: Record<string, number> = {};
    
    this.findings.forEach(f => {
      blocksBySeverity[f.severity] = (blocksBySeverity[f.severity] || 0) + 1;
      findingsByType[f.type] = (findingsByType[f.type] || 0) + 1;
    });

    const blockedIPs = [...new Set(this.blockEvents.map(b => b.ip))];

    return {
      totalFindings: this.findings.length,
      totalBlocks: this.blockEvents.length,
      totalAlerts: this.alerts.length,
      bySeverity: blocksBySeverity,
      byType: findingsByType,
      blockedIPs,
      lastFinding: this.findings[0] || null,
      lastBlock: this.blockEvents[0] || null,
      lastAlert: this.alerts[0] || null,
    };
  }

  static clearAll(): void {
    this.findings = [];
    this.blockEvents = [];
    this.alerts = [];
    this.persistFindings();
    this.persistBlocks();
    this.persistAlerts();
    console.log('[RASP] 🗑️ Todos los registros limpiados');
  }
}