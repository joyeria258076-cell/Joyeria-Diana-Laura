// Frontend/src/screens/admin/proveedores/AdminProveedorDetalleScreen.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  AiOutlineEdit, AiOutlineDelete, AiOutlineMail, AiOutlinePhone, AiOutlineGlobal, AiOutlineUser,
  AiOutlineIdcard, AiOutlineEnvironment, AiOutlineFileText, AiOutlineCalendar,
} from 'react-icons/ai';
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
  imagen_url?: string;
}

const iniciales = (nombre: string) =>
  nombre.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || '?';

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
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const formatDateShort = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="pd2-loading">
        <div className="pd2-spinner" />
        <p>Cargando proveedor...</p>
      </div>
    );
  }

  if (error || !proveedor) {
    return (
      <div className="pd2-error">
        <h2>Error</h2>
        <p>{error || 'Proveedor no encontrado'}</p>
      </div>
    );
  }

  return (
    <div className="pd2-container">
      {/* Banner de perfil */}
      <div className="pd2-hero">
        <div className="pd2-hero-avatar">
          {proveedor.imagen_url ? <img src={proveedor.imagen_url} alt={proveedor.nombre} /> : iniciales(proveedor.nombre)}
        </div>

        <div className="pd2-hero-info">
          <div className="pd2-hero-top">
            <h1>{proveedor.nombre}</h1>
            <span className={`pd2-badge ${proveedor.activo ? 'on' : 'off'}`}>
              {proveedor.activo ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          {proveedor.razon_social && <p className="pd2-hero-razon">{proveedor.razon_social}</p>}

          <div className="pd2-hero-chips">
            {proveedor.email && (
              <a href={`mailto:${proveedor.email}`} className="pd2-chip">
                <AiOutlineMail size={14} /> {proveedor.email}
              </a>
            )}
            {proveedor.telefono && (
              <a href={`tel:${proveedor.telefono}`} className="pd2-chip">
                <AiOutlinePhone size={14} /> {proveedor.telefono}
              </a>
            )}
            {proveedor.sitio_web && (
              <a href={proveedor.sitio_web} target="_blank" rel="noopener noreferrer" className="pd2-chip">
                <AiOutlineGlobal size={14} /> Sitio web
              </a>
            )}
          </div>
        </div>

        <div className="pd2-hero-actions">
          <button className="pd2-btn-edit" onClick={() => navigate(`/admin/editar-proveedor/${proveedor.id}`)}>
            <AiOutlineEdit size={16} /> Editar
          </button>
          <button className="pd2-btn-delete" onClick={handleDelete}>
            <AiOutlineDelete size={16} />
          </button>
        </div>
      </div>

      {/* Contenido: sidebar meta + tarjetas principales */}
      <div className="pd2-layout">
        <aside className="pd2-sidebar">
          <div className="pd2-sidebar-sticky">
            <div className="pd2-meta-card">
              <span className="pd2-meta-label"><AiOutlineIdcard size={14} /> RFC</span>
              <span className="pd2-meta-value">{proveedor.rfc || 'No especificado'}</span>
            </div>
            <div className="pd2-meta-card">
              <span className="pd2-meta-label"><AiOutlineUser size={14} /> Contacto</span>
              <span className="pd2-meta-value">{proveedor.persona_contacto || 'No especificado'}</span>
            </div>
            <div className="pd2-meta-card">
              <span className="pd2-meta-label"><AiOutlineCalendar size={14} /> Registrado</span>
              <span className="pd2-meta-value">{formatDateShort(proveedor.fecha_creacion)}</span>
            </div>
            {proveedor.fecha_actualizacion && (
              <div className="pd2-meta-card">
                <span className="pd2-meta-label"><AiOutlineCalendar size={14} /> Actualizado</span>
                <span className="pd2-meta-value">{formatDateShort(proveedor.fecha_actualizacion)}</span>
              </div>
            )}
          </div>
        </aside>

        <div className="pd2-main">
          <div className="pd2-panel">
            <h3><AiOutlineCalendar size={16} /> Historial</h3>
            <div className="pd2-panel-row">
              <span>Fecha de creación</span>
              <strong>{formatDate(proveedor.fecha_creacion)}</strong>
            </div>
            {proveedor.fecha_actualizacion && (
              <div className="pd2-panel-row">
                <span>Última actualización</span>
                <strong>{formatDate(proveedor.fecha_actualizacion)}</strong>
              </div>
            )}
          </div>

          {proveedor.direccion && (
            <div className="pd2-panel">
              <h3><AiOutlineEnvironment size={16} /> Dirección</h3>
              <p className="pd2-panel-text">{proveedor.direccion}</p>
            </div>
          )}

          {proveedor.notas && (
            <div className="pd2-panel">
              <h3><AiOutlineFileText size={16} /> Notas</h3>
              <p className="pd2-panel-text">{proveedor.notas}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminProveedorDetalleScreen;
