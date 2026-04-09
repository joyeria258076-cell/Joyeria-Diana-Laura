// src/iast/IASTMiddleware.ts
import { Request, Response, NextFunction, Router } from 'express';
import {
  iastStorage,
  IASTRequestContext,
  generateRequestId,
  taintValue,
  getCurrentContext,
  detectModule,
} from './IASTContext';
import {
  instrumentPool,
  analyzeResponseHeaders,
  analyzeAuthRequest,
} from './IASTAgent';
import { IASTReporter } from './IASTReporter';
import pool from '../config/database';

// MODULE_GROUPS (objeto con grupos y sus pantallas)
const MODULE_GROUPS = {
  'Publico': [
    'InicioPublicScreen', 'CatalogoPublicScreen', 'ProductoDetallePublicScreen',
    'NoticiasScreen', 'ContactoPublicScreen', 'UbicacionPublicScreen', 'AyudaPublicScreen'
  ],
  'Auth': [
    'LoginScreen', 'RegistroScreen', 'OlvideContraseniaScreen',
    'ReiniciarContraseniaScreen', 'RecuperarConPreguntaScreen', 'MFAVerifyScreen'
  ],
  'Cliente': [
    'InicioScreen', 'CatalogoScreen', 'ProductoDetalleScreen', 'CarritoScreen',
    'ClientePedidosScreen', 'PerfilScreen', 'SobreNosotros', 'ContactoScreen',
    'UbicacionScreen', 'AyudaScreen', 'MFASetupScreen', 'ConfiguracionScreen'
  ],
  'Admin': [
    'AdminDashboardScreen', 'AdminInventarioScreen', 'AdminNuevoProductoScreen',
    'AdminEditarProductoScreen', 'AdminProductoDetalleScreen', 'AdminCategoriasScreen',
    'AdminTrabajadoresScreen', 'AdminAltaTrabajadorForm', 'AdminEditarTrabajadorScreen',
    'AdminReportesScreen', 'AdminPrediccionScreen', 'AdminPerfilScreen'
  ],
  'AdminBaseDatos': [
    'AdminDatabaseScreen', 'AdminBackupsScreen', 'AdminImportExportScreen',
    'AdminSimpleImportScreen', 'AdminExportScreen', 'AdminBulkUpdateScreen',
    'AdminAutomationScreen', 'AdminMonitoreoScreen'
  ],
  'AdminContenido': [
    'AdminContentManagerScreen', 'AdminPageManagementScreen', 'AdminSectionManagementScreen',
    'AdminPageContentInitialScreen', 'AdminPageContentNoticiasScreen',
    'AdminContentInfoScreen', 'AdminContentFAQScreen', 'AdminContentMisionScreen'
  ],
  'AdminConfiguracion': [
    'AdminVariablesConfigScreen'
  ],
  'AdminProveedores': [
    'AdminProveedoresScreen', 'AdminNuevoProveedorScreen',
    'AdminEditarProveedorScreen', 'AdminProveedorDetalleScreen'
  ],
  'Trabajador': [
    'DashboardTrabajadorScreen', 'GestionPedidosScreen', 'ActividadesTrabajadorScreen'
  ],
  'BackendRoutes': [
    'authRoutes', 'userRoutes', 'productRoutes', 'carritoRoutes', 'adminRoutes',
    'proveedoresRoutes', 'backupRoutes', 'exportRoutes', 'importRoutes',
    'bulkUpdateRoutes', 'predictiveRoutes', 'securityQuestionRoutes',
    'adminContentRoutes', 'uploadRoutes', 'configuracionRoutes', 'templateRoutes'
  ],
  'BackendServices': [
    'JWTService', 'MFAService', 'SessionService', 'loginSecurityService',
    'EmailValidationService', 'cloudinaryService', 'BackupSchedulerService',
    'exportService', 'excelImportService', 'firestoreService', 'recoverySecurityService'
  ],
  'BackendMiddleware': [
    'authMiddleware', 'roleMiddleware', 'metricsMiddleware',
    'activityMiddleware', 'uploadMiddleware'
  ]
};

