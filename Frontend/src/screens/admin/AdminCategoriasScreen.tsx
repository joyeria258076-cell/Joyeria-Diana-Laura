import React, { useState, useEffect } from 'react';
import './AdminCategoriasScreen.css';
import { productsAPI } from '../../services/api';
import CategoriaModal from './CategoriaModal';
import AdminHero from '../../components/AdminHero';
import {
  AiOutlineReload, AiOutlinePlus, AiOutlineEdit, AiOutlineEye, AiOutlineEyeInvisible,
  AiOutlineDelete, AiOutlineSearch, AiOutlineAppstore, AiOutlineTags, AiOutlineInbox, AiOutlineFolder,
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

  // Foto y número de piezas por categoría (tomado de los productos)
  const [fotos, setFotos] = useState<Record<number, { img?: string; n: number }>>({});
  useEffect(() => {
    productsAPI.getAll().then((r: any) => {
      const m: Record<number, { img?: string; n: number }> = {};
      (Array.isArray(r?.data) ? r.data : []).forEach((pr: any) => {
        if (!pr.categoria_id) return;
        const f = m[pr.categoria_id] || (m[pr.categoria_id] = { n: 0 });
        f.n += 1;
        if (!f.img && pr.imagen_principal) f.img = pr.imagen_principal;
      });
      setFotos(m);
    }).catch(() => {});
  }, []);

  return (
    <div className="av-page cat2-container">
      <AdminHero icono={<AiOutlineTags size={26} />} seccion="Gestión de catálogo" titulo="Tus" resaltado="categorías"
        descripcion="Ordena cómo se agrupan las piezas en la tienda. Arrastra para cambiar el orden en que aparecen.">
        <button className="av-btn" onClick={() => handleAbrirModal()}><AiOutlinePlus size={17} /> Nueva categoría</button>
      </AdminHero>

      <div className="av-kpis">
        <div className="av-kpi"><span className="av-kpi-icono"><AiOutlineTags size={20} /></span><span><strong>{categorias.length}</strong><small>Categorías</small></span></div>
        <div className="av-kpi av-tono--info"><span className="av-kpi-icono"><AiOutlineAppstore size={20} /></span><span><strong>{principales.length}</strong><small>Principales · {totalSub} sub</small></span></div>
        <div className="av-kpi av-tono--ok"><span className="av-kpi-icono"><AiOutlineFolder size={20} /></span><span><strong>{totalActivas}</strong><small>Visibles en tienda</small></span></div>
        <div className="av-kpi av-tono--acento"><span className="av-kpi-icono"><AiOutlineInbox size={20} /></span><span><strong>{Object.values(fotos).reduce((n, f) => n + f.n, 0)}</strong><small>Piezas clasificadas</small></span></div>
      </div>

      <div className="av-barra">
        <label className="av-buscar">
          <AiOutlineSearch size={18} />
          <input type="text" placeholder="Buscar categoría o subcategoría" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </label>
        <button className="av-btn av-btn--sec av-btn--icono" onClick={cargarCategorias} disabled={loading} aria-label="Actualizar"><AiOutlineReload size={18} /></button>
      </div>

      {/* Árbol de categorías */}
      {grupos.length === 0 ? (
        <div className="cat2-empty">
          <AiOutlineFolder size={36} />
          <p>{searchTerm ? 'No se encontraron categorías' : 'No hay categorías registradas'}</p>
        </div>
      ) : (
        <div className="cat4-grid">
          {grupos.map(({ padre, hijos }) => {
            const isActivo = padre.activo !== false;
            return (
              <div
                key={padre.id}
                className={`cat4-card ${!isActivo ? 'cat2-group-inactivo' : ''} ${dragOverId === padre.id ? 'cat2-drag-over' : ''} ${draggedId === padre.id ? 'cat2-dragging' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragOverId(padre.id); }}
                onDragLeave={() => setDragOverId(prev => prev === padre.id ? null : prev)}
                onDrop={e => { e.preventDefault(); handleDrop(principales, padre.id); }}
              >
                <div className="cat4-foto">
                  {fotos[padre.id]?.img ? <img src={fotos[padre.id].img} alt="" loading="lazy" /> : <span className="cat4-sinfoto"><AiOutlineAppstore size={34} /></span>}
                  <span
                    className="cat2-drag-handle cat4-mover"
                    draggable
                    onDragStart={() => setDraggedId(padre.id)}
                    onDragEnd={() => { setDraggedId(null); setDragOverId(null); }}
                    title="Arrastra para cambiar el orden"
                  >
                    <AiOutlineHolder size={16} />
                  </span>
                  <span className={`cat4-estado ${isActivo ? 'on' : 'off'}`}>{isActivo ? 'Visible' : 'Oculta'}</span>
                  <div className="cat4-velo">
                    <h3>{padre.nombre}</h3>
                    <span>{fotos[padre.id]?.n || 0} pieza{(fotos[padre.id]?.n || 0) === 1 ? '' : 's'}{hijos.length ? ` · ${hijos.length} sub` : ''}</span>
                  </div>
                </div>
                <div className="cat4-cuerpo">
                  <p className="cat4-desc">{padre.descripcion || 'Sin descripción'}</p>
                  <div className="cat4-acciones">
                    <button className="pr4-editar" onClick={() => handleAbrirModal(padre)}><AiOutlineEdit size={15} /> Editar</button>
                    <button className="av-accion" onClick={() => handleToggleEstado(padre.id, isActivo)} title={isActivo ? 'Ocultar de la tienda' : 'Mostrar en la tienda'}>
                      {isActivo ? <AiOutlineEye size={16} /> : <AiOutlineEyeInvisible size={16} />}
                    </button>
                    <button className="av-accion av-accion--peligro" onClick={() => handleEliminarCategoria(padre.id)} title="Eliminar"><AiOutlineDelete size={16} /></button>
                  </div>
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
