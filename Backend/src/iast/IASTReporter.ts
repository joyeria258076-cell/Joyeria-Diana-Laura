// src/iast/IASTReporter.ts
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { IASTFinding } from './IASTContext';

const IS_RENDER = !!process.env.RENDER;
const REPORTS_DIR = IS_RENDER ? '/tmp' : path.join(process.cwd(), 'iast-reports');
const REPORT_FILE = path.join(REPORTS_DIR, 'iast-findings.json');
const MAX_FINDINGS_IN_MEMORY = 500;
const AUTO_RESOLVE_DAYS = 0.0104; // 15 minutos

export class IASTReporter {
  private static findings: IASTFinding[] = [];
  private static sseClients: Set<Response> = new Set();
  private static initialized = false;
  private static autoResolveInterval: NodeJS.Timeout | null = null;

  // Mapa para registrar última actividad por módulo
  private static moduleLastActivity: Map<string, number> = new Map();

  static initialize(): void {
    if (this.initialized) return;
    this.initialized = true;

    if (!fs.existsSync(REPORTS_DIR)) {
      try { fs.mkdirSync(REPORTS_DIR, { recursive: true }); } catch (_e) { }
    }

    if (fs.existsSync(REPORT_FILE)) {
      try {
        const data = fs.readFileSync(REPORT_FILE, 'utf-8');
        this.findings = JSON.parse(data);
        console.log(`[IAST] 📂 Cargados ${this.findings.length} hallazgos previos`);
      } catch { this.findings = []; }
    }

    this.autoResolveOldFindings();
    if (this.autoResolveInterval) clearInterval(this.autoResolveInterval);
    this.autoResolveInterval = setInterval(() => this.autoResolveOldFindings(), 6 * 60 * 60 * 1000);

    console.log('[IAST] 📊 Reporter inicializado (auto-resolución activa)');
  }

  private static autoResolveOldFindings(): void {
    const now = Date.now();
    const threshold = AUTO_RESOLVE_DAYS * 24 * 60 * 60 * 1000;
    let changed = false;

    this.findings = this.findings.filter(f => {
      if (!f.resolved && f.lastDetected) {
        const last = new Date(f.lastDetected).getTime();
        if (now - last > threshold) {
          f.resolved = true;
          f.resolvedAt = new Date().toISOString();
          f.resolvedReason = 'auto';
          changed = true;
          console.log(`[IAST] 🤖 Hallazgo resuelto automáticamente: ${f.type} (${f.module})`);
        }
      }
      return true;
    });

    if (changed) {
      this.persistFindings();
      this.broadcastUpdate();
    }
  }

  // Registrar actividad de un módulo (llamado desde el middleware)
  static recordModuleActivity(moduleName: string): void {
    this.moduleLastActivity.set(moduleName, Date.now());
    console.log(`[IAST] 📍 Actividad registrada en módulo: ${moduleName}`);
    // Notificar a los clientes SSE para actualizar la UI
    this.broadcastUpdate();
  }

  // Obtener todas las actividades para enviar al cliente
  static getAllModuleActivities(): Record<string, number> {
    const obj: Record<string, number> = {};
    this.moduleLastActivity.forEach((value, key) => {
      obj[key] = value;
    });
    return obj;
  }

  static addFinding(finding: IASTFinding): void {
    const existingIndex = this.findings.findIndex(f =>
      !f.resolved &&
      f.type === finding.type &&
      f.path === finding.path &&
      f.evidence === finding.evidence
    );

    if (existingIndex !== -1) {
      this.findings[existingIndex].timestamp = finding.timestamp;
      this.findings[existingIndex].lastDetected = finding.timestamp;
      this.findings[existingIndex].severity = finding.severity;
      this.findings[existingIndex].description = finding.description;
      this.findings[existingIndex].remediation = finding.remediation;
      this.persistFindings();
      this.broadcastUpdate();
      return;
    }

    if (this.findings.length >= MAX_FINDINGS_IN_MEMORY) {
      this.findings = this.findings.slice(-MAX_FINDINGS_IN_MEMORY + 1);
    }

    finding.lastDetected = finding.timestamp;
    finding.resolved = false;
    this.findings.push(finding);

    this.persistFindings();
    this.broadcastFinding(finding);
    this.logFinding(finding);
  }

