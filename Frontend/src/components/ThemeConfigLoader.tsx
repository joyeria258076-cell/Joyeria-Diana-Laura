// Ruta: Frontend/src/components/ThemeConfigLoader.tsx
// Al montarse (una sola vez, en la raíz de la app), consulta la
// personalización visual guardada por el admin (fondo + paleta de colores)
// y la aplica sobreescribiendo las variables CSS globales de :root.
// No renderiza nada — es un efecto puro de configuración de tema.
import { useEffect } from 'react';
import { productsAPI } from '../services/api';

export const PALETAS: Record<string, Record<string, string>> = {
  clasico: {
    '--color-bg': '#0a0a0a',
    '--color-surface': '#141414',
    '--color-surface-2': '#1e1e1e',
    '--color-rose-gold': '#c9956c',
    '--color-champagne': '#e8d5b7',
    '--color-blush': '#f4c2c2',
    '--color-text': '#f5f0eb',
    '--color-text-muted': '#9e9087',
    '--color-border': 'rgba(201, 149, 108, 0.18)',
    '--color-glow': 'rgba(201, 149, 108, 0.08)',
  },
  // En paletas claras "champagne" se usa también como color de texto/acento,
  // así que debe ser un tono medio legible sobre blanco (no un pastel).
  blanco_rosa: {
    '--color-bg': '#fdf6f8',
    '--color-surface': '#ffffff',
    '--color-surface-2': '#fbeef2',
    '--color-rose-gold': '#c8506f',
    '--color-champagne': '#a63d5a',
    '--color-blush': '#b8364f',
    '--color-text': '#2a1a1f',
    '--color-text-muted': '#6e5059',
    '--color-border': 'rgba(200, 80, 111, 0.22)',
    '--color-glow': 'rgba(200, 80, 111, 0.08)',
  },
  naranja_blanco: {
    '--color-bg': '#fffaf5',
    '--color-surface': '#ffffff',
    '--color-surface-2': '#fff1e0',
    '--color-rose-gold': '#d9782a',
    '--color-champagne': '#a8561a',
    '--color-blush': '#b8431f',
    '--color-text': '#2a1f14',
    '--color-text-muted': '#6e5a45',
    '--color-border': 'rgba(217, 120, 42, 0.24)',
    '--color-glow': 'rgba(217, 120, 42, 0.08)',
  },
};

export function aplicarTema(fondoUrl?: string | null, paletaClave?: string | null) {
  const root = document.documentElement;
  if (fondoUrl) {
    root.style.setProperty('--global-bg-url', `url('${fondoUrl}')`);
  }
  const paleta = paletaClave ? PALETAS[paletaClave] : null;
  if (paleta) {
    Object.entries(paleta).forEach(([variable, valor]) => root.style.setProperty(variable, valor));
    root.dataset.tema = paletaClave === 'clasico' ? 'oscuro' : 'claro';
  }
}

const ThemeConfigLoader: React.FC = () => {
  useEffect(() => {
    (async () => {
      try {
        const [fondoRes, paletaRes] = await Promise.all([
          productsAPI.getConfiguracionByClave('sitio_fondo_url').catch(() => null),
          productsAPI.getConfiguracionByClave('sitio_paleta').catch(() => null),
        ]);
        // ?tema=blanco_rosa en la URL permite previsualizar una paleta solo en esa pestaña
        const temaUrl = new URLSearchParams(window.location.search).get('tema');
        aplicarTema(
          fondoRes?.success ? fondoRes.data?.valor : null,
          temaUrl && PALETAS[temaUrl] ? temaUrl : (paletaRes?.success ? paletaRes.data?.valor : null)
        );
      } catch {
        // Silencioso: si falla, se queda con los valores por default de index.css.
      }
    })();
  }, []);

  return null;
};

export default ThemeConfigLoader;
