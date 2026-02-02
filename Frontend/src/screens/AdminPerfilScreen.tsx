import React from 'react';
import '../styles/AdminPerfilScreen.css';

const AdminPerfilScreen: React.FC = () => {
  return (
    <div className="admin-perfil-container">
      <h2 className="section-title">Mi Perfil</h2>
      
      {/* CARD DE CABECERA DE PERFIL */}
      <div className="profile-card main-info">
        <div className="profile-header-content">
          <div className="profile-avatar-large">MG</div>
          <div className="profile-info-text">
            <h3>María García Rodríguez</h3>
            <p><i className="fas fa-briefcase"></i> Administrador</p>
            <p><i className="fas fa-envelope"></i> maria.garcia@dianaLaura.com</p>
            <p><i className="fas fa-calendar-alt"></i> Miembro desde: 15 de enero de 2024</p>
          </div>
        </div>
      </div>

      <div className="profile-grid">
        {/* FORMULARIO DATOS PERSONALES */}
        <div className="profile-card">
          <h4 className="card-subtitle">
            <i className="fas fa-user-edit"></i> Datos Personales
          </h4>
          <form className="profile-form">
            <div className="form-row">
              <div className="form-group">
                <label>Nombre</label>
                <input type="text" defaultValue="María" />
              </div>
              <div className="form-group">
                <label>Apellido</label>
                <input type="text" defaultValue="García Rodríguez" />
              </div>
            </div>
            <div className="form-group">
              <label>Correo Electrónico</label>
              <input type="email" defaultValue="maria.garcia@dianaLaura.com" />
            </div>
            <div className="form-group">
              <label>Teléfono</label>
              <input type="tel" defaultValue="+34 912 345 678" />
            </div>
            <button type="button" className="btn-save-profile">
              <i className="fas fa-save"></i> Guardar Cambios
            </button>
          </form>
        </div>

        {/* FORMULARIO SEGURIDAD */}
        <div className="profile-card">
          <h4 className="card-subtitle">
            <i className="fas fa-shield-alt"></i> Seguridad
          </h4>
          <form className="profile-form">
            <div className="form-group">
              <label>Contraseña Actual</label>
              <input type="password" placeholder="••••••••" />
            </div>
            <div className="form-group">
              <label>Nueva Contraseña</label>
              <input type="password" placeholder="Mínimo 8 caracteres" />
            </div>
            <div className="form-group">
              <label>Confirmar Nueva Contraseña</label>
              <input type="password" placeholder="Repita la nueva contraseña" />
            </div>
            <button type="button" className="btn-save-profile secondary">
              <i className="fas fa-lock"></i> Actualizar Seguridad
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminPerfilScreen;