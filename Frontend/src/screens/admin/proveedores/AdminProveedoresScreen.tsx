// Frontend/src/screens/admin/proveedores/AdminProveedoresScreen.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AiOutlinePlus, AiOutlineSearch, AiOutlineReload, AiOutlineEdit, AiOutlineDelete, AiOutlineInfo,
  AiOutlineMail, AiOutlinePhone, AiOutlineShop, AiOutlineIdcard, AiOutlineCheckCircle, AiOutlineStop,
  AiOutlineLeft, AiOutlineRight,
} from 'react-icons/ai';
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
  imagen_url?: string;
}

const iniciales = (nombre: string) =>
  nombre.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || '?';

const AdminProveedoresScreen: React.FC = () => {
  const navigate = useNavigate();
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [proveedoresFiltrados, setProveedoresFiltrados] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [filtroActivo, setFiltroActivo] = useState<'todos' | 'activos' | 'inactivos'>('todos');
  const [paginaActual, setPaginaActual] = useState(1);
  const PROVEEDORES_POR_PAGINA = 9;

  useEffect(() => {
    cargarProveedores();
  }, []);

  useEffect(() => {
    filtrarProveedores();
  }, [searchTerm, filtroActivo, proveedores]);

  useEffect(() => {
    setPaginaActual(1);
  }, [searchTerm, filtroActivo]);

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

    if (filtroActivo === 'activos') {
      filtrados = filtrados.filter(p => p.activo);
    } else if (filtroActivo === 'inactivos') {
      filtrados = filtrados.filter(p => !p.activo);
    }

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
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const totalActivos = proveedores.filter(p => p.activo).length;
  const totalInactivos = proveedores.length - totalActivos;

  const totalPaginas = Math.max(1, Math.ceil(proveedoresFiltrados.length / PROVEEDORES_POR_PAGINA));
  const proveedoresPagina = proveedoresFiltrados.slice(
    (paginaActual - 1) * PROVEEDORES_POR_PAGINA,
    paginaActual * PROVEEDORES_POR_PAGINA
  );

  return (
    <div className="pv-container">
      {/* Header */}
      <div className="pv-header">
        <h1><AiOutlineShop size={24} /> Proveedores</h1>
        <button className="pv-btn-nuevo" onClick={() => navigate('/admin/proveedor/nuevo')}>
          <AiOutlinePlus size={20} />
          Nuevo Proveedor
        </button>
      </div>

      {/* Estadísticas */}
      <div className="pv-stats">
        <div className="pv-stat">
          <span className="pv-stat-num">{proveedores.length}</span>
          <span className="pv-stat-label">Total</span>
        </div>
        <div className="pv-stat pv-stat-ok">
          <span className="pv-stat-num">{totalActivos}</span>
          <span className="pv-stat-label">Activos</span>
        </div>
        <div className="pv-stat pv-stat-off">
          <span className="pv-stat-num">{totalInactivos}</span>
          <span className="pv-stat-label">Inactivos</span>
        </div>
      </div>

      {error && <div className="pv-alert">{error}</div>}

      {/* Toolbar */}
      <div className="pv-toolbar">
        <div className="pv-search">
          <AiOutlineSearch />
          <input
            type="text"
            placeholder="Buscar por nombre, RFC, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="pv-filtros">
          {(['todos', 'activos', 'inactivos'] as const).map(f => (
            <button
              key={f}
              className={`pv-filtro-btn ${filtroActivo === f ? 'active' : ''}`}
              onClick={() => setFiltroActivo(f)}
            >
              {f === 'todos' ? 'Todos' : f === 'activos' ? 'Activos' : 'Inactivos'}
            </button>
          ))}
        </div>

        <button className="pv-btn-refrescar" onClick={cargarProveedores} disabled={loading}>
          <AiOutlineReload size={17} />
          {loading ? 'Cargando...' : 'Refrescar'}
        </button>
      </div>

      {/* Cuadrícula de tarjetas */}
      {loading ? (
        <div className="pv-loading">
          <div className="pv-spinner" />
          <p>Cargando proveedores...</p>
        </div>
      ) : proveedoresFiltrados.length === 0 ? (
        <div className="pv-empty">
          <AiOutlineShop size={36} />
          <p>{searchTerm ? 'No se encontraron proveedores' : 'No hay proveedores registrados'}</p>
          {!searchTerm && (
            <button className="pv-btn-nuevo" onClick={() => navigate('/admin/proveedor/nuevo')}>
              <AiOutlinePlus size={18} />
              Agregar primer proveedor
            </button>
          )}
        </div>
      ) : (
        <div className="pv-grid">
          {proveedoresPagina.map(proveedor => (
            <div key={proveedor.id} className={`pv-card ${!proveedor.activo ? 'pv-card-inactivo' : ''}`}>
              <div className="pv-card-top">
                <div className="pv-card-avatar">
                  {proveedor.imagen_url ? <img src={proveedor.imagen_url} alt="" /> : iniciales(proveedor.nombre)}
                </div>
                <button
                  className={`pv-status ${proveedor.activo ? 'on' : 'off'}`}
                  onClick={() => handleToggleStatus(proveedor.id, proveedor.activo)}
                  title={proveedor.activo ? 'Hacer inactivo' : 'Activar'}
                >
                  {proveedor.activo ? <AiOutlineCheckCircle size={13} /> : <AiOutlineStop size={13} />}
                  {proveedor.activo ? 'Activo' : 'Inactivo'}
                </button>
              </div>

              <h3 className="pv-card-nombre">{proveedor.nombre}</h3>
              {proveedor.razon_social && <p className="pv-card-razon">{proveedor.razon_social}</p>}

              <div className="pv-card-id">#{proveedor.id} · {formatDate(proveedor.fecha_creacion)}</div>

              <div className="pv-card-divider" />

              <div className="pv-card-info">
                <div className="pv-card-row">
                  <AiOutlineIdcard size={14} />
                  <span>{proveedor.rfc || 'RFC no especificado'}</span>
                </div>
                {proveedor.persona_contacto && (
                  <div className="pv-card-row">
                    <span className="pv-card-dot" />
                    <span>{proveedor.persona_contacto}</span>
                  </div>
                )}
                {proveedor.email && (
                  <div className="pv-card-row">
                    <AiOutlineMail size={14} />
                    <span>{proveedor.email}</span>
                  </div>
                )}
                {proveedor.telefono && (
                  <div className="pv-card-row">
                    <AiOutlinePhone size={14} />
                    <span>{proveedor.telefono}</span>
                  </div>
                )}
              </div>

              <div className="pv-card-actions">
                <button onClick={() => navigate(`/admin/proveedor/${proveedor.id}`)} title="Ver detalles">
                  <AiOutlineInfo size={16} />
                </button>
                <button onClick={() => navigate(`/admin/editar-proveedor/${proveedor.id}`)} title="Editar">
                  <AiOutlineEdit size={16} />
                </button>
                <button className="danger" onClick={() => handleDelete(proveedor.id, proveedor.nombre)} title="Eliminar">
                  <AiOutlineDelete size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Paginación */}
      {!loading && proveedoresFiltrados.length > PROVEEDORES_POR_PAGINA && (
        <div className="pv-pagination">
          <button
            className="pv-page-btn"
            onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
            disabled={paginaActual === 1}
          >
            <AiOutlineLeft size={14} />
          </button>

          <span className="pv-page-info">
            Página {paginaActual} de {totalPaginas}
            <small> · {proveedoresFiltrados.length} proveedores</small>
          </span>

          <button
            className="pv-page-btn"
            onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
            disabled={paginaActual === totalPaginas}
          >
            <AiOutlineRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminProveedoresScreen;
