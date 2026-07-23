// Frontend/src/screens/admin/AdminInventarioScreen.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AiOutlinePlus, AiOutlineSearch, AiOutlineReload, AiOutlineEdit, AiOutlineDelete, AiOutlineInfo,
  AiOutlineInbox, AiOutlineWarning, AiOutlineCheckCircle, AiOutlineLeft, AiOutlineRight, AiOutlineStar,
} from 'react-icons/ai';
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

const PRODUCTOS_POR_PAGINA = 9;

const AdminInventarioScreen: React.FC = () => {
  const navigate = useNavigate();
  const [loadingAll, setLoadingAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [vista, setVista] = useState<'recientes' | 'todos'>('recientes');
  const [paginaActual, setPaginaActual] = useState(1);

  const [productosRecientes, setProductosRecientes] = useState<Producto[]>([]);
  const [todosProductos, setTodosProductos] = useState<Producto[]>([]);
  const [productosFiltrados, setProductosFiltrados] = useState<Producto[]>([]);

  useEffect(() => {
    loadRecent();
    loadAll();
  }, []);

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

  useEffect(() => {
    setPaginaActual(1);
  }, [searchTerm, vista]);

  const loadRecent = async () => {
    setError('');
    try {
      const response = await productsAPI.getRecent(10);
      setProductosRecientes(response.success && Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      console.error('Error loading recent products:', err);
      setError('Error cargando productos recientes');
    }
  };

  const loadAll = async () => {
    setLoadingAll(true);
    setError('');
    try {
      const response = await productsAPI.getAll();
      const data = response.success && Array.isArray(response.data) ? response.data : [];
      setTodosProductos(data);
      setProductosFiltrados(data);
    } catch (err: any) {
      console.error('Error loading products:', err);
      setError('Error cargando productos');
    } finally {
      setLoadingAll(false);
    }
  };

  const handleRefrescar = () => {
    loadRecent();
    loadAll();
  };

  const handleDelete = async (id: number, nombre: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar "${nombre}"?`)) return;
    try {
      await productsAPI.delete(id);
      setProductosRecientes(prev => prev.filter(p => p.id !== id));
      setTodosProductos(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      alert(`Error al eliminar: ${err.message}`);
    }
  };

  const getStockNivel = (actual: number, minimo: number): 'bajo' | 'medio' | 'ok' => {
    if (actual <= minimo) return 'bajo';
    if (actual <= minimo * 2) return 'medio';
    return 'ok';
  };

  const formatPrice = (price: number): string =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(price);

  const listaActiva = vista === 'recientes' ? productosRecientes : productosFiltrados;
  const totalPaginas = Math.max(1, Math.ceil(listaActiva.length / PRODUCTOS_POR_PAGINA));
  const productosPagina = listaActiva.slice((paginaActual - 1) * PRODUCTOS_POR_PAGINA, paginaActual * PRODUCTOS_POR_PAGINA);

  const totalStockBajo = todosProductos.filter(p => p.stock_actual <= p.stock_minimo).length;
  const totalActivos = todosProductos.filter(p => p.activo).length;
  const totalNuevos = todosProductos.filter(p => p.es_nuevo).length;

  return (
    <div className="inv2-container">
      <div className="inv2-header">
        <h1><AiOutlineInbox size={22} /> Inventario de Productos</h1>
        <button className="inv2-btn-nuevo" onClick={() => navigate('/admin-nuevo-producto')}>
          <AiOutlinePlus size={18} /> Nuevo Producto
        </button>
      </div>

      <div className="inv2-stats">
        <div className="inv2-stat">
          <span className="inv2-stat-num">{todosProductos.length}</span>
          <span className="inv2-stat-label">Total</span>
        </div>
        <div className="inv2-stat inv2-stat-bad">
          <span className="inv2-stat-num">{totalStockBajo}</span>
          <span className="inv2-stat-label">Stock Bajo</span>
        </div>
        <div className="inv2-stat inv2-stat-ok">
          <span className="inv2-stat-num">{totalActivos}</span>
          <span className="inv2-stat-label">Activos</span>
        </div>
        <div className="inv2-stat">
          <span className="inv2-stat-num">{totalNuevos}</span>
          <span className="inv2-stat-label">Nuevos</span>
        </div>
      </div>

      {error && <div className="inv2-alert">{error}</div>}

      <div className="inv2-toolbar">
        <div className="inv2-tabs">
          <button className={`inv2-tab ${vista === 'recientes' ? 'active' : ''}`} onClick={() => setVista('recientes')}>
            Recientes
          </button>
          <button className={`inv2-tab ${vista === 'todos' ? 'active' : ''}`} onClick={() => setVista('todos')}>
            Todos ({todosProductos.length})
          </button>
        </div>

        {vista === 'todos' && (
          <div className="inv2-search">
            <AiOutlineSearch />
            <input
              type="text"
              placeholder="Buscar por nombre, descripción o categoría..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        )}

        <button className="inv2-btn-refrescar" onClick={handleRefrescar} disabled={loadingAll}>
          <AiOutlineReload size={15} />
          {loadingAll ? 'Cargando...' : 'Refrescar'}
        </button>
      </div>

      {loadingAll && listaActiva.length === 0 ? (
        <div className="inv2-loading">
          <div className="inv2-spinner" />
          <p>Cargando inventario...</p>
        </div>
      ) : productosPagina.length === 0 ? (
        <div className="inv2-empty">
          <AiOutlineInbox size={36} />
          <p>{searchTerm ? 'No se encontraron productos' : 'No hay productos disponibles'}</p>
        </div>
      ) : (
        <div className="inv2-grid">
          {productosPagina.map(producto => {
            const nivel = getStockNivel(producto.stock_actual, producto.stock_minimo);
            const porcentaje = Math.min(100, Math.round((producto.stock_actual / (producto.stock_minimo * 2 || 1)) * 100));
            return (
              <div key={producto.id} className={`inv2-card ${!producto.activo ? 'inv2-card-inactivo' : ''}`}>
                <div className="inv2-card-media">
                  {producto.imagen_principal ? (
                    <img src={producto.imagen_principal} alt={producto.nombre} />
                  ) : (
                    <div className="inv2-card-media-placeholder"><AiOutlineInbox size={26} /></div>
                  )}
                  <div className="inv2-card-badges">
                    {producto.es_nuevo && <span className="inv2-badge new">Nuevo</span>}
                    {producto.es_destacado && <span className="inv2-badge featured"><AiOutlineStar size={11} /> Destacado</span>}
                  </div>
                  {!producto.activo && <span className="inv2-badge-inactivo">Inactivo</span>}
                </div>

                <div className="inv2-card-body">
                  <div className="inv2-card-id">#{producto.id} · {producto.categoria_nombre || 'Sin categoría'}</div>
                  <h3 className="inv2-card-nombre">{producto.nombre}</h3>
                  <div className="inv2-card-precio">{formatPrice(producto.precio_venta)}</div>

                  <div className="inv2-stock-wrap">
                    <div className="inv2-stock-top">
                      <span className={`inv2-stock-label ${nivel}`}>
                        {nivel === 'bajo' ? <AiOutlineWarning size={12} /> : <AiOutlineCheckCircle size={12} />}
                        {nivel === 'bajo' ? 'Stock bajo' : nivel === 'medio' ? 'Stock medio' : 'Stock OK'}
                      </span>
                      <span className="inv2-stock-num">{producto.stock_actual} uds.</span>
                    </div>
                    <div className="inv2-stock-bar">
                      <div className={`inv2-stock-fill ${nivel}`} style={{ width: `${porcentaje}%` }} />
                    </div>
                  </div>

                  <div className="inv2-card-actions">
                    <button onClick={() => navigate(`/admin/producto/${producto.id}`)} title="Ver detalles">
                      <AiOutlineInfo size={16} />
                    </button>
                    <button onClick={() => navigate(`/admin/editar-producto/${producto.id}`)} title="Editar">
                      <AiOutlineEdit size={16} />
                    </button>
                    <button className="danger" onClick={() => handleDelete(producto.id, producto.nombre)} title="Eliminar">
                      <AiOutlineDelete size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {listaActiva.length > PRODUCTOS_POR_PAGINA && (
        <div className="inv2-pagination">
          <button className="inv2-page-btn" onClick={() => setPaginaActual(p => Math.max(1, p - 1))} disabled={paginaActual === 1}>
            <AiOutlineLeft size={14} />
          </button>
          <span className="inv2-page-info">
            Página {paginaActual} de {totalPaginas}
            <small> · {listaActiva.length} productos</small>
          </span>
          <button className="inv2-page-btn" onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas}>
            <AiOutlineRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminInventarioScreen;
