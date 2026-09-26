import React, { useState, useEffect } from 'react';
import { paginasAPI, seccionesAPI } from '../../../services/api';
import { AiOutlineEdit, AiOutlineDelete, AiOutlineLayout, AiOutlinePicture, AiOutlineEye } from 'react-icons/ai';
import './AdminSectionManagementScreen.css';
import './GestionSeccionesApp.css';

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

// Texto claro u oscuro según el color de fondo de la sección (para la vista previa).
const textoSobre = (hex?: string) => {
  const h = (hex || '#ffffff').replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return '#2A0F22';
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.6 ? '#2A0F22' : '#FFFFFF';
};

const VistaSeccion: React.FC<{ nombre: string; descripcion?: string; imagen?: string; color?: string; mini?: boolean }> = ({ nombre, descripcion, imagen, color, mini }) => (
  <div className={`gsec-vista${mini ? ' gsec-vista--mini' : ''}`} style={{ background: color || '#ffffff', color: textoSobre(color) }}>
    {imagen ? <img className="gsec-vista-img" src={imagen} alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} /> : null}
    <div className="gsec-vista-texto">
      <strong>{nombre || 'Nombre de la sección'}</strong>
      {!mini && <p>{descripcion || 'Aquí aparecerá la descripción de la sección tal como la verán tus clientes.'}</p>}
    </div>
  </div>
);

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

  const paginaActual = paginas.find(p => p.id === selectedPaginaId);

  return (
    <div className="section-management-container gsec">
      <span className="gsec-eyebrow">Contenido</span>
      <h2 className="section-management-title">Gestión de <span>secciones</span></h2>
      <p className="gsec-sub">Elige una página, arma cada apartado y mira cómo quedará antes de guardarlo.</p>

      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}

      {/* Páginas como píldoras */}
      <div className="gsec-paginas" role="tablist" aria-label="Páginas">
        {paginas.length === 0 && <span className="gsec-nota">No hay páginas registradas todavía.</span>}
        {paginas.map(pagina => (
          <button
            key={pagina.id}
            role="tab"
            aria-selected={selectedPaginaId === pagina.id}
            className={`gsec-pagina${selectedPaginaId === pagina.id ? ' activa' : ''}`}
            onClick={() => { setSelectedPaginaId(pagina.id); resetForm(); }}
          >
            <AiOutlineLayout size={15} /> {pagina.nombre} <small>/{pagina.slug}</small>
          </button>
        ))}
      </div>

      {!selectedPaginaId ? (
        <div className="gsec-vacio">
          <AiOutlineLayout size={30} />
          <p>Selecciona una página para ver y editar sus secciones.</p>
        </div>
      ) : (
        <div className="gsec-grid">
          {/* Formulario */}
          <div className="gsec-card">
            <h3 className="gsec-card-titulo">{editingId ? 'Editar sección' : 'Nueva sección'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="nombre">Nombre de la sección *</label>
                <input id="nombre" type="text" name="nombre" placeholder="Ej: Nuestros servicios" value={formData.nombre} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label htmlFor="descripcion">Descripción</label>
                <textarea id="descripcion" name="descripcion" placeholder="Descripción de la sección" value={formData.descripcion} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label htmlFor="imagen_url">URL de la imagen</label>
                <input id="imagen_url" type="text" name="imagen_url" placeholder="https://ejemplo.com/imagen.jpg" value={formData.imagen_url} onChange={handleInputChange} />
              </div>
              <div className="gsec-fila">
                <div className="form-group">
                  <label htmlFor="color_fondo">Color de fondo</label>
                  <div className="color-input-wrapper">
                    <input id="color_fondo" type="color" name="color_fondo" value={formData.color_fondo} onChange={handleInputChange} />
                    <input type="text" value={formData.color_fondo} placeholder="#ffffff"
                      onChange={(e) => setFormData(prev => ({ ...prev, color_fondo: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="orden">Orden</label>
                  <input id="orden" type="number" name="orden" value={formData.orden} onChange={handleInputChange} />
                </div>
              </div>
              <div className="form-actions">
                {editingId && <button type="button" className="btn-secondary" onClick={resetForm}>Cancelar</button>}
                <button type="submit" className="btn-primary">{editingId ? 'Guardar cambios' : 'Crear sección'}</button>
              </div>
            </form>
          </div>

          {/* Vista previa + lista */}
          <div className="gsec-columna">
            <div className="gsec-card">
              <h3 className="gsec-card-titulo"><AiOutlineEye size={16} /> Vista previa</h3>
              <VistaSeccion nombre={formData.nombre} descripcion={formData.descripcion} imagen={formData.imagen_url} color={formData.color_fondo} />
            </div>

            <div className="gsec-card">
              <h3 className="gsec-card-titulo">Secciones de {paginaActual?.nombre} <span className="gsec-contador">{secciones.length}</span></h3>
              {loading ? (
                <p className="gsec-nota">Cargando secciones…</p>
              ) : secciones.length === 0 ? (
                <p className="gsec-nota">Aún no hay secciones. Crea la primera con el formulario.</p>
              ) : (
                <div className="gsec-lista">
                  {[...secciones].sort((a, b) => a.orden - b.orden).map(seccion => (
                    <div key={seccion.id} className={`gsec-item${editingId === seccion.id ? ' editando' : ''}`}>
                      <span className="gsec-orden">{seccion.orden}</span>
                      <VistaSeccion mini nombre={seccion.nombre} imagen={seccion.imagen_url} color={seccion.color_fondo} />
                      <div className="gsec-item-info">
                        <strong>{seccion.nombre}</strong>
                        <span>{seccion.imagen_url ? <><AiOutlinePicture size={12} /> Con imagen</> : 'Sin imagen'}</span>
                      </div>
                      <div className="gsec-item-acciones">
                        <button className="gsec-icono" onClick={() => handleEdit(seccion)} aria-label="Editar sección" title="Editar"><AiOutlineEdit size={16} /></button>
                        <button className="gsec-icono gsec-icono--peligro" onClick={() => handleDelete(seccion.id)} aria-label="Eliminar sección" title="Eliminar"><AiOutlineDelete size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSectionManagementScreen;
