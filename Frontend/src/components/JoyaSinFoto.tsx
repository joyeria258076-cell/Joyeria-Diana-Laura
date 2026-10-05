// Ruta: src/components/JoyaSinFoto.tsx
// Lo que se muestra cuando una pieza no tiene foto: el diamante del catálogo
// en línea fina, con los colores del tema activo (claro u oscuro).
import React from 'react';

interface Props {
    className?: string;
    etiqueta?: string;
}

const JoyaSinFoto: React.FC<Props> = ({ className = '', etiqueta = 'Pieza sin foto' }) => (
    <div className={`joya-sin-foto ${className}`} role="img" aria-label={etiqueta}
        style={{
            width: '100%', height: '100%', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--color-surface-2)', color: 'var(--color-primary-strong)', borderRadius: 'inherit',
        }}>
        <svg viewBox="-40 -24 80 66" width="34%" style={{ maxWidth: 120, opacity: .75 }} aria-hidden="true"
            fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
            <path d="M-22,-14 L22,-14 L32,-2 L0,34 L-32,-2 Z" />
            <path d="M-22,-14 L0,-2 L22,-14 M-32,-2 L32,-2 M0,-2 L0,34" />
        </svg>
    </div>
);

export default JoyaSinFoto;
