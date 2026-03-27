// src/iast/IASTMiddleware.ts
// ─────────────────────────────────────────────────────────────────
// Middleware Express del agente IAST.
// 1. Crea el contexto AsyncLocalStorage por request
// 2. Extrae y marca como contaminados todos los inputs del usuario
// 3. Al finalizar la response, colecta hallazgos y los reporta
// 4. Expone endpoints /iast/* protegidos con token secreto
// ─────────────────────────────────────────────────────────────────
import { Request, Response, NextFunction, Router } from 'express';
import {
  iastStorage,
  IASTRequestContext,
  generateRequestId,
  taintValue,
  getCurrentContext,
} from './IASTContext';
import {
  instrumentPool,
  analyzeResponseHeaders,
  analyzeAuthRequest,
} from './IASTAgent';
import { IASTReporter } from './IASTReporter';
import pool from '../config/database';

// ── Rutas que omitimos para no saturar el dashboard ───────────────
const SKIP_PATHS = [
  '/api/health',
  '/api/db-test',
  '/api/test',
  '/iast/',
  '/api/metrics',
  '/_next/',
  '/favicon',
];

function shouldSkip(path: string): boolean {
  return SKIP_PATHS.some(skip => path.startsWith(skip));
}

// ── Extrae y tainta todos los inputs del usuario ──────────────────
function extractAndTaintInputs(req: Request): void {
  if (req.body && typeof req.body === 'object') {
    const taintObject = (obj: Record<string, any>, prefix = '') => {
      Object.entries(obj).forEach(([key, value]) => {
        if (typeof value === 'string' && value.length > 0 && value.length < 1000) {
          taintValue(value, 'body', prefix ? `${prefix}.${key}` : key);
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          taintObject(value, key);
        } else if (Array.isArray(value)) {
          value.forEach((v, i) => {
            if (typeof v === 'string') taintValue(v, 'body', `${key}[${i}]`);
          });
        }
      });
    };
    taintObject(req.body);
  }

  if (req.query && typeof req.query === 'object') {
    Object.entries(req.query).forEach(([key, value]) => {
      if (typeof value === 'string' && value.length > 0) {
        taintValue(value, 'query', key);
      }
    });
  }

  if (req.params && typeof req.params === 'object') {
    Object.entries(req.params).forEach(([key, value]) => {
      if (typeof value === 'string' && value.length > 0) {
        taintValue(value, 'params', key);
      }
    });
  }

  const relevantHeaders = ['user-agent', 'referer', 'x-forwarded-for', 'x-real-ip'];
  relevantHeaders.forEach(header => {
    const val = req.headers[header];
    if (typeof val === 'string' && val.length > 0) {
      taintValue(val, 'headers', header);
    }
  });

  if (req.cookies && typeof req.cookies === 'object') {
    Object.entries(req.cookies).forEach(([key, value]) => {
      if (typeof value === 'string' && value.length > 0 && value.length < 500) {
        taintValue(value, 'cookies', key);
      }
    });
  }
}

// ── Middleware principal IAST ─────────────────────────────────────
export function iastMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (shouldSkip(req.path)) {
    return next();
  }

  const context: IASTRequestContext = {
    requestId: generateRequestId(),
    method: req.method,
    path: req.path,
    ip: req.ip || req.socket.remoteAddress || 'unknown',
    startTime: Date.now(),
    taintedValues: new Map(),
    findings: [],
  };

  iastStorage.run(context, () => {
    extractAndTaintInputs(req);

    if (req.path.includes('/auth') || req.path.includes('/login')) {
      analyzeAuthRequest(req.path, req.method, req.body || {}, req.headers as any);
    }

    const originalEnd = res.end.bind(res);
    (res as any).end = function (...args: any[]) {
      try {
        const headers = res.getHeaders() as Record<string, string | string[] | undefined>;
        analyzeResponseHeaders(headers, req.path, req.method);
        const ctx = getCurrentContext();
        if (ctx && ctx.findings.length > 0) {
          IASTReporter.collectFromRequest(ctx.findings);
        }
      } catch (err) {
        console.error('[IAST] Error al finalizar análisis:', err);
      }
      return originalEnd(...args);
    };

    next();
  });
}