  static collectFromRequest(findings: IASTFinding[]): void {
    findings.forEach(f => this.addFinding(f));
  }

  private static logFinding(finding: IASTFinding): void {
    const colors: Record<string, string> = {
      CRITICAL: '\x1b[41m\x1b[37m', HIGH: '\x1b[31m', MEDIUM: '\x1b[33m',
      LOW: '\x1b[36m', INFO: '\x1b[34m',
    };
    const reset = '\x1b[0m';
    const color = colors[finding.severity] || '';
    console.log(`[IAST] ${color}[${finding.severity}]${reset} ${finding.type} | ${finding.module} | ${finding.path}`);
  }

  private static persistFindings(): void {
    try {
      fs.writeFileSync(REPORT_FILE, JSON.stringify(this.findings, null, 2), 'utf-8');
    } catch (err) { console.error('[IAST] Error persistiendo hallazgos:', err); }
  }

  static addSSEClient(res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    this.sseClients.add(res);
    console.log(`[IAST] 🔌 Cliente SSE conectado (total: ${this.sseClients.size})`);

    const initPayload = {
      type: 'init',
      findings: this.getAllFindings(),
      moduleActivities: this.getAllModuleActivities()
    };
    res.write(`data: ${JSON.stringify(initPayload)}\n\n`);

    const keepAlive = setInterval(() => {
      if (!res.writableEnded) res.write(': keep-alive\n\n');
      else clearInterval(keepAlive);
    }, 25000);

    res.on('close', () => {
      clearInterval(keepAlive);
      this.sseClients.delete(res);
      console.log(`[IAST] 🔌 Cliente SSE desconectado (total: ${this.sseClients.size})`);
    });
  }

  private static broadcastFinding(finding: IASTFinding): void {
    const payload = JSON.stringify({
      type: 'finding',
      finding,
      moduleActivities: this.getAllModuleActivities()
    });
    this.broadcast(payload);
  }

  private static broadcastUpdate(): void {
    const payload = JSON.stringify({
      type: 'update',
      findings: this.getAllFindings(),
      moduleActivities: this.getAllModuleActivities()
    });
    this.broadcast(payload);
  }

  private static broadcast(payload: string): void {
    if (this.sseClients.size === 0) return;
    const dead: Response[] = [];
    this.sseClients.forEach(client => {
      if (client.writableEnded) dead.push(client);
      else client.write(`data: ${payload}\n\n`);
    });
    dead.forEach(c => this.sseClients.delete(c));
  }

  static getAllFindings(): IASTFinding[] {
    return [...this.findings].reverse();
  }

  static getActiveFindings(): IASTFinding[] {
    return this.findings.filter(f => !f.resolved);
  }

  static getResolvedFindings(): IASTFinding[] {
    return this.findings.filter(f => f.resolved);
  }

  static getSummary() {
    const active = this.getActiveFindings();
    const resolved = this.getResolvedFindings();
    const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0, RESOLVED: resolved.length };
    active.forEach(f => counts[f.severity]++);
    const byModule: Record<string, number> = {};
    active.forEach(f => byModule[f.module] = (byModule[f.module] || 0) + 1);
    const byType: Record<string, number> = {};
    active.forEach(f => byType[f.type] = (byType[f.type] || 0) + 1);
    return {
      totalActive: active.length,
      totalResolved: resolved.length,
      bySeverity: counts,
      byModule,
      byType,
      lastFinding: active[0]?.timestamp || null,
      activeSSEClients: this.sseClients.size,
    };
  }

  static clearFindings(): void {
    this.findings = [];
    this.persistFindings();
    this.broadcastUpdate();
    console.log('[IAST] 🗑️  Hallazgos limpiados');
  }
}