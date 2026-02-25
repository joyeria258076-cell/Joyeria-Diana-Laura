import React from 'react';
import './AdminContentManager.css';

const AdminContentManagerScreen: React.FC = () => {
    return (
        <div className="content-manager-container">
            <h2 className="content-manager-title">
                <span className="title-icon">⚙️</span> Gestor de Contenido Web
            </h2>
            
            <div className="content-redirect">
                <div className="redirect-card">
                    <h3>👈 Selecciona una opción</h3>
                    <p>Usa el menú lateral para acceder a las diferentes secciones de gestión de contenido.</p>
                </div>
            </div>
        </div>
    );
};

export default AdminContentManagerScreen;
