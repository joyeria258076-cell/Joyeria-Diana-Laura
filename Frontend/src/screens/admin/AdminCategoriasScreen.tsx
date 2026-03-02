import React, { useState, useEffect } from 'react';
import './AdminCategoriasScreen.css';
import { productsAPI } from '../../services/api';
import CategoriaModal from './CategoriaModal';
import { AiOutlineReload, AiOutlinePlus, AiOutlineEdit, AiOutlineEye, AiOutlineEyeInvisible, AiOutlineDelete } from 'react-icons/ai';

interface Categoria {
  id: number;
  nombre: string;
  descripcion?: string;
  categoria_padre_id?: number | null;
  imagen_url?: string;
  orden?: number;
  activo?: boolean;
  creado_por?: number;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
}

const AdminCategoriasScreen: React.FC = () => {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [categoriaEditar, setCategoriaEditar] = useState<Categoria | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const cargarCategorias = async () => {
    setLoading(true);
    try {
      const res = await productsAPI.getCategories();
      const datos = Array.isArray(res) ? res : (res.data || []);
      setCategorias(datos);
    } catch (error) {
      console.error("Error cargando categorías:", error);
      alert("Error al cargar las categorías");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarCategorias();
  }, []);

  const handleAbrirModal = (categoria?: Categoria) => {
    if (categoria) {
      setCategoriaEditar(categoria);
      setIsEditing(true);
    } else {
      setCategoriaEditar(null);
      setIsEditing(false);
    }
    setModalOpen(true);
  };

  const handleCerrarModal = () => {
    setModalOpen(false);
    setCategoriaEditar(null);
    setIsEditing(false);
  };

  const handleSubmitModal = async (formData: Categoria) => {
    try {
      setLoading(true);
      
      if (isEditing && categoriaEditar?.id) {
        await productsAPI.updateCategory(categoriaEditar.id, formData);
        alert('✅ Categoría actualizada correctamente');
      } else {
        await productsAPI.createCategory(formData);
        alert('✅ Categoría creada correctamente');
      }
      
      handleCerrarModal();
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

  const categoriasFiltradas = categorias.filter(cat =>
    cat.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cat.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getNombreCategoriaPadre = (id?: number | null) => {
    if (!id) return 'Categoría Principal';
    const padre = categorias.find(c => c.id === id);
    return padre ? padre.nombre : 'Desconocida';
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
        <div className="header-buttons">
          <button className="btn-refresh-lux" onClick={cargarCategorias} disabled={loading}>
            <AiOutlineReload className="icon" /> Actualizar
          </button>
          <button className="btn-new-lux" onClick={() => handleAbrirModal()}>
            <AiOutlinePlus className="icon" /> Nueva Categoría
          </button>
        </div>
      </div>

      {/* BÚSQUEDA */}
      <div className="search-container">
        <input
          type="text"
          placeholder="🔍 Buscar categoría por nombre o descripción..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="search-input"
        />
        {categoriasFiltradas.length > 0 && (
          <span className="search-count">{categoriasFiltradas.length} resultados</span>
        )}
      </div>

      {/* TABLA DE RESULTADOS */}
      <div className="table-container-lux">
        <div className="table-responsive">
          <table className="admin-custom-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Descripción</th>
                <th>Tipo</th>
                <th>Orden</th>
                <th>Estado</th>
                <th className="txt-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {categoriasFiltradas.length > 0 ? (
                categoriasFiltradas.map((cat) => {
                  const isActivo = cat.activo !== false;
                  const isPrincipal = !cat.categoria_padre_id;
                  
                  return (
                    <tr key={cat.id} className={isActivo ? 'row-active' : 'row-inactive'}>
                      <td className="id-cell">#{cat.id}</td>
                      <td className="name-cell">
                        <div className="category-info-wrapper">
                          <span className="category-name">{cat.nombre}</span>
                          {!isActivo && <span className="status-pill hidden-pill">Oculta</span>}
                        </div>
                      </td>
                      <td className="description-cell">
                        <span className="text-truncate" title={cat.descripcion}>
                          {cat.descripcion || '-'}
                        </span>
                      </td>
                      <td className="type-cell">
                        <span className={`type-badge ${isPrincipal ? 'principal' : 'sub'}`}>
                          {isPrincipal ? 'Principal' : `Sub (${getNombreCategoriaPadre(cat.categoria_padre_id)})`}
                        </span>
                      </td>
                      <td className="orden-cell">
                        <span className="orden-badge">{cat.orden || 0}</span>
                      </td>
                      <td className="status-cell">
                        <div className="status-container">
                          <span className={`dot-status ${isActivo ? 'active' : 'inactive'}`}></span>
                          <span className="status-text">{isActivo ? 'Activa' : 'Inactiva'}</span>
                        </div>
                      </td>
                      <td className="actions-cell">
                        <button
                          className="btn-action-lux edit"
                          onClick={() => handleAbrirModal(cat)}
                          title="Editar"
                        >
                          <AiOutlineEdit className="btn-icon" />
                          Editar
                        </button>
                        <button
                          className={`btn-action-lux ${isActivo ? 'hide' : 'show'}`}
                          onClick={() => handleToggleEstado(cat.id, isActivo)}
                          title={isActivo ? 'Ocultar' : 'Mostrar'}
                        >
                          {isActivo ? <AiOutlineEye className="btn-icon" /> : <AiOutlineEyeInvisible className="btn-icon" />}
                          {isActivo ? 'Ocultar' : 'Mostrar'}
                        </button>
                        <button
                          className="btn-action-lux delete"
                          onClick={() => handleEliminarCategoria(cat.id)}
                          title="Eliminar"
                        >
                          <AiOutlineDelete className="btn-icon" />
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="no-data">
                    {searchTerm ? 'No se encontraron categorías con ese término' : 'No se han encontrado categorías registradas'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      <CategoriaModal
        isOpen={modalOpen}
        isEditing={isEditing}
        categoriales={categoriaEditar}
        todascategorias={categorias}
        onClose={handleCerrarModal}
        onSubmit={handleSubmitModal}
        loading={loading}
      />
    </div>
  );
};

export default AdminCategoriasScreen;