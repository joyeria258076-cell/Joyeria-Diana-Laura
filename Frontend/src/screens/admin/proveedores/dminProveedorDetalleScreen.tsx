// Frontend/src/screens/admin/proveedores/AdminProveedorDetalleScreen.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AiOutlineArrowLeft, AiOutlineEdit, AiOutlineDelete, AiOutlineMail, AiOutlinePhone, AiOutlineGlobal, AiOutlineUser, AiOutlineIdcard } from 'react-icons/ai';
import { proveedoresAPI } from '../../../services/api';
import './AdminProveedorDetalleScreen.css';

interface Proveedor {
  id: number;
  nombre: string;
  razon_social: string;
  rfc: string;
  direccion: string;
  telefono: string;
  email: string;
  sitio_web: string;
  persona_contacto: string;
  notas: string;
  activo: boolean;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

const AdminProveedorDetalleScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [proveedor, setProveedor] = useState<Proveedor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      cargarProveedor(Number.parseInt(id));
    }
  }, [id]);

  const cargarProveedor = async (proveedorId: number) => {
    try {
      setLoading(true);
      const response = await proveedoresAPI.getById(proveedorId);
      if (response.success) {
        setProveedor(response.data);
      } else {
        setError('No se pudo cargar el proveedor');
      }
    } catch (err: any) {
      console.error('Error cargando proveedor:', err);
      setError(err.message || 'Error al cargar el proveedor');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!proveedor) return;
    
    if (!window.confirm(`¿Estás seguro de que deseas eliminar al proveedor "${proveedor.nombre}"?`)) {
      return;
    }

    try {
      const response = await proveedoresAPI.delete(proveedor.id);
      if (response.success) {
        alert('Proveedor eliminado exitosamente');
        navigate('/admin/proveedores');
      } else {
        alert(response.message || 'Error al eliminar el proveedor');
      }
    } catch (err: any) {
      alert(`Error al eliminar: ${err.message}`);
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="proveedor-detalle-loading">
        <div className="spinner"></div>
        <p>Cargando proveedor...</p>
      </div>
    );
  }

  if (error || !proveedor) {
    return (
      <div className="proveedor-detalle-error">
        <h2>Error</h2>
        <p>{error || 'Proveedor no encontrado'}</p>
        <button className="btn-volver" onClick={() => navigate('/admin/proveedores')}>
          Volver a Proveedores
        </button>
      </div>
    );
  }

  return (
    <div className="proveedor-detalle-container">
      {/* Header */}
      <div className="proveedor-detalle-header">
        <button className="btn-back" onClick={() => navigate('/admin/proveedores')}>
          <AiOutlineArrowLeft size={20} />
          <span>Volver a Proveedores</span>
        </button>
        <div className="header-actions">
          <button 
            className="btn-edit"
            onClick={() => navigate(`/admin/editar-proveedor/${proveedor.id}`)}
          >
            <AiOutlineEdit size={18} />
            Editar
          </button>
          <button 
            className="btn-delete"
            onClick={handleDelete}
          >
            <AiOutlineDelete size={18} />
            Eliminar
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div className="proveedor-detalle-content">
        {/* Header con nombre y estado */}
        <div className="detalle-header-card">
          <div className="detalle-titulo">
            <h1>{proveedor.nombre}</h1>
            <span className={`estado-badge ${proveedor.activo ? 'activo' : 'inactivo'}`}>
              {proveedor.activo ? '✓ Activo' : '✗ Inactivo'}
            </span>
          </div>
          {proveedor.razon_social && (
            <p className="razon-social">{proveedor.razon_social}</p>
          )}
        </div>

        {/* Grid de información */}
        <div className="detalle-grid">
          {/* Columna izquierda */}
          <div className="detalle-col">
            {/* Información fiscal */}
            <div className="info-card">
              <h3>
                <AiOutlineIdcard size={20} />
                Información Fiscal
              </h3>
              <div className="info-content">
                <div className="info-row">
                  <span className="info-label">RFC:</span>
                  <span className="info-value">{proveedor.rfc || 'No especificado'}</span>
                </div>
              </div>
            </div>

            {/* Contacto */}
            <div className="info-card">
              <h3>
                <AiOutlineUser size={20} />
                Contacto
              </h3>
              <div className="info-content">
                {proveedor.persona_contacto && (
                  <div className="info-row">
                    <span className="info-label">Persona de contacto:</span>
                    <span className="info-value">{proveedor.persona_contacto}</span>
                  </div>
                )}
                {proveedor.email && (
                  <div className="info-row contact-item">
                    <AiOutlineMail size={16} />
                    <a href={`mailto:${proveedor.email}`} className="contact-link">
                      {proveedor.email}
                    </a>
                  </div>
                )}
                {proveedor.telefono && (
                  <div className="info-row contact-item">
                    <AiOutlinePhone size={16} />
                    <a href={`tel:${proveedor.telefono}`} className="contact-link">
                      {proveedor.telefono}
                    </a>
                  </div>
                )}
                {proveedor.sitio_web && (
                  <div className="info-row contact-item">
                    <AiOutlineGlobal size={16} />
                    <a href={proveedor.sitio_web} target="_blank" rel="noopener noreferrer" className="contact-link">
                      {proveedor.sitio_web}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Columna derecha */}
          <div className="detalle-col">
            {/* Dirección */}
            {proveedor.direccion && (
              <div className="info-card">
                <h3>📍 Dirección</h3>
                <div className="info-content">
                  <p className="direccion-text">{proveedor.direccion}</p>
                </div>
              </div>
            )}

            {/* Notas */}
            {proveedor.notas && (
              <div className="info-card">
                <h3>📝 Notas</h3>
                <div className="info-content">
                  <p className="notas-text">{proveedor.notas}</p>
                </div>
              </div>
            )}

            {/* Fechas */}
            <div className="info-card">
              <h3>📅 Fechas</h3>
              <div className="info-content">
                <div className="info-row">
                  <span className="info-label">Creado:</span>
                  <span className="info-value">{formatDate(proveedor.fecha_creacion)}</span>
                </div>
                {proveedor.fecha_actualizacion && (
                  <div className="info-row">
                    <span className="info-label">Actualizado:</span>
                    <span className="info-value">{formatDate(proveedor.fecha_actualizacion)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProveedorDetalleScreen;