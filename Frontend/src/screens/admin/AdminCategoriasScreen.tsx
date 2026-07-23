import React, { useState, useEffect } from 'react';
import './AdminCategoriasScreen.css';
import { productsAPI } from '../../services/api';
import CategoriaModal from './CategoriaModal';
import {
  AiOutlineReload, AiOutlinePlus, AiOutlineEdit, AiOutlineEye, AiOutlineEyeInvisible,
  AiOutlineDelete, AiOutlineSearch, AiOutlineAppstore, AiOutlineTags, AiOutlineFolder,
  AiOutlineHolder,
} from 'react-icons/ai';

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

const inicial = (nombre: string) => nombre.trim().charAt(0).toUpperCase() || '?';

const AdminCategoriasScreen: React.FC = () => {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [categoriaEditar, setCategoriaEditar] = useState<Categoria | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const [reordering, setReordering] = useState(false);

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
      } else {
        await productsAPI.createCategory(formData);
      }

      handleCerrarModal();
      cargarCategorias();
    } catch (error: any) {
      alert("Error: " + error.message);
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
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarCategoria = async (id: number) => {
    if (!window.confirm("¿Estás seguro de eliminar esta categoría permanentemente?")) return;

    try {
      setLoading(true);
      await productsAPI.deleteCategory(id);
      cargarCategorias();
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const persistarOrden = async (lista: Categoria[]) => {
    setReordering(true);
    try {
      await Promise.all(
        lista.map((cat, index) =>
          cat.orden === index ? null : productsAPI.updateCategory(cat.id, { ...cat, orden: index })
        )
      );
      await cargarCategorias();
    } catch (error: any) {
      alert("Error al reordenar: " + error.message);
    } finally {
      setReordering(false);
    }
  };

  const handleDrop = (lista: Categoria[], targetId: number) => {
    if (draggedId == null || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }
    const nueva = [...lista];
    const fromIndex = nueva.findIndex(c => c.id === draggedId);
    const toIndex = nueva.findIndex(c => c.id === targetId);
    if (fromIndex === -1 || toIndex === -1) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }
    const [movido] = nueva.splice(fromIndex, 1);
    nueva.splice(toIndex, 0, movido);
    setDraggedId(null);
    setDragOverId(null);
    persistarOrden(nueva);
  };

  const handleReorderHermanas = async (cambios: { id: number; orden: number }[]) => {
    setReordering(true);
    try {
      await Promise.all(
        cambios.map(({ id, orden }) => {
          const cat = categorias.find(c => c.id === id);
          return cat ? productsAPI.updateCategory(id, { ...cat, orden }) : null;
        })
      );
      await cargarCategorias();
    } catch (error: any) {
      alert("Error al reordenar: " + error.message);
    } finally {
      setReordering(false);
    }
  };

  const term = searchTerm.toLowerCase();
  const coincide = (cat: Categoria) =>
    cat.nombre.toLowerCase().includes(term) ||
    (cat.descripcion?.toLowerCase().includes(term));

  const principales = categorias
    .filter(c => !c.categoria_padre_id)
    .sort((a, b) => (a.orden || 0) - (b.orden || 0));

  const hijosDe = (id: number) =>
    categorias
      .filter(c => c.categoria_padre_id === id)
      .sort((a, b) => (a.orden || 0) - (b.orden || 0));

  const grupos = principales
    .map(p => ({ padre: p, hijos: hijosDe(p.id) }))
    .filter(({ padre, hijos }) =>
      !searchTerm.trim() || coincide(padre) || hijos.some(coincide)
    );

  const totalActivas = categorias.filter(c => c.activo !== false).length;
  const totalSub = categorias.filter(c => c.categoria_padre_id).length;

  const renderAcciones = (cat: Categoria) => {
    const isActivo = cat.activo !== false;
    return (
      <div className="cat2-actions">
        <button onClick={() => handleAbrirModal(cat)} title="Editar">
          <AiOutlineEdit size={14} />
        </button>
        <button onClick={() => handleToggleEstado(cat.id, isActivo)} title={isActivo ? 'Ocultar' : 'Mostrar'}>
          {isActivo ? <AiOutlineEye size={14} /> : <AiOutlineEyeInvisible size={14} />}
        </button>
        <button className="danger" onClick={() => handleEliminarCategoria(cat.id)} title="Eliminar">
          <AiOutlineDelete size={14} />
        </button>
      </div>
    );
  };

  return (
    <div className="cat2-container">
      <div className="cat2-header">
        <h1><AiOutlineTags size={24} /> Gestión de Categorías</h1>
        <button className="cat2-btn-nuevo" onClick={() => handleAbrirModal()}>
          <AiOutlinePlus size={18} /> Nueva Categoría
        </button>
      </div>

      <div className="cat2-stats">
        <div className="cat2-stat">
          <span className="cat2-stat-num">{categorias.length}</span>
          <span className="cat2-stat-label">Total</span>
        </div>
        <div className="cat2-stat">
          <span className="cat2-stat-num">{principales.length}</span>
          <span className="cat2-stat-label">Principales</span>
        </div>
        <div className="cat2-stat">
          <span className="cat2-stat-num">{totalSub}</span>
          <span className="cat2-stat-label">Subcategorías</span>
        </div>
        <div className="cat2-stat cat2-stat-ok">
          <span className="cat2-stat-num">{totalActivas}</span>
          <span className="cat2-stat-label">Activas</span>
        </div>
      </div>

      <div className="cat2-toolbar">
        <div className="cat2-search">
          <AiOutlineSearch />
          <input
            type="text"
            placeholder="Buscar categoría o subcategoría..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="cat2-btn-refrescar" onClick={cargarCategorias} disabled={loading}>
          <AiOutlineReload size={15} />
          {loading ? 'Cargando...' : 'Refrescar'}
        </button>
      </div>

      {/* Árbol de categorías */}
      {grupos.length === 0 ? (
        <div className="cat2-empty">
          <AiOutlineFolder size={36} />
          <p>{searchTerm ? 'No se encontraron categorías' : 'No hay categorías registradas'}</p>
        </div>
      ) : (
        <div className="cat2-tree">
          {grupos.map(({ padre, hijos }) => {
            const isActivo = padre.activo !== false;
            return (
              <div
                key={padre.id}
                className={`cat2-group ${!isActivo ? 'cat2-group-inactivo' : ''} ${dragOverId === padre.id ? 'cat2-drag-over' : ''} ${draggedId === padre.id ? 'cat2-dragging' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragOverId(padre.id); }}
                onDragLeave={() => setDragOverId(prev => prev === padre.id ? null : prev)}
                onDrop={e => { e.preventDefault(); handleDrop(principales, padre.id); }}
              >
                <div className="cat2-group-header">
                  <span
                    className="cat2-drag-handle"
                    draggable
                    onDragStart={() => setDraggedId(padre.id)}
                    onDragEnd={() => { setDraggedId(null); setDragOverId(null); }}
                    title="Arrastrar para reordenar"
                  >
                    <AiOutlineHolder size={16} />
                  </span>
                  <div className="cat2-group-icon"><AiOutlineAppstore size={18} /></div>
                  <div className="cat2-group-info">
                    <div className="cat2-group-nombre">
                      {padre.nombre}
                      <span className="cat2-orden">#{padre.orden || 0}</span>
                    </div>
                    {padre.descripcion && <p className="cat2-group-desc">{padre.descripcion}</p>}
                  </div>
                  <span className={`cat2-dot ${isActivo ? 'on' : 'off'}`}>{isActivo ? 'Activa' : 'Inactiva'}</span>
                  {renderAcciones(padre)}
                </div>

                {hijos.length > 0 && (
                  <div className="cat2-children">
                    {hijos.map(hijo => {
                      const hijoActivo = hijo.activo !== false;
                      return (
                        <div
                          key={hijo.id}
                          className={`cat2-child ${!hijoActivo ? 'cat2-child-inactivo' : ''} ${dragOverId === hijo.id ? 'cat2-drag-over' : ''} ${draggedId === hijo.id ? 'cat2-dragging' : ''}`}
                          onDragOver={e => { e.preventDefault(); setDragOverId(hijo.id); }}
                          onDragLeave={() => setDragOverId(prev => prev === hijo.id ? null : prev)}
                          onDrop={e => { e.preventDefault(); e.stopPropagation(); handleDrop(hijos, hijo.id); }}
                        >
                          <span
                            className="cat2-drag-handle"
                            draggable
                            onDragStart={e => { e.stopPropagation(); setDraggedId(hijo.id); }}
                            onDragEnd={() => { setDraggedId(null); setDragOverId(null); }}
                            title="Arrastrar para reordenar"
                          >
                            <AiOutlineHolder size={14} />
                          </span>
                          <span className="cat2-child-avatar">{inicial(hijo.nombre)}</span>
                          <div className="cat2-child-info">
                            <span className="cat2-child-nombre">
                              {hijo.nombre}
                              <span className="cat2-orden small">#{hijo.orden || 0}</span>
                            </span>
                            {hijo.descripcion && <span className="cat2-child-desc">{hijo.descripcion}</span>}
                          </div>
                          <span className={`cat2-dot small ${hijoActivo ? 'on' : 'off'}`}>{hijoActivo ? 'Activa' : 'Inactiva'}</span>
                          {renderAcciones(hijo)}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {reordering && <div className="cat2-reordering-toast">Guardando nuevo orden...</div>}

      <CategoriaModal
        isOpen={modalOpen}
        isEditing={isEditing}
        categoriales={categoriaEditar}
        todascategorias={categorias}
        onClose={handleCerrarModal}
        onSubmit={handleSubmitModal}
        onReorderHermanas={handleReorderHermanas}
        loading={loading}
      />
    </div>
  );
};

export default AdminCategoriasScreen;