// ── Guard de autenticación IAST ───────────────────────────────────
// Variable requerida: IAST_SECRET_TOKEN en .env / Render Environment
// Acepta token en: ?token=xxx  O  header X-IAST-Token: xxx
function iastAuthGuard(req: Request, res: Response, next: NextFunction): void {
  const secretToken = process.env.IAST_SECRET_TOKEN;

  if (!secretToken) {
    res.status(503).json({
      success: false,
      error: 'IAST no disponible. Configura IAST_SECRET_TOKEN en las variables de entorno de Render.',
    });
    return;
  }

  const provided =
    (req.query.token as string | undefined) ||
    (req.headers['x-iast-token'] as string | undefined);

  if (!provided || provided !== secretToken) {
    if (req.path === '/dashboard' || req.path === '/') {
      res.status(401).send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>IAST — Acceso restringido</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:system-ui,sans-serif;background:#0f1117;color:#e2e8f0;
         display:flex;align-items:center;justify-content:center;min-height:100vh}
    .box{background:#1a1d2e;border:1px solid #2d3748;border-radius:12px;
         padding:40px;text-align:center;max-width:380px;width:90%}
    h2{color:#f59e0b;margin-bottom:8px;font-size:20px}
    p{color:#718096;font-size:13px;margin-bottom:24px}
    input{width:100%;padding:10px 14px;background:#0f1117;border:1px solid #2d3748;
          border-radius:8px;color:#e2e8f0;font-size:14px;box-sizing:border-box;margin-bottom:12px}
    button{width:100%;padding:10px;background:#f59e0b;color:#000;border:none;
           border-radius:8px;font-size:14px;font-weight:600;cursor:pointer}
    button:hover{background:#d97706}
  </style>
</head>
<body>
  <div class="box">
    <h2>🛡️ IAST Dashboard</h2>
    <p>Joyería Diana Laura · Acceso restringido</p>
    <input type="password" id="tok" placeholder="Token de acceso"
           onkeydown="if(event.key==='Enter') go()"/>
    <button onclick="go()">Acceder</button>
  </div>
  <script>
    function go() {
      const t = document.getElementById('tok').value.trim();
      if (t) window.location.href = '/iast/dashboard?token=' + encodeURIComponent(t);
    }
  </script>
</body>
</html>`);
      return;
    }
    res.status(401).json({ success: false, error: 'Token IAST inválido o no proporcionado.' });
    return;
  }

  next();
}

// ── Router del dashboard IAST ─────────────────────────────────────
export function createIASTRouter(): Router {
  const router = Router();

  // Guard aplicado a TODAS las rutas /iast/*
  router.use(iastAuthGuard);

  // GET /iast/stream — SSE en tiempo real
  router.get('/stream', (_req: Request, res: Response) => {
    IASTReporter.addSSEClient(res);
  });

  // GET /iast/findings — hallazgos en JSON
  router.get('/findings', (req: Request, res: Response) => {
    const { severity, module: mod, type, limit } = req.query;
    let findings = IASTReporter.getAllFindings();
    if (severity) findings = findings.filter(f => f.severity === severity);
    if (mod)      findings = findings.filter(f => f.module === String(mod));
    if (type)     findings = findings.filter(f => f.type.toLowerCase().includes(String(type).toLowerCase()));
    if (limit)    findings = findings.slice(0, parseInt(String(limit)));
    res.json({ success: true, total: findings.length, findings });
  });

  // GET /iast/summary — resumen ejecutivo
  router.get('/summary', (_req: Request, res: Response) => {
    res.json({ success: true, summary: IASTReporter.getSummary() });
  });

  // DELETE /iast/findings — limpiar hallazgos
  router.delete('/findings', (_req: Request, res: Response) => {
    IASTReporter.clearFindings();
    res.json({ success: true, message: 'Hallazgos eliminados' });
  });

  // GET /iast/dashboard — panel HTML (token inyectado para el stream SSE)
  router.get('/dashboard', (req: Request, res: Response) => {
    const token = (req.query.token as string) || '';
    res.setHeader('Content-Type', 'text/html');
    res.send(getDashboardHTML(token));
  });

  return router;
}

// ── Inicialización del agente IAST ────────────────────────────────
export function initializeIAST(): void {
  IASTReporter.initialize();
  instrumentPool(pool);
  console.log('[IAST] Agente IAST inicializado y activo');
  console.log('[IAST] Dashboard: /iast/dashboard');
  console.log('[IAST] SSE stream: /iast/stream');
}

// ── Dashboard HTML ────────────────────────────────────────────────
function getDashboardHTML(token: string): string {
  const safeToken = token.replace(/['"<>&]/g, (c: string) =>
    ({ "'": '&#39;', '"': '&quot;', '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] ?? c)
  );

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>IAST Dashboard - Joyeria Diana Laura</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:system-ui,sans-serif;background:#0f1117;color:#e2e8f0;min-height:100vh}
  header{background:#1a1d2e;border-bottom:1px solid #2d3748;padding:16px 24px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100}
  header h1{font-size:18px;font-weight:600;color:#fff}
  header h1 span{color:#f59e0b}
  .badge-live{background:#ef4444;color:#fff;font-size:10px;padding:2px 8px;border-radius:9999px;animation:pulse 2s infinite;font-weight:600}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.6}}
  .stats{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;padding:20px 24px}
  .stat{background:#1a1d2e;border:1px solid #2d3748;border-radius:10px;padding:16px;text-align:center}
  .stat .num{font-size:28px;font-weight:700}
  .stat .lbl{font-size:11px;color:#718096;margin-top:4px;text-transform:uppercase;letter-spacing:.05em}
  .crit{color:#ef4444}.high{color:#f97316}.med{color:#f59e0b}.low{color:#38bdf8}.info{color:#a78bfa}
  .controls{padding:0 24px 16px;display:flex;gap:10px;flex-wrap:wrap;align-items:center}
  .controls select,.controls button{background:#1a1d2e;border:1px solid #2d3748;color:#e2e8f0;padding:7px 14px;border-radius:7px;font-size:13px;cursor:pointer}
  .controls button:hover{background:#2d3748}
  .controls button.danger{border-color:#ef4444;color:#ef4444}
  .status-dot{width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:6px}
  .dot-green{background:#22c55e;animation:pulse 1.5s infinite}.dot-red{background:#ef4444}
  #findings{padding:0 24px 24px;display:flex;flex-direction:column;gap:10px;max-height:65vh;overflow-y:auto}
  .finding{background:#1a1d2e;border:1px solid #2d3748;border-radius:10px;padding:16px;border-left:4px solid #2d3748;transition:transform .15s}
  .finding:hover{transform:translateX(3px)}
  .finding.CRITICAL{border-left-color:#ef4444}
  .finding.HIGH{border-left-color:#f97316}
  .finding.MEDIUM{border-left-color:#f59e0b}
  .finding.LOW{border-left-color:#38bdf8}
  .finding.INFO{border-left-color:#a78bfa}
  .finding-header{display:flex;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap}
  .severity-badge{font-size:10px;padding:2px 8px;border-radius:4px;font-weight:700;letter-spacing:.05em}
  .sev-CRITICAL{background:#450a0a;color:#f87171}
  .sev-HIGH{background:#431407;color:#fb923c}
  .sev-MEDIUM{background:#422006;color:#fbbf24}
  .sev-LOW{background:#0c1a2e;color:#38bdf8}
  .sev-INFO{background:#1e1b4b;color:#a78bfa}
  .finding-type{font-size:14px;font-weight:600;color:#fff;flex:1}
  .finding-time{font-size:11px;color:#4a5568;white-space:nowrap}
  .finding-meta{display:flex;gap:16px;margin-bottom:8px;flex-wrap:wrap}
  .meta-item{font-size:12px;color:#718096}
  .meta-item span{color:#a0aec0}
  .finding-desc{font-size:13px;color:#cbd5e0;margin-bottom:8px;line-height:1.5}
  .evidence{background:#0d1117;border:1px solid #2d3748;border-radius:6px;padding:10px;font-family:monospace;font-size:11px;color:#68d391;word-break:break-all;margin-bottom:8px}
  .remediation{background:#0a1628;border:1px solid #1e3a5f;border-radius:6px;padding:10px;font-size:12px;color:#90cdf4;line-height:1.5}
  .remediation strong{color:#60a5fa;display:block;margin-bottom:4px}
  .taint-info{font-size:11px;color:#d69e2e;background:#1a1400;border:1px solid #2d2200;border-radius:4px;padding:4px 8px;display:inline-block;margin-bottom:8px}
  #empty{text-align:center;color:#4a5568;padding:60px 24px;font-size:15px}
  #empty h3{font-size:20px;margin-bottom:8px;color:#718096}
  .new-finding{animation:slideIn .3s ease}
  @keyframes slideIn{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
</style>
</head>
<body>
<header>
  <div>
    <h1>IAST Dashboard - <span>Joyeria Diana Laura</span></h1>
    <div style="font-size:12px;color:#718096;margin-top:2px">Interactive Application Security Testing - Tiempo real</div>
  </div>
  <div style="display:flex;align-items:center;gap:12px">
    <span id="conn-status"><span class="status-dot dot-red" id="dot"></span><span id="conn-label">Conectando...</span></span>
    <span class="badge-live">LIVE</span>
  </div>
</header>

<div class="stats">
  <div class="stat"><div class="num crit" id="count-CRITICAL">0</div><div class="lbl">Criticos</div></div>
  <div class="stat"><div class="num high" id="count-HIGH">0</div><div class="lbl">Altos</div></div>
  <div class="stat"><div class="num med"  id="count-MEDIUM">0</div><div class="lbl">Medios</div></div>
  <div class="stat"><div class="num low"  id="count-LOW">0</div><div class="lbl">Bajos</div></div>
  <div class="stat"><div class="num info" id="count-INFO">0</div><div class="lbl">Info</div></div>
</div>

<div class="controls">
  <label style="font-size:13px;color:#718096">Filtrar:</label>
  <select id="filter-severity" onchange="applyFilters()">
    <option value="">Todas las severidades</option>
    <option value="CRITICAL">Critico</option>
    <option value="HIGH">Alto</option>
    <option value="MEDIUM">Medio</option>
    <option value="LOW">Bajo</option>
    <option value="INFO">Info</option>
  </select>
  <select id="filter-module" onchange="applyFilters()">
    <option value="">Todos los modulos</option>
    <option value="Auth / Login">Auth / Login</option>
    <option value="Inventario / Productos">Inventario / Productos</option>
    <option value="Usuarios">Usuarios</option>
    <option value="Panel Admin">Panel Admin</option>
    <option value="Carrito">Carrito</option>
  </select>
  <button onclick="clearFindings()" class="danger">Limpiar</button>
  <button onclick="exportFindings()">Exportar JSON</button>
  <span style="margin-left:auto;font-size:12px;color:#4a5568" id="total-label">0 hallazgos</span>
</div>

<div id="findings">
  <div id="empty">
    <h3>Esperando trafico...</h3>
    <p>Usa el sistema normalmente y los hallazgos IAST apareceran aqui en tiempo real.</p>
  </div>
</div>

<script>
var TOKEN = '${safeToken}';
var allFindings = [];
var es;

function connect() {
  es = new EventSource('/iast/stream?token=' + encodeURIComponent(TOKEN));
  es.onopen = function() {
    document.getElementById('dot').className = 'status-dot dot-green';
    document.getElementById('conn-label').textContent = 'Conectado';
  };
  es.onmessage = function(e) {
    var data = JSON.parse(e.data);
    if (data.type === 'init') {
      allFindings = data.findings || [];
      renderAll();
    } else if (data.type === 'finding') {
      allFindings.unshift(data.finding);
      updateStats();
      renderFinding(data.finding, true);
      document.getElementById('empty').style.display = 'none';
    }
  };
  es.onerror = function() {
    document.getElementById('dot').className = 'status-dot dot-red';
    document.getElementById('conn-label').textContent = 'Reconectando...';
    setTimeout(connect, 3000);
  };
}

function updateStats() {
  ['CRITICAL','HIGH','MEDIUM','LOW','INFO'].forEach(function(s) {
    document.getElementById('count-'+s).textContent =
      allFindings.filter(function(f){ return f.severity === s; }).length;
  });
  document.getElementById('total-label').textContent = allFindings.length + ' hallazgos';
}

function getFiltered() {
  var sev = document.getElementById('filter-severity').value;
  var mod = document.getElementById('filter-module').value;
  return allFindings.filter(function(f){
    return (!sev || f.severity === sev) && (!mod || f.module === mod);
  });
}

function applyFilters() {
  document.querySelectorAll('.finding').forEach(function(el){ el.remove(); });
  getFiltered().forEach(function(f){ renderFinding(f, false); });
  document.getElementById('empty').style.display = getFiltered().length ? 'none' : 'block';
}

function renderAll() {
  updateStats();
  document.querySelectorAll('.finding').forEach(function(el){ el.remove(); });
  allFindings.forEach(function(f){ renderFinding(f, false); });
  document.getElementById('empty').style.display = allFindings.length ? 'none' : 'block';
}

function renderFinding(f, isNew) {
  var sev = document.getElementById('filter-severity').value;
  var mod = document.getElementById('filter-module').value;
  if (sev && f.severity !== sev) return;
  if (mod && f.module !== mod) return;

  var container = document.getElementById('findings');
  var div = document.createElement('div');
  div.className = 'finding ' + f.severity + (isNew ? ' new-finding' : '');
  var time = new Date(f.timestamp).toLocaleTimeString('es-MX');
  var taintHtml = f.taintSource
    ? '<div class="taint-info">Taint: ' + f.taintSource.source + '.' + f.taintSource.field +
      ' = "' + String(f.taintSource.value).slice(0,60) + '"</div>'
    : '';

  div.innerHTML =
    '<div class="finding-header">' +
      '<span class="severity-badge sev-' + f.severity + '">' + f.severity + '</span>' +
      '<span class="finding-type">' + f.type + '</span>' +
      '<span class="finding-time">' + time + '</span>' +
    '</div>' +
    '<div class="finding-meta">' +
      '<div class="meta-item">Modulo: <span>' + f.module + '</span></div>' +
      '<div class="meta-item">Ruta: <span>' + f.method + ' ' + f.path + '</span></div>' +
    '</div>' +
    '<div class="finding-desc">' + f.description + '</div>' +
    taintHtml +
    '<div class="evidence">' + (f.evidence || 'Sin evidencia') + '</div>' +
    '<div class="remediation"><strong>Remediacion:</strong>' + f.remediation + '</div>';

  if (isNew) {
    container.insertBefore(div, container.firstChild);
  } else {
    container.appendChild(div);
  }
}

function clearFindings() {
  if (!confirm('Eliminar todos los hallazgos?')) return;
  fetch('/iast/findings?token=' + encodeURIComponent(TOKEN), { method: 'DELETE' })
    .then(function(){ allFindings = []; renderAll(); });
}

function exportFindings() {
  var blob = new Blob([JSON.stringify(getFiltered(), null, 2)], { type: 'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'iast-findings-' + Date.now() + '.json';
  a.click();
}

connect();
</script>
</body>
</html>`;
}