import React, { useState, useEffect } from 'react';
import { paginasAPI } from '../../../services/api';
import './AdminPageManagementScreen.css';

interface Pagina {
  id: number;
  nombre: string;
  slug: string;
  descripcion?: string;
  icono?: string;
  orden: number;
  mostrar_en_menu: boolean;
  mostrar_en_footer: boolean;
  requiere_autenticacion: boolean;
  activo: boolean;
}

const AdminPageManagementScreen: React.FC = () => {
  // Estados
  const [paginas, setPaginas] = useState<Pagina[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Formulario
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    slug: '',
    descripcion: '',
    icono: '',
    orden: 0,
    mostrar_en_menu: true,
    mostrar_en_footer: false,
    requiere_autenticacion: false
  });

  // Cargar páginas
  useEffect(() => {
    fetchPaginas();
  }, []);

  const fetchPaginas = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await paginasAPI.getAll();
      setPaginas(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      setError('Error al cargar las páginas');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Manejar cambios en el formulario
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as any;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));
  };

  // Generar slug automáticamente
  const handleNombreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nombre = e.target.value;
    const slug = nombre
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '');
    
    setFormData(prev => ({
      ...prev,
      nombre,
      slug: editingId ? prev.slug : slug // Solo auto-generar para nuevas páginas
    }));
  };

  // Limpiar formulario
  const resetForm = () => {
    setFormData({
      nombre: '',
      slug: '',
      descripcion: '',
      icono: '',
      orden: 0,
      mostrar_en_menu: true,
      mostrar_en_footer: false,
      requiere_autenticacion: false
    });
    setEditingId(null);
  };

  // Editar página
  const handleEdit = (pagina: Pagina) => {
    setFormData({
      nombre: pagina.nombre,
      slug: pagina.slug,
      descripcion: pagina.descripcion || '',
      icono: pagina.icono || '',
      orden: pagina.orden,
      mostrar_en_menu: pagina.mostrar_en_menu,
      mostrar_en_footer: pagina.mostrar_en_footer,
      requiere_autenticacion: pagina.requiere_autenticacion
    });
    setEditingId(pagina.id);
  };

  // Guardar página
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nombre.trim() || !formData.slug.trim()) {
      setError('El nombre y slug son obligatorios');
      return;
    }

    try {
      setError(null);
      setSuccessMessage(null);
      
      if (editingId) {
        // Actualizar
        await paginasAPI.update(editingId, formData);
        setSuccessMessage('Página actualizada correctamente');
      } else {
        // Crear
        await paginasAPI.create(formData);
        setSuccessMessage('Página creada correctamente');
      }

      resetForm();
      await fetchPaginas();
    } catch (err: any) {
      setError(err.message || 'Error al guardar la página');
      console.error(err);
    }
  };

  // Eliminar página
  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta página?')) {
      return;
    }

    try {
      setError(null);
      await paginasAPI.delete(id);
      setSuccessMessage('Página eliminada correctamente');
      await fetchPaginas();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar la página');
      console.error(err);
    }
  };

  return (
    <div className="page-management-container">
      <h2 className="page-management-title">
        <span className="title-icon">📄</span> Gestión de Páginas
      </h2>

      {error && <div className="error-message">❌ {error}</div>}
      {successMessage && <div className="success-message">✅ {successMessage}</div>}

      <div className="page-management-section">
        {/* Formulario */}
        <div className="page-form-container">
          <h3 style={{ marginTop: 0, marginBottom: 20, color: '#333' }}>
            {editingId ? 'Editar Página' : 'Nueva Página'}
          </h3>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="nombre">Nombre de la Página *</label>
              <input
                id="nombre"
                type="text"
                name="nombre"
                placeholder="Ej: Acerca de Nosotros"
                value={formData.nombre}
                onChange={handleNombreChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="slug">Slug (URL amigable) *</label>
              <input
                id="slug"
                type="text"
                name="slug"
                placeholder="Ej: acerca-de-nosotros"
                value={formData.slug}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="descripcion">Descripción</label>
              <textarea
                id="descripcion"
                name="descripcion"
                placeholder="Descripción general de la página"
                value={formData.descripcion}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="icono">Icono (Emoji o clase CSS)</label>
              <input
                id="icono"
                type="text"
                name="icono"
                placeholder="Ej: ℹ️ o fas fa-info-circle"
                value={formData.icono}
                onChange={handleInputChange}
              />
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

            <div className="form-group">
              <label className="checkbox-group">
                <div className="checkbox-item">
                  <input
                    type="checkbox"
                    name="mostrar_en_menu"
                    checked={formData.mostrar_en_menu}
                    onChange={handleInputChange}
                  />
                  <span>Mostrar en menú principal</span>
                </div>
              </label>
            </div>

            <div className="form-group">
              <label className="checkbox-group">
                <div className="checkbox-item">
                  <input
                    type="checkbox"
                    name="mostrar_en_footer"
                    checked={formData.mostrar_en_footer}
                    onChange={handleInputChange}
                  />
                  <span>Mostrar en pie de página</span>
                </div>
              </label>
            </div>

            <div className="form-group">
              <label className="checkbox-group">
                <div className="checkbox-item">
                  <input
                    type="checkbox"
                    name="requiere_autenticacion"
                    checked={formData.requiere_autenticacion}
                    onChange={handleInputChange}
                  />
                  <span>Requiere autenticación</span>
                </div>
              </label>
            </div>

            <div className="form-actions">
              {editingId && (
                <button type="button" className="btn-secondary" onClick={resetForm}>
                  Cancelar
                </button>
              )}
              <button type="submit" className="btn-primary">
                {editingId ? 'Actualizar' : 'Crear'} Página
              </button>
            </div>
          </form>
        </div>

        {/* Lista de páginas */}
        <div className="pages-list-container">
          <h3 className="pages-list-title">Páginas Disponibles</h3>

          {loading ? (
            <div className="loading-message">Cargando páginas...</div>
          ) : paginas.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <div className="empty-state-title">No hay páginas</div>
              <p>Crea tu primera página usando el formulario</p>
            </div>
          ) : (
            <div>
              {paginas.map(pagina => (
                <div key={pagina.id} className="page-item">
                  <div className="page-item-content">
                    <div className="page-item-name">
                      {pagina.icono && <span>{pagina.icono} </span>}
                      {pagina.nombre}
                    </div>
                    <div className="page-item-info">
                      <span className="page-item-slug">/{pagina.slug}</span>
                      <span>{pagina.mostrar_en_menu ? '📍 Menú' : ''}</span>
                      <span>{pagina.mostrar_en_footer ? '🔗 Footer' : ''}</span>
                      {pagina.requiere_autenticacion && <span>🔒 Privada</span>}
                    </div>
                  </div>
                  <div className="page-item-actions">
                    <button
                      className="btn-edit"
                      onClick={() => handleEdit(pagina)}
                    >
                      ✏️ Editar
                    </button>
                    <button
                      className="btn-remove"
                      onClick={() => handleDelete(pagina.id)}
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
    </div>
  );
};

export default AdminPageManagementScreen;
