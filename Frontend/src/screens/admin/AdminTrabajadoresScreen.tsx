import React, { useState } from 'react';
import './AdminTrabajadoresScreen.css';

interface Trabajador {
  id: number;
  nombre: string;
  email: string;
  puesto: string;
  fechaIngreso: string;
  estado: 'Activo' | 'Inactivo';
}

const AdminTrabajadoresScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState('altas');

  const [trabajadores] = useState<Trabajador[]>([
    { id: 1, nombre: 'María García', email: 'maria@dianaLaura.com', puesto: 'Administrador', fechaIngreso: '15/01/2024', estado: 'Activo' },
    { id: 2, nombre: 'Juan Rodríguez', email: 'juan@dianaLaura.com', puesto: 'Vendedor', fechaIngreso: '20/02/2024', estado: 'Activo' },
    { id: 3, nombre: 'Laura Martínez', email: 'laura@dianaLaura.com', puesto: 'Diseñadora', fechaIngreso: '10/03/2024', estado: 'Activo' },
  ]);

  return (
    <div className="admin-trabajadores-container">
      <div className="admin-page-header">
        <h2>Gestión de Trabajadores</h2>
        <button className="btn-add-worker">
          <i className="fas fa-plus"></i> Agregar Trabajador
        </button>
      </div>

      {/* TABS NAVEGACIÓN */}
      <div className="admin-tabs">
        {['altas', 'bajas', 'actualizacion', 'roles'].map((tab) => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1).replace('on', 'ón')}
          </button>
        ))}
      </div>

      {/* TABLA DE TRABAJADORES */}
      <div className="admin-table-responsive">
        <table className="admin-custom-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Puesto</th>
              <th>Fecha Ingreso</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {trabajadores.map((t) => (
              <tr key={t.id}>
                <td>{t.nombre}</td>
                <td className="email-text">{t.email}</td>
                <td>{t.puesto}</td>
                <td>{t.fechaIngreso}</td>
                <td>
                  <span className={`status-badge ${t.estado.toLowerCase()}`}>
                    {t.estado}
                  </span>
                </td>
                <td>
                  <div className="admin-actions">
                    <button className="btn-action-edit" title="Editar">
                      <i className="fas fa-user-edit"></i>
                    </button>
                    <button className="btn-action-delete" title="Desactivar">
                      <i className="fas fa-user-slash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminTrabajadoresScreen;