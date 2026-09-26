// Ruta: Frontend/src/components/ThemeConfigLoader.tsx
// Temas del sitio (mismo lenguaje que la app móvil). Los colores de los 3 temas
// fijos viven en styles/temas.css como bloques [data-theme="…"]; las temáticas
// de temporada que da de alta el admin (Halloween, Navidad…) se inyectan aquí
// como un <style> con su propio bloque [data-theme="t-<clave>"].
//
// Orden de prioridad del tema:
//   1. ?tema=<clave> en la URL (vista previa en una pestaña)
//   2. elección del usuario (localStorage, selector del perfil / menú)
//   3. tema predeterminado del sitio que elige el admin (configuracion.sitio_paleta)
//   4. Negro · Rosa
import { useEffect, useSyncExternalStore } from 'react';
import { productsAPI, temasTemporadaAPI, type TemaTemporada } from '../services/api';

export type ClaveBase = 'negro_rosa' | 'blanco_rosa' | 'negro_dorado';
/** Tema fijo o temática de temporada ("t-halloween"). */
export type ClaveTema = ClaveBase | `t-${string}`;

// Valores de cada tema fijo (se usan para las muestras y miniaturas; la fuente
// de verdad de los estilos es temas.css).
export const PALETAS: Record<ClaveBase, Record<string, string>> = {
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

export const NOMBRES_TEMA: Record<ClaveBase, string> = {
  negro_rosa: 'Negro · Rosa',
  blanco_rosa: 'Blanco · Rosa',
  negro_dorado: 'Negro · Dorado',
};

export const TEMAS = Object.keys(PALETAS) as ClaveBase[];
const TEMA_POR_DEFECTO: ClaveBase = 'negro_rosa';
const CLAVE_LS = 'dl_tema';
const CLAVE_LS_TEMPORADA = 'dl_temas_temporada';
const CLAVE_VISTA_PREVIA = 't-vista-previa';

// Claves antiguas guardadas por el admin antes de este sistema
const ALIAS: Record<string, ClaveBase> = { clasico: 'negro_dorado', naranja_blanco: 'blanco_rosa' };

/** Solo los 3 temas fijos (lo que puede ser el tema predeterminado del sitio). */
export const normalizarBase = (v?: string | null): ClaveBase | null => {
  if (!v) return null;
  if ((TEMAS as string[]).includes(v)) return v as ClaveBase;
  return ALIAS[v] || null;
};

// ── Temáticas de temporada ──
let temporada: TemaTemporada[] = [];
let temaPrevio: TemaTemporada | null = null;   // vista previa del admin (sin guardar)

const claveDe = (t: TemaTemporada): ClaveTema => `t-${t.clave}`;
const buscarTemporada = (clave: string) =>
  clave === CLAVE_VISTA_PREVIA ? temaPrevio : temporada.find(t => claveDe(t) === clave) || null;

/** Tema fijo o temática activa; cualquier otra cosa es inválida. */
export const normalizarTema = (v?: string | null): ClaveTema | null => {
  const base = normalizarBase(v);
  if (base) return base;
  if (v && v.startsWith('t-') && buscarTemporada(v)) return v as ClaveTema;
  return null;
};

const hexARgb = (hex: string) => {
  const h = hex.replace('#', '');
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)).join(', ');
};
const luminancia = (hex: string) => {
  const [r, g, b] = hexARgb(hex).split(', ').map(n => Number(n) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** Bloque CSS con todas las variables de una temática (mismas que temas.css). */
export const cssDeTemporada = (t: TemaTemporada, clave: string = claveDe(t)) => {
  const oscuro = t.modo !== 'claro';
  const textoRgb = hexARgb(t.color_texto);
  const principalRgb = hexARgb(t.color_principal);
  const fuerteRgb = hexARgb(t.color_principal_fuerte);
  const sombra = oscuro ? '0,0,0' : hexARgb(t.color_principal_fuerte);
  return `[data-theme="${clave}"]{
  --color-highlight:${t.color_principal};
  --color-bg:${t.color_fondo};
  --color-surface:${t.color_superficie};
  --color-surface-2:${t.color_superficie_2};
  --color-primary:${t.color_principal};
  --color-primary-strong:${t.color_principal_fuerte};
  --color-accent:${t.color_acento};
  --color-text:${t.color_texto};
  --color-text-muted:${t.color_texto_suave};
  --color-border:rgba(${textoRgb}, ${oscuro ? 0.10 : 0.12});
  --color-glow:rgba(${principalRgb}, 0.10);
  --color-on-primary:${luminancia(t.color_principal) > 0.55 ? '#1A1016' : '#FFFFFF'};
  --glass-bg:rgba(${hexARgb(t.color_superficie)}, ${oscuro ? 0.62 : 0.72});
  --glass-border:rgba(${textoRgb}, ${oscuro ? 0.12 : 0.10});
  --blob-1:${t.color_principal_fuerte};
  --blob-2:${t.color_acento};
  --shadow-soft:0 1px 2px rgba(${sombra},${oscuro ? '.35' : '.08'}), 0 8px 24px rgba(${sombra},${oscuro ? '.35' : '.10'});
  --shadow-lift:0 2px 6px rgba(${sombra},${oscuro ? '.35' : '.10'}), 0 18px 44px rgba(${sombra},${oscuro ? '.45' : '.14'});
  --shadow-primary:0 10px 28px rgba(${fuerteRgb}, 0.32);
  color-scheme:${oscuro ? 'dark' : 'light'};
}`;
};

const inyectarCssTemporada = () => {
  if (typeof document === 'undefined') return;
  let tag = document.getElementById('dl-temas-temporada') as HTMLStyleElement | null;
  if (!tag) {
    tag = document.createElement('style');
    tag.id = 'dl-temas-temporada';
    document.head.appendChild(tag);
  }
  tag.textContent = [
    ...temporada.map(t => cssDeTemporada(t)),
    ...(temaPrevio ? [cssDeTemporada(temaPrevio, CLAVE_VISTA_PREVIA)] : []),
  ].join('\n');
};

// ── Estado compartido ──
let temaSitio: ClaveBase | null = null;      // el del admin
let temaActual: ClaveTema = TEMA_POR_DEFECTO;
let version = 0;                              // cambia cuando cambian las temáticas disponibles
const oyentes = new Set<() => void>();
const avisar = () => { version++; oyentes.forEach(fn => fn()); };

const leerPreferencia = (): ClaveTema | null => {
  try { return normalizarTema(localStorage.getItem(CLAVE_LS)); } catch { return null; }
};

const ponerEnHtml = (clave: ClaveTema) => {
  const root = document.documentElement;
  const t = clave.startsWith('t-') ? buscarTemporada(clave) : null;
  root.classList.add('dl-cambiando-tema');
  root.dataset.theme = clave;
  root.dataset.tema = t ? (t.modo === 'claro' ? 'claro' : 'oscuro') : clave === 'blanco_rosa' ? 'claro' : 'oscuro';
  if (t && t.decoracion && t.decoracion !== 'ninguna') root.dataset.deco = t.decoracion;
  else delete root.dataset.deco;
  window.setTimeout(() => root.classList.remove('dl-cambiando-tema'), 320);
  temaActual = clave;
  avisar();
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

/** Vista previa de una temática que el admin está editando (sin guardarla). */
export const previsualizarTemporada = (t: TemaTemporada | null) => {
  temaPrevio = t;
  inyectarCssTemporada();
  if (t) ponerEnHtml(CLAVE_VISTA_PREVIA);
  else ponerEnHtml(resolverTema());
};

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

/** Reemplaza las temáticas disponibles (respuesta del servidor). */
export const actualizarTemporada = (lista: TemaTemporada[]) => {
  temporada = Array.isArray(lista) ? lista : [];
  try { localStorage.setItem(CLAVE_LS_TEMPORADA, JSON.stringify(temporada)); } catch { /* */ }
  inyectarCssTemporada();
  // Si el usuario tenía una temática que ya no está activa, vuelve a su tema normal.
  if (temaActual.startsWith('t-') && temaActual !== CLAVE_VISTA_PREVIA && !buscarTemporada(temaActual)) {
    try { localStorage.removeItem(CLAVE_LS); } catch { /* */ }
  }
  if (temaActual !== CLAVE_VISTA_PREVIA) ponerEnHtml(resolverTema());
  else avisar();
};

const suscribir = (fn: () => void) => { oyentes.add(fn); return () => { oyentes.delete(fn); }; };

/** Hook para leer el tema activo desde cualquier componente. */
export const useTema = () => useSyncExternalStore(suscribir, () => temaActual);

/** Hook con las temáticas de temporada que el usuario puede elegir. */
export const useTemasTemporada = (): TemaTemporada[] => {
  useSyncExternalStore(suscribir, () => version);
  return temporada;
};

// Aplica de inmediato la preferencia guardada y las temáticas conocidas
// (antes de la respuesta del servidor) para que no haya parpadeo de colores.
if (typeof document !== 'undefined') {
  try { temporada = JSON.parse(localStorage.getItem(CLAVE_LS_TEMPORADA) || '[]') || []; } catch { temporada = []; }
  inyectarCssTemporada();
  ponerEnHtml(resolverTema());
}

const ThemeConfigLoader: React.FC = () => {
  useEffect(() => {
    (async () => {
      try {
        const [fondoRes, paletaRes, temporadaRes] = await Promise.all([
          productsAPI.getConfiguracionByClave('sitio_fondo_url').catch(() => null),
          productsAPI.getConfiguracionByClave('sitio_paleta').catch(() => null),
          temasTemporadaAPI.getActivas().catch(() => null),
        ]);
        if (fondoRes?.success && fondoRes.data?.valor) aplicarTema(fondoRes.data.valor);
        temaSitio = normalizarBase(paletaRes?.success ? paletaRes.data?.valor : null);
        if (temporadaRes?.success) actualizarTemporada(temporadaRes.data || []);
        else ponerEnHtml(resolverTema());
      } catch {
        // Silencioso: se queda con la preferencia del usuario o el tema por defecto.
      }
    })();
  }, []);

  return null;
};

export default ThemeConfigLoader;
