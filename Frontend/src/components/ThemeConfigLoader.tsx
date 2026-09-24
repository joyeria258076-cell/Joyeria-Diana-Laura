// Ruta: Frontend/src/components/ThemeConfigLoader.tsx
// Temas del sitio (mismo lenguaje que la app móvil). Los colores viven en
// styles/temas.css como bloques [data-theme="…"]; aquí solo se decide cuál
// aplicar y se pone el atributo en <html>.
//
// Orden de prioridad del tema:
//   1. ?tema=<clave> en la URL (vista previa en una pestaña)
//   2. elección del usuario (localStorage, selector del perfil / menú)
//   3. tema predeterminado del sitio que elige el admin (configuracion.sitio_paleta)
//   4. Negro · Rosa
import { useEffect, useSyncExternalStore } from 'react';
import { productsAPI } from '../services/api';

export type ClaveTema = 'negro_rosa' | 'blanco_rosa' | 'negro_dorado';

// Valores de cada tema (se usan para las muestras y miniaturas; la fuente
// de verdad de los estilos es temas.css).
export const PALETAS: Record<ClaveTema, Record<string, string>> = {
  negro_rosa: {
    '--color-bg': '#0D080C', '--color-surface': '#191116', '--color-surface-2': '#261C22',
    '--color-rose-gold': '#E9AFC7', '--color-champagne': '#A792C2', '--color-primary-strong': '#CF819F',
    '--color-text': '#FFF4FA', '--color-text-muted': '#C7A7BB', '--color-border': 'rgba(255,190,220,.10)',
  },
  blanco_rosa: {
    '--color-bg': '#FFF6FA', '--color-surface': '#FFFFFF', '--color-surface-2': '#FCE8F1',
    '--color-rose-gold': '#C9668F', '--color-champagne': '#9486B8', '--color-primary-strong': '#B85C83',
    '--color-text': '#2A0F22', '--color-text-muted': '#8D647C', '--color-border': 'rgba(201,102,143,.16)',
  },
  negro_dorado: {
    '--color-bg': '#0A0A0A', '--color-surface': '#141414', '--color-surface-2': '#1E1E1E',
    '--color-rose-gold': '#C9956C', '--color-champagne': '#E8D5B7', '--color-primary-strong': '#B07E57',
    '--color-text': '#F5F0EB', '--color-text-muted': '#9E9087', '--color-border': 'rgba(201,149,108,.18)',
  },
};

export const NOMBRES_TEMA: Record<ClaveTema, string> = {
  negro_rosa: 'Negro · Rosa',
  blanco_rosa: 'Blanco · Rosa',
  negro_dorado: 'Negro · Dorado',
};

export const TEMAS = Object.keys(PALETAS) as ClaveTema[];
const TEMA_POR_DEFECTO: ClaveTema = 'negro_rosa';
const CLAVE_LS = 'dl_tema';

// Claves antiguas guardadas por el admin antes de este sistema
const ALIAS: Record<string, ClaveTema> = { clasico: 'negro_dorado', naranja_blanco: 'blanco_rosa' };

export const normalizarTema = (v?: string | null): ClaveTema | null => {
  if (!v) return null;
  if ((TEMAS as string[]).includes(v)) return v as ClaveTema;
  return ALIAS[v] || null;
};

// ── Estado compartido ──
let temaSitio: ClaveTema | null = null;      // el del admin
let temaActual: ClaveTema = TEMA_POR_DEFECTO;
const oyentes = new Set<() => void>();

const leerPreferencia = (): ClaveTema | null => {
  try { return normalizarTema(localStorage.getItem(CLAVE_LS)); } catch { return null; }
};

const ponerEnHtml = (clave: ClaveTema) => {
  const root = document.documentElement;
  root.classList.add('dl-cambiando-tema');
  root.dataset.theme = clave;
  root.dataset.tema = clave === 'blanco_rosa' ? 'claro' : 'oscuro';
  window.setTimeout(() => root.classList.remove('dl-cambiando-tema'), 320);
  temaActual = clave;
  oyentes.forEach(fn => fn());
};

/** Tema que corresponde ahora según la prioridad (URL › usuario › sitio › defecto). */
const resolverTema = (): ClaveTema => {
  let url: ClaveTema | null = null;
  try { url = normalizarTema(new URLSearchParams(window.location.search).get('tema')); } catch { /* */ }
  return url || leerPreferencia() || temaSitio || TEMA_POR_DEFECTO;
};

/** Aplica el fondo global y, si se indica, fuerza un tema (vista previa del admin). */
export function aplicarTema(fondoUrl?: string | null, clave?: string | null) {
  if (fondoUrl) document.documentElement.style.setProperty('--global-bg-url', `url('${fondoUrl}')`);
  const t = normalizarTema(clave);
  if (t) ponerEnHtml(t);
}

/** Vuelve al tema que corresponde (p. ej. al salir de la vista previa del admin). */
export const restaurarTema = () => ponerEnHtml(resolverTema());

/** Guarda la elección del usuario y la aplica. `null` = usar el del sitio. */
export const elegirTema = (clave: ClaveTema | null) => {
  try {
    if (clave) localStorage.setItem(CLAVE_LS, clave);
    else localStorage.removeItem(CLAVE_LS);
  } catch { /* modo privado: se aplica solo en esta sesión */ }
  ponerEnHtml(clave || temaSitio || TEMA_POR_DEFECTO);
};

/** Hook para leer el tema activo desde cualquier componente. */
export const useTema = () =>
  useSyncExternalStore(
    fn => { oyentes.add(fn); return () => { oyentes.delete(fn); }; },
    () => temaActual,
  );

// Aplica de inmediato la preferencia guardada (antes de la respuesta del
// servidor) para que no haya parpadeo de colores al cargar.
if (typeof document !== 'undefined') ponerEnHtml(resolverTema());

const ThemeConfigLoader: React.FC = () => {
  useEffect(() => {
    (async () => {
      try {
        const [fondoRes, paletaRes] = await Promise.all([
          productsAPI.getConfiguracionByClave('sitio_fondo_url').catch(() => null),
          productsAPI.getConfiguracionByClave('sitio_paleta').catch(() => null),
        ]);
        if (fondoRes?.success && fondoRes.data?.valor) aplicarTema(fondoRes.data.valor);
        temaSitio = normalizarTema(paletaRes?.success ? paletaRes.data?.valor : null);
        ponerEnHtml(resolverTema());
      } catch {
        // Silencioso: se queda con la preferencia del usuario o el tema por defecto.
      }
    })();
  }, []);

  return null;
};

export default ThemeConfigLoader;
