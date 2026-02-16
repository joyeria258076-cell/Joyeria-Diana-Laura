import React from 'react';
import './ErrorScreens.css';

const ServerErrorScreen: React.FC = () => {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="login-container error-page">
      <div className="login-form-section">
        <div className="login-card">
          <div className="login-header">
            <h2 className="error-code">500</h2>
            <p>ERROR DE SISTEMA</p>
          </div>
          <div className="error-content">
            <p className="error-description">
              Estamos puliendo algunos detalles técnicos en nuestro servidor. Por favor, intenta de nuevo en unos momentos ;).
            </p>
            <button className="login-button" onClick={handleRetry}>
              REINTENTAR AHORA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServerErrorScreen;