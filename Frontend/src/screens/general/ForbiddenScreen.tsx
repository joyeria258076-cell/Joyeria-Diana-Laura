import React from 'react';
import { useNavigate } from 'react-router-dom';
import './ErrorScreens.css';

const ForbiddenScreen: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="login-container error-page">
      <div className="login-form-section">
        <div className="login-card">
          <div className="login-header">
            <h2 className="error-code">403</h2>
            <p>ACCESO RESTRINGIDO</p>
          </div>
          <div className="error-content">
            <p className="error-description">
              Lo sentimos, no tienes los permisos necesarios para acceder a esta sección de la joyería ;).
            </p>
            <button className="login-button" onClick={() => navigate('/inicio')}>
              VOLVER AL INICIO
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForbiddenScreen;