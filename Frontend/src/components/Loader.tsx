// Ruta: Frontend/src/components/Loader.tsx
import React from 'react';
import './Loader.css';

interface LoaderProps {
    texto?: string;
    tamano?: 'sm' | 'md' | 'lg';
}

/**
 * Loader estandar de la app (animacion de barritas), para usarse en cualquier
 * pantalla en vez de spinners/puntitos propios de cada componente.
 */
const Loader: React.FC<LoaderProps> = ({ texto, tamano = 'md' }) => (
    <div className={`dl-loader dl-loader-${tamano}`}>
        <div className="dl-loader-bars"><span /><span /><span /><span /></div>
        {texto && <p className="dl-loader-texto">{texto}</p>}
    </div>
);

export default Loader;
