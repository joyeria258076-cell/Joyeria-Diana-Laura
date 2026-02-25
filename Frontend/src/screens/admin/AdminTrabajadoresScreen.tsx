import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { workersAPI } from '../../services/api';
import './AdminTrabajadoresScreen.css';

interface Trabajador {
  id: number;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
}

const AdminTrabajadoresScreen: React.FC = () => {
  const navigate = useNavigate();
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [loading, setLoading] = useState(true);

  const cargarTrabajadores = async () => {
    try {
      setLoading(true);
      const res = await workersAPI.getAll();
      
      console.log("1. Datos recibidos del API:", res.data);

      if (res.success && Array.isArray(res.data)) {
        // 🎯 NORMALIZACIÓN Y FILTRADO:
        // Algunos usuarios pueden venir con .rol y otros con .puesto dependiendo de la BD
        const filtrados = res.data
          .map((u: any) => ({
            ...u,
            // Si no viene 'rol', intentamos usar 'puesto' como respaldo
            rol: (u.rol || u.puesto || 'sin rol').toLowerCase()
          }))
          .filter((u: any) => u.rol === 'trabajador'); // Filtramos solo trabajadores
        
        console.log("2. Trabajadores listos para mostrar:", filtrados);
        setTrabajadores(filtrados);
      }
    } catch (error) {
      console.error("❌ Error al cargar trabajadores:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarTrabajadores();
  }, []);

  return (
    <div className="admin-trabajadores-container animate-in">
      <div className="admin-page-header">
        <div>
          <h2>Panel de Personal</h2>
          <p className="subtitle">Gestión de empleados - Joyería Diana Laura</p>
        </div>
        <button className="btn-add-worker" onClick={() => navigate('/admin-trabajadores/nuevo')}>
          <i className="fas fa-user-plus"></i> Registrar Trabajador
        </button>
      </div>

      <div className="admin-table-responsive">
        {loading ? (
          <div className="loading-state">
             <i className="fas fa-spinner fa-spin"></i> Cargando personal...
          </div>
        ) : trabajadores.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-users-slash" style={{fontSize: '3rem', marginBottom: '1rem', opacity: 0.5}}></i>
            <p>No se encontraron usuarios con el rol de "trabajador".</p>
            <button onClick={cargarTrabajadores} className="btn-retry">Reintentar</button>
          </div>
        ) : (
          <table className="admin-custom-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Puesto</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {trabajadores.map((t) => (
                <tr key={t.id} className="row-fade-in">
                  <td><strong>{t.nombre}</strong></td>
                  <td>{t.email}</td>
                  <td>
                    <span className="role-badge">{t.rol}</span>
                  </td>
                  <td>
                    <span className={`status-pill ${t.activo ? 'activo' : 'inactivo'}`}>
                      {t.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <button className="btn-action-edit" title="Editar">
                      <i className="fas fa-edit"></i>
                    </button>
                    <button className="btn-action-delete" title="Eliminar">
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminTrabajadoresScreen;