// Ruta: Frontend/src/screens/admin/contenido/AdminEditorPaginasScreen.tsx
// Gestión de páginas con vista previa real: se carga la página pública dentro
// de un iframe (?editor=1) y el admin elige qué bloques mostrar u ocultar.
// Los bloques se declaran en las páginas con <Seccion id nombre>.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AiOutlineEye, AiOutlineEyeInvisible, AiOutlineEdit, AiOutlineDesktop, AiOutlineMobile, AiOutlineReload,
  AiOutlineArrowUp, AiOutlineArrowDown, AiOutlineAim,
} from 'react-icons/ai';
import { productsAPI, carritoAPI } from '../../../services/api';
import '../../../styles/SitioSecciones.css';
import './AdminEditorPaginasScreen.css';

// clave = prefijo de los ids de sus bloques; ordenable = sus bloques se pueden reacomodar
const PAGINAS = [
  { ruta: '/', nombre: 'Inicio', clave: 'inicio', ordenable: true },
  { ruta: '/contacto-publico', nombre: 'Contacto', clave: 'contacto', ordenable: false },
  { ruta: '/ayuda-publica', nombre: 'Centro de ayuda', clave: 'ayuda', ordenable: false },
  { ruta: '/ubicacion-publica', nombre: 'Ubicación', clave: 'ubicacion', ordenable: false },
];
// Bloques fuera del contenedor ordenable (van fijos arriba)
const FIJOS = new Set(['inicio.ticker']);
type Orden = Record<string, string[]>;

// Dónde se edita el contenido de cada bloque
const EDITAR: Record<string, { label: string; ruta: string }> = {
  'inicio.ticker': { label: 'Promociones', ruta: '/admin/promociones' },
  'inicio.carrusel': { label: 'Contenido de inicio', ruta: '/admin-contenido/pagina-inicio' },
  'inicio.confianza': { label: 'Información empresarial', ruta: '/admin-contenido/info' },
  'inicio.estadisticas': { label: 'Información empresarial', ruta: '/admin-contenido/info' },
  'inicio.colecciones': { label: 'Colecciones', ruta: '/admin/colecciones' },
  'inicio.destacadas': { label: 'Inventario', ruta: '/admin-inventario' },
  'inicio.seleccion': { label: 'Inventario', ruta: '/admin-inventario' },
  'inicio.promociones': { label: 'Promociones', ruta: '/admin/promociones' },
  'inicio.noticias': { label: 'Noticias', ruta: '/admin-contenido/pagina-noticias' },
  'contacto.whatsapp': { label: 'Información empresarial', ruta: '/admin-contenido/info' },
  'contacto.datos': { label: 'Información empresarial', ruta: '/admin-contenido/info' },
  'contacto.redes': { label: 'Información empresarial', ruta: '/admin-contenido/info' },
  'ayuda.faq': { label: 'Preguntas frecuentes', ruta: '/admin-contenido/faq' },
  'ayuda.asistente': { label: 'Información empresarial', ruta: '/admin-contenido/info' },
  'ubicacion.mapa': { label: 'Información empresarial', ruta: '/admin-contenido/info' },
  'ubicacion.horario': { label: 'Información empresarial', ruta: '/admin-contenido/info' },
  'ubicacion.entregas': { label: 'Zonas de entrega', ruta: '/admin-contenido/zonas-entrega' },
};

interface Bloque { id: string; nombre: string; }

