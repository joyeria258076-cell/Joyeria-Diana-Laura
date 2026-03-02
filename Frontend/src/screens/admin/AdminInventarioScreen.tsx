import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AiOutlinePlus, AiOutlineSearch, AiOutlineReload, AiOutlineEdit, AiOutlineDelete, AiOutlineInfo } from 'react-icons/ai';
import { productsAPI } from '../../services/api';
import './AdminInventarioScreen.css';

interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  categoria_id: number;
  categoria_nombre?: string;
  proveedor_id?: number;
  proveedor_nombre?: string;
  precio_venta: number;
  stock_actual: number;
  stock_minimo: number;
  es_nuevo?: boolean;
  es_destacado?: boolean;
  activo: boolean;
  fecha_creacion: string;
  imagen_principal?: string;
}

const AdminInventarioScreen: React.FC = () => {
  const navigate = useNavigate();
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  
  // Productos recientes
  const [productosRecientes, setProductosRecientes] = useState<Producto[]>([]);
  
  // Todos los productos
  const [todosProductos, setTodosProductos] = useState<Producto[]>([]);
  const [productosFiltrados, setProductosFiltrados] = useState<Producto[]>([]);

  // Cargar datos al montar componente
  useEffect(() => {
    loadRecent();
    loadAll();
  }, []);

  // Realizar búsqueda
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setProductosFiltrados(todosProductos);
    } else {
      const filtered = todosProductos.filter(p =>
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.categoria_nombre?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setProductosFiltrados(filtered);
    }
  }, [searchTerm, todosProductos]);

  const loadRecent = async () => {
    setLoadingRecent(true);
    setError('');
    try {
      const response = await productsAPI.getRecent(10);
      if (response.success && Array.isArray(response.data)) {
        setProductosRecientes(response.data);
      } else {
        setProductosRecientes([]);
      }
    } catch (err: any) {
      console.error('Error loading recent products:', err);
      setError('Error cargando productos recientes');
    } finally {
      setLoadingRecent(false);
    }
  };

  const loadAll = async () => {
    setLoadingAll(true);
    setError('');
    try {
      const response = await productsAPI.getAll();
      if (response.success && Array.isArray(response.data)) {
        setTodosProductos(response.data);
        setProductosFiltrados(response.data);
      } else {
        setTodosProductos([]);
        setProductosFiltrados([]);
      }
    } catch (err: any) {
      console.error('Error loading products:', err);
      setError('Error cargando productos');
    } finally {
      setLoadingAll(false);
    }
  };

  const handleDelete = async (id: number, nombre: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar "${nombre}"?`)) {
      return;
    }

    try {
      await productsAPI.delete(id);
      setProductosRecientes(productosRecientes.filter(p => p.id !== id));
      setTodosProductos(todosProductos.filter(p => p.id !== id));
    } catch (err: any) {
      alert(`Error al eliminar: ${err.message}`);
    }
  };

  const getStockColor = (actual: number, minimo: number): string => {
    if (actual <= minimo) return 'stock-bajo';
    if (actual <= minimo * 2) return 'stock-medio';
    return 'stock-ok';
  };

  const getStockLabel = (actual: number, minimo: number): string => {
    if (actual <= minimo) return '⚠️ Bajo Stock';
    if (actual <= minimo * 2) return '⚠️ Stock Medio';
    return '✓ Stock OK';
  };

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="inventario-container">
      {/* Header */}
      <div className="inventario-header">
        <h1>📦 Inventario de Productos</h1>
        <button
          className="btn-new-product"
          onClick={() => navigate('/admin/nuevo-producto')}
        >
          <AiOutlinePlus size={20} />
          Nuevo Producto
        </button>
      </div>

      {/* Alert */}
      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {/* SECTION 1: PRODUCTOS RECIENTES */}
      <section className="inventory-section">
        <div className="section-header">
          <h2>📅 Productos Recientes (Últimos 7 días)</h2>
          <button
            className="btn-refresh"
            onClick={loadRecent}
            disabled={loadingRecent}
          >
            <AiOutlineReload size={18} />
            {loadingRecent ? 'Cargando...' : 'Recargar'}
          </button>
        </div>

        {loadingRecent ? (
          <div className="loading-state">Cargando productos recientes...</div>
        ) : productosRecientes.length === 0 ? (
          <div className="empty-state">
            <p>No hay productos recientes</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Categoría</th>
                  <th>Stock</th>
                  <th>Precio</th>
                  <th>Fecha</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productosRecientes.map(producto => (
                  <tr key={producto.id} className={producto.activo ? '' : 'inactive'}>
                    <td className="table-id">#{producto.id}</td>
                    <td className="table-nombre">
                      <span>{producto.nombre}</span>
                      {producto.es_nuevo && <span className="badge-new">Nuevo</span>}
                      {producto.es_destacado && <span className="badge-featured">Destacado</span>}
                    </td>
                    <td>{producto.categoria_nombre || '-'}</td>
                    <td>
                      <span className={`stock-badge ${getStockColor(producto.stock_actual, producto.stock_minimo)}`}>
                        {getStockLabel(producto.stock_actual, producto.stock_minimo)}
                      </span>
                      <span className="stock-number">({producto.stock_actual})</span>
                    </td>
                    <td className="table-price">{formatPrice(producto.precio_venta)}</td>
                    <td className="table-date">{formatDate(producto.fecha_creacion)}</td>
                    <td className="table-actions">
                      <button
                        className="btn-action btn-info"
                        onClick={() => navigate(`/admin/producto/${producto.id}`)}
                        title="Ver detalles"
                      >
                        <AiOutlineInfo size={16} />
                      </button>
                      <button
                        className="btn-action btn-edit"
                        onClick={() => navigate(`/admin/editar-producto/${producto.id}`)}
                        title="Editar"
                      >
                        <AiOutlineEdit size={16} />
                      </button>
                      <button
                        className="btn-action btn-delete"
                        onClick={() => handleDelete(producto.id, producto.nombre)}
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
      </section>

      {/* SECTION 2: TODOS LOS PRODUCTOS */}
      <section className="inventory-section">
        <div className="section-header">
          <h2>📋 Inventario General ({productosFiltrados.length})</h2>
          <div className="search-box">
            <AiOutlineSearch size={18} />
            <input
              type="text"
              placeholder="Buscar por nombre, descripción o categoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loadingAll ? (
          <div className="loading-state">Cargando inventario...</div>
        ) : productosFiltrados.length === 0 ? (
          <div className="empty-state">
            <p>{searchTerm ? 'No se encontraron productos' : 'No hay productos disponibles'}</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Categoría</th>
                  <th>Proveedor</th>
                  <th>Stock</th>
                  <th>Precio</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productosFiltrados.map(producto => (
                  <tr key={producto.id} className={producto.activo ? '' : 'inactive'}>
                    <td className="table-id">#{producto.id}</td>
                    <td className="table-nombre">
                      <span>{producto.nombre}</span>
                      {producto.es_nuevo && <span className="badge-new">Nuevo</span>}
                      {producto.es_destacado && <span className="badge-featured">Destacado</span>}
                    </td>
                    <td>{producto.categoria_nombre || '-'}</td>
                    <td>{producto.proveedor_nombre || '-'}</td>
                    <td>
                      <span className={`stock-badge ${getStockColor(producto.stock_actual, producto.stock_minimo)}`}>
                        {getStockLabel(producto.stock_actual, producto.stock_minimo)}
                      </span>
                      <span className="stock-number">({producto.stock_actual})</span>
                    </td>
                    <td className="table-price">{formatPrice(producto.precio_venta)}</td>
                    <td>
                      <span className={`status-badge ${producto.activo ? 'active' : 'inactive'}`}>
                        {producto.activo ? '✓ Activo' : '✗ Inactivo'}
                      </span>
                    </td>
                    <td className="table-actions">
                      <button
                        className="btn-action btn-info"
                        onClick={() => navigate(`/admin/producto/${producto.id}`)}
                        title="Ver detalles"
                      >
                        <AiOutlineInfo size={16} />
                      </button>
                      <button
                        className="btn-action btn-edit"
                        onClick={() => navigate(`/admin/editar-producto/${producto.id}`)}
                        title="Editar"
                      >
                        <AiOutlineEdit size={16} />
                      </button>
                      <button
                        className="btn-action btn-delete"
                        onClick={() => handleDelete(producto.id, producto.nombre)}
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
      </section>
    </div>
  );
};

export default AdminInventarioScreen;