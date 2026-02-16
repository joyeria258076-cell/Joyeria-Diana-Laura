import React from 'react';
import { Link } from 'react-router-dom';
import './ConfiguracionScreen.css';

const ConfiguracionScreen: React.FC = () => {
    return (
        <div className="content-area-config">
            <div className="page-header">
                <h2><i className="fas fa-sliders-h"></i> Configuración del Sistema</h2>
            </div>
            
            <div className="settings-grid">
                {/* SECCIÓN: Notificaciones */}
                <section className="settings-section">
                    <h4><i className="fas fa-bell"></i> Notificaciones</h4>
                    <div className="config-options">
                        <label className="config-switch">
                            <input type="checkbox" defaultChecked />
                            <span className="slider"></span>
                            <span className="label-text">Notificaciones de nuevos pedidos</span>
                        </label>
                        <label className="config-switch">
                            <input type="checkbox" defaultChecked />
                            <span className="slider"></span>
                            <span className="label-text">Notificaciones de inventario bajo</span>
                        </label>
                        <label className="config-switch">
                            <input type="checkbox" />
                            <span className="slider"></span>
                            <span className="label-text">Reportes semanales automáticos</span>
                        </label>
                    </div>
                    <button className="btn-save-config">Guardar Preferencias</button>
                </section>

                {/* SECCIÓN: Seguridad */}
                <section className="settings-section">
                    <h4><i className="fas fa-lock"></i> Seguridad</h4>
                    <div className="form-group-config">
                        <label>Autenticación de dos factores (MFA)</label>
                        <select className="select-config">
                            <option>Habilitada - Aplicación (Recomendado)</option>
                            <option>Habilitada - SMS</option>
                            <option>Deshabilitada</option>
                        </select>
                    </div>
                    <div className="form-group-config">
                        <label>Sesión automática</label>
                        <select className="select-config">
                            <option>Cerrar tras 30 min de inactividad</option>
                            <option>Cerrar tras 1 hora</option>
                            <option>Mantener siempre abierta</option>
                        </select>
                    </div>
                    <button className="btn-save-config">Actualizar Seguridad</button>
                </section>

                {/* SECCIÓN: Idioma y Región */}
                <section className="settings-section">
                    <h4><i className="fas fa-globe"></i> Regional</h4>
                    <div className="form-group-config">
                        <label>Idioma del Panel</label>
                        <select className="select-config">
                            <option>Español (México)</option>
                            <option>English (US)</option>
                        </select>
                    </div>
                    <button className="btn-save-config">Guardar Cambios</button>
                </section>
            </div>
        </div>
    );
};

export default ConfiguracionScreen;