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

// icono y seccion se conservan en la firma para no tocar las pantallas, pero ya no se pintan
const AdminHero: React.FC<Props> = ({ titulo, resaltado, descripcion, children }) => (
    <header className="av-hero">
        <div>
            <h1 className="av-titulo">{titulo}{resaltado && <> <em>{resaltado}</em></>}</h1>
            {descripcion && <p className="av-sub">{descripcion}</p>}
        </div>
        {children && <div className="av-hero-acciones">{children}</div>}
    </header>
);

export default AdminHero;
