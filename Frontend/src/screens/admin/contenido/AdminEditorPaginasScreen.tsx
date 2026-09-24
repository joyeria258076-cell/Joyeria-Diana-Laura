// Ruta: Frontend/src/screens/admin/contenido/AdminEditorPaginasScreen.tsx
// Gestión de páginas con vista previa real: se carga la página pública dentro
// de un iframe (?editor=1) y el admin elige qué bloques mostrar u ocultar.
// Los bloques se declaran en las páginas con <Seccion id nombre>.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AiOutlineEye, AiOutlineEyeInvisible, AiOutlineEdit, AiOutlineDesktop, AiOutlineMobile, AiOutlineReload,
} from 'react-icons/ai';
import { productsAPI, carritoAPI } from '../../../services/api';
import '../../../styles/SitioSecciones.css';
import './AdminEditorPaginasScreen.css';

const PAGINAS = [
  { ruta: '/', nombre: 'Inicio' },
  { ruta: '/contacto-publico', nombre: 'Contacto' },
  { ruta: '/ayuda-publica', nombre: 'Centro de ayuda' },
  { ruta: '/ubicacion-publica', nombre: 'Ubicación' },
];

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
  }, []);

  // Mandar la lista actual (sin guardar) a la vista previa
  const enviarOcultas = useCallback((lista: string[]) => {
    iframeRef.current?.contentWindow?.postMessage({ tipo: 'dl-ocultas', ids: lista }, window.location.origin);
  }, []);

  useEffect(() => { enviarOcultas(ocultas); }, [ocultas, enviarOcultas]);

  const alternar = useCallback((id: string) => {
    setMsg(null);
    setOcultas(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, []);

  // Mensajes que llegan desde la página dentro del iframe
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const d = e.data;
      if (d?.tipo === 'dl-listo') enviarOcultas(ocultas);
      if (d?.tipo === 'dl-seccion') {
        setBloques(prev => prev.some(b => b.id === d.id) ? prev : [...prev, { id: d.id, nombre: d.nombre }]);
      }
      if (d?.tipo === 'dl-toggle') alternar(d.id);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [ocultas, enviarOcultas, alternar]);

  const cambiarPagina = (p: typeof PAGINAS[number]) => {
    setPagina(p);
    setBloques([]);
  };

  const hayCambios = JSON.stringify([...ocultas].sort()) !== JSON.stringify([...guardadas].sort());

  const guardar = async () => {
    setGuardando(true);
    setMsg(null);
    try {
      const res: any = await carritoAPI.setConfiguracion('secciones_ocultas', JSON.stringify(ocultas));
      if (res && res.success === false) throw new Error(res.message);
      setGuardadas(ocultas);
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
          Así se ven las páginas ahora mismo. Haz clic en cualquier bloque de la vista previa
          (o usa los interruptores) para ocultarlo o mostrarlo, y después guarda.
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
          <ul className="aep-lista">
            {bloques.map(b => {
              const oculta = ocultas.includes(b.id);
              const editar = EDITAR[b.id];
              return (
                <li key={b.id} className={`aep-bloque${oculta ? ' oculta' : ''}`}>
                  <button className="aep-switch" role="switch" aria-checked={!oculta} onClick={() => alternar(b.id)}
                    title={oculta ? 'Mostrar bloque' : 'Ocultar bloque'}>
                    {oculta ? <AiOutlineEyeInvisible size={16} /> : <AiOutlineEye size={16} />}
                  </button>
                  <span className="aep-bloque-nombre">{b.nombre}</span>
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
              <button className="sx-btn sx-btn--ghost" onClick={() => { setOcultas(guardadas); setMsg(null); }} disabled={guardando}>
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