const AdminEditorPaginasScreen: React.FC = () => {
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [pagina, setPagina] = useState(PAGINAS[0]);
  const [dispositivo, setDispositivo] = useState<'escritorio' | 'movil'>('escritorio');
  const [bloques, setBloques] = useState<Bloque[]>([]);
  const [ocultas, setOcultas] = useState<string[]>([]);
  const [guardadas, setGuardadas] = useState<string[]>([]);
  const [orden, setOrden] = useState<Orden>({});
  const [ordenGuardado, setOrdenGuardado] = useState<Orden>({});
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    productsAPI.getConfiguracionByClave('secciones_ocultas')
      .then((res: any) => {
        const lista = JSON.parse(res?.data?.valor || '[]');
        if (Array.isArray(lista)) { setOcultas(lista); setGuardadas(lista); }
      })
      .catch(() => { /* todo visible */ });
    productsAPI.getConfiguracionByClave('secciones_orden')
      .then((res: any) => {
        const o = JSON.parse(res?.data?.valor || '{}');
        if (o && typeof o === 'object') { setOrden(o); setOrdenGuardado(o); }
      })
      .catch(() => { /* orden original */ });
  }, []);

  // Mandar la lista actual (sin guardar) a la vista previa
  const enviarOcultas = useCallback((lista: string[]) => {
    iframeRef.current?.contentWindow?.postMessage({ tipo: 'dl-ocultas', ids: lista }, window.location.origin);
  }, []);

  useEffect(() => { enviarOcultas(ocultas); }, [ocultas, enviarOcultas]);

  const enviarOrden = useCallback((o: Orden) => {
    iframeRef.current?.contentWindow?.postMessage({ tipo: 'dl-orden', orden: o }, window.location.origin);
  }, []);
  useEffect(() => { enviarOrden(orden); }, [orden, enviarOrden]);

  const irA = (id: string) =>
    iframeRef.current?.contentWindow?.postMessage({ tipo: 'dl-ir', id }, window.location.origin);

  const alternar = useCallback((id: string) => {
    setMsg(null);
    setOcultas(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, []);

  // Mensajes que llegan desde la página dentro del iframe
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const d = e.data;
      if (d?.tipo === 'dl-listo') { enviarOcultas(ocultas); enviarOrden(orden); }
      if (d?.tipo === 'dl-seccion') {
        setBloques(prev => prev.some(b => b.id === d.id) ? prev : [...prev, { id: d.id, nombre: d.nombre }]);
      }
      if (d?.tipo === 'dl-toggle') alternar(d.id);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [ocultas, orden, enviarOcultas, enviarOrden, alternar]);

  const cambiarPagina = (p: typeof PAGINAS[number]) => {
    setPagina(p);
    setBloques([]);
  };

  // Bloques de la página en el orden en que se muestran
  const listaOrdenada = (() => {
    const o = orden[pagina.clave];
    if (!o) return bloques;
    const pos = (id: string) => FIJOS.has(id) ? -1 : (o.indexOf(id) >= 0 ? o.indexOf(id) : 999);
    return [...bloques].sort((a, b) => pos(a.id) - pos(b.id));
  })();

  const mover = (id: string, dir: -1 | 1) => {
    const movibles = listaOrdenada.filter(b => !FIJOS.has(b.id)).map(b => b.id);
    const i = movibles.indexOf(id), j = i + dir;
    if (i < 0 || j < 0 || j >= movibles.length) return;
    [movibles[i], movibles[j]] = [movibles[j], movibles[i]];
    setMsg(null);
    setOrden(prev => ({ ...prev, [pagina.clave]: movibles }));
    setTimeout(() => irA(id), 80);
  };

  const cambiosVisibilidad = ocultas.filter(x => !guardadas.includes(x)).length + guardadas.filter(x => !ocultas.includes(x)).length;
  const cambioOrden = JSON.stringify(orden) !== JSON.stringify(ordenGuardado);
  const hayCambios = cambiosVisibilidad > 0 || cambioOrden;

  const guardar = async () => {
    setGuardando(true);
    setMsg(null);
    try {
      const [r1, r2]: any[] = await Promise.all([
        carritoAPI.setConfiguracion('secciones_ocultas', JSON.stringify(ocultas)),
        carritoAPI.setConfiguracion('secciones_orden', JSON.stringify(orden)),
      ]);
      if (r1?.success === false || r2?.success === false) throw new Error(r1?.message || r2?.message);
      setGuardadas(ocultas);
      setOrdenGuardado(orden);
      setMsg({ tipo: 'ok', texto: 'Cambios guardados: ya se aplican en el sitio.' });
    } catch (err: any) {
      setMsg({ tipo: 'error', texto: err?.message || 'No se pudieron guardar los cambios.' });
    } finally {
      setGuardando(false);
    }
  };

  const src = `${pagina.ruta}?editor=1&r=${recarga}`;
  const ocultasPagina = bloques.filter(b => ocultas.includes(b.id)).length;

  return (
    <main className="aep-page">
      <header className="sx-head" style={{ marginBottom: '1.75rem' }}>
        <div className="sx-eyebrow">Contenido</div>
        <h1 className="sx-title">Gestión de <span>páginas</span></h1>
        <p className="sx-subtitle">
          Así se ven las páginas ahora mismo. Haz clic en un bloque de la vista previa para
          ocultarlo o mostrarlo; en Inicio también puedes cambiar el orden con las flechas.
          Nada cambia en el sitio hasta que guardas.
        </p>
      </header>

      <div className="aep-toolbar">
        <div className="aep-tabs" role="tablist">
          {PAGINAS.map(p => (
            <button key={p.ruta} role="tab" aria-selected={pagina.ruta === p.ruta}
              className={`aep-tab${pagina.ruta === p.ruta ? ' activa' : ''}`} onClick={() => cambiarPagina(p)}>
              {p.nombre}
            </button>
          ))}
        </div>
        <div className="aep-tools">
          <button className={`aep-icon${dispositivo === 'escritorio' ? ' activa' : ''}`} onClick={() => setDispositivo('escritorio')} title="Vista escritorio" aria-label="Vista escritorio"><AiOutlineDesktop size={18} /></button>
          <button className={`aep-icon${dispositivo === 'movil' ? ' activa' : ''}`} onClick={() => setDispositivo('movil')} title="Vista celular" aria-label="Vista celular"><AiOutlineMobile size={18} /></button>
          <button className="aep-icon" onClick={() => { setBloques([]); setRecarga(r => r + 1); }} title="Recargar vista previa" aria-label="Recargar vista previa"><AiOutlineReload size={18} /></button>
        </div>
      </div>

      <div className="aep-layout">
        <div className={`aep-preview aep-preview--${dispositivo}`}>
          <iframe ref={iframeRef} key={src} src={src} title={`Vista previa: ${pagina.nombre}`} />
        </div>

        <aside className="aep-panel sx-card sx-card--static">
          <h2 className="aep-panel-title">Bloques de {pagina.nombre}</h2>
          <p className="aep-panel-sub">
            {bloques.length === 0 ? 'Cargando vista previa…' : `${bloques.length - ocultasPagina} visibles · ${ocultasPagina} ocultos`}
          </p>
          {hayCambios && (
            <p className="aep-cambios">
              Sin guardar: {[cambiosVisibilidad > 0 && `${cambiosVisibilidad} ${cambiosVisibilidad === 1 ? 'bloque' : 'bloques'} con visibilidad cambiada`,
                cambioOrden && 'nuevo orden'].filter(Boolean).join(' · ')}
            </p>
          )}
          <ul className="aep-lista">
            {listaOrdenada.map((b, idx) => {
              const oculta = ocultas.includes(b.id);
              const editar = EDITAR[b.id];
              const movible = pagina.ordenable && !FIJOS.has(b.id);
              const primeroMovible = listaOrdenada.findIndex(x => !FIJOS.has(x.id));
              return (
                <li key={b.id} className={`aep-bloque${oculta ? ' oculta' : ''}`}>
                  <button className="aep-switch" role="switch" aria-checked={!oculta} onClick={() => alternar(b.id)}
                    title={oculta ? 'Mostrar bloque' : 'Ocultar bloque'}>
                    {oculta ? <AiOutlineEyeInvisible size={16} /> : <AiOutlineEye size={16} />}
                  </button>
                  <button className="aep-bloque-nombre" onClick={() => irA(b.id)} title="Ver en la vista previa">
                    {b.nombre} <AiOutlineAim size={12} />
                  </button>
                  {movible && (
                    <span className="aep-mover">
                      <button onClick={() => mover(b.id, -1)} disabled={idx <= primeroMovible} aria-label="Subir" title="Subir"><AiOutlineArrowUp size={13} /></button>
                      <button onClick={() => mover(b.id, 1)} disabled={idx === listaOrdenada.length - 1} aria-label="Bajar" title="Bajar"><AiOutlineArrowDown size={13} /></button>
                    </span>
                  )}
                  {editar && (
                    <button className="aep-editar" onClick={() => navigate(editar.ruta)} title={`Editar en ${editar.label}`}>
                      <AiOutlineEdit size={14} /> {editar.label}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>

          {msg && <div className={`aep-msg aep-msg--${msg.tipo}`}>{msg.texto}</div>}

          <div className="aep-acciones">
            {hayCambios && (
              <button className="sx-btn sx-btn--ghost" onClick={() => { setOcultas(guardadas); setOrden(ordenGuardado); setMsg(null); }} disabled={guardando}>
                Descartar
              </button>
            )}
            <button className="sx-btn" onClick={guardar} disabled={!hayCambios || guardando}>
              {guardando ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </aside>
      </div>
    </main>
  );
};

export default AdminEditorPaginasScreen;
