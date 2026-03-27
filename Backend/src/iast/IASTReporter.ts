// src/iast/IASTReporter.ts
// ─────────────────────────────────────────────────────────────────
// Colector central de hallazgos IAST.
// Acumula findings en memoria, los persiste en JSON local,
// y los emite en tiempo real via Server-Sent Events (SSE).
// ─────────────────────────────────────────────────────────────────
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { IASTFinding } from './IASTContext';

const REPORTS_DIR = path.join(process.cwd(), 'iast-reports');
const REPORT_FILE = path.join(REPORTS_DIR, 'findings.json');
const MAX_FINDINGS_IN_MEMORY = 500;

export class IASTReporter {
  private static findings: IASTFinding[] = [];
  private static sseClients: Set<Response> = new Set();
  private static initialized = false;

  // ── Inicialización ─────────────────────────────────────────────

  static initialize(): void {
    if (this.initialized) return;
    this.initialized = true;

    // Crear directorio de reportes si no existe
    if (!fs.existsSync(REPORTS_DIR)) {
      fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }

    // Cargar hallazgos previos si existen
    if (fs.existsSync(REPORT_FILE)) {
      try {
        const data = fs.readFileSync(REPORT_FILE, 'utf-8');
        this.findings = JSON.parse(data);
        console.log(`[IAST] 📂 Cargados ${this.findings.length} hallazgos previos`);
      } catch {
        this.findings = [];
      }
    }

    console.log('[IAST] 📊 Reporter inicializado');
  }

  // ── Registro de hallazgos ──────────────────────────────────────

  static addFinding(finding: IASTFinding): void {
    // Evitar duplicados exactos (mismo tipo + path + evidence en los últimos 50)
    const recentFindings = this.findings.slice(-50);
    const isDuplicate = recentFindings.some(
      f =>
        f.type === finding.type &&
        f.path === finding.path &&
        f.evidence === finding.evidence
    );
    if (isDuplicate) return;

    // Limitar memoria
    if (this.findings.length >= MAX_FINDINGS_IN_MEMORY) {
      this.findings = this.findings.slice(-MAX_FINDINGS_IN_MEMORY + 1);
    }

    this.findings.push(finding);

    // Log en consola con color según severidad
    const colors: Record<string, string> = {
      CRITICAL: '\x1b[41m\x1b[37m', // Fondo rojo
      HIGH:     '\x1b[31m',          // Rojo
      MEDIUM:   '\x1b[33m',          // Amarillo
      LOW:      '\x1b[36m',          // Cyan
      INFO:     '\x1b[34m',          // Azul
    };
    const reset = '\x1b[0m';
    const color = colors[finding.severity] || '';
    console.log(
      `[IAST] ${color}[${finding.severity}]${reset} ${finding.type} | ${finding.module} | ${finding.path}`
    );

    // Persistir en archivo (async, sin bloquear)
    this.persistFindings();

    // Emitir a clientes SSE conectados
    this.broadcastFinding(finding);
  }

  // ── Colecta findings de una request completa ───────────────────

  static collectFromRequest(findings: IASTFinding[]): void {
    findings.forEach(f => this.addFinding(f));
  }

  // ── Persistencia en disco ──────────────────────────────────────

  private static persistFindings(): void {
    try {
      fs.writeFileSync(REPORT_FILE, JSON.stringify(this.findings, null, 2), 'utf-8');
    } catch (err) {
      console.error('[IAST] Error persistiendo hallazgos:', err);
    }
  }

  // ── SSE: emisión en tiempo real ────────────────────────────────

  static addSSEClient(res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Render/Nginx
    res.flushHeaders();

    this.sseClients.add(res);
    console.log(`[IAST] 🔌 Cliente SSE conectado (total: ${this.sseClients.size})`);

    // Enviar hallazgos existentes al nuevo cliente
    const init = JSON.stringify({ type: 'init', findings: this.findings });
    res.write(`data: ${init}\n\n`);

    // Mantener conexión viva
    const keepAlive = setInterval(() => {
      if (!res.writableEnded) {
        res.write(': keep-alive\n\n');
      } else {
        clearInterval(keepAlive);
      }
    }, 25000);

    // Limpiar cuando el cliente desconecta
    res.on('close', () => {
      clearInterval(keepAlive);
      this.sseClients.delete(res);
      console.log(`[IAST] 🔌 Cliente SSE desconectado (total: ${this.sseClients.size})`);
    });
  }

  private static broadcastFinding(finding: IASTFinding): void {
    if (this.sseClients.size === 0) return;

    const payload = JSON.stringify({ type: 'finding', finding });
    const deadClients: Response[] = [];

    this.sseClients.forEach(client => {
      if (client.writableEnded) {
        deadClients.push(client);
      } else {
        client.write(`data: ${payload}\n\n`);
      }
    });

    deadClients.forEach(c => this.sseClients.delete(c));
  }

  // ── Getters para el endpoint REST del dashboard ────────────────

  static getAllFindings(): IASTFinding[] {
    return [...this.findings].reverse(); // Más recientes primero
  }

  static getSummary() {
    const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
    const byModule: Record<string, number> = {};
    const byType: Record<string, number> = {};

    this.findings.forEach(f => {
      counts[f.severity] = (counts[f.severity] || 0) + 1;
      byModule[f.module] = (byModule[f.module] || 0) + 1;
      byType[f.type] = (byType[f.type] || 0) + 1;
    });

    return {
      total: this.findings.length,
      bySeverity: counts,
      byModule,
      byType,
      lastFinding: this.findings[this.findings.length - 1]?.timestamp || null,
      activeSSEClients: this.sseClients.size,
    };
  }

  static clearFindings(): void {
    this.findings = [];
    this.persistFindings();
    this.broadcastFinding({
      id: 'clear',
      timestamp: new Date().toISOString(),
      severity: 'INFO',
      type: 'Hallazgos limpiados',
      module: 'Sistema',
      method: 'SYSTEM',
      path: '/iast/clear',
      description: 'Todos los hallazgos fueron eliminados manualmente.',
      evidence: '',
      remediation: '',
    });
    console.log('[IAST] 🗑️  Hallazgos limpiados');
  }
}