// src/screens/admin/basedatos/AdminMonitoreoScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { metricsAPI } from '../../../services/metricsAPI';
import './styles/AdminMonitoreoScreen.css';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Resumen {
  total_requests: number; total_errores: number; avg_respuesta_ms: number;
  requests_lentos: number; avg_memoria_mb: number; sesiones_activas: number;
  errores_sin_resolver: number;
}
interface PuntoRendimiento { hora: string; total_requests: number; avg_ms: number; max_ms: number; errores: number; avg_memoria_mb: number; }
interface EndpointLento    { endpoint: string; method: string; total_llamadas: number; avg_ms: number; max_ms: number; errores: number; }
interface ErrorItem {
  id: number; fuente: 'sistema'|'http'; tipo: string; mensaje: string;
  endpoint: string|null; method: string|null; resuelta: boolean; fecha: string;
  usuario_email: string|null; status_code: number|null; duration_ms: number|null;
  ocurrencias?: number;
}
interface PaginatedErrores { data: ErrorItem[]; total: number; page: number; totalPages: number; limit: number; }
interface SesionActiva { id: number; email: string; nombre: string; rol: string; device_name: string; browser: string; os: string; ip_address: string; created_at: string; last_activity: string; expires_at: string; }
interface Actividad {
  sesiones: { dia: string; nuevas_sesiones: number; usuarios_unicos: number }[];
  logins:   { dia: string; exitosos: number; fallidos: number }[];
  auditoria: { operacion: string; tabla: string; usuario_email: string; ip_address: string; fecha_operacion: string }[];
  sesionesActivas: SesionActiva[];
  paginacion: {
    sesiones:  { total: number; page: number; totalPages: number; limit: number };
    auditoria: { total: number; page: number; totalPages: number; limit: number };
  };
}
interface TablaDB { tabla: string; tamano: string; tamano_bytes: number; filas_aprox: number; filas_muertas: number; escaneos_secuenciales: number; escaneos_indice: number; ultimo_vacuum: string|null; }
interface DatabaseStats {
  tamano_db:      { tamano_total: string; tamano_bytes: number };
  tablas:         TablaDB[];
  conexiones:     { total_conexiones: number; activas: number; inactivas: number; idle_in_transaction: number };
  indices:        { tabla: string; indice: string; usos: number; tamano: string }[];
  cache_hit_rate: number|null;
  negocio:        { total_usuarios: number; total_productos: number; total_ventas: number; total_logs: number; sesiones_activas: number };
}
type Tab = 'rendimiento'|'endpoints'|'errores'|'actividad'|'database';

// ─── Helpers de fecha ─────────────────────────────────────────────────────────
const _TZ = import.meta.env.DEV ? 'America/Mexico_City' : 'UTC';

const fmtFecha = (iso: string) =>
  new Date(iso).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    timeZone: _TZ
  });
const fmtFechaCorta = (iso: string) =>
  new Date(iso).toLocaleString('es-MX', {
    day: '2-digit', month: 'short',
    timeZone: _TZ
  });
const fmtHora = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-MX', {
    hour: '2-digit', minute: '2-digit',
    timeZone: _TZ
  });

const fmtHoraUTC = (iso: string) => new Date(iso).toLocaleTimeString('es-MX', {
  hour: '2-digit', minute: '2-digit',
  timeZone: 'America/Mexico_City'
});
const fmtFechaUTC = (iso: string) => new Date(iso).toLocaleString('es-MX', {
  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  timeZone: 'America/Mexico_City'
});

const fmtMs = (ms: number) => ms >= 1000 ? `${(ms/1000).toFixed(1)}s` : `${Math.round(ms)}ms`;
const MsBadge = ({ ms }: { ms: number }) => {
  const v = Number(ms);
  if (v < 300)  return <span className="badge ok">{fmtMs(v)}</span>;
  if (v < 1000) return <span className="badge warn">{fmtMs(v)}</span>;
  return <span className="badge error">{fmtMs(v)}</span>;
};
const RolBadge = ({ rol }: { rol: string }) => {
  const m: Record<string,string> = { admin:'error', trabajador:'warn', cliente:'info' };
  return <span className={`badge ${m[rol]||'info'}`}>{rol}</span>;
};
const Paginacion = ({ page, totalPages, total, label, onPage }:
  { page:number; totalPages:number; total:number; label:string; onPage:(p:number)=>void }) => (
  <div className="paginacion-row">
    <span className="paginacion-info">{label}: <b>{total}</b> total</span>
    <div className="paginacion-controles">
      <button className="pag-btn" disabled={page<=1} onClick={()=>onPage(page-1)}>← Anterior</button>
      <span className="pag-pagina">{page} / {totalPages||1}</span>
      <button className="pag-btn" disabled={page>=totalPages} onClick={()=>onPage(page+1)}>Siguiente →</button>
    </div>
  </div>
);

