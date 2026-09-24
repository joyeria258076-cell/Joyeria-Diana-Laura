// Ruta: Frontend/src/components/Seccion.tsx
// Envoltorio para los bloques de las páginas públicas que el admin puede
// ocultar desde "Gestión de páginas" (editor visual).
//
// • Sitio normal: si el id está en configuracion.secciones_ocultas, no se renderiza.
// • Modo editor (la página se abre dentro del iframe del admin con ?editor=1):
//   el bloque se resalta al pasar el mouse, un clic lo marca oculto/visible y
//   se comunica con la pantalla del admin mediante postMessage.
import React, { useEffect, useSyncExternalStore } from 'react';
import { productsAPI } from '../services/api';
import '../styles/Seccion.css';

// ── Store de ids ocultos (compartido por todas las secciones) ──
let ocultas = new Set<string>();
const oyentes = new Set<() => void>();
let cargado = false;

const notificar = () => oyentes.forEach(fn => fn());
const setOcultas = (ids: string[]) => { ocultas = new Set(ids); notificar(); };

export const enModoEditor = (() => {
  try {
    return window.parent !== window && new URLSearchParams(window.location.search).get('editor') === '1';
  } catch { return false; }
})();

const cargarOcultas = () => {
  if (cargado) return;
  cargado = true;
  productsAPI.getConfiguracionByClave('secciones_ocultas')
    .then((res: any) => {
      const lista = JSON.parse(res?.data?.valor || '[]');
      if (Array.isArray(lista)) setOcultas(lista.map(String));
    })
    .catch(() => { /* sin config: todo visible */ });

  if (enModoEditor) {
    // El admin manda la lista actual (aún sin guardar) para refrescar la vista previa
    window.addEventListener('message', (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.tipo === 'dl-ocultas' && Array.isArray(e.data.ids)) setOcultas(e.data.ids);
    });
    window.parent.postMessage({ tipo: 'dl-listo', ruta: window.location.pathname }, window.location.origin);
  }
};

const suscribir = (fn: () => void) => { oyentes.add(fn); cargarOcultas(); return () => { oyentes.delete(fn); }; };
const obtener = () => ocultas;

interface Props {
  id: string;          // p. ej. "inicio.estadisticas"
  nombre: string;      // nombre legible para el admin
  children: React.ReactNode;
}

const Seccion: React.FC<Props> = ({ id, nombre, children }) => {
  const actuales = useSyncExternalStore(suscribir, obtener);
  const oculta = actuales.has(id);

  // Registrar el bloque en el panel del admin
  useEffect(() => {
    if (!enModoEditor) return;
    window.parent.postMessage({ tipo: 'dl-seccion', id, nombre }, window.location.origin);
  }, [id, nombre]);

  if (!enModoEditor) return oculta ? null : <>{children}</>;

  const alternar = (e: React.MouseEvent) => {
    // En el editor, un clic en cualquier parte del bloque lo selecciona (no navega)
    e.preventDefault();
    e.stopPropagation();
    window.parent.postMessage({ tipo: 'dl-toggle', id }, window.location.origin);
  };

  return (
    <div className={`dl-sec${oculta ? ' dl-sec--oculta' : ''}`} onClickCapture={alternar} data-seccion={id}>
      <span className="dl-sec-etiqueta">
        {nombre} · {oculta ? 'Oculta — clic para mostrar' : 'Clic para ocultar'}
      </span>
      {children}
    </div>
  );
};

export default Seccion;
