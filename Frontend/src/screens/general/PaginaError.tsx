// Pantalla común para 404 / 403 / 500 con el estilo de la app móvil.
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './PaginaError.css';

interface Props {
  codigo: string;
  titulo: React.ReactNode;
  texto: string;
  accion?: { etiqueta: string; onClick: () => void };
}

const PaginaError: React.FC<Props> = ({ codigo, titulo, texto, accion }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const rol = user?.rol?.toLowerCase().trim();
  const inicio = !user ? '/' : rol === 'admin' ? '/admin-dashboard' : rol === 'trabajador' ? '/dashboard-trabajador' : '/inicio';

  return (
    <div className="pe-page">
      <div className="pe-card">
        <img className="pe-logo" src="/pwa-192.png" alt="Joyería Diana Laura" width={64} height={64} />
        <span className="pe-eyebrow">Joyería Diana Laura</span>
        <div className="pe-codigo" aria-hidden="true">{codigo}</div>
        <h1 className="pe-titulo">{titulo}</h1>
        <p className="pe-texto">{texto}</p>
        <div className="pe-acciones">
          {accion && <button className="pe-btn" onClick={accion.onClick}>{accion.etiqueta}</button>}
          <button className={accion ? 'pe-btn pe-btn--ghost' : 'pe-btn'} onClick={() => navigate(inicio)}>Volver al inicio</button>
          {!accion && <button className="pe-btn pe-btn--ghost" onClick={() => navigate(-1)}>Regresar</button>}
        </div>
      </div>
    </div>
  );
};

export default PaginaError;