const SKIP_PATHS = ['/api/health', '/api/db-test', '/api/test', '/iast/', '/api/metrics', '/_next/', '/favicon'];
function shouldSkip(path: string): boolean {
  return SKIP_PATHS.some(skip => path.startsWith(skip));
}

function extractAndTaintInputs(req: Request): void {
  if (req.body && typeof req.body === 'object') {
    const taintObject = (obj: Record<string, any>, prefix = '') => {
      Object.entries(obj).forEach(([key, value]) => {
        if (typeof value === 'string' && value.length > 0 && value.length < 1000) {
          taintValue(value, 'body', prefix ? `${prefix}.${key}` : key);
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          taintObject(value, key);
        } else if (Array.isArray(value)) {
          value.forEach((v, i) => { if (typeof v === 'string') taintValue(v, 'body', `${key}[${i}]`); });
        }
      });
    };
    taintObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    Object.entries(req.query).forEach(([key, value]) => { if (typeof value === 'string' && value.length > 0) taintValue(value, 'query', key); });
  }
  if (req.params && typeof req.params === 'object') {
    Object.entries(req.params).forEach(([key, value]) => { if (typeof value === 'string' && value.length > 0) taintValue(value, 'params', key); });
  }
  const relevantHeaders = ['user-agent', 'referer', 'x-forwarded-for', 'x-real-ip'];
  relevantHeaders.forEach(header => {
    const val = req.headers[header];
    if (typeof val === 'string' && val.length > 0) taintValue(val, 'headers', header);
  });
  if (req.cookies && typeof req.cookies === 'object') {
    Object.entries(req.cookies).forEach(([key, value]) => {
      if (typeof value === 'string' && value.length > 0 && value.length < 500) taintValue(value, 'cookies', key);
    });
  }
}

export function iastMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (shouldSkip(req.path)) return next();
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
    // Registrar actividad del módulo
    const moduleName = detectModule(req.path);
    IASTReporter.recordModuleActivity(moduleName);
    console.log(`[IAST MIDDLEWARE] Actividad para ruta ${req.path} → módulo ${moduleName}`);

    // Rutas compartidas: registrar actividad adicional en Trabajador
    if (req.path.startsWith('/api/carrito')) {
      IASTReporter.recordModuleActivity('Trabajador');
    }
    if (req.path.startsWith('/api/auth/validate-session') ||
        req.path.startsWith('/api/auth/update-activity')) {
      IASTReporter.recordModuleActivity('Trabajador');
      IASTReporter.recordModuleActivity('Admin');
      IASTReporter.recordModuleActivity('Cliente');
    }

    if (req.path.includes('/auth') || req.path.includes('/login')) {
      analyzeAuthRequest(req.path, req.method, req.body || {}, req.headers as any);
    }
    const originalEnd = res.end.bind(res);
    (res as any).end = function (...args: any[]) {
      try {
        const headers = res.getHeaders() as Record<string, string | string[] | undefined>;
        analyzeResponseHeaders(headers, req.path, req.method);
        const ctx = getCurrentContext();
        if (ctx && ctx.findings.length > 0) IASTReporter.collectFromRequest(ctx.findings);
      } catch (err) { console.error('[IAST] Error al finalizar análisis:', err); }
      return originalEnd(...args);
    };
    next();
  });
}

function iastAuthGuard(req: Request, res: Response, next: NextFunction): void {
  const secretToken = process.env.IAST_SECRET_TOKEN;
  if (!secretToken) {
    res.status(503).json({ success: false, error: 'IAST no disponible. Configura IAST_SECRET_TOKEN.' });
    return;
  }
  const provided = (req.query.token as string) || (req.headers['x-iast-token'] as string);
  if (!provided || provided !== secretToken) {
    if (req.path === '/dashboard' || req.path === '/') {
      res.status(401).send(`<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>IAST — Acceso restringido</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui;background:#0f1117;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh}.box{background:#1a1d2e;border:1px solid #2d3748;border-radius:12px;padding:40px;text-align:center;max-width:380px;width:90%}h2{color:#f59e0b;margin-bottom:8px}p{color:#718096;margin-bottom:24px}input{width:100%;padding:10px;background:#0f1117;border:1px solid #2d3748;border-radius:8px;color:#e2e8f0;margin-bottom:12px}button{width:100%;padding:10px;background:#f59e0b;color:#000;border:none;border-radius:8px;font-weight:600;cursor:pointer}</style>
</head>
<body><div class="box"><h2>🛡️ IAST Dashboard</h2><p>Joyería Diana Laura · Acceso restringido</p><input type="password" id="tok" placeholder="Token de acceso" onkeydown="if(event.key==='Enter') go()"/><button onclick="go()">Acceder</button></div>
<script>function go(){const t=document.getElementById('tok').value.trim();if(t)window.location.href='/iast/dashboard?token='+encodeURIComponent(t);}</script>
</body></html>`);
      return;
    }
    res.status(401).json({ success: false, error: 'Token IAST inválido.' });
    return;
  }
  next();
}

export function createIASTRouter(): Router {
  const router = Router();
  router.use(iastAuthGuard);
  router.get('/stream', (_req, res) => IASTReporter.addSSEClient(res));
  router.get('/findings', (req, res) => {
    const { severity, module: mod, type, limit } = req.query;
    let findings = IASTReporter.getAllFindings();
    if (severity) findings = findings.filter(f => f.severity === severity);
    if (mod) findings = findings.filter(f => f.module === String(mod));
    if (type) findings = findings.filter(f => f.type.toLowerCase().includes(String(type).toLowerCase()));
    if (limit) findings = findings.slice(0, Number.parseInt(String(limit)));
    res.json({ success: true, total: findings.length, findings });
  });
  router.get('/summary', (_req, res) => res.json({ success: true, summary: IASTReporter.getSummary() }));
  router.delete('/findings', (_req, res) => { IASTReporter.clearFindings(); res.json({ success: true, message: 'Hallazgos eliminados' }); });
  router.get('/dashboard', (req, res) => {
    const token = (req.query.token as string) || '';
    res.setHeader('Content-Type', 'text/html');
    res.send(getDashboardHTML(token));
  });
  return router;
}

export function initializeIAST(): void {
  IASTReporter.initialize();
  instrumentPool(pool);
  console.log('[IAST] Agente IAST inicializado y activo');
  console.log('[IAST] Dashboard: /iast/dashboard');
  console.log('[IAST] SSE stream: /iast/stream');
}

function getDashboardHTML(token: string): string {
  const safeTokenJSON = JSON.stringify(token).replace(/<\//g, '<\\/');
  const moduleGroupsJSON = JSON.stringify(MODULE_GROUPS).replace(/<\//g, '<\\/');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>IAST Dashboard - Joyeria Diana Laura</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;background:#0f1117;color:#e2e8f0;min-height:100vh}
  header{background:#1a1d2e;border-bottom:1px solid #2d3748;padding:16px 24px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100}
  header h1{font-size:18px;font-weight:600;color:#fff}header h1 span{color:#f59e0b}
  .badge-live{background:#ef4444;color:#fff;font-size:10px;padding:2px 8px;border-radius:9999px;animation:pulse 2s infinite}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.6}}
  .stats{display:grid;grid-template-columns:repeat(6,1fr);gap:12px;padding:20px 24px}
  .stat{background:#1a1d2e;border:1px solid #2d3748;border-radius:10px;padding:16px;text-align:center}
  .stat .num{font-size:28px;font-weight:700}.stat .lbl{font-size:11px;color:#718096;margin-top:4px;text-transform:uppercase}
  .crit{color:#ef4444}.high{color:#f97316}.med{color:#f59e0b}.low{color:#38bdf8}.info{color:#a78bfa}.resolved{color:#10b981}
  .controls{padding:0 24px 16px;display:flex;gap:10px;flex-wrap:wrap;align-items:center}
  .controls select,.controls button{background:#1a1d2e;border:1px solid #2d3748;color:#e2e8f0;padding:7px 14px;border-radius:7px;font-size:13px;cursor:pointer}
  .controls button.danger{border-color:#ef4444;color:#ef4444}
  .status-dot{width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:6px}
  .dot-green{background:#22c55e;animation:pulse 1.5s infinite}.dot-red{background:#ef4444}
  .tabs{display:flex;gap:8px;margin:0 24px 20px;border-bottom:1px solid #2d3748}
  .tab{background:transparent;border:none;padding:10px 20px;color:#a0aec0;font-size:14px;font-weight:600;cursor:pointer}
  .tab.active{color:#f59e0b;border-bottom:2px solid #f59e0b}
  .modules-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:20px;padding:0 24px 24px}
  .module-group{background:#1a1d2e;border:1px solid #2d3748;border-radius:10px;overflow:hidden}
  .module-header{cursor:pointer;user-select:none;display:flex;align-items:center;gap:8px;padding:12px}
  .arrow{font-size:14px;transition:transform 0.2s;display:inline-block}
  .arrow.rotated{transform:rotate(90deg)}
  .submodules{display:none;margin-top:8px;padding-left:24px;border-left:1px solid #2d3748}
  .submodules.show{display:block}
  .submodule-item{display:flex;justify-content:space-between;align-items:center;padding:6px 8px;border-bottom:1px solid #1f2937;font-size:12px}
  .submodule-name{font-family:monospace}
  .submodule-badge{background:#4a5568;color:#e2e8f0;padding:2px 6px;border-radius:12px;font-size:10px}
  .activity-dot{display:inline-block;width:12px;height:12px;border-radius:50%;margin-right:8px}
  .active-dot{background-color:#22c55e;box-shadow:0 0 4px #22c55e}
  .inactive-dot{background-color:#4a5568}
  .module-badge{padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;display:inline-block}
  .badge-critical{background:#ef4444;color:#fff}.badge-high{background:#f97316;color:#fff}.badge-medium{background:#f59e0b;color:#000}
  .badge-low{background:#38bdf8;color:#000}.badge-info{background:#a78bfa;color:#fff}.badge-inactive{background:#4a5568;color:#e2e8f0}
  .finding-count{font-size:12px;color:#718096;margin-top:8px}
  #findings,#resolvedList{padding:0 24px 24px;display:flex;flex-direction:column;gap:10px;max-height:65vh;overflow-y:auto}
  .finding{background:#1a1d2e;border:1px solid #2d3748;border-radius:10px;padding:16px;border-left:4px solid #2d3748}
  .finding.CRITICAL{border-left-color:#ef4444}.finding.HIGH{border-left-color:#f97316}.finding.MEDIUM{border-left-color:#f59e0b}
  .finding.LOW{border-left-color:#38bdf8}.finding.INFO{border-left-color:#a78bfa}
  .finding-header{display:flex;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap}
  .severity-badge{font-size:10px;padding:2px 8px;border-radius:4px;font-weight:700}
  .sev-CRITICAL{background:#450a0a;color:#f87171}.sev-HIGH{background:#431407;color:#fb923c}.sev-MEDIUM{background:#422006;color:#fbbf24}
  .sev-LOW{background:#0c1a2e;color:#38bdf8}.sev-INFO{background:#1e1b4b;color:#a78bfa}
  .finding-type{font-size:14px;font-weight:600;color:#fff;flex:1}.finding-time{font-size:11px;color:#4a5568}
  .finding-meta{display:flex;gap:16px;margin-bottom:8px}.meta-item{font-size:12px;color:#718096}
  .finding-desc{font-size:13px;color:#cbd5e0;margin-bottom:8px}
  .evidence{background:#0d1117;border:1px solid #2d3748;border-radius:6px;padding:10px;font-family:monospace;font-size:11px;color:#68d391;word-break:break-all;margin-bottom:8px}
  .remediation{background:#0a1628;border:1px solid #1e3a5f;border-radius:6px;padding:10px;font-size:12px;color:#90cdf4}
  .btn{background:#2d3748;border:none;padding:4px 12px;border-radius:6px;color:#fff;cursor:pointer;font-size:11px;margin-right:8px}
  .btn-resolve{background:#10b981}.btn-reopen{background:#f59e0b}
  .resolved-badge{background:#10b981;color:#fff;padding:2px 8px;border-radius:12px;font-size:10px;margin-left:8px}
  #empty{text-align:center;color:#4a5568;padding:60px 24px}
</style>
</head>
<body>
<header>
  <div><h1>IAST Dashboard - <span>Joyeria Diana Laura</span></h1><div style="font-size:12px;color:#718096">Interactive Application Security Testing - Tiempo real</div></div>
  <div><span id="conn-status"><span class="status-dot dot-red" id="dot"></span><span id="conn-label">Conectando...</span></span><span class="badge-live">LIVE</span></div>
</header>
<div class="stats" id="statsGrid"></div>
<div class="tabs">
  <button class="tab active" data-tab="findings">📋 Hallazgos activos</button>
  <button class="tab" data-tab="modules">📦 Módulos</button>
  <button class="tab" data-tab="resolved">✅ Resueltas</button>
</div>
<div id="findingsTab" class="tab-content">
  <div class="controls">
    <select id="filter-severity"><option value="">Todas</option><option value="CRITICAL">Crítico</option><option value="HIGH">Alto</option><option value="MEDIUM">Medio</option><option value="LOW">Bajo</option><option value="INFO">Info</option></select>
    <select id="filter-module"><option value="">Todos los módulos</option></select>
    <button id="clearBtn" class="danger">Limpiar todo</button>
    <button id="exportBtn">Exportar JSON</button>
    <span id="total-label">0 hallazgos</span>
  </div>
  <div id="findings"></div>
</div>
<div id="modulesTab" class="tab-content" style="display:none"><div id="modulesGrid" class="modules-grid"></div></div>
<div id="resolvedTab" class="tab-content" style="display:none"><div id="resolvedList"></div></div>
<script>
const TOKEN = ${safeTokenJSON};
const MODULE_GROUPS = ${moduleGroupsJSON};
let allFindings = [], resolvedFindings = [], es;
let moduleActivities = {}; // objeto con timestamp de última actividad por grupo
let expandedGroups = {};   // guarda qué grupos están expandidos

function loadResolved() { try { const s = localStorage.getItem('iast_resolved_findings'); resolvedFindings = s ? JSON.parse(s) : []; } catch(e) { resolvedFindings = []; } }
function saveResolved() { localStorage.setItem('iast_resolved_findings', JSON.stringify(resolvedFindings)); }
function resolveFinding(id) {
  const f = allFindings.find(x => x.id === id);
  if (f && !resolvedFindings.some(r => r.id === id)) {
    resolvedFindings.push({...f, resolvedAt: new Date().toISOString()});
    saveResolved();
    allFindings = allFindings.filter(x => x.id !== id);
    renderAll();
    if (getActiveTab() === 'resolved') renderResolved();
  }
}
function reopenFinding(id) {
  const f = resolvedFindings.find(r => r.id === id);
  if (f) {
    resolvedFindings = resolvedFindings.filter(r => r.id !== id);
    saveResolved();
    allFindings.unshift(f);
    renderAll();
    if (getActiveTab() === 'resolved') renderResolved();
  }
}
function getActiveTab() { const a = document.querySelector('.tab.active'); return a ? a.getAttribute('data-tab') : 'findings'; }
function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelector('.tab[data-tab="'+tab+'"]').classList.add('active');
  document.getElementById('findingsTab').style.display = tab === 'findings' ? 'block' : 'none';
  document.getElementById('modulesTab').style.display = tab === 'modules' ? 'block' : 'none';
  document.getElementById('resolvedTab').style.display = tab === 'resolved' ? 'block' : 'none';
  if (tab === 'modules') renderModules();
  if (tab === 'resolved') renderResolved();
}
function computeStats() {
  const c = { CRITICAL:0, HIGH:0, MEDIUM:0, LOW:0, INFO:0, RESUELTAS: resolvedFindings.length };
  allFindings.forEach(f => { if (c[f.severity] !== undefined) c[f.severity]++; });
  return c;
}
function updateStats() {
  const s = computeStats();
  document.getElementById('statsGrid').innerHTML = \`
    <div class="stat"><div class="num crit">\${s.CRITICAL}</div><div class="lbl">Críticos</div></div>
    <div class="stat"><div class="num high">\${s.HIGH}</div><div class="lbl">Altos</div></div>
    <div class="stat"><div class="num med">\${s.MEDIUM}</div><div class="lbl">Medios</div></div>
    <div class="stat"><div class="num low">\${s.LOW}</div><div class="lbl">Bajos</div></div>
    <div class="stat"><div class="num info">\${s.INFO}</div><div class="lbl">Info</div></div>
    <div class="stat"><div class="num resolved">\${s.RESUELTAS}</div><div class="lbl">Resueltas</div></div>
  \`;
  document.getElementById('total-label').innerText = allFindings.length + ' hallazgos activos';
}

// Determina si un grupo tuvo actividad en los últimos 5 minutos (solo tráfico)
function isModuleActive(groupName) {
  const last = moduleActivities[groupName];
  if (!last) return false;
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  return (now - last) < fiveMinutes;
}

// Pestaña Módulos: acordeón con grupos y subpantallas
function renderModules() {
  const container = document.getElementById('modulesGrid');
  if (!container) return;
  let html = '';
  for (const group of Object.keys(MODULE_GROUPS)) {
    const activeFindings = allFindings.filter(f => f.module === group);
    const active = isModuleActive(group);
    const dotClass = active ? 'active-dot' : 'inactive-dot';
    const isInternal = ['BackendRoutes','BackendServices','BackendMiddleware'].includes(group);
    let badgeClass = isInternal ? 'badge-info' : 'badge-inactive';
    let badgeText = isInternal ? 'Solo referencia' : 'Sin actividad';
    let count = 0;
    if (activeFindings.length) {
      const order = { CRITICAL:5, HIGH:4, MEDIUM:3, LOW:2, INFO:1 };
      let maxSev = 'INFO';
      for (const f of activeFindings) if (order[f.severity] > order[maxSev]) maxSev = f.severity;
      badgeClass = 'badge-' + maxSev.toLowerCase();
      const sevNames = { CRITICAL:'Crítico', HIGH:'Alto', MEDIUM:'Medio', LOW:'Bajo', INFO:'Info' };
      badgeText = sevNames[maxSev] || maxSev;
      count = activeFindings.length;
    }
    const activityLabel = active ? 'Activo' : 'Inactivo';

    html += '<div class="module-group">' +
    '<div class="module-header" onclick="toggleGroup(&quot;grp_' + group.replace(/[^a-zA-Z0-9]/g, '_') + '&quot;)">' +
    '<span class="arrow" id="arr_grp_' + group.replace(/[^a-zA-Z0-9]/g, '_') + '">▶</span>' +
      '<span class="activity-dot ' + dotClass + '"></span>' +
        '<strong style="flex:1">' + group + '</strong>' +
        '<span style="font-size:11px;color:#718096;margin-right:8px">' + (count ? count + ' hallazgo' + (count > 1 ? 's' : '') : '') + '</span>' +
        '<span class="module-badge ' + badgeClass + '">' + badgeText + '</span>' +
      '</div>' +
      '<div class="submodules" id="sub_grp_' + group.replace(/[^a-zA-Z0-9]/g, '_') + '">' +
      (isInternal ? '<div style="font-size:11px;color:#4a5568;padding:8px 16px;border-bottom:1px solid #1f2937;font-style:italic">⚙️ Módulo interno — el agente IAST no intercepta estos componentes directamente. su actividad y vulnerabilidades se reportan en los módulos funcionales correspondientes (Auth, Cliente, Admin, etc.). Se listan aquí como referencia de la arquitectura del sistema.</div>' : '');

    // Lista de pantallas hijas
    const screens = MODULE_GROUPS[group];
    for (const screen of screens) {
    html += '<div class="submodule-item">' +
      '<span class="submodule-name">' + screen + '</span>' +
      '</div>';
    }
    html += '</div></div>';
  }
  container.innerHTML = html;
}

function toggleGroup(safeId) {
  var sub = document.getElementById('sub_' + safeId);
  var arr = document.getElementById('arr_' + safeId);
  if (!sub) return;
  var isOpen = sub.classList.contains('show');
  sub.classList.toggle('show', !isOpen);
  if (arr) arr.classList.toggle('rotated', !isOpen);
}

let filterSev = '', filterMod = '';
function renderFindings() {
  const cont = document.getElementById('findings');
  let filtered = allFindings.filter(f => (!filterSev || f.severity === filterSev) && (!filterMod || f.module === filterMod));
  if (!filtered.length) { cont.innerHTML = '<div id="empty"><h3>🌊 Esperando tráfico...</h3><p>Usa el sistema normalmente y los hallazgos IAST aparecerán aquí en tiempo real.</p></div>'; return; }
  let html = '';
  for (const f of filtered) {
    const time = new Date(f.timestamp).toLocaleTimeString('es-MX');
    const taint = f.taintSource ? '<div class="taint-info">Taint: '+f.taintSource.source+'.'+f.taintSource.field+' = "'+String(f.taintSource.value).slice(0,60)+'"</div>' : '';
    html += \`
      <div class="finding \${f.severity}">
        <div class="finding-header"><span class="severity-badge sev-\${f.severity}">\${{CRITICAL:'Crítico',HIGH:'Alto',MEDIUM:'Medio',LOW:'Bajo',INFO:'Info'}[f.severity]||f.severity}</span><span class="finding-type">\${f.type}</span><span class="finding-time">\${time}</span></div>
        <div class="finding-meta"><div class="meta-item">Módulo: <span>\${f.module}</span></div><div class="meta-item">Ruta: <span>\${f.method} \${f.path}</span></div></div>
        <div class="finding-desc">\${f.description}</div>\${taint}<div class="evidence">\${f.evidence || 'Sin evidencia'}</div>
        <div class="remediation"><strong>Remediación:</strong> \${f.remediation}</div>
        <div style="margin-top:10px"><button class="btn btn-resolve" onclick="resolveFinding('\${f.id}')">✅ Marcar como resuelta</button></div>
      </div>
    \`;
  }
  cont.innerHTML = html;
}
function applyFilters() { filterSev = document.getElementById('filter-severity').value; filterMod = document.getElementById('filter-module').value; renderFindings(); }

// Filtro de módulos: muestra TODOS los grupos con su cantidad de hallazgos activos
function updateModuleFilter() {
  const sel = document.getElementById('filter-module');
  sel.innerHTML = '<option value="">Todos los módulos</option>';
  for (const group of Object.keys(MODULE_GROUPS)) {
    const count = allFindings.filter(f => f.module === group).length;
    const label = count ? group + '  (' + count + ')' : group;
    const opt = document.createElement('option');
    opt.value = group;
    opt.textContent = label;
    if (count) { opt.style.fontWeight = 'bold'; opt.style.color = '#a78bfa'; }
    sel.appendChild(opt);
  }
  // También agregar módulos que no estén en MODULE_GROUPS pero tengan hallazgos
  const extraModules = [...new Set(allFindings.map(f => f.module).filter(m => m && !MODULE_GROUPS[m]))];
  for (const mod of extraModules) {
    const count = allFindings.filter(f => f.module === mod).length;
    sel.innerHTML += '<option value="' + mod + '">' + mod + ' (' + count + ')</option>';
  }
}

function renderResolved() {
  const cont = document.getElementById('resolvedList');
  if (!resolvedFindings.length) { cont.innerHTML = '<div id="empty"><h3>✅ No hay hallazgos resueltos</h3></div>'; return; }
  let html = '';
  for (const f of resolvedFindings) {
    const time = new Date(f.timestamp).toLocaleTimeString('es-MX');
    const resolvedTime = new Date(f.resolvedAt).toLocaleString();
    const taint = f.taintSource ? '<div class="taint-info">Taint: '+f.taintSource.source+'.'+f.taintSource.field+' = "'+String(f.taintSource.value).slice(0,60)+'"</div>' : '';
    html += \`
      <div class="finding \${f.severity}">
        <div class="finding-header"><span class="severity-badge sev-\${f.severity}">\${f.severity}</span><span class="finding-type">\${f.type}</span><span class="finding-time">\${time}</span><span class="resolved-badge">✅ Resuelta el \${resolvedTime}</span></div>
        <div class="finding-meta"><div class="meta-item">Módulo: <span>\${f.module}</span></div><div class="meta-item">Ruta: <span>\${f.method} \${f.path}</span></div></div>
        <div class="finding-desc">\${f.description}</div>\${taint}<div class="evidence">\${f.evidence || 'Sin evidencia'}</div>
        <div class="remediation"><strong>Remediación:</strong> \${f.remediation}</div>
        <div><button class="btn btn-reopen" onclick="reopenFinding('\${f.id}')">🔄 Reabrir hallazgo</button></div>
      </div>
    \`;
  }
  cont.innerHTML = html;
}

function renderAll() { updateStats(); renderFindings(); updateModuleFilter(); if (getActiveTab() === 'modules') renderModules(); }

function connect() {
  es = new EventSource('/iast/stream?token=' + encodeURIComponent(TOKEN));
  es.onopen = () => { document.getElementById('dot').className = 'status-dot dot-green'; document.getElementById('conn-label').innerText = 'Conectado'; };
  es.onmessage = (e) => {
    const data = JSON.parse(e.data);
    if (data.type === 'init') {
      const resolvedIds = new Set(resolvedFindings.map(r => r.id));
      allFindings = (data.findings || []).filter(f => !resolvedIds.has(f.id));
      moduleActivities = data.moduleActivities || {};
      renderAll();
      } else if (data.type === 'update') {
        const resolvedIds = new Set(resolvedFindings.map(r => r.id));
        allFindings = (data.findings || []).filter(f => !f.resolved && !resolvedIds.has(f.id));
        moduleActivities = data.moduleActivities || {};
        renderAll();
        } else if (data.type === 'finding') {
          if (!resolvedFindings.some(r => r.id === data.finding.id) && !allFindings.some(f => f.id === data.finding.id)) {
            allFindings.unshift(data.finding);
            if (data.moduleActivities) moduleActivities = data.moduleActivities;
            renderAll();
          }
        }
  };
  es.onerror = () => { document.getElementById('dot').className = 'status-dot dot-red'; document.getElementById('conn-label').innerText = 'Reconectando...'; setTimeout(connect, 3000); };
}
function clearFindings() {
  if (!confirm('Eliminar TODOS los hallazgos activos?')) return;
  fetch('/iast/findings?token=' + encodeURIComponent(TOKEN), { method: 'DELETE' }).then(() => { allFindings = []; renderAll(); });
}
function exportFindings() {
  const blob = new Blob([JSON.stringify({ activos: allFindings, resueltos: resolvedFindings }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'iast-full-'+Date.now()+'.json'; a.click();
}
document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => switchTab(t.getAttribute('data-tab'))));
document.getElementById('filter-severity').addEventListener('change', applyFilters);
document.getElementById('filter-module').addEventListener('change', applyFilters);
document.getElementById('clearBtn').addEventListener('click', clearFindings);
document.getElementById('exportBtn').addEventListener('click', exportFindings);
loadResolved();
connect();
</script>
</body>
</html>`;
}