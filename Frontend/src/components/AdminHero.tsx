// Encabezado común de las pantallas del admin (estilos en styles/AdminV2.css)
import React from 'react';
import '../styles/AdminV2.css';

interface Props {
    icono: React.ReactNode;
    seccion: string;
    titulo: string;
    resaltado?: string;
    descripcion?: React.ReactNode;
    children?: React.ReactNode;
}

const AdminHero: React.FC<Props> = ({ icono, seccion, titulo, resaltado, descripcion, children }) => (
    <header className="av-hero">
        <div>
            <span className="av-hero-icono">{icono}</span>
            <span className="av-eyebrow">{seccion}</span>
            <h1 className="av-titulo">{titulo}{resaltado && <> <em>{resaltado}</em></>}</h1>
            {descripcion && <p className="av-sub">{descripcion}</p>}
        </div>
        {children && <div className="av-hero-acciones">{children}</div>}
    </header>
);

export default AdminHero;
