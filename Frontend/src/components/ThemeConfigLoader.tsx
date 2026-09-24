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
    '--color-bg': '#fefbfc',
    '--color-surface': '#ffffff',
    '--color-surface-2': '#faf4f6',
    '--color-rose-gold': '#c07b8d',
    '--color-champagne': '#94586a',
    '--color-blush': '#a94f66',
    '--color-text': '#2b2226',
    '--color-text-muted': '#76666c',
    '--color-border': 'rgba(192, 123, 141, 0.2)',
    '--color-glow': 'rgba(192, 123, 141, 0.07)',
  },
  naranja_blanco: {
    '--color-bg': '#fffcf8',
    '--color-surface': '#ffffff',
    '--color-surface-2': '#fbf5ee',
    '--color-rose-gold': '#cc8d55',
    '--color-champagne': '#8f6038',
    '--color-blush': '#a9573c',
    '--color-text': '#2b241d',
    '--color-text-muted': '#766a5e',
    '--color-border': 'rgba(204, 141, 85, 0.22)',
    '--color-glow': 'rgba(204, 141, 85, 0.07)',
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
