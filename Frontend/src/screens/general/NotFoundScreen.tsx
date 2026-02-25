import React from 'react';
import { useNavigate } from 'react-router-dom';
import './NotFoundScreen.css';

const NotFoundScreen: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="login-container not-found-page">
      {/* El efecto de partículas viene del login-container */}
      
      <div className="login-form-section">
        <div className="login-card">
          <div className="login-header">
            <h2>404</h2>
            <p>PÁGINA NO ENCONTRADA :c</p>
          </div>

          <div className="not-found-content" style={{ textAlign: 'center' }}>
            <p style={{ 
              color: '#FFFFFF', 
              marginBottom: '2rem', 
              fontFamily: 'Montserrat',
              opacity: 0.8 
            }}>
              La pieza o página que buscas no forma parte de nuestro catálogo actual.
            </p>

            <button 
              className="login-button" 
              onClick={() => navigate('/login')}
            >
              VOLVER AL INICIO
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFoundScreen;