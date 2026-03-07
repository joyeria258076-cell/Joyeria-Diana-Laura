// Frontend/src/screens/admin/proveedores/AdminProveedoresScreen.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AiOutlinePlus, AiOutlineSearch, AiOutlineReload, AiOutlineEdit, AiOutlineDelete, AiOutlineInfo, AiOutlineMail, AiOutlinePhone } from 'react-icons/ai';
import { proveedoresAPI } from '../../../services/api';
import './AdminProveedoresScreen.css';

interface Proveedor {
  id: number;
  nombre: string;
  razon_social: string;
  rfc: string;
  telefono: string;
  email: string;
  persona_contacto: string;
  activo: boolean;
  fecha_creacion: string;
}

const AdminProveedoresScreen: React.FC = () => {
  const navigate = useNavigate();
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [proveedoresFiltrados, setProveedoresFiltrados] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [filtroActivo, setFiltroActivo] = useState<'todos' | 'activos' | 'inactivos'>('todos');

  useEffect(() => {
    cargarProveedores();
  }, []);

  useEffect(() => {
    filtrarProveedores();
  }, [searchTerm, filtroActivo, proveedores]);

  const cargarProveedores = async () => {
    try {
      setLoading(true);
      const response = await proveedoresAPI.getAll();
      if (response.success) {
        const data = Array.isArray(response.data) ? response.data : [];
        setProveedores(data);
        setProveedoresFiltrados(data);
      } else {
        setError('Error al cargar los proveedores');
      }
    } catch (err: any) {
      console.error('Error loading proveedores:', err);
      setError(err.message || 'Error al cargar los proveedores');
    } finally {
      setLoading(false);
    }
  };

  const filtrarProveedores = () => {
    let filtrados = [...proveedores];

    // Filtrar por estado
    if (filtroActivo === 'activos') {
      filtrados = filtrados.filter(p => p.activo);
    } else if (filtroActivo === 'inactivos') {
      filtrados = filtrados.filter(p => !p.activo);
    }

    // Filtrar por búsqueda
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtrados = filtrados.filter(p => 
        p.nombre.toLowerCase().includes(term) ||
        p.razon_social?.toLowerCase().includes(term) ||
        p.rfc?.toLowerCase().includes(term) ||
        p.email?.toLowerCase().includes(term) ||
        p.persona_contacto?.toLowerCase().includes(term)
      );
    }

    setProveedoresFiltrados(filtrados);
  };

  const handleDelete = async (id: number, nombre: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar al proveedor "${nombre}"?`)) {
      return;
    }

    try {
      const response = await proveedoresAPI.delete(id);
      if (response.success) {
        cargarProveedores();
      } else {
        alert(response.message || 'Error al eliminar el proveedor');
      }
    } catch (err: any) {
      alert(`Error al eliminar: ${err.message}`);
    }
  };

  const handleToggleStatus = async (id: number, activo: boolean) => {
    try {
      const response = await proveedoresAPI.toggleStatus(id, !activo);
      if (response.success) {
        cargarProveedores();
      } else {
        alert(response.message || 'Error al cambiar el estado');
      }
    } catch (err: any) {
      alert(`Error al cambiar estado: ${err.message}`);
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="proveedores-container">
      {/* Header */}
      <div className="proveedores-header">
        <h1>🏢 Proveedores</h1>
        <button
          className="btn-nuevo-proveedor"
          onClick={() => navigate('/admin/proveedor/nuevo')}
        >
          <AiOutlinePlus size={20} />
          Nuevo Proveedor
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {/* Filtros y Búsqueda */}
      <div className="filtros-section">
        <div className="search-box">
          <AiOutlineSearch className="search-icon" />
          <input
            type="text"
            placeholder="Buscar por nombre, RFC, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filtros-estado">
          <button 
            className={`filtro-btn ${filtroActivo === 'todos' ? 'active' : ''}`}
            onClick={() => setFiltroActivo('todos')}
          >
            Todos
          </button>
          <button 
            className={`filtro-btn ${filtroActivo === 'activos' ? 'active' : ''}`}
            onClick={() => setFiltroActivo('activos')}
          >
            Activos
          </button>
          <button 
            className={`filtro-btn ${filtroActivo === 'inactivos' ? 'active' : ''}`}
            onClick={() => setFiltroActivo('inactivos')}
          >
            Inactivos
          </button>
        </div>

        <button className="btn-refrescar" onClick={cargarProveedores} disabled={loading}>
          <AiOutlineReload size={18} />
          {loading ? 'Cargando...' : 'Refrescar'}
        </button>
      </div>

      {/* Tabla de Proveedores */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Cargando proveedores...</p>
        </div>
      ) : proveedoresFiltrados.length === 0 ? (
        <div className="empty-state">
          <p>{searchTerm ? 'No se encontraron proveedores' : 'No hay proveedores registrados'}</p>
          {!searchTerm && (
            <button 
              className="btn-primer-proveedor"
              onClick={() => navigate('/admin/proveedor/nuevo')}
            >
              <AiOutlinePlus size={18} />
              Agregar primer proveedor
            </button>
          )}
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="proveedores-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Proveedor</th>
                <th>RFC</th>
                <th>Contacto</th>
                <th>Email / Teléfono</th>
                <th>Fecha Registro</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {proveedoresFiltrados.map(proveedor => (
                <tr key={proveedor.id} className={!proveedor.activo ? 'inactivo' : ''}>
                  <td className="table-id">#{proveedor.id}</td>
                  <td className="table-proveedor">
                    <strong>{proveedor.nombre}</strong>
                    {proveedor.razon_social && (
                      <small>{proveedor.razon_social}</small>
                    )}
                  </td>
                  <td>{proveedor.rfc || '-'}</td>
                  <td>{proveedor.persona_contacto || '-'}</td>
                  <td>
                    {proveedor.email && (
                      <div className="contact-info">
                        <AiOutlineMail size={14} />
                        <span>{proveedor.email}</span>
                      </div>
                    )}
                    {proveedor.telefono && (
                      <div className="contact-info">
                        <AiOutlinePhone size={14} />
                        <span>{proveedor.telefono}</span>
                      </div>
                    )}
                  </td>
                  <td>{formatDate(proveedor.fecha_creacion)}</td>
                  <td>
                    <button
                      className={`status-badge ${proveedor.activo ? 'active' : 'inactive'}`}
                      onClick={() => handleToggleStatus(proveedor.id, proveedor.activo)}
                      title={proveedor.activo ? 'Hacer inactivo' : 'Activar'}
                    >
                      {proveedor.activo ? '✓ Activo' : '✗ Inactivo'}
                    </button>
                  </td>
                  <td className="table-actions">
                    <button
                      className="btn-action btn-info"
                      onClick={() => navigate(`/admin/proveedor/${proveedor.id}`)}
                      title="Ver detalles"
                    >
                      <AiOutlineInfo size={16} />
                    </button>
                    <button
                      className="btn-action btn-edit"
                      onClick={() => navigate(`/admin/editar-proveedor/${proveedor.id}`)}
                      title="Editar"
                    >
                      <AiOutlineEdit size={16} />
                    </button>
                    <button
                      className="btn-action btn-delete"
                      onClick={() => handleDelete(proveedor.id, proveedor.nombre)}
                      title="Eliminar"
                    >
                      <AiOutlineDelete size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminProveedoresScreen;