// src/rasp/RASPRouter.ts
import { Router, Request, Response } from 'express';
import { RASPReporter } from './RASPReporter';
import { defaultConfig } from './config';

const router = Router();

const RASP_SECRET_TOKEN = process.env.RASP_SECRET_TOKEN || 'rasp_token_default';

function authGuard(req: Request, res: Response, next: Function): void {
  const token = req.query.token as string || req.headers['x-rasp-token'] as string;
  
  if (!token || token !== RASP_SECRET_TOKEN) {
    if (req.path === '/dashboard' || req.path === '/') {
      res.status(401).send(getAuthHTML());
      return;
    }
    res.status(401).json({ error: 'Token RASP inválido' });
    return;
  }
  
  next();
}

function getAuthHTML(): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>RASP Dashboard - Acceso</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui;background:#0f1117;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh}
.box{background:#1a1d2e;border:1px solid #2d3748;border-radius:12px;padding:40px;text-align:center;max-width:380px}
h2{color:#f59e0b} input{width:100%;padding:10px;background:#0f1117;border:1px solid #2d3748;border-radius:8px;color:#e2e8f0;margin-bottom:12px}
button{width:100%;padding:10px;background:#f59e0b;color:#000;border:none;border-radius:8px;cursor:pointer}
</style>
</head>
<body>
<div class="box">
<h2>🛡️ RASP Dashboard</h2>
<input type="password" id="token" placeholder="Token" onkeydown="if(event.key==='Enter') go()"/>
<button onclick="go()">Acceder</button>
</div>
<script>
function go(){const t=document.getElementById('token').value.trim();if(t)window.location.href='/rasp/dashboard?token='+encodeURIComponent(t);}
</script>
</body>
</html>`;
}

router.use(authGuard);

router.get('/stream', (req: Request, res: Response) => {
  RASPReporter.addSSEClient(res);
});

router.get('/findings', (req: Request, res: Response) => {
  const { severity, type, limit } = req.query;
  let findings = RASPReporter.getAllFindings();
  if (severity) findings = findings.filter(f => f.severity === severity);
  if (type) findings = findings.filter(f => f.type === type);
  if (limit) findings = findings.slice(0, parseInt(limit as string));
  res.json({ success: true, total: findings.length, findings });
});

router.get('/blocks', (req: Request, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
  const blocks = RASPReporter.getBlocks(limit);
  res.json({ success: true, total: blocks.length, blocks });
});

router.get('/alerts', (req: Request, res: Response) => {
  const { severity, limit } = req.query;
  const alerts = RASPReporter.getAlerts(severity as string, limit ? parseInt(limit as string) : undefined);
  res.json({ success: true, total: alerts.length, alerts });
});

router.get('/summary', (req: Request, res: Response) => {
  res.json({ success: true, summary: RASPReporter.getSummary(), config: defaultConfig });
});

router.delete('/findings', (req: Request, res: Response) => {
  RASPReporter.clearAll();
  res.json({ success: true, message: 'Hallazgos eliminados' });
});

router.get('/dashboard', (req: Request, res: Response) => {
  const token = req.query.token as string || '';
  res.setHeader('Content-Type', 'text/html');
  res.send(getDashboardHTML(token));
});

console.log('[RASP] Token configurado:', RASP_SECRET_TOKEN ? '✅ Sí' : '❌ No');

function getDashboardHTML(token: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>RASP Dashboard</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui;background:#0f1117;color:#e2e8f0}
header{background:#1a1d2e;border-bottom:1px solid #2d3748;padding:16px 24px;display:flex;justify-content:space-between}
.stats{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;padding:20px 24px}
.stat{background:#1a1d2e;border:1px solid #2d3748;border-radius:10px;padding:16px;text-align:center}
.stat .num{font-size:28px;font-weight:700}
.critical{color:#ef4444}.high{color:#f97316}.medium{color:#f59e0b}.low{color:#38bdf8}
.controls{padding:0 24px 16px;display:flex;gap:10px}
.controls select,.controls button{background:#1a1d2e;border:1px solid #2d3748;color:#e2e8f0;padding:7px 14px;border-radius:7px;cursor:pointer}
#findings{padding:0 24px 24px;display:flex;flex-direction:column;gap:10px;max-height:60vh;overflow-y:auto}
.finding{background:#1a1d2e;border:1px solid #2d3748;border-radius:10px;padding:16px;border-left:4px solid}
.finding.CRITICAL{border-left-color:#ef4444}.finding.HIGH{border-left-color:#f97316}
.finding.MEDIUM{border-left-color:#f59e0b}.finding.LOW{border-left-color:#38bdf8}
.severity-badge{font-size:10px;padding:2px 8px;border-radius:4px;font-weight:700}
.sev-CRITICAL{background:#450a0a;color:#f87171}.sev-HIGH{background:#431407;color:#fb923c}
.sev-MEDIUM{background:#422006;color:#fbbf24}.sev-LOW{background:#0c1a2e;color:#38bdf8}
.blocked-badge{background:#ef4444;color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;margin-left:8px}
.evidence{background:#0d1117;border:1px solid #2d3748;border-radius:6px;padding:10px;font-family:monospace;font-size:11px;color:#68d391;word-break:break-all;margin-top:8px}
</style>
</head>
<body>
<header><h1>🛡️ RASP Dashboard</h1><div><span id="conn-status">Conectando...</span></div></header>
<div class="stats">
<div class="stat"><div class="num critical" id="count-CRITICAL">0</div><div class="lbl">Críticos</div></div>
<div class="stat"><div class="num high" id="count-HIGH">0</div><div class="lbl">Altos</div></div>
<div class="stat"><div class="num medium" id="count-MEDIUM">0</div><div class="lbl">Medios</div></div>
<div class="stat"><div class="num low" id="count-LOW">0</div><div class="lbl">Bajos</div></div>
<div class="stat"><div class="num" id="count-BLOCKS">0</div><div class="lbl">Bloqueos</div></div>
</div>
<div class="controls">
<select id="filter-severity"><option value="">Todas</option><option value="CRITICAL">Crítico</option><option value="HIGH">Alto</option><option value="MEDIUM">Medio</option><option value="LOW">Bajo</option></select>
<button id="btn-clear">Limpiar</button>
</div>
<div id="findings"><div>Esperando hallazgos...</div></div>
<script>
const TOKEN='${token}';
let allFindings=[],eventSource;
function updateStats(){let c={CRITICAL:0,HIGH:0,MEDIUM:0,LOW:0,BLOCKS:0};allFindings.forEach(f=>{c[f.severity]++;if(f.blocked)c.BLOCKS++});Object.keys(c).forEach(k=>{let el=document.getElementById('count-'+k);if(el)el.textContent=c[k]});}
function renderAll(){const container=document.getElementById('findings');container.innerHTML='';if(allFindings.length===0){container.innerHTML='<div>No hay hallazgos</div>';return;}
allFindings.forEach(f=>{const div=document.createElement('div');div.className='finding '+f.severity;div.innerHTML='<div><span class="severity-badge sev-'+f.severity+'">'+f.severity+'</span> <strong>'+f.type+'</strong>'+(f.blocked?' <span class="blocked-badge">BLOQUEADO</span>':'')+'</div><div>'+f.path+' | '+f.field+'</div><div>'+f.description+'</div><div class="evidence">'+escapeHtml(f.payload)+'</div>';container.appendChild(div);});}
function escapeHtml(s){return s.replace(/[&<>]/g,function(m){return m==='&'?'&amp;':m==='<'?'&lt;':'&gt;';});}
function connect(){eventSource=new EventSource('/rasp/stream?token='+encodeURIComponent(TOKEN));eventSource.onmessage=function(e){const data=JSON.parse(e.data);if(data.type==='init'){allFindings=data.findings||[];updateStats();renderAll();}else if(data.type==='finding'){allFindings.unshift(data.finding);updateStats();renderAll();}};eventSource.onerror=function(){setTimeout(connect,3000);};}
document.getElementById('filter-severity').addEventListener('change',function(){const sev=this.value;const filtered=sev?allFindings.filter(f=>f.severity===sev):allFindings;const container=document.getElementById('findings');container.innerHTML='';filtered.forEach(f=>{const div=document.createElement('div');div.className='finding '+f.severity;div.innerHTML='<div><span class="severity-badge sev-'+f.severity+'">'+f.severity+'</span> <strong>'+f.type+'</strong></div><div>'+f.path+' | '+f.field+'</div><div>'+f.description+'</div><div class="evidence">'+escapeHtml(f.payload)+'</div>';container.appendChild(div);});});
document.getElementById('btn-clear').addEventListener('click',function(){if(confirm('Eliminar hallazgos?'))fetch('/rasp/findings?token='+encodeURIComponent(TOKEN),{method:'DELETE'}).then(()=>{allFindings=[];updateStats();renderAll();});});
connect();
</script>
</body>
</html>`;
}

export default router;