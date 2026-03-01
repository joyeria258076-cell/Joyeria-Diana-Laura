import React, { useState, useEffect } from 'react';
import './AdminInventarioScreen.css';
import { productsAPI } from '../../services/api';

interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
  imagen?: string;
  categoria_nombre?: string;
}

const AdminInventarioScreen: React.FC = () => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(false);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const prodRes = await productsAPI.getAll();
      setProductos(Array.isArray(prodRes) ? prodRes : (prodRes.data || []));
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  const handleEliminar = async (id: number) => {
    if (!window.confirm('¿Seguro que deseas eliminar este producto?')) return;
    try {
      setLoading(true);
      await productsAPI.delete(id);
      cargarDatos();
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const productosFiltrados = productos.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (p.categoria_nombre && p.categoria_nombre.toLowerCase().includes(busqueda.toLowerCase()))
  );

  return (
    <div className="admin-inventario-container animate-fade-in">
      <div className="bg-glow" />

      {/* ENCABEZADO */}
      <header className="admin-header-section">
        <div>
          <h2 className="admin-title">Inventario Real</h2>
          <p className="subtitle">Gestión de existencias y piezas exclusivas</p>
        </div>
        <button className="btn-refresh-lux" onClick={cargarDatos} disabled={loading}>
          {loading ? 'Cargando...' : '🔄 Actualizar'}
        </button>
      </header>

      {/* BUSCADOR */}
      <div className="admin-toolbar-lux">
        <div className="search-wrapper-lux">
          <svg
            className="search-icon-svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="admin-search-input-lux"
            placeholder="Buscar por nombre o categoría..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      </div>

      {/* TABLA */}
      <div className="table-container-lux">
        <table className="admin-custom-table-lux">
          <thead>
            <tr>
              <th>ID</th>
              <th>Pieza</th>
              <th>Colección</th>
              <th>Precio</th>
              <th>Existencia</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productosFiltrados.length > 0 ? (
              productosFiltrados.map((prod) => (
                <tr key={prod.id} className="row-hover-effect">
                  <td>#{prod.id}</td>
                  <td>
                    <div className="product-info-cell">
                      <div className="img-wrapper-lux">
                        {prod.imagen ? (
                          <img src={prod.imagen} alt={prod.nombre} className="table-img-lux" />
                        ) : (
                          <div className="no-img-placeholder">💎</div>
                        )}
                      </div>
                      <span className="product-name-lux">{prod.nombre}</span>
                    </div>
                  </td>
                  <td>
                    <span className="category-tag-lux">
                      {prod.categoria_nombre || 'General'}
                    </span>
                  </td>
                  <td className="price-cell">
                    <strong>
                      ${Number(prod.precio).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </strong>
                  </td>
                  <td>
                    <span className={`stock-pill ${prod.stock < 5 ? 'low' : 'ok'}`}>
                      {prod.stock} {prod.stock === 1 ? 'unidad' : 'unidades'}
                    </span>
                    {prod.stock < 5 && (
                      <span className="low-stock-warning">⚠️ Stock Bajo</span>
                    )}
                  </td>
                  <td className="actions-cell">
                    <div className="actions-wrapper">
                      <button className="btn-action-lux edit" title="Editar">✏️</button>
                      <button
                        className="btn-action-lux delete"
                        onClick={() => handleEliminar(prod.id)}
                        title="Eliminar"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="no-data-lux">
                  {busqueda
                    ? 'No se encontraron coincidencias...'
                    : 'No hay productos registrados en el inventario.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminInventarioScreen;