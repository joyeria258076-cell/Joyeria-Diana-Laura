// Ruta: Frontend/src/components/Loader.tsx
import React from 'react';
import './Loader.css';

interface LoaderProps {
    texto?: string;
    tamano?: 'sm' | 'md' | 'lg';
}

/**
 * Loader estándar de la app: un diamante en línea fina que se dibuja una y otra
 * vez (el mismo trazo del panel de acceso), para usarse en cualquier pantalla.
 */
const Loader: React.FC<LoaderProps> = ({ texto, tamano = 'md' }) => (
    <div className={`dl-loader dl-loader-${tamano}`} role="status" aria-live="polite">
        <svg className="dl-loader-joya" viewBox="0 0 80 72" aria-hidden="true">
            <path className="dl-loader-trazo" d="M10 26 L24 6 H56 L70 26 L40 66 Z M10 26 H70 M24 6 L32 26 L40 66 L48 26 L56 6" />
        </svg>
        <p className="dl-loader-texto">{texto || 'Cargando…'}</p>
    </div>
);

export default Loader;
