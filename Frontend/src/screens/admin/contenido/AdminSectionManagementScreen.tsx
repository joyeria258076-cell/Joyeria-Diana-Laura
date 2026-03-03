import React, { useState, useEffect } from 'react';
import { paginasAPI, seccionesAPI } from '../../../services/api';
import './AdminSectionManagementScreen.css';

interface Pagina {
  id: number;
  nombre: string;
  slug: string;
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
}

const AdminSectionManagementScreen: React.FC = () => {
  // Estados
  const [paginas, setPaginas] = useState<Pagina[]>([]);
  const [selectedPaginaId, setSelectedPaginaId] = useState<number | null>(null);
  const [secciones, setSecciones] = useState<Seccion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Formulario
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    imagen_url: '',
    color_fondo: '#ffffff',
    orden: 0
  });

  // Cargar páginas al montar
  useEffect(() => {
    fetchPaginas();
  }, []);

  // Cargar secciones cuando se selecciona una página
  useEffect(() => {
    if (selectedPaginaId) {
      fetchSecciones();
    }
  }, [selectedPaginaId]);

  const fetchPaginas = async () => {
    try {
      const data = await paginasAPI.getAll();
      setPaginas(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      setError('Error al cargar las páginas');
      console.error(err);
    }
  };

  const fetchSecciones = async () => {
    if (!selectedPaginaId) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await seccionesAPI.getByPagina(selectedPaginaId);
      setSecciones(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      setError('Error al cargar las secciones');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Manejar cambios en el formulario
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Limpiar formulario
  const resetForm = () => {
    setFormData({
      nombre: '',
      descripcion: '',
      imagen_url: '',
      color_fondo: '#ffffff',
      orden: 0
    });
    setEditingId(null);
  };

  // Editar sección
  const handleEdit = (seccion: Seccion) => {
    setFormData({
      nombre: seccion.nombre,
      descripcion: seccion.descripcion || '',
      imagen_url: seccion.imagen_url || '',
      color_fondo: seccion.color_fondo || '#ffffff',
      orden: seccion.orden
    });
    setEditingId(seccion.id);
  };

  // Guardar sección
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPaginaId) {
      setError('Debes seleccionar una página primero');
      return;
    }

    if (!formData.nombre.trim()) {
      setError('El nombre de la sección es obligatorio');
      return;
    }

    try {
      setError(null);
      setSuccessMessage(null);

      if (editingId) {
        // Actualizar
        await seccionesAPI.update(editingId, formData);
        setSuccessMessage('Sección actualizada correctamente');
      } else {
        // Crear
        await seccionesAPI.create({
          pagina_id: selectedPaginaId,
          ...formData
        });
        setSuccessMessage('Sección creada correctamente');
      }

      resetForm();
      await fetchSecciones();
    } catch (err: any) {
      setError(err.message || 'Error al guardar la sección');
      console.error(err);
    }
  };

  // Eliminar sección
  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta sección?')) {
      return;
    }

    try {
      setError(null);
      await seccionesAPI.delete(id);
      setSuccessMessage('Sección eliminada correctamente');
      await fetchSecciones();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar la sección');
      console.error(err);
    }
  };

  return (
    <div className="section-management-container">
      <h2 className="section-management-title">
        <span className="title-icon">📑</span> Gestión de Secciones
      </h2>

      {error && <div className="error-message">❌ {error}</div>}
      {successMessage && <div className="success-message">✅ {successMessage}</div>}

      {/* Selector de página */}
      <div className="page-selector-container">
        <label className="page-selector-label" htmlFor="page-select">
          Selecciona una página para gestionar sus secciones:
        </label>
        <select
          id="page-select"
          className="page-selector"
          value={selectedPaginaId || ''}
          onChange={(e) => {
            setSelectedPaginaId(e.target.value ? parseInt(e.target.value) : null);
            resetForm();
          }}
        >
          <option value="">-- Elige una página --</option>
          {paginas.map(pagina => (
            <option key={pagina.id} value={pagina.id}>
              {pagina.nombre} (/{pagina.slug})
            </option>
          ))}
        </select>
      </div>

      {selectedPaginaId && (
        <div className="section-management-section">
          {/* Formulario */}
          <div className="section-form-container">
            <h3 style={{ marginTop: 0, marginBottom: 20, color: '#333' }}>
              {editingId ? 'Editar Sección' : 'Nueva Sección'}
            </h3>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="nombre">Nombre de la Sección *</label>
                <input
                  id="nombre"
                  type="text"
                  name="nombre"
                  placeholder="Ej: Nuestros Servicios"
                  value={formData.nombre}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="descripcion">Descripción</label>
                <textarea
                  id="descripcion"
                  name="descripcion"
                  placeholder="Descripción de la sección"
                  value={formData.descripcion}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="imagen_url">URL de la Imagen</label>
                <input
                  id="imagen_url"
                  type="text"
                  name="imagen_url"
                  placeholder="https://ejemplo.com/imagen.jpg"
                  value={formData.imagen_url}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="color_fondo">Color de Fondo</label>
                <div className="color-input-wrapper">
                  <input
                    id="color_fondo"
                    type="color"
                    name="color_fondo"
                    value={formData.color_fondo}
                    onChange={handleInputChange}
                  />
                  <input
                    type="text"
                    value={formData.color_fondo}
                    onChange={handleInputChange}
                    name="color_fondo_text"
                    placeholder="#ffffff"
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      color_fondo: e.target.value
                    }))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="orden">Orden de Visualización</label>
                <input
                  id="orden"
                  type="number"
                  name="orden"
                  value={formData.orden}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-actions">
                {editingId && (
                  <button type="button" className="btn-secondary" onClick={resetForm}>
                    Cancelar
                  </button>
                )}
                <button type="submit" className="btn-primary">
                  {editingId ? 'Actualizar' : 'Crear'} Sección
                </button>
              </div>
            </form>
          </div>

          {/* Lista de secciones */}
          <div className="sections-list-container">
            <h3 className="sections-list-title">
              Secciones de {paginas.find(p => p.id === selectedPaginaId)?.nombre}
            </h3>

            {loading ? (
              <div className="loading-message">Cargando secciones...</div>
            ) : secciones.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📭</div>
                <div className="empty-state-title">No hay secciones</div>
                <p>Crea tu primera sección usando el formulario</p>
              </div>
            ) : (
              <div>
                {secciones.map(seccion => (
                  <div
                    key={seccion.id}
                    className="section-item"
                    style={{ borderLeftColor: seccion.color_fondo || '#8b7355' }}
                  >
                    <div className="section-item-content">
                      <div className="section-item-name">{seccion.nombre}</div>
                      <div className="section-item-info">
                        <span>
                          Color:{' '}
                          <span
                            className="section-item-color"
                            style={{ backgroundColor: seccion.color_fondo || '#ffffff' }}
                            title={seccion.color_fondo}
                          />
                        </span>
                        {seccion.imagen_url && <span>🖼️ Con imagen</span>}
                        <span>Orden: {seccion.orden}</span>
                      </div>
                    </div>
                    <div className="section-item-actions">
                      <button
                        className="btn-edit"
                        onClick={() => handleEdit(seccion)}
                      >
                        ✏️ Editar
                      </button>
                      <button
                        className="btn-remove"
                        onClick={() => handleDelete(seccion.id)}
                      >
                        🗑️ Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSectionManagementScreen;
