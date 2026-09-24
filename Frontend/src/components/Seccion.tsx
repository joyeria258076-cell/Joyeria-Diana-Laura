// Ruta: Frontend/src/components/Seccion.tsx
// Envoltorio para los bloques de las páginas públicas que el admin controla
// desde "Gestión de páginas" (editor visual).
//
// • Sitio normal: si el id está en configuracion.secciones_ocultas no se
//   renderiza; si la página tiene orden guardado (secciones_orden) el bloque
//   recibe su posición con CSS `order` (el contenedor debe tener .dl-orden).
// • Modo editor (la página dentro del iframe del admin con ?editor=1): el
//   bloque se resalta, un clic lo oculta/muestra y todo se comunica con la
//   pantalla del admin mediante postMessage.
import React, { useEffect, useRef, useSyncExternalStore } from 'react';
import { productsAPI } from '../services/api';
import '../styles/Seccion.css';

type Orden = Record<string, string[]>;
interface Estado { ocultas: Set<string>; orden: Orden; }

let estado: Estado = { ocultas: new Set(), orden: {} };
const oyentes = new Set<() => void>();
let cargado = false;

const notificar = () => oyentes.forEach(fn => fn());
const actualizar = (parcial: Partial<Estado>) => { estado = { ...estado, ...parcial }; notificar(); };

export const enModoEditor = (() => {
  try {
    return window.parent !== window && new URLSearchParams(window.location.search).get('editor') === '1';
  } catch { return false; }
})();

const leerJson = (res: any, def: any) => {
  try { const v = JSON.parse(res?.data?.valor ?? ''); return v ?? def; } catch { return def; }
};

const cargar = () => {
  if (cargado) return;
  cargado = true;
  productsAPI.getConfiguracionByClave('secciones_ocultas')
    .then((res: any) => { const l = leerJson(res, []); if (Array.isArray(l)) actualizar({ ocultas: new Set(l.map(String)) }); })
    .catch(() => { /* todo visible */ });
  productsAPI.getConfiguracionByClave('secciones_orden')
    .then((res: any) => { const o = leerJson(res, {}); if (o && typeof o === 'object') actualizar({ orden: o }); })
    .catch(() => { /* orden original */ });

  if (enModoEditor) {
    window.addEventListener('message', (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const d = e.data;
      if (d?.tipo === 'dl-ocultas' && Array.isArray(d.ids)) actualizar({ ocultas: new Set(d.ids) });
      if (d?.tipo === 'dl-orden' && d.orden && typeof d.orden === 'object') actualizar({ orden: d.orden });
      if (d?.tipo === 'dl-ir' && d.id) {
        const el = document.querySelector(`[data-seccion="${CSS.escape(d.id)}"]`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.remove('dl-sec--foco');
          void (el as HTMLElement).offsetWidth; // reinicia la animación
          el.classList.add('dl-sec--foco');
        }
      }
    });
    window.parent.postMessage({ tipo: 'dl-listo', ruta: window.location.pathname }, window.location.origin);
  }
};

const suscribir = (fn: () => void) => { oyentes.add(fn); cargar(); return () => { oyentes.delete(fn); }; };
const obtener = () => estado;

interface Props {
  id: string;          // "<pagina>.<bloque>", p. ej. "inicio.estadisticas"
  nombre: string;      // nombre legible para el admin
  children: React.ReactNode;
}

const Seccion: React.FC<Props> = ({ id, nombre, children }) => {
  const { ocultas, orden } = useSyncExternalStore(suscribir, obtener);
  const oculta = ocultas.has(id);
  const pagina = id.split('.')[0];
  const listaOrden = orden[pagina];
  const posicion = listaOrden ? (listaOrden.indexOf(id) >= 0 ? listaOrden.indexOf(id) : 999) : undefined;
  const registrado = useRef(false);

  // Registrar el bloque en el panel del admin (en el orden en que aparece)
  useEffect(() => {
    if (!enModoEditor || registrado.current) return;
    registrado.current = true;
    window.parent.postMessage({ tipo: 'dl-seccion', id, nombre }, window.location.origin);
  }, [id, nombre]);

  if (!enModoEditor) {
    if (oculta) return null;
    return posicion === undefined ? <>{children}</> : <div className="dl-sec-orden" style={{ order: posicion }}>{children}</div>;
  }

  const alternar = (e: React.MouseEvent) => {
    // En el editor, un clic en cualquier parte del bloque lo selecciona (no navega)
    e.preventDefault();
    e.stopPropagation();
    window.parent.postMessage({ tipo: 'dl-toggle', id }, window.location.origin);
  };

  return (
    <div className={`dl-sec${oculta ? ' dl-sec--oculta' : ''}`} onClickCapture={alternar} data-seccion={id}
      style={posicion === undefined ? undefined : { order: posicion }}>
      <span className="dl-sec-etiqueta">
        {nombre} · {oculta ? 'Oculta — clic para mostrar' : 'Clic para ocultar'}
      </span>
      {children}
    </div>
  );
};

export default Seccion;