// ─── Componente principal ─────────────────────────────────────────────────────
const AdminMonitoreoScreen: React.FC = () => {
  const [tab, setTab]             = useState<Tab>('rendimiento');
  const [cargando, setCargando]   = useState(true);
  const [error, setError]         = useState<string|null>(null);
  const [ultimaAct, setUltimaAct] = useState(new Date());

  const [resumen,     setResumen]     = useState<Resumen|null>(null);
  const [rendimiento, setRendimiento] = useState<PuntoRendimiento[]>([]);
  const [endpoints,   setEndpoints]   = useState<EndpointLento[]>([]);
  const [erroresPag,  setErroresPag]  = useState<PaginatedErrores|null>(null);
  const [actividad,   setActividad]   = useState<Actividad|null>(null);
  const [dbStats,     setDbStats]     = useState<DatabaseStats|null>(null);

  const [horasRend,       setHorasRend]       = useState(24);
  const [soloNoResueltos, setSoloNoResueltos] = useState(false);
  const [diasActividad,   setDiasActividad]   = useState(7);

  const [pageErr, setPageErr] = useState(1);
  const [pageSes, setPageSes] = useState(1);
  const [pageAud, setPageAud] = useState(1);

  const [ejecutandoVacuum,  setEjecutandoVacuum]  = useState<string|null>(null);
  const [ejecutandoAnalyze, setEjecutandoAnalyze] = useState<string|null>(null);
  const [resultados, setResultados] = useState<Record<string,{tipo:'ok'|'error';msg:string}>>({});
  
  const [mostrarTodasTablas, setMostrarTodasTablas] = useState(false);

  const cargarTodo = useCallback(async () => {
    setCargando(true); setError(null);
    try {
      const [r, rend, ep, err, act, db] = await Promise.all([
        metricsAPI.getResumen(),
        metricsAPI.getRendimiento(horasRend),
        metricsAPI.getEndpointsLentos(10),
        metricsAPI.getErrores(soloNoResueltos, 1),
        metricsAPI.getActividad(diasActividad, 1, 1),
        metricsAPI.getDatabase(),
      ]);
      setResumen(r); setRendimiento(rend); setEndpoints(ep);
      setErroresPag(err); setActividad(act); setDbStats(db);
      setPageErr(1); setPageSes(1); setPageAud(1);
      setUltimaAct(new Date());
    } catch (e: any) { setError(e.message); }
    finally { setCargando(false); }
  }, [horasRend, soloNoResueltos, diasActividad]);

  useEffect(() => { cargarTodo(); }, [cargarTodo]);
  useEffect(() => { if (!cargando) metricsAPI.getRendimiento(horasRend).then(setRendimiento).catch(()=>{}); }, [horasRend, cargando]);
  useEffect(() => { if (!cargando) { setPageErr(1); metricsAPI.getErrores(soloNoResueltos,1).then(setErroresPag).catch(()=>{}); } }, [soloNoResueltos, cargando]);
  useEffect(() => { if (!cargando) { setPageSes(1); setPageAud(1); metricsAPI.getActividad(diasActividad,1,1).then(setActividad).catch(()=>{}); } }, [diasActividad, cargando]);

  const cambiarPagErr = async (p: number) => { setPageErr(p); const d = await metricsAPI.getErrores(soloNoResueltos,p).catch(()=>null); if(d) setErroresPag(d); };
  const cambiarPagSes = async (p: number) => { setPageSes(p); const d = await metricsAPI.getActividad(diasActividad,p,pageAud).catch(()=>null); if(d) setActividad(d); };
  const cambiarPagAud = async (p: number) => { setPageAud(p); const d = await metricsAPI.getActividad(diasActividad,pageSes,p).catch(()=>null); if(d) setActividad(d); };

  const handleResolverError = async (id: number) => {
    try {
      await metricsAPI.resolverError(id);
      setErroresPag(prev => prev ? { ...prev, data: prev.data.map(e => e.id===id ? {...e,resuelta:true} : e) } : prev);
    } catch (e: any) { alert('Error: '+e.message); }
  };

  const handleVacuum = async (tabla?: string) => {
    const key = tabla || 'all';
    setEjecutandoVacuum(key);
    setResultados(prev => { const n={...prev}; delete n[`v_${key}`]; return n; });
    try {
      const res = await metricsAPI.runVacuum(tabla);
      setResultados(prev => ({ ...prev, [`v_${key}`]: { tipo:'ok', msg: res.mensaje } }));
      metricsAPI.getDatabase().then(setDbStats).catch(()=>{});
    } catch (e: any) {
      const msg = e.message?.includes('superuser') || e.message?.includes('permission')
        ? 'Supabase gestiona VACUUM automáticamente' : e.message;
      setResultados(prev => ({ ...prev, [`v_${key}`]: { tipo:'error', msg } }));
    } finally { setEjecutandoVacuum(null); }
  };

  const handleAnalyze = async (tabla?: string) => {
    const key = tabla || 'all';
    setEjecutandoAnalyze(key);
    setResultados(prev => { const n={...prev}; delete n[`a_${key}`]; return n; });
    try {
      const res = await metricsAPI.runAnalyze(tabla);
      setResultados(prev => ({ ...prev, [`a_${key}`]: { tipo:'ok', msg: res.mensaje } }));
    } catch (e: any) {
      setResultados(prev => ({ ...prev, [`a_${key}`]: { tipo:'error', msg: e.message } }));
    } finally { setEjecutandoAnalyze(null); }
  };

  const maxRequests = Math.max(...rendimiento.map(p=>Number(p.total_requests)), 5);

  const TABS: {id:Tab;icon:string;label:string}[] = [
    {id:'rendimiento', icon:'📈', label:'Rendimiento'},
    {id:'endpoints',   icon:'🐢', label:'Endpoints'},
    {id:'errores',     icon:'🚨', label:'Errores'},
    {id:'actividad',   icon:'👥', label:'Actividad'},
    {id:'database',    icon:'🗄️', label:'Base de datos'},
  ];

  return (
    <div className="monitoreo-screen">
      <div className="monitoreo-header">
        <div>
          <div className="monitoreo-titulo"><h1>🖥️ Monitor del sistema</h1></div>
          <p>Última actualización: {ultimaAct.toLocaleTimeString('es-MX', { timeZone: 'America/Mexico_City' })}</p>
        </div>
        <button className="btn-refresh" onClick={cargarTodo} disabled={cargando}>
          {cargando ? <><span className="spinner"/> Cargando…</> : '↺ Actualizar'}
        </button>
      </div>

      {error && <div className="estado-error">⚠️ {error}</div>}

      {cargando && !resumen ? (
        <div className="estado-carga"><span className="spinner"/> Cargando métricas…</div>
      ) : resumen && (
        <div className="tarjetas-grid">
          {[
            {clase:'t-purple',icono:'purple',emoji:'📊',valor:Number(resumen.total_requests).toLocaleString(),     label:'Requests (24h)'},
            {clase:'t-red',   icono:'red',   emoji:'🔴',valor:Number(resumen.total_errores).toLocaleString(),      label:'Errores HTTP'},
            {clase:'t-blue',  icono:'blue',  emoji:'⚡',valor:fmtMs(Number(resumen.avg_respuesta_ms)),             label:'Tiempo promedio'},
            {clase:'t-amber', icono:'amber', emoji:'🐢',valor:Number(resumen.requests_lentos).toLocaleString(),    label:'Requests lentos'},
            {clase:'t-teal',  icono:'teal',  emoji:'🧠',valor:`${Number(resumen.avg_memoria_mb).toFixed(1)} MB`,   label:'Memoria promedio'},
            {clase:'t-green', icono:'green', emoji:'👥',valor:Number(resumen.sesiones_activas).toLocaleString(),   label:'Sesiones activas'},
            {clase:'t-rose',  icono:'rose',  emoji:'🚨',valor:Number(resumen.errores_sin_resolver).toLocaleString(),label:'Sin resolver'},
          ].map((t,i)=>(
            <div key={i} className={`tarjeta ${t.clase}`}>
              <div className="tarjeta-top"><div className={`tarjeta-icono ${t.icono}`}>{t.emoji}</div></div>
              <div className="tarjeta-valor">{t.valor}</div>
              <div className="tarjeta-label">{t.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="tabs-nav">
        {TABS.map(t=>(
          <button key={t.id} className={`tab-btn${tab===t.id?' activo':''}`} onClick={()=>setTab(t.id)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ═══ TAB 1: RENDIMIENTO ═══ */}
      {tab==='rendimiento' && (
        <>
          <div className="filtros-row">
            <label>Período:</label>
            <select value={horasRend} onChange={e=>setHorasRend(Number(e.target.value))}>
              <option value={6}>Últimas 6h</option>
              <option value={24}>Últimas 24h</option>
              <option value={48}>Últimas 48h</option>
              <option value={168}>Última semana</option>
            </select>
          </div>
          <div className="grafica-wrapper">
            <p className="seccion-titulo">Requests en el tiempo</p>
            <div className="grafica-leyenda">
              <span className="leyenda-item"><span className="leyenda-dot" style={{background:'#ecb2c3'}}/> Normal</span>
              <span className="leyenda-item"><span className="leyenda-dot" style={{background:'#f87171'}}/> Con errores</span>
            </div>
            {rendimiento.length > 0 ? (
              <div className="svg-scroll-wrapper">
                {(() => {
                  const width = 900; const height = 320;
                  const padding = { top: 20, right: 30, bottom: 80, left: 70 };
                  const chartData = [...rendimiento].reverse();
                  const pointsReq = chartData.map((d, i) => ({
                    x: padding.left + (i * (width - padding.left - padding.right) / Math.max(chartData.length - 1, 1)),
                    y: height - padding.bottom - ((Number(d.total_requests) / maxRequests) * (height - padding.top - padding.bottom)),
                    val: Number(d.total_requests), hora: d.hora
                  }));
                  const pointsErr = chartData.map((d, i) => ({
                    x: padding.left + (i * (width - padding.left - padding.right) / Math.max(chartData.length - 1, 1)),
                    y: height - padding.bottom - ((Number(d.errores) / maxRequests) * (height - padding.top - padding.bottom)),
                    val: Number(d.errores)
                  }));
                  const pathReq = pointsReq.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');
                  const areaReq = `${pathReq} L ${pointsReq[pointsReq.length - 1]?.x},${height - padding.bottom} L ${pointsReq[0]?.x},${height - padding.bottom} Z`;
                  const pathErr = pointsErr.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');
                  const stepX = Math.max(1, Math.ceil(chartData.length / 15));
                  return (
                    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="grafica-svg-responsive">
                      <defs>
                        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ecb2c3" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#ecb2c3" stopOpacity="0.01" />
                        </linearGradient>
                      </defs>
                      <text transform="rotate(-90)" x={-(height/2)} y="20" textAnchor="middle" className="svg-axis-title">CANTIDAD DE REQUESTS</text>
                      <text x={width/2 + padding.left/2} y={height - 10} textAnchor="middle" className="svg-axis-title">TIEMPO (HORAS)</text>
                      {[0, 0.5, 1].map(ratio => {
                        const y = height - padding.bottom - (ratio * (height - padding.top - padding.bottom));
                        return (
                          <g key={ratio}>
                            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} className="svg-grid-line" />
                            <text x={padding.left - 10} y={y + 4} className="svg-axis-label" textAnchor="end">{Math.round(maxRequests * ratio)}</text>
                          </g>
                        );
                      })}
                      <path d={areaReq} fill="url(#areaGradient)" />
                      <path d={pathReq} fill="none" stroke="#ecb2c3" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      <path d={pathErr} fill="none" stroke="#f87171" strokeWidth="2" strokeDasharray="5 5" strokeLinecap="round" />
                      {pointsReq.map((p, i) => (
                        <g key={`p-${i}`}>
                          {i % stepX === 0 && (
                            <text transform={`rotate(-45, ${p.x}, ${height - padding.bottom + 15})`} x={p.x} y={height - padding.bottom + 15} className="svg-axis-label" textAnchor="end">
                              {fmtHoraUTC(p.hora).substring(0,5)}
                            </text>
                          )}
                          <circle cx={p.x} cy={p.y} r="4" fill="#16162a" stroke="#ecb2c3" strokeWidth="2"><title>{`${p.val} reqs a las ${fmtHoraUTC(p.hora)}`}</title></circle>
                          {pointsErr[i].val > 0 && <circle cx={pointsErr[i].x} cy={pointsErr[i].y} r="3" fill="#f87171"><title>{`${pointsErr[i].val} errores`}</title></circle>}
                        </g>
                      ))}
                    </svg>
                  );
                })()}
              </div>
            ) : <div className="estado-carga">Sin datos para el período seleccionado</div>}
          </div>

          <p className="seccion-titulo">Detalle por hora</p>
          <div className="tabla-wrapper">
            <table>
              <thead><tr><th>Hora</th><th>Requests</th><th>Prom.</th><th>Máx.</th><th>Errores</th><th>Memoria</th></tr></thead>
              <tbody>
                {rendimiento.length===0
                  ? <tr><td colSpan={6} style={{textAlign:'center',color:'#334155'}}>Sin datos</td></tr>
                  : rendimiento.slice().reverse().map((p,i)=>(
                    <tr key={i}>
                      <td style={{color:'#64748b',fontSize:12}}>{fmtFechaUTC(p.hora)}</td>
                      <td>{p.total_requests}</td>
                      <td><MsBadge ms={Number(p.avg_ms)}/></td>
                      <td><MsBadge ms={Number(p.max_ms)}/></td>
                      <td>{Number(p.errores)>0?<span className="badge error">{p.errores}</span>:<span className="badge ok">0</span>}</td>
                      <td style={{color:'#64748b'}}>{Number(p.avg_memoria_mb).toFixed(1)} MB</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ═══ TAB 2: ENDPOINTS ═══ */}
      {tab==='endpoints' && (
        <>
          <p className="seccion-titulo">Top endpoints más lentos <span>— últimos 7 días</span></p>
          {endpoints.length > 0 && (
            <div className="svg-scroll-wrapper">
              {(() => {
                const width = 900;
                const height = 360;
                const padding = { top: 20, right: 30, bottom: 120, left: 70 };
                const maxMs = Math.max(...endpoints.map(e => Number(e.avg_ms)), 100);
                return (
                  <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="grafica-svg-responsive">
                    <text transform="rotate(-90)" x={-(height/2)} y="20" textAnchor="middle" className="svg-axis-title">TIEMPO PROMEDIO (ms)</text>
                    <text x={width/2 + padding.left/2} y={height - 10} textAnchor="middle" className="svg-axis-title">ENDPOINTS DEL SISTEMA</text>
                    {[0, 0.5, 1].map(ratio => {
                      const y = height - padding.bottom - (ratio * (height - padding.top - padding.bottom));
                      return (
                        <g key={ratio}>
                          <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} className="svg-grid-line" />
                          <text x={padding.left - 10} y={y + 4} className="svg-axis-label" textAnchor="end">{Math.round(maxMs * ratio)}ms</text>
                        </g>
                      );
                    })}
                    {endpoints.map((ep, i) => {
                      const sectionWidth = (width - padding.left - padding.right) / endpoints.length;
                      const barWidth = Math.min(sectionWidth * 0.5, 40);
                      const x = padding.left + (sectionWidth * i) + (sectionWidth / 2);
                      const barH = Math.max((Number(ep.avg_ms) / maxMs) * (height - padding.top - padding.bottom), 2);
                      const y = height - padding.bottom - barH;
                      const isLento = Number(ep.avg_ms) > 1000;
                      const shortEp = ep.endpoint.length > 20 ? ep.endpoint.substring(0, 18) + '...' : ep.endpoint;
                      return (
                        <g key={`bar-${i}`}>
                          <rect x={x - barWidth/2} y={y} width={barWidth} height={barH} fill={isLento ? '#f87171' : '#3b82f6'} rx="4" className="svg-bar">
                            <title>{`${ep.method} ${ep.endpoint}: ${fmtMs(Number(ep.avg_ms))}`}</title>
                          </rect>
                          <text x={x} y={y - 8} fill="#f1f5f9" fontSize="11" fontWeight="bold" textAnchor="middle">{fmtMs(Number(ep.avg_ms))}</text>
                          <text transform={`rotate(-45, ${x}, ${height - padding.bottom + 15})`} x={x} y={height - padding.bottom + 15} className="svg-axis-label" textAnchor="end">
                            {ep.method} {shortEp}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                );
              })()}
            </div>
          )}
          <div className="tabla-wrapper">
            <table>
              <thead><tr><th>Método</th><th>Endpoint</th><th>Llamadas</th><th>Prom.</th><th>Máx.</th><th>Errores</th></tr></thead>
              <tbody>
                {endpoints.length===0
                  ? <tr><td colSpan={6} style={{textAlign:'center',color:'#334155'}}>Sin datos</td></tr>
                  : endpoints.map((ep,i)=>(
                    <tr key={i}>
                      <td><span className="badge info">{ep.method}</span></td>
                      <td style={{fontFamily:'monospace',fontSize:12,color:'#94a3b8'}}>{ep.endpoint}</td>
                      <td>{ep.total_llamadas}</td>
                      <td><MsBadge ms={Number(ep.avg_ms)}/></td>
                      <td><MsBadge ms={Number(ep.max_ms)}/></td>
                      <td>{Number(ep.errores)>0?<span className="badge error">{ep.errores}</span>:<span className="badge ok">0</span>}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ═══ TAB 3: ERRORES ═══ */}
      {tab==='errores' && (
        <>
          <div className="filtros-row">
            <label className="check-label">
              <input type="checkbox" checked={soloNoResueltos} onChange={e=>setSoloNoResueltos(e.target.checked)}/>
              Solo errores sin resolver
            </label>
            <span style={{fontSize:11,color:'#475569',background:'rgba(71,85,105,0.15)',padding:'3px 8px',borderRadius:'99px',border:'1px solid #334155'}}>
              Incluye excepciones del servidor y requests HTTP fallidos
            </span>
          </div>
          {erroresPag && erroresPag.data.length > 0 && (
            <div className="svg-scroll-wrapper">
              <p className="seccion-titulo" style={{ marginTop: 0 }}>Distribución de Errores (Página Actual)</p>
              {(() => {
                const width = 800;
                const height = 300;
                const padding = { top: 30, right: 30, bottom: 80, left: 60 };
                const conteo: Record<string, number> = {};
                erroresPag.data.forEach(e => {
                  const key = e.fuente === 'sistema' ? 'Sistema / Internos' : 'HTTP / Peticiones';
                  conteo[key] = (conteo[key] || 0) + 1;
                });
                const labels = Object.keys(conteo);
                const maxErr = Math.max(...Object.values(conteo), 5);
                return (
                  <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="grafica-svg-responsive" style={{ minWidth: '500px' }}>
                    <text transform="rotate(-90)" x={-(height/2)} y="20" textAnchor="middle" className="svg-axis-title">CANTIDAD DE ERRORES</text>
                    <text x={width/2 + padding.left/2} y={height - 10} textAnchor="middle" className="svg-axis-title">CATEGORÍA DEL ERROR</text>
                    {[0, 0.5, 1].map(ratio => {
                      const y = height - padding.bottom - (ratio * (height - padding.top - padding.bottom));
                      return (
                        <g key={ratio}>
                          <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} className="svg-grid-line" />
                          <text x={padding.left - 10} y={y + 4} className="svg-axis-label" textAnchor="end">{Math.round(maxErr * ratio)}</text>
                        </g>
                      );
                    })}
                    {labels.map((label, i) => {
                      const val = conteo[label];
                      const sectionWidth = (width - padding.left - padding.right) / labels.length;
                      const barWidth = Math.min(sectionWidth * 0.4, 80);
                      const x = padding.left + (sectionWidth * i) + (sectionWidth / 2);
                      const barH = (val / maxErr) * (height - padding.top - padding.bottom);
                      const y = height - padding.bottom - barH;
                      return (
                        <g key={`bar-err-${i}`}>
                          <rect x={x - barWidth/2} y={y} width={barWidth} height={barH} fill={label.includes('Sistema') ? '#f59e0b' : '#f87171'} rx="4" className="svg-bar" />
                          <text x={x} y={y - 8} fill="#f1f5f9" fontSize="13" fontWeight="bold" textAnchor="middle">{val}</text>
                          <text x={x} y={height - padding.bottom + 25} fill="#94a3b8" fontSize="13" fontWeight="bold" textAnchor="middle">{label}</text>
                        </g>
                      );
                    })}
                  </svg>
                );
              })()}
            </div>
          )}
          {erroresPag && <Paginacion page={erroresPag.page} totalPages={erroresPag.totalPages} total={erroresPag.total} label="Errores" onPage={cambiarPagErr}/>}
          <div className="tabla-wrapper">
            <table>
              <thead><tr><th>Fuente</th><th>Tipo</th><th>Mensaje</th><th>Endpoint</th><th>Usuario</th><th>Fecha</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {!erroresPag?.data?.length
                  ? <tr><td colSpan={8} style={{textAlign:'center',color:'#334155',padding:'24px'}}>
                      {soloNoResueltos?'✅ No hay errores pendientes':'Sin errores en las últimas 24h'}
                    </td></tr>
                  : erroresPag.data.map((e,i)=>(
                    <tr key={i}>
                      <td><span className={`badge ${e.fuente==='sistema'?'error':'warn'}`}>{e.fuente==='sistema'?'⚠ sistema':`HTTP ${e.status_code}`}</span></td>
                      <td style={{fontSize:11,color:'#94a3b8',fontFamily:'monospace'}}>{e.tipo}</td>
                      <td style={{maxWidth:220,fontSize:12,color:'#cbd5e1'}} title={e.mensaje}>
                        {e.mensaje.length>55?e.mensaje.slice(0,55)+'…':e.mensaje}
                      </td>
                      <td style={{fontFamily:'monospace',fontSize:11,color:'#64748b'}}>{e.method&&e.endpoint?`${e.method} ${e.endpoint}`:'—'}</td>
                      <td style={{fontSize:12,color:'#64748b'}}>{e.usuario_email??'—'}</td>
                      <td style={{fontSize:12,color:'#475569',whiteSpace:'nowrap'}}>{fmtFechaUTC(e.fecha)}</td>
                      <td><span className={`badge ${e.resuelta?'resuelto':'pendiente'}`}>{e.resuelta?'Resuelto':'Pendiente'}</span></td>
                      <td>{e.fuente==='sistema'&&!e.resuelta&&<button className="btn-resolver" onClick={()=>handleResolverError(e.id)}>✓</button>}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ═══ TAB 4: ACTIVIDAD ═══ */}
      {tab==='actividad' && actividad && (
        <>
          <div className="filtros-row">
            <label>Período:</label>
            <select value={diasActividad} onChange={e=>setDiasActividad(Number(e.target.value))}>
              <option value={7}>Últimos 7 días</option>
              <option value={14}>Últimos 14 días</option>
              <option value={30}>Últimos 30 días</option>
            </select>
          </div>
          <p className="seccion-titulo">Sesiones activas ahora <span>— {actividad.paginacion.sesiones.total} usuarios conectados</span></p>
          <Paginacion page={pageSes} totalPages={actividad.paginacion.sesiones.totalPages} total={actividad.paginacion.sesiones.total} label="Sesiones" onPage={cambiarPagSes}/>
          <div className="tabla-wrapper" style={{marginBottom:24}}>
            <table>
              <thead><tr><th>Usuario</th><th>Rol</th><th>Dispositivo</th><th>Navegador / OS</th><th>IP</th><th>Última actividad</th><th>Expira</th></tr></thead>
              <tbody>
                {!actividad.sesionesActivas?.length
                  ? <tr><td colSpan={7} style={{textAlign:'center',color:'#334155',padding:'24px'}}>Sin sesiones activas</td></tr>
                  : actividad.sesionesActivas.map((s,i)=>(
                    <tr key={i}>
                      <td><div style={{fontSize:13,color:'#f1f5f9',fontWeight:500}}>{s.nombre||'—'}</div><div style={{fontSize:11,color:'#64748b'}}>{s.email}</div></td>
                      <td><RolBadge rol={s.rol}/></td>
                      <td style={{fontSize:12,color:'#94a3b8'}}>{s.device_name}</td>
                      <td style={{fontSize:12,color:'#64748b'}}>{s.browser} / {s.os}</td>
                      <td style={{fontSize:12,color:'#475569',fontFamily:'monospace'}}>{s.ip_address??'—'}</td>
                      <td style={{fontSize:12,color:'#475569',whiteSpace:'nowrap'}}>{fmtFecha(s.last_activity)}</td>
                      <td style={{fontSize:12,color:'#334155',whiteSpace:'nowrap'}}>{fmtFecha(s.expires_at)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <p className="seccion-titulo">Intentos de login por día</p>
          {actividad.logins.length > 0 && (
            <div className="svg-scroll-wrapper">
               <div className="grafica-leyenda">
                  <div className="leyenda-item"><div className="leyenda-dot" style={{ background: '#4ade80' }}></div><span>Exitosos</span></div>
                  <div className="leyenda-item"><div className="leyenda-dot" style={{ background: '#f87171' }}></div><span>Fallidos</span></div>
                </div>
              {(() => {
                const width = 900; const height = 310;
                const padding = { top: 20, right: 30, bottom: 80, left: 60 };
                const chartData = [...actividad.logins].reverse();
                const maxLogins = Math.max(...chartData.map(l => Number(l.exitosos) + Number(l.fallidos)), 5);
                return (
                  <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="grafica-svg-responsive">
                    <text transform="rotate(-90)" x={-(height/2)} y="20" textAnchor="middle" className="svg-axis-title">CANTIDAD DE LOGINS</text>
                    <text x={width/2 + padding.left/2} y={height - 10} textAnchor="middle" className="svg-axis-title">FECHA DEL REGISTRO</text>
                    {[0, 0.5, 1].map(ratio => {
                      const y = height - padding.bottom - (ratio * (height - padding.top - padding.bottom));
                      return (
                        <g key={ratio}>
                          <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} className="svg-grid-line" />
                          <text x={padding.left - 10} y={y + 4} className="svg-axis-label" textAnchor="end">{Math.round(maxLogins * ratio)}</text>
                        </g>
                      );
                    })}
                    {chartData.map((l, i) => {
                      const sectionWidth = (width - padding.left - padding.right) / chartData.length;
                      const barWidth = Math.min(sectionWidth * 0.6, 30);
                      const x = padding.left + (sectionWidth * i) + (sectionWidth / 2);
                      const hExitosos = (Number(l.exitosos) / maxLogins) * (height - padding.top - padding.bottom);
                      const hFallidos = (Number(l.fallidos) / maxLogins) * (height - padding.top - padding.bottom);
                      const yExitosos = height - padding.bottom - hExitosos;
                      const yFallidos = yExitosos - hFallidos;
                      return (
                        <g key={`log-${i}`}>
                          {hExitosos > 0 && <rect x={x - barWidth/2} y={yExitosos} width={barWidth} height={hExitosos} fill="#4ade80" className="svg-bar"><title>{`${l.exitosos} Exitosos`}</title></rect>}
                          {hFallidos > 0 && <rect x={x - barWidth/2} y={yFallidos} width={barWidth} height={hFallidos} fill="#f87171" className="svg-bar"><title>{`${l.fallidos} Fallidos`}</title></rect>}
                          <text transform={`rotate(-45, ${x}, ${height - padding.bottom + 15})`} x={x} y={height - padding.bottom + 15} className="svg-axis-label" textAnchor="end">
                            {fmtFechaCorta(l.dia)}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                );
              })()}
            </div>
          )}

          <p className="seccion-titulo">Últimas acciones registradas</p>
          <Paginacion page={pageAud} totalPages={actividad.paginacion.auditoria.totalPages} total={actividad.paginacion.auditoria.total} label="Acciones" onPage={cambiarPagAud}/>
          <div className="tabla-wrapper">
            <table>
              <thead><tr><th>Operación</th><th>Tabla</th><th>Usuario</th><th>IP</th><th>Fecha</th></tr></thead>
              <tbody>
                {actividad.auditoria.length===0 ? <tr><td colSpan={5} style={{textAlign:'center',color:'#334155'}}>Sin actividad</td></tr>
                  : actividad.auditoria.map((a,i)=>(
                    <tr key={i}>
                      <td><span className={`badge ${a.operacion==='INSERT'?'ok':a.operacion==='DELETE'?'error':'info'}`}>{a.operacion}</span></td>
                      <td style={{fontFamily:'monospace',fontSize:12,color:'#94a3b8'}}>{a.tabla}</td>
                      <td style={{fontSize:12,color:'#64748b'}}>{a.usuario_email??'—'}</td>
                      <td style={{fontSize:12,color:'#475569'}}>{a.ip_address??'—'}</td>
                      <td style={{fontSize:12,color:'#475569',whiteSpace:'nowrap'}}>{fmtFecha(a.fecha_operacion)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ═══ TAB 5: BASE DE DATOS ═══ */}
      {tab==='database' && (
        <>
          {!dbStats ? <div className="estado-carga"><span className="spinner"/> Cargando estadísticas…</div> : (
            <>
              {/* Tarjetas de Salud y Datos de Negocio */}
              <div className="db-salud-grid">
                <div className="db-salud-card">
                  <div className="db-salud-card-titulo">🔗 Estado de BD</div>
                  <div className="db-salud-row"><span>Estado</span><span className="badge ok">✅ Activa</span></div>
                  <div className="db-salud-row"><span>Conexiones activas</span><b style={{color:'#f1f5f9'}}>{dbStats.conexiones.activas}</b></div>
                  <div className="db-salud-row"><span>Conexiones inactivas</span><b style={{color:'#64748b'}}>{dbStats.conexiones.inactivas}</b></div>
                  <div className="db-salud-row"><span>Tamaño total BD</span><b style={{color:'#60a5fa'}}>{dbStats.tamano_db.tamano_total}</b></div>
                  <div className="db-salud-row">
                    <span>Cache hit rate</span>
                    <span className={`badge ${Number(dbStats.cache_hit_rate)>=90?'ok':Number(dbStats.cache_hit_rate)>=70?'warn':'error'}`}>
                      {dbStats.cache_hit_rate??0}%
                    </span>
                  </div>
                </div>
                <div className="db-salud-card">
                  <div className="db-salud-card-titulo">💼 Datos del negocio</div>
                  {[
                    {emoji:'👤',label:'Usuarios',  valor:Number(dbStats.negocio.total_usuarios).toLocaleString()},
                    {emoji:'💍',label:'Productos',  valor:Number(dbStats.negocio.total_productos).toLocaleString()},
                    {emoji:'🛍️',label:'Ventas',     valor:Number(dbStats.negocio.total_ventas).toLocaleString()},
                    {emoji:'📋',label:'Logs acum.', valor:Number(dbStats.negocio.total_logs).toLocaleString()},
                  ].map((item,i)=>(
                    <div key={i} className="db-salud-row">
                      <span>{item.emoji} {item.label}</span>
                      <b style={{color:'#f1f5f9'}}>{item.valor}</b>
                    </div>
                  ))}
                </div>
              </div>

              {/* 🟢 FILA 1 DE GRÁFICAS: Circulares (Caché, Índices, Conexiones, Tamaño) 🟢 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginTop: '20px', marginBottom: '20px' }}>
                
                {/* Gauge 1: Eficiencia de Caché */}
                <div className="db-salud-card" style={{ alignItems: 'center', textAlign: 'center' }}>
                  <div className="db-salud-card-titulo">Eficiencia de Caché</div>
                  <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '10px' }}>Consultas en memoria (Hit Rate)</p>
                  <svg width="120" height="120" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#252540" strokeWidth="12" strokeDasharray="235.6 314.1" strokeDashoffset="-39.2" strokeLinecap="round" />
                    <circle cx="60" cy="60" r="50" fill="none" stroke={Number(dbStats.cache_hit_rate) > 95 ? '#4ade80' : Number(dbStats.cache_hit_rate) > 85 ? '#fbbf24' : '#f87171'} strokeWidth="12" strokeDasharray={`${(Number(dbStats.cache_hit_rate) / 100) * 235.6} 314.1`} strokeDashoffset="-39.2" strokeLinecap="round" style={{ transition: 'stroke-dasharray 1s ease-out' }} />
                    <text x="60" y="65" fill="#f1f5f9" fontSize="22" fontWeight="bold" textAnchor="middle">{Number(dbStats.cache_hit_rate).toFixed(1)}%</text>
                  </svg>
                </div>

                {/* Gauge 2: Eficiencia de Índices */}
                <div className="db-salud-card" style={{ alignItems: 'center', textAlign: 'center' }}>
                  <div className="db-salud-card-titulo">Uso Global de Índices</div>
                  <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '10px' }}>Salud general de las consultas</p>
                  {(() => {
                    const totalIdx = dbStats.tablas.reduce((acc, t) => acc + Number(t.escaneos_indice), 0);
                    const totalSeq = dbStats.tablas.reduce((acc, t) => acc + Number(t.escaneos_secuenciales), 0);
                    const totalScans = totalIdx + totalSeq;
                    const indexHitRate = totalScans > 0 ? (totalIdx / totalScans) * 100 : 0;
                    return (
                      <svg width="120" height="120" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="50" fill="none" stroke="#252540" strokeWidth="12" strokeDasharray="235.6 314.1" strokeDashoffset="-39.2" strokeLinecap="round" />
                        <circle cx="60" cy="60" r="50" fill="none" stroke={indexHitRate > 90 ? '#4ade80' : indexHitRate > 75 ? '#fbbf24' : '#f87171'} strokeWidth="12" strokeDasharray={`${(indexHitRate / 100) * 235.6} 314.1`} strokeDashoffset="-39.2" strokeLinecap="round" style={{ transition: 'stroke-dasharray 1s ease-out' }} />
                        <text x="60" y="65" fill="#f1f5f9" fontSize="22" fontWeight="bold" textAnchor="middle">{indexHitRate.toFixed(1)}%</text>
                      </svg>
                    );
                  })()}
                </div>

                {/* 🟢 NUEVO: Dona de Pool de Conexiones 🟢 */}
                <div className="db-salud-card">
                  <div className="db-salud-card-titulo" style={{ textAlign: 'center' }}>Pool de Conexiones</div>
                  <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '10px', textAlign: 'center' }}>Uso actual de las conexiones a BD</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: 'auto', marginBottom: 'auto' }}>
                    {(() => {
                      const { activas, inactivas, idle_in_transaction, total_conexiones } = dbStats.conexiones;
                      const total = Number(total_conexiones) || (Number(activas) + Number(inactivas) + Number(idle_in_transaction)) || 1;
                      
                      let currentDeg = 0;
                      const stops = [];
                      
                      const degAct = (Number(activas) / total) * 360;
                      if (degAct > 0) { stops.push(`#4ade80 ${currentDeg}deg ${currentDeg + degAct}deg`); currentDeg += degAct; }
                      
                      const degIdle = (Number(idle_in_transaction) / total) * 360;
                      if (degIdle > 0) { stops.push(`#f87171 ${currentDeg}deg ${currentDeg + degIdle}deg`); currentDeg += degIdle; }
                      
                      const degInac = (Number(inactivas) / total) * 360;
                      if (degInac > 0) { stops.push(`#64748b ${currentDeg}deg ${currentDeg + degInac}deg`); currentDeg += degInac; }
                      
                      if (currentDeg < 360) { stops.push(`#252540 ${currentDeg}deg 360deg`); }

                      const gradient = stops.join(', ');

                      return (
                        <>
                          <div style={{ position: 'relative', minWidth: '90px', width: '90px', height: '90px', borderRadius: '50%', background: `conic-gradient(${gradient})` }}>
                            {/* El "huequito" para hacerla Dona */}
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '55px', height: '55px', background: '#16162a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                                <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#f1f5f9' }}>{total}</span>
                            </div>
                          </div>
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#cbd5e1' }}>
                              <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#4ade80' }}></div>
                              <span style={{ flex: 1 }}>Activas</span>
                              <span style={{ color: '#f1f5f9', fontWeight: 'bold' }}>{activas}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#cbd5e1' }}>
                              <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#f87171' }}></div>
                              <span style={{ flex: 1 }}>Idle</span>
                              <span style={{ color: Number(idle_in_transaction) > 0 ? '#f87171' : '#f1f5f9', fontWeight: 'bold' }}>{idle_in_transaction}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#cbd5e1' }}>
                              <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#64748b' }}></div>
                              <span style={{ flex: 1 }}>Inactivas</span>
                              <span style={{ color: '#f1f5f9', fontWeight: 'bold' }}>{inactivas}</span>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
                
                {/* Dona: Top 5 Tablas por Tamaño (Ajustada para tener hueco) */}
                <div className="db-salud-card">
                  <div className="db-salud-card-titulo" style={{ textAlign: 'center' }}>Top 5 Tablas (Tamaño)</div>
                  <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '10px', textAlign: 'center' }}>Distribución del almacenamiento</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: 'auto', marginBottom: 'auto' }}>
                    {(() => {
                      const totalBytes = dbStats.tablas.reduce((acc, t) => acc + Number(t.tamano_bytes), 0);
                      let currentDeg = 0;
                      const colores = ['#ecb2c3', '#8b5cf6', '#3b82f6', '#14b8a6', '#f59e0b'];
                      const top5 = [...dbStats.tablas].sort((a,b) => Number(b.tamano_bytes) - Number(a.tamano_bytes)).slice(0, 5);
                      const gradientStops = top5.map((t, i) => {
                        const deg = (Number(t.tamano_bytes) / totalBytes) * 360;
                        const stop = `${colores[i]} ${currentDeg}deg ${currentDeg + deg}deg`;
                        currentDeg += deg;
                        return stop;
                      }).join(', ');
                      return (
                        <>
                          <div style={{ position: 'relative', minWidth: '90px', width: '90px', height: '90px', borderRadius: '50%', background: `conic-gradient(${gradientStops}, #252540 ${currentDeg}deg 360deg)` }}>
                             {/* El "huequito" para hacerla Dona */}
                             <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '55px', height: '55px', background: '#16162a', borderRadius: '50%' }}></div>
                          </div>
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {top5.map((t, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#cbd5e1' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: colores[i] }}></div>
                                <span style={{ flex: 1, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis' }} title={t.tabla}>{t.tabla}</span>
                                <span style={{ color: '#64748b' }}>{t.tamano}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* 🟢 FILA 2 DE GRÁFICAS: Análisis Avanzado (Filas y Escaneos) 🟢 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                
                {/* Top 5 Tablas con más filas */}
                <div className="db-salud-card">
                  <div className="db-salud-card-titulo">Top 5 Tablas (Volumen de Registros)</div>
                  <p style={{ fontSize: '11px', color: '#64748b', margin: '4px 0 12px 0' }}>Tablas que más crecen en cantidad de datos</p>
                  <div className="todas-tablas-lista" style={{ marginTop: 0 }}>
                    {(() => {
                      const top5Rows = [...dbStats.tablas].sort((a,b) => Number(b.filas_aprox) - Number(a.filas_aprox)).slice(0, 5);
                      const maxRows = top5Rows.length > 0 ? Number(top5Rows[0].filas_aprox) : 1;
                      
                      return top5Rows.map((t, i) => (
                        <div key={i} className="tabla-bar-row" style={{ padding: '6px 0' }}>
                          <span className="tb-col-name" style={{ minWidth: '120px' }}>{t.tabla}</span>
                          <div className="tb-col-bar" style={{ padding: '0 10px' }}>
                             <div className="barra-track">
                               <div className="barra-fill" style={{ width: `${(Number(t.filas_aprox) / maxRows) * 100}%`, background: 'linear-gradient(90deg, #3b82f6, #60a5fa)' }}></div>
                             </div>
                          </div>
                          <span className="tb-col-rows" style={{ width: '80px', color: '#f1f5f9' }}>{Number(t.filas_aprox).toLocaleString()}</span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                {/* Salud de Consultas (Índice vs Secuencial) */}
                <div className="db-salud-card">
                  <div className="db-salud-card-titulo">Salud de Consultas (Top 5 Tablas más leídas)</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0 12px 0' }}>
                    <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>Tipo de escaneo utilizado por tabla</p>
                    <div className="grafica-leyenda" style={{ margin: 0 }}>
                      <span className="leyenda-item" style={{ fontSize: '10px' }}><span className="leyenda-dot" style={{background:'#4ade80'}}/> Índice</span>
                      <span className="leyenda-item" style={{ fontSize: '10px' }}><span className="leyenda-dot" style={{background:'#f87171'}}/> Secuencial</span>
                    </div>
                  </div>
                  
                  <div className="todas-tablas-lista" style={{ marginTop: 0 }}>
                    {(() => {
                      const topScans = [...dbStats.tablas]
                        .sort((a,b) => (Number(b.escaneos_indice) + Number(b.escaneos_secuenciales)) - (Number(a.escaneos_indice) + Number(a.escaneos_secuenciales)))
                        .slice(0, 5);
                      
                      const maxScans = Math.max(...topScans.map(t => Number(t.escaneos_indice) + Number(t.escaneos_secuenciales)), 1);
                      
                      return topScans.map((t, i) => {
                        const total = Number(t.escaneos_indice) + Number(t.escaneos_secuenciales);
                        const widthTotal = (total / maxScans) * 100;
                        const pctIdx = total > 0 ? (Number(t.escaneos_indice) / total) * 100 : 0;
                        const pctSeq = total > 0 ? (Number(t.escaneos_secuenciales) / total) * 100 : 0;

                        return (
                          <div key={i} className="tabla-bar-row" style={{ padding: '6px 0' }}>
                            <span className="tb-col-name" style={{ minWidth: '120px' }} title={t.tabla}>{t.tabla}</span>
                            <div className="tb-col-bar" style={{ padding: '0 10px' }}>
                               <div className="barra-track" style={{ display: 'flex', width: `${widthTotal}%`, background: 'transparent' }}>
                                 {pctIdx > 0 && <div className="barra-fill indice" style={{ width: `${pctIdx}%`, background: '#4ade80', borderRadius: pctSeq === 0 ? '4px' : '4px 0 0 4px' }} title={`Índice: ${Number(t.escaneos_indice).toLocaleString()}`}></div>}
                                 {pctSeq > 0 && <div className="barra-fill secuencial" style={{ width: `${pctSeq}%`, background: '#f87171', borderRadius: pctIdx === 0 ? '4px' : '0 4px 4px 0' }} title={`Secuencial (ALERTA): ${Number(t.escaneos_secuenciales).toLocaleString()}`}></div>}
                               </div>
                            </div>
                            <span className="tb-col-rows" style={{ width: '80px', color: '#f1f5f9', fontSize: '11px' }}>{total.toLocaleString()}</span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

              </div>

              {/* Acordeón: Explorador de Todas las Tablas */}
              <div className="db-todas-tablas-card">
                <div className="db-mant-header" style={{ cursor: 'pointer' }} onClick={() => setMostrarTodasTablas(!mostrarTodasTablas)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="db-mant-titulo">📂 Explorador avanzado: Todas las tablas y su volumen</span>
                    <span className="badge info">{dbStats.tablas.length} tablas en total</span>
                  </div>
                  <button className="btn-resolver">{mostrarTodasTablas ? 'Ocultar detalles ▲' : 'Ver todas las tablas ▼'}</button>
                </div>
                
                {mostrarTodasTablas && (
                  <div className="todas-tablas-lista">
                    <div className="tabla-bar-header">
                      <span className="tb-col-name">Nombre de Tabla</span>
                      <span className="tb-col-bar">Proporción de Tamaño</span>
                      <span className="tb-col-size">Tamaño</span>
                      <span className="tb-col-rows">Filas (Aprox.)</span>
                    </div>
                    
                    {(() => {
                      const allTables = [...dbStats.tablas].sort((a,b) => Number(b.tamano_bytes) - Number(a.tamano_bytes));
                      const maxBytes = allTables.length > 0 ? Number(allTables[0].tamano_bytes) : 1;
                      
                      return allTables.map((t, i) => (
                        <div key={i} className="tabla-bar-row">
                          <span className="tb-col-name" title={t.tabla}>{t.tabla}</span>
                          <div className="tb-col-bar">
                             <div className="barra-track">
                               <div className="barra-fill" style={{ width: `${(Number(t.tamano_bytes) / maxBytes) * 100}%` }}></div>
                             </div>
                          </div>
                          <span className="tb-col-size">{t.tamano}</span>
                          <span className="tb-col-rows">{Number(t.filas_aprox).toLocaleString()} filas</span>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>

              {/* Mantenimiento: Vacuum */}
              <div className="db-mantenimiento-card">
                <div className="db-mant-header">
                  <span className="db-mant-titulo">🧹 VACUUM — Limpieza de Filas Muertas</span>
                  <button className="btn-vacuum" disabled={!!ejecutandoVacuum} onClick={()=>handleVacuum()}>
                    {ejecutandoVacuum==='all'?<><span className="spinner"/> Ejecutando…</>:'Ejecutar en todas'}
                  </button>
                </div>
                {resultados['v_all'] && (
                  <div className={`db-accion-resultado ${resultados['v_all'].tipo}`}>
                    {resultados['v_all'].tipo==='ok'?'✅':'⚠️'} {resultados['v_all'].msg}
                  </div>
                )}
                <div className="tabla-wrapper" style={{marginTop:12}}>
                  <table>
                    <thead><tr><th>Tabla</th><th>Último vacuum</th><th>Filas muertas</th><th>Estado</th><th>Acción</th></tr></thead>
                    <tbody>
                      {dbStats.tablas.map((t,i)=>(
                        <tr key={i}>
                          <td style={{fontFamily:'monospace',fontSize:12,color:'#94a3b8'}}>{t.tabla}</td>
                          <td style={{fontSize:12,color:'#64748b'}}>{t.ultimo_vacuum??'—'}</td>
                          <td>{Number(t.filas_muertas)>0?<span className="badge warn">{Number(t.filas_muertas).toLocaleString()}</span>:<span style={{color:'#334155'}}>0</span>}</td>
                          <td>
                            {resultados[`v_${t.tabla}`]
                              ? <span className={`badge ${resultados[`v_${t.tabla}`].tipo==='ok'?'ok':'error'}`}>{resultados[`v_${t.tabla}`].tipo==='ok'?'✅ OK':'⚠️ Ver'}</span>
                              : <span className="badge ok">✅ OK</span>}
                          </td>
                          <td>
                            <button className="btn-resolver" disabled={!!ejecutandoVacuum} onClick={()=>handleVacuum(t.tabla)} title="VACUUM ANALYZE esta tabla">
                              {ejecutandoVacuum===t.tabla?<span className="spinner"/>:'🧹'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mantenimiento: Analyze */}
              <div className="db-mantenimiento-card">
                <div className="db-mant-header">
                  <span className="db-mant-titulo">📊 ANALYZE — Estadísticas del Planificador</span>
                  <button className="btn-analyze" disabled={!!ejecutandoAnalyze} onClick={()=>handleAnalyze()}>
                    {ejecutandoAnalyze==='all'?<><span className="spinner"/> Ejecutando…</>:'Ejecutar en todas'}
                  </button>
                </div>
                {resultados['a_all'] && (
                  <div className={`db-accion-resultado ${resultados['a_all'].tipo}`}>
                    {resultados['a_all'].tipo==='ok'?'✅':'⚠️'} {resultados['a_all'].msg}
                  </div>
                )}
                <div className="tabla-wrapper" style={{marginTop:12}}>
                  <table>
                    <thead><tr><th>Tabla</th><th>Último analyze</th><th>Esc. secuencial</th><th>Estado</th><th>Acción</th></tr></thead>
                    <tbody>
                      {dbStats.tablas.map((t,i)=>(
                        <tr key={i}>
                          <td style={{fontFamily:'monospace',fontSize:12,color:'#94a3b8'}}>{t.tabla}</td>
                          <td style={{fontSize:12,color:'#64748b'}}>{t.ultimo_vacuum??'—'}</td>
                          <td style={{color:Number(t.escaneos_secuenciales)>1000?'#f87171':'#64748b'}}>{Number(t.escaneos_secuenciales).toLocaleString()}</td>
                          <td>
                            {resultados[`a_${t.tabla}`]
                              ? <span className={`badge ${resultados[`a_${t.tabla}`].tipo==='ok'?'ok':'error'}`}>{resultados[`a_${t.tabla}`].tipo==='ok'?'✅ OK':'❌ Error'}</span>
                              : <span className="badge ok">✅ OK</span>}
                          </td>
                          <td>
                            <button className="btn-resolver" disabled={!!ejecutandoAnalyze} onClick={()=>handleAnalyze(t.tabla)} title="ANALYZE esta tabla">
                              {ejecutandoAnalyze===t.tabla?<span className="spinner"/>:'📊'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default AdminMonitoreoScreen;