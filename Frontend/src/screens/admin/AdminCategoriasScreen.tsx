import React, { useState, useEffect } from 'react';
import './AdminCategoriasScreen.css'; 
import { productsAPI } from '../../services/api';

interface Categoria {
  id: number;
  nombre: string;
  activo?: boolean;
}

const AdminCategoriasScreen: React.FC = () => {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [loading, setLoading] = useState(false);

  const cargarCategorias = async () => {
    setLoading(true);
    try {
      const res = await productsAPI.getCategories();
      setCategorias(Array.isArray(res) ? res : (res.data || []));
    } catch (error) {
      console.error("Error cargando categorías:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarCategorias();
  }, []);

  const handleCrearCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaCategoria.trim()) return;

    try {
      setLoading(true);
      await productsAPI.createCategory({ nombre: nuevaCategoria });
      setNuevaCategoria('');
      cargarCategorias();
    } catch (error: any) {
      alert("❌ Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEstado = async (id: number, estadoActual: boolean) => {
    const accion = estadoActual ? "deshabilitar" : "habilitar";
    if (!window.confirm(`¿Seguro que deseas ${accion} esta categoría?`)) return;

    try {
      setLoading(true);
      await productsAPI.toggleCategoryStatus(id, !estadoActual);
      cargarCategorias(); 
    } catch (error: any) {
      alert("❌ Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarCategoria = async (id: number) => {
    if (!window.confirm("🚨 ¡ADVERTENCIA! ¿Estás seguro de eliminar esta categoría permanentemente?")) return;

    try {
      setLoading(true);
      await productsAPI.deleteCategory(id);
      cargarCategorias();
    } catch (error: any) {
      alert("❌ Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-categorias-container animate-fade-in">
      <div className="bg-glow"></div>

      {/* ENCABEZADO */}
      <div className="admin-page-header">
        <div className="header-title-section">
          <h2>Gestión de Categorías</h2>
          <p className="subtitle">Catálogo Exclusivo Diana Laura</p>
        </div>
        <button className="btn-refresh-lux" onClick={cargarCategorias}>
          <span className="icon">🔄</span> Actualizar Listado
        </button>
      </div>

      {/* FORMULARIO DE REGISTRO */}
      <div className="form-container-lux">
        <div className="form-inner">
          <h3>Nueva Colección</h3>
          <form onSubmit={handleCrearCategoria} className="categoria-form-row">
            <div className="input-lux-group">
              <label>✦ Nombre de la Categoría</label>
              <input 
                type="text" 
                value={nuevaCategoria} 
                onChange={e => setNuevaCategoria(e.target.value)} 
                placeholder="Escribe el nombre aquí..." 
                required 
              />
            </div>
            <button type="submit" className="btn-submit-lux" disabled={loading}>
              {loading ? 'Guardando...' : 'AÑADIR A CATÁLOGO'}
            </button>
          </form>
        </div>
      </div>

      {/* TABLA DE RESULTADOS */}
      <div className="table-container-lux">
        <table className="admin-custom-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Colección / Categoría</th>
              <th>Estado Visual</th>
              <th className="txt-center">Acciones de Gestión</th>
            </tr>
          </thead>
          <tbody>
            {categorias.length > 0 ? (
              categorias.map((cat) => {
                const isActivo = cat.activo !== false; 
                return (
                  <tr key={cat.id} className={isActivo ? 'row-active' : 'row-inactive'}>
                    <td className="id-cell">#{cat.id}</td>
                    <td className="name-cell">
                      <div className="category-info-wrapper">
                        <span className="category-name">{cat.nombre}</span>
                        {!isActivo && <span className="status-pill hidden-pill">Oculta</span>}
                      </div>
                    </td>
                    <td>
                      <div className="status-container">
                        <span className={`dot-status ${isActivo ? 'active' : 'inactive'}`}></span>
                        <span className="status-text">{isActivo ? 'Visible al Público' : 'Privada / Oculta'}</span>
                      </div>
                    </td>
                    <td className="actions-cell">
                      <button 
                        className={`btn-action-lux ${isActivo ? 'hide' : 'show'}`}
                        onClick={() => handleToggleEstado(cat.id, isActivo)}
                      >
                        {isActivo ? '👁️ Ocultar' : '👁️‍🗨️ Mostrar'}
                      </button>
                      <button 
                        className="btn-action-lux delete"
                        onClick={() => handleEliminarCategoria(cat.id)}
                      >
                        🗑️ Eliminar
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={4} className="no-data">No se han encontrado colecciones registradas.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminCategoriasScreen;