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
  blanco_rosa: {
    '--color-bg': '#fdf6f8',
    '--color-surface': '#ffffff',
    '--color-surface-2': '#fbeef2',
    '--color-rose-gold': '#d4607e',
    '--color-champagne': '#f4c2d1',
    '--color-blush': '#ecb2c3',
    '--color-text': '#2a1a1f',
    '--color-text-muted': '#7a5a63',
    '--color-border': 'rgba(212, 96, 126, 0.25)',
    '--color-glow': 'rgba(212, 96, 126, 0.1)',
  },
  naranja_blanco: {
    '--color-bg': '#fffaf5',
    '--color-surface': '#ffffff',
    '--color-surface-2': '#fff1e0',
    '--color-rose-gold': '#e08a3c',
    '--color-champagne': '#f5c98a',
    '--color-blush': '#f0b070',
    '--color-text': '#2a1f14',
    '--color-text-muted': '#7a6650',
    '--color-border': 'rgba(224, 138, 60, 0.25)',
    '--color-glow': 'rgba(224, 138, 60, 0.1)',
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
        aplicarTema(
          fondoRes?.success ? fondoRes.data?.valor : null,
          paletaRes?.success ? paletaRes.data?.valor : null
        );
      } catch {
        // Silencioso: si falla, se queda con los valores por default de index.css.
      }
    })();
  }, []);

  return null;
};

export default ThemeConfigLoader;
