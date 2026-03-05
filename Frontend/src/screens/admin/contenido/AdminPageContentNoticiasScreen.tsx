// Frontend/src/screens/admin/contenido/AdminPageContentInitialScreen.tsx
import React, { useState, useEffect } from 'react';
import { paginasAPI, seccionesAPI, contenidosAPI } from '../../../services/api';
import './AdminPageContentNoticiasScreen.css';

interface Contenido {
  id: number;
  seccion_id: number;
  titulo: string;
  descripcion?: string;
  imagen_url?: string;
  enlace_url?: string;
  enlace_nueva_ventana?: boolean;
  orden: number;
  activo: boolean;
}

interface Seccion {
  id: number;
  pagina_id: number;
  nombre: string;
  descripcion?: string;
  imagen_url?: string;
  color_fondo?: string;
  orden: number;
  activo: boolean;
  contenidos?: Contenido[];
}

interface Pagina {
  id: number;
  nombre: string;
  slug: string;
  descripcion?: string;
  icono?: string;
  orden: number;
  activo: boolean;
}

const AdminPageContentNoticiasScreen: React.FC = () => {
  // ESTADOS
  const [pagina, setPagina] = useState<Pagina | null>(null);
  const [secciones, setSecciones] = useState<Seccion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // FORMULARIO DE CONTENIDO
  const [showContentForm, setShowContentForm] = useState(false);
  const [editingContentId, setEditingContentId] = useState<number | null>(null);
  const [selectedSeccionId, setSelectedSeccionId] = useState<number | null>(null);
  const [contentFormData, setContentFormData] = useState({
    titulo: '',
    descripcion: '',
    imagen_url: '',
    enlace_url: '',
    enlace_nueva_ventana: false,
    orden: 0
  });

  // CARGAR DATOS
  useEffect(() => {
    fetchNoticiasData();
  }, []);

  const fetchNoticiasData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Obtener todas las páginas y filtrar por slug 'noticias'
      const paginas = await paginasAPI.getAll();
      const paginaNoticias = Array.isArray(paginas)
        ? paginas.find((p: Pagina) => p.slug === 'noticias')
        : paginas.data?.find((p: Pagina) => p.slug === 'noticias');

      if (!paginaNoticias) {
        setError('Página "Noticias" no encontrada. Por favor, crea la página primero.');
        setLoading(false);
        return;
      }

      setPagina(paginaNoticias);

      // 2. Obtener secciones
      const seccionesData = await seccionesAPI.getByPagina(paginaNoticias.id);
      const seccionesArray = Array.isArray(seccionesData) ? seccionesData : seccionesData.data || [];

      // 3. Para cada sección, obtener sus contenidos
      const seccionesConContenidos = await Promise.all(
        seccionesArray.map(async (seccion: Seccion) => {
          try {
            const contenidosData = await contenidosAPI.getBySeccion(seccion.id);
            const contenidosArray = Array.isArray(contenidosData)
              ? contenidosData
              : contenidosData.data || [];
            return {
              ...seccion,
              contenidos: contenidosArray.filter((c: Contenido) => c.activo !== false)
            };
          } catch (err) {
            console.error(`Error cargando contenidos de sección ${seccion.id}:`, err);
            return { ...seccion, contenidos: [] };
          }
        })
      );

      setSecciones(seccionesConContenidos);
    } catch (err) {
      console.error('Error cargando datos de noticias:', err);
      setError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  // GESTIÓN DE FORMULARIO DE CONTENIDO
  const handleOpenContentForm = (seccionId: number, contenidoId?: number) => {
    setSelectedSeccionId(seccionId);

    if (contenidoId) {
      // Modo edición
      const seccion = secciones.find(s => s.id === seccionId);
      const contenido = seccion?.contenidos?.find(c => c.id === contenidoId);
      if (contenido) {
        setEditingContentId(contenidoId);
        setContentFormData({
          titulo: contenido.titulo,
          descripcion: contenido.descripcion || '',
          imagen_url: contenido.imagen_url || '',
          enlace_url: contenido.enlace_url || '',
          enlace_nueva_ventana: contenido.enlace_nueva_ventana || false,
          orden: contenido.orden
        });
      }
    } else {
      // Modo creación
      setEditingContentId(null);
      setContentFormData({
        titulo: '',
        descripcion: '',
        imagen_url: '',
        enlace_url: '',
        enlace_nueva_ventana: false,
        orden: 0
      });
    }

    setShowContentForm(true);
  };

  const handleCloseContentForm = () => {
    setShowContentForm(false);
    setEditingContentId(null);
    setSelectedSeccionId(null);
    setContentFormData({
      titulo: '',
      descripcion: '',
      imagen_url: '',
      enlace_url: '',
      enlace_nueva_ventana: false,
      orden: 0
    });
  };

  const handleContentFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setContentFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSaveContent = async () => {
    if (!contentFormData.titulo.trim()) {
      setError('El título del contenido es obligatorio');
      return;
    }

    if (!selectedSeccionId) {
      setError('Debe seleccionar una sección');
      return;
    }

    try {
      if (editingContentId) {
        // Actualizar
        await contenidosAPI.update(editingContentId, contentFormData);
        setSuccessMessage('Noticia actualizada correctamente');
      } else {
        // Crear
        await contenidosAPI.create({
          seccion_id: selectedSeccionId,
          ...contentFormData
        });
        setSuccessMessage('Noticia agregada correctamente');
      }

      handleCloseContentForm();
      fetchNoticiasData();
    } catch (err) {
      console.error('Error guardando noticia:', err);
      setError('Error al guardar la noticia');
    }
  };

  const handleHideContent = async (contenidoId: number) => {
    try {
      const seccion = secciones.find(s => s.contenidos?.some(c => c.id === contenidoId));
      if (!seccion) return;

      const contenido = seccion.contenidos?.find(c => c.id === contenidoId);
      if (!contenido) return;

      // Actualizar estado a inactivo
      await contenidosAPI.update(contenidoId, {
        ...contenido,
        titulo: contenido.titulo,
        descripcion: contenido.descripcion,
        imagen_url: contenido.imagen_url,
        enlace_url: contenido.enlace_url,
        enlace_nueva_ventana: contenido.enlace_nueva_ventana,
        activo: false
      });

      setSuccessMessage('Noticia ocultada correctamente');
      fetchNoticiasData();
    } catch (err) {
      console.error('Error ocultando noticia:', err);
      setError('Error al ocultar la noticia');
    }
  };

  const handleDeleteContent = async (contenidoId: number) => {
    if (!window.confirm('¿Está seguro de que desea eliminar esta noticia?')) {
      return;
    }

    try {
      await contenidosAPI.delete(contenidoId);
      setSuccessMessage('Noticia eliminada correctamente');
      fetchNoticiasData();
    } catch (err) {
      console.error('Error eliminando noticia:', err);
      setError('Error al eliminar la noticia');
    }
  };

  // RENDERIZADO
  if (loading) {
    return <div className="noticias-page-content-container"><div className="loading-spinner">Cargando...</div></div>;
  }

  return (
    <div className="noticias-page-content-container">
      {/* MENSAJES */}
      {error && <div className="message error-message">{error}</div>}
      {successMessage && <div className="message success-message">{successMessage}</div>}

      {/* ENCABEZADO DE LA PÁGINA */}
      {pagina && (
        <div className="page-header-section">
          <div className="page-title-container">
            <h1 className="page-title">{pagina.nombre}</h1>
            {pagina.descripcion && <p className="page-description">{pagina.descripcion}</p>}
          </div>
        </div>
      )}

      {/* SECCIONES Y CONTENIDOS */}
      <div className="sections-container">
        {secciones.length === 0 ? (
          <div className="empty-state">
            <p>No hay secciones definidas para esta página.</p>
            <p>Por favor, crea secciones primero en "Gestión de Secciones".</p>
          </div>
        ) : (
          secciones.map((seccion) => (
            <div key={seccion.id} className="section-card">
              {/* ENCABEZADO DE SECCIÓN */}
              <div className="section-header">
                <div className="section-info">
                  <h2 className="section-title">{seccion.nombre}</h2>
                  {seccion.descripcion && (
                    <p className="section-description">{seccion.descripcion}</p>
                  )}
                </div>
                {seccion.color_fondo && (
                  <div
                    className="section-color-indicator"
                    style={{ backgroundColor: seccion.color_fondo }}
                    title={`Color: ${seccion.color_fondo}`}
                  />
                )}
              </div>

              {/* CONTENIDOS DE LA SECCIÓN */}
              <div className="section-contents">
                {seccion.contenidos && seccion.contenidos.length > 0 ? (
                  <div className="contents-list">
                    {seccion.contenidos.map((contenido) => (
                      <div key={contenido.id} className="content-item">
                        <div className="content-preview">
                          {contenido.imagen_url && (
                            <img
                              src={contenido.imagen_url}
                              alt={contenido.titulo}
                              className="content-thumbnail"
                              onError={(e) => {
                                e.currentTarget.src = 'https://via.placeholder.com/150?text=No+Image';
                              }}
                            />
                          )}
                          <div className="content-details">
                            <h3 className="content-title">{contenido.titulo}</h3>
                            {contenido.descripcion && (
                              <p className="content-short-desc">
                                {contenido.descripcion.substring(0, 100)}
                                {contenido.descripcion.length > 100 ? '...' : ''}
                              </p>
                            )}
                            {contenido.enlace_url && (
                              <a
                                href={contenido.enlace_url}
                                target={contenido.enlace_nueva_ventana ? '_blank' : '_self'}
                                rel="noreferrer"
                                className="content-link"
                              >
                                {contenido.enlace_url}
                              </a>
                            )}
                          </div>
                        </div>

                        {/* BOTONES DE ACCIÓN */}
                        <div className="content-actions">
                          <button
                            className="btn-action btn-edit"
                            onClick={() => handleOpenContentForm(seccion.id, contenido.id)}
                            title="Editar noticia"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            className="btn-action btn-hide"
                            onClick={() => handleHideContent(contenido.id)}
                            title="Ocultar noticia"
                          >
                            👁️ Ocultar
                          </button>
                          <button
                            className="btn-action btn-delete"
                            onClick={() => handleDeleteContent(contenido.id)}
                            title="Eliminar noticia"
                          >
                            🗑️ Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-contents">
                    <p>No hay noticias en esta sección aún.</p>
                  </div>
                )}

                {/* BOTÓN AGREGAR NOTICIA */}
                <button
                  className="btn-add-content"
                  onClick={() => handleOpenContentForm(seccion.id)}
                >
                  ➕ Agregar Noticia
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL - FORMULARIO DE NOTICIA */}
      {showContentForm && (
        <div className="modal-overlay" onClick={handleCloseContentForm}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingContentId ? 'Editar Noticia' : 'Agregar Noticia'}</h2>
              <button className="btn-close" onClick={handleCloseContentForm}>✕</button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="titulo">Título *</label>
                <input
                  type="text"
                  id="titulo"
                  name="titulo"
                  value={contentFormData.titulo}
                  onChange={handleContentFormChange}
                  placeholder="Ingrese el título de la noticia"
                />
              </div>

              <div className="form-group">
                <label htmlFor="descripcion">Descripción / Contenido</label>
                <textarea
                  id="descripcion"
                  name="descripcion"
                  value={contentFormData.descripcion}
                  onChange={handleContentFormChange}
                  placeholder="Contenido de la noticia"
                  rows={4}
                />
              </div>

              <div className="form-group">
                <label htmlFor="imagen_url">URL de la Imagen</label>
                <input
                  type="url"
                  id="imagen_url"
                  name="imagen_url"
                  value={contentFormData.imagen_url}
                  onChange={handleContentFormChange}
                  placeholder="https://ejemplo.com/imagen.jpg"
                />
              </div>

              <div className="form-group">
                <label htmlFor="enlace_url">URL del Enlace (opcional)</label>
                <input
                  type="url"
                  id="enlace_url"
                  name="enlace_url"
                  value={contentFormData.enlace_url}
                  onChange={handleContentFormChange}
                  placeholder="https://ejemplo.com"
                />
              </div>

              <div className="form-group checkbox">
                <input
                  type="checkbox"
                  id="enlace_nueva_ventana"
                  name="enlace_nueva_ventana"
                  checked={contentFormData.enlace_nueva_ventana}
                  onChange={handleContentFormChange}
                />
                <label htmlFor="enlace_nueva_ventana">Abrir enlace en nueva ventana</label>
              </div>

              <div className="form-group">
                <label htmlFor="orden">Orden</label>
                <input
                  type="number"
                  id="orden"
                  name="orden"
                  value={contentFormData.orden}
                  onChange={handleContentFormChange}
                  min="0"
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={handleCloseContentForm}>
                Cancelar
              </button>
              <button className="btn-save" onClick={handleSaveContent}>
                {editingContentId ? 'Actualizar' : 'Agregar'} Noticia
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPageContentNoticiasScreen;
