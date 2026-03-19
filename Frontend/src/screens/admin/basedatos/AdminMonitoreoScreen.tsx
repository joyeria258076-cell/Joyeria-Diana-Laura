// src/screens/admin/basedatos/AdminMonitoreoScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { metricsAPI } from '../../../services/metricsAPI';
import './styles/AdminMonitoreoScreen.css';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Resumen {
  total_requests: number; total_errores: number; avg_respuesta_ms: number;
  requests_lentos: number; avg_memoria_mb: number; sesiones_activas: number; errores_sin_resolver: number;
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtHora  = (iso: string) => new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
const fmtFecha = (iso: string) => new Date(iso).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const fmtMs    = (ms: number)  => ms >= 1000 ? `${(ms/1000).toFixed(1)}s` : `${Math.round(ms)}ms`;

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

  const [horasRend,       setHorasRend]      = useState(24);
  const [soloNoResueltos, setSoloNoResueltos] = useState(false);
  const [diasActividad,   setDiasActividad]  = useState(7);
  const [pageErr, setPageErr] = useState(1);
  const [pageSes, setPageSes] = useState(1);
  const [pageAud, setPageAud] = useState(1);

  const [ejecutandoVacuum,  setEjecutandoVacuum]  = useState<string|null>(null);
  const [ejecutandoAnalyze, setEjecutandoAnalyze] = useState<string|null>(null);
  const [resultados, setResultados] = useState<Record<string,{tipo:'ok'|'error';msg:string}>>({});

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

  useEffect(() => { cargarTodo(); }, []);
  useEffect(() => { if (!cargando) metricsAPI.getRendimiento(horasRend).then(setRendimiento).catch(()=>{}); }, [horasRend]);
  useEffect(() => { if (!cargando) { setPageErr(1); metricsAPI.getErrores(soloNoResueltos,1).then(setErroresPag).catch(()=>{}); } }, [soloNoResueltos]);
  useEffect(() => { if (!cargando) { setPageSes(1); setPageAud(1); metricsAPI.getActividad(diasActividad,1,1).then(setActividad).catch(()=>{}); } }, [diasActividad]);

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
        ? 'Supabase gestiona VACUUM automáticamente (autovacuum activo)'
        : e.message;
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

  const maxRequests = Math.max(...rendimiento.map(p=>Number(p.total_requests)),1);
  const maxTamano   = dbStats ? Math.max(...dbStats.tablas.map(t=>t.tamano_bytes),1) : 1;

  const TABS: {id:Tab;icon:string;label:string}[] = [
    {id:'rendimiento', icon:'📈', label:'Rendimiento'},
    {id:'endpoints',   icon:'🐢', label:'Endpoints lentos'},
    {id:'errores',     icon:'🚨', label:'Errores'},
    {id:'actividad',   icon:'👥', label:'Actividad'},
    {id:'database',    icon:'🗄️', label:'Base de datos'},
  ];

  return (
    <div className="monitoreo-screen">
      <div className="monitoreo-header">
        <div>
          <div className="monitoreo-titulo"><h1>🖥️ Monitoreo del sistema</h1></div>
          <p>Última actualización: {ultimaAct.toLocaleTimeString('es-MX')}</p>
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
            {clase:'t-purple',icono:'purple',emoji:'📊',valor:Number(resumen.total_requests).toLocaleString(),    label:'Requests (24h)'},
            {clase:'t-red',   icono:'red',   emoji:'🔴',valor:Number(resumen.total_errores).toLocaleString(),     label:'Errores HTTP'},
            {clase:'t-blue',  icono:'blue',  emoji:'⚡',valor:fmtMs(Number(resumen.avg_respuesta_ms)),            label:'Tiempo promedio'},
            {clase:'t-amber', icono:'amber', emoji:'🐢',valor:Number(resumen.requests_lentos).toLocaleString(),   label:'Requests lentos'},
            {clase:'t-teal',  icono:'teal',  emoji:'🧠',valor:`${Number(resumen.avg_memoria_mb).toFixed(1)} MB`,  label:'Memoria promedio'},
            {clase:'t-green', icono:'green', emoji:'👥',valor:Number(resumen.sesiones_activas).toLocaleString(),  label:'Sesiones activas'},
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

      {/* ══ Rendimiento ══ */}
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
            <p className="seccion-titulo">Requests por hora</p>
            <div className="grafica-leyenda">
              <span className="leyenda-item"><span className="leyenda-dot" style={{background:'#ecb2c3'}}/> Normal</span>
              <span className="leyenda-item"><span className="leyenda-dot" style={{background:'#f87171'}}/> Con errores</span>
            </div>
            {rendimiento.length===0
              ? <div className="estado-carga">Sin datos para el período seleccionado</div>
              : <div className="linea-tiempo">
                  {rendimiento.map((p,i)=>(
                    <div key={i} className="lt-columna"
                      title={`${fmtHora(p.hora)} — ${p.total_requests} req · prom ${fmtMs(Number(p.avg_ms))} · ${p.errores} errores`}>
                      <div className="lt-barra" style={{height:`${Math.max(4,(Number(p.total_requests)/maxRequests)*76)}px`,background:Number(p.errores)>0?'#f87171':'#ecb2c3'}}/>
                      <span className="lt-hora">{fmtHora(p.hora).split(':')[0]}h</span>
                    </div>
                  ))}
                </div>
            }
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
                      <td style={{color:'#64748b',fontSize:12}}>{fmtFecha(p.hora)}</td>
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

      {/* ══ Endpoints ══ */}
      {tab==='endpoints' && (
        <>
          <p className="seccion-titulo">Top endpoints más lentos <span>— últimos 7 días</span></p>
          <div className="grafica-barras">
            {endpoints.length===0
              ? <div className="estado-carga">Sin datos suficientes aún</div>
              : (()=>{
                  const maxMs=Math.max(...endpoints.map(e=>Number(e.avg_ms)),1);
                  return endpoints.map((ep,i)=>(
                    <div key={i} className="barra-fila">
                      <span className="barra-label" title={`${ep.method} ${ep.endpoint}`}><b style={{color:'#94a3b8'}}>{ep.method}</b> {ep.endpoint}</span>
                      <div className="barra-track"><div className={`barra-fill${Number(ep.avg_ms)>1000?' lento':''}`} style={{width:`${(Number(ep.avg_ms)/maxMs)*100}%`}}/></div>
                      <span className="barra-valor">{fmtMs(Number(ep.avg_ms))}</span>
                    </div>
                  ));
                })()}
          </div>
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

      {/* ══ Errores ══ */}
      {tab==='errores' && (
        <>
          <div className="filtros-row">
            <label className="check-label">
              <input type="checkbox" checked={soloNoResueltos} onChange={e=>setSoloNoResueltos(e.target.checked)}/>
              Solo errores sin resolver
            </label>
            <span style={{fontSize:11,color:'#475569',background:'rgba(71,85,105,0.15)',padding:'3px 8px',borderRadius:'99px',border:'1px solid #334155'}}>
              Incluye excepciones del servidor y requests HTTP fallidos (agrupados por endpoint)
            </span>
          </div>
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
                      {/* ✅ Mensaje con badge de ocurrencias */}
                      <td style={{maxWidth:220,fontSize:12,color:'#cbd5e1'}} title={e.mensaje}>
                        {e.mensaje.length>55?e.mensaje.slice(0,55)+'…':e.mensaje}
                        {e.ocurrencias && e.ocurrencias > 1 && (
                          <span className="badge warn" style={{marginLeft:6,fontSize:10}}>×{e.ocurrencias}</span>
                        )}
                      </td>
                      <td style={{fontFamily:'monospace',fontSize:11,color:'#64748b'}}>{e.method&&e.endpoint?`${e.method} ${e.endpoint}`:'—'}</td>
                      <td style={{fontSize:12,color:'#64748b'}}>{e.usuario_email??'—'}</td>
                      <td style={{fontSize:12,color:'#475569',whiteSpace:'nowrap'}}>{fmtFecha(e.fecha)}</td>
                      <td><span className={`badge ${e.resuelta?'resuelto':'pendiente'}`}>{e.resuelta?'Resuelto':'Pendiente'}</span></td>
                      <td>{e.fuente==='sistema'&&!e.resuelta&&<button className="btn-resolver" onClick={()=>handleResolverError(e.id)}>✓</button>}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ══ Actividad ══ */}
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
          <div className="grafica-barras">
            {actividad.logins.length===0 ? <div className="estado-carga">Sin datos</div>
              : actividad.logins.map((l,i)=>(
                <div key={i} className="barra-fila">
                  <span className="barra-label">{new Date(l.dia).toLocaleDateString('es-MX',{day:'2-digit',month:'short'})}</span>
                  <div className="barra-track"><div className="barra-fill" style={{width:`${(l.exitosos/Math.max(l.exitosos+l.fallidos,1))*100}%`}}/></div>
                  <span className="barra-valor" style={{fontSize:11}}><span style={{color:'#4ade80'}}>✓{l.exitosos}</span>{' '}<span style={{color:'#f87171'}}>✗{l.fallidos}</span></span>
                </div>
              ))}
          </div>
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
          <p className="seccion-titulo">Sesiones nuevas por día</p>
          <div className="tabla-wrapper">
            <table>
              <thead><tr><th>Día</th><th>Sesiones nuevas</th><th>Usuarios únicos</th></tr></thead>
              <tbody>
                {actividad.sesiones.length===0 ? <tr><td colSpan={3} style={{textAlign:'center',color:'#334155'}}>Sin datos</td></tr>
                  : actividad.sesiones.slice().reverse().map((s,i)=>(
                    <tr key={i}>
                      <td style={{color:'#64748b'}}>{new Date(s.dia).toLocaleDateString('es-MX',{weekday:'short',day:'2-digit',month:'short'})}</td>
                      <td>{s.nuevas_sesiones}</td>
                      <td>{s.usuarios_unicos}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ══ Base de datos ══ */}
      {tab==='database' && (
        <>
          {!dbStats
            ? <div className="estado-carga"><span className="spinner"/> Cargando estadísticas…</div>
            : (
              <>
                {/* Conexión y salud */}
                <div className="db-salud-grid">
                  <div className="db-salud-card">
                    <div className="db-salud-card-titulo">🔗 Conexión</div>
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

                {/* VACUUM */}
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

                {/* ANALYZE */}
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
                            <td style={{color:Number(t.escaneos_secuenciales)>1000?'#fbbf24':'#64748b'}}>{Number(t.escaneos_secuenciales).toLocaleString()}</td>
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

                {/* Índices */}
                <p className="seccion-titulo">Índices más usados</p>
                <div className="tabla-wrapper">
                  <table>
                    <thead><tr><th>Tabla</th><th>Índice</th><th>Usos</th><th>Tamaño</th></tr></thead>
                    <tbody>
                      {dbStats.indices.map((idx,i)=>(
                        <tr key={i}>
                          <td style={{fontFamily:'monospace',fontSize:12,color:'#94a3b8'}}>{idx.tabla}</td>
                          <td style={{fontFamily:'monospace',fontSize:11,color:'#64748b'}}>{idx.indice}</td>
                          <td>{Number(idx.usos).toLocaleString()}</td>
                          <td><span className="badge info">{idx.tamano}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Tablas por tamaño */}
                <p className="seccion-titulo">Tablas por tamaño <span>— top 15</span></p>
                <div className="grafica-barras">
                  {dbStats.tablas.map((t,i)=>(
                    <div key={i} className="barra-fila">
                      <span className="barra-label" title={t.tabla}>{t.tabla}</span>
                      <div className="barra-track"><div className="barra-fill" style={{width:`${(t.tamano_bytes/maxTamano)*100}%`}}/></div>
                      <span className="barra-valor">{t.tamano}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
        </>
      )}
    </div>
  );
};

export default AdminMonitoreoScreen;