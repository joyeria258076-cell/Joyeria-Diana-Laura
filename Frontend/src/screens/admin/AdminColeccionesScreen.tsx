import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { coleccionesAPI, productsAPI, uploadAPI } from '../../services/api';
import './AdminColeccionesScreen.css';

interface Producto {
  id: number;
  nombre: string;
  codigo: string;
  imagen_principal: string;
  precio_venta: number;
  precio_oferta?: number;
  stock_actual: number;
  activo: boolean;
  orden?: number;
}

interface Coleccion {
  id: number;
  nombre: string;
  descripcion: string | null;
  imagen_url: string | null;
  activo: boolean;
  orden: number;
  total_productos: number;
  creado_por_nombre?: string;
}

interface ColeccionDetalle extends Coleccion {
  productos: Producto[];
}

const defaultForm = { nombre: '', descripcion: '', imagen_url: '', orden: '0' };

const AdminColeccionesScreen: React.FC = () => {
  const navigate = useNavigate();
  const [colecciones, setColecciones] = useState<Coleccion[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<ColeccionDetalle | null>(null);
  const [form, setForm] = useState({ ...defaultForm });
  const [productosSeleccionados, setProductosSeleccionados] = useState<Producto[]>([]);
  const [todosProductos, setTodosProductos] = useState<Producto[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<Coleccion | null>(null);
  const busquedaRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const cargar = async () => {
    setLoading(true);
    try {
      const res = await coleccionesAPI.getAll();
      setColecciones(Array.isArray(res) ? res : res.data || []);
    } catch { setError('Error al cargar colecciones'); }
    finally { setLoading(false); }
  };

  const cargarProductos = async () => {
    try {
      const res = await productsAPI.getAll();
      const lista = Array.isArray(res) ? res : (res.data || res.productos || []);
      setTodosProductos(lista);
    } catch { console.error('Error cargando productos'); }
  };

  useEffect(() => { cargar(); cargarProductos(); }, []);

  const abrirCrear = () => {
    setEditando(null);
    setForm({ ...defaultForm });
    setProductosSeleccionados([]);
    setBusqueda('');
    setError('');
    setSelectedFile(null);
    setImagePreview(null);
    setModalOpen(true);
  };

  const abrirEditar = async (c: Coleccion) => {
    try {
      const res = await coleccionesAPI.getById(c.id);
      const detalle: ColeccionDetalle = res.data || res;
      setEditando(detalle);
      setForm({
        nombre: detalle.nombre,
        descripcion: detalle.descripcion ?? '',
        imagen_url: detalle.imagen_url ?? '',
        orden: detalle.orden?.toString() ?? '0',
      });
      setProductosSeleccionados(detalle.productos || []);
      setBusqueda('');
      setError('');
      setSelectedFile(null);
      setImagePreview(detalle.imagen_url || null);
      setModalOpen(true);
    } catch { alert('Error al cargar detalle'); }
  };

  const cerrarModal = () => { setModalOpen(false); setEditando(null); setSelectedFile(null); setImagePreview(null); };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const toggleProducto = (prod: Producto) => {
    setProductosSeleccionados(prev =>
      prev.find(p => p.id === prod.id)
        ? prev.filter(p => p.id !== prod.id)
        : [...prev, prod]
    );
  };

  const handleGuardar = async () => {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return; }
    setSaving(true); setError('');

    let imagenUrlFinal = form.imagen_url.trim() || null;

    if (selectedFile) {
      setUploadingImage(true);
      try {
        const resUpload = await uploadAPI.uploadImage(selectedFile, 'joyeria/colecciones');
        if (!resUpload.success) throw new Error(resUpload.message || 'Error al subir la imagen');
        imagenUrlFinal = resUpload.data.url;
      } catch (err: any) {
        setError(err.message || 'Error al subir la imagen');
        setSaving(false);
        setUploadingImage(false);
        return;
      } finally {
        setUploadingImage(false);
      }
    }

    const payload = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || null,
      imagen_url: imagenUrlFinal,
      orden: parseInt(form.orden) || 0,
      productos: productosSeleccionados.map(p => p.id),
    };
    try {
      if (editando) {
        await coleccionesAPI.update(editando.id, payload);
      } else {
        await coleccionesAPI.create(payload);
      }
      cerrarModal();
      cargar();
    } catch { setError('Error al guardar la colección'); }
    finally { setSaving(false); }
  };

  const handleToggle = async (c: Coleccion) => {
    try {
      await coleccionesAPI.toggleStatus(c.id, !c.activo);
      cargar();
    } catch { alert('Error al cambiar estado'); }
  };

  const handleEliminar = async () => {
    if (!confirmDelete) return;
    try {
      await coleccionesAPI.delete(confirmDelete.id);
      setConfirmDelete(null);
      cargar();
    } catch { alert('Error al eliminar'); }
  };

  const productosFiltrados = todosProductos.filter(p =>
    !busqueda || p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || p.codigo.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="ac-container">
      <div className="ac-header">
        <button className="ac-back" onClick={() => navigate(-1)}>← Volver</button>
        <div>
          <h1 className="ac-title">Colecciones</h1>
          <p className="ac-subtitle">Agrupa productos en colecciones temáticas para el catálogo</p>
        </div>
        <button className="ac-btn-primary" onClick={abrirCrear}>+ Nueva colección</button>
      </div>

      {error && <div className="ac-error-global">{error}</div>}

      {loading ? (
        <div className="ac-loading">Cargando...</div>
      ) : colecciones.length === 0 ? (
        <div className="ac-empty">
          <div className="ac-empty-icon">🗂️</div>
          <p>No hay colecciones. ¡Crea la primera!</p>
        </div>
      ) : (
        <div className="ac-grid">
          {colecciones.map(c => (
            <div key={c.id} className={`ac-card ${!c.activo ? 'ac-card-inactiva' : ''}`}>
              {c.imagen_url ? (
                <img src={c.imagen_url} alt={c.nombre} className="ac-card-img" />
              ) : (
                <div className="ac-card-img-placeholder">🗂️</div>
              )}
              <div className="ac-card-body">
                <div className="ac-card-nombre">{c.nombre}</div>
                {c.descripcion && <div className="ac-card-desc">{c.descripcion}</div>}
                <div className="ac-card-meta">
                  <span className="ac-chip ac-chip-prods">🛍 {c.total_productos} productos</span>
                  <span className={`ac-chip ${c.activo ? 'ac-chip-activo' : 'ac-chip-inactivo'}`}>
                    {c.activo ? 'Visible' : 'Oculta'}
                  </span>
                </div>
              </div>
              <div className="ac-card-actions">
                <button className="ac-btn-icon" title="Editar" onClick={() => abrirEditar(c)}>✏️</button>
                <button className="ac-btn-icon" title={c.activo ? 'Ocultar' : 'Mostrar'} onClick={() => handleToggle(c)}>
                  {c.activo ? '🔴' : '🟢'}
                </button>
                <button className="ac-btn-icon" title="Eliminar" onClick={() => setConfirmDelete(c)}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL */}
      {modalOpen && (
        <div className="ac-overlay" onClick={cerrarModal}>
          <div className="ac-modal" onClick={e => e.stopPropagation()}>
            <h2>{editando ? 'Editar colección' : 'Nueva colección'}</h2>

            <div className="ac-form-grid">
              <div className="ac-field ac-full">
                <label>Nombre *</label>
                <input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Ej. Colección Primavera" />
              </div>
              <div className="ac-field ac-full">
                <label>Descripción</label>
                <textarea name="descripcion" value={form.descripcion} onChange={handleChange} rows={2} placeholder="Descripción breve visible en el catálogo" />
              </div>
              <div className="ac-field ac-full">
                <label>Imagen de portada</label>
                {imagePreview && (
                  <div className="ac-imagen-preview-wrap">
                    <img src={imagePreview} alt="Vista previa" className="ac-imagen-preview" />
                    <button
                      type="button"
                      className="ac-btn-quitar-imagen"
                      onClick={() => { setSelectedFile(null); setImagePreview(null); setForm(prev => ({ ...prev, imagen_url: '' })); }}
                    >Quitar imagen</button>
                  </div>
                )}
                <input type="file" accept="image/*" onChange={handleImageChange} />
                {uploadingImage && <p className="ac-subiendo-texto">Subiendo imagen...</p>}
                <details className="ac-url-alterna">
                  <summary>¿Prefieres pegar una URL en vez de subir un archivo?</summary>
                  <input
                    name="imagen_url"
                    value={form.imagen_url}
                    onChange={e => { handleChange(e); setSelectedFile(null); setImagePreview(e.target.value || null); }}
                    placeholder="https://..."
                  />
                </details>
              </div>
              <div className="ac-field">
                <label>Orden de aparición</label>
                <input name="orden" type="number" min="0" value={form.orden} onChange={handleChange} />
              </div>
            </div>

            <div className="ac-section-title">
              Productos en esta colección
              {productosSeleccionados.length > 0 && (
                <span className="ac-badge">{productosSeleccionados.length} seleccionados</span>
              )}
            </div>

            {/* Productos seleccionados */}
            {productosSeleccionados.length > 0 && (
              <div className="ac-seleccionados">
                {productosSeleccionados.map(p => (
                  <div key={p.id} className="ac-prod-chip">
                    {p.imagen_principal && <img src={p.imagen_principal} alt={p.nombre} />}
                    <span>{p.nombre}</span>
                    <button onClick={() => toggleProducto(p)}>×</button>
                  </div>
                ))}
              </div>
            )}

            {/* Buscador de productos */}
            <input
              ref={busquedaRef}
              className="ac-search"
              placeholder="Buscar producto por nombre o código..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
            <div className="ac-prod-lista">
              {productosFiltrados.slice(0, 50).map(p => {
                const estaSeleccionado = !!productosSeleccionados.find(s => s.id === p.id);
                return (
                  <div
                    key={p.id}
                    className={`ac-prod-item ${estaSeleccionado ? 'ac-prod-item-sel' : ''}`}
                    onClick={() => toggleProducto(p)}
                  >
                    {p.imagen_principal
                      ? <img src={p.imagen_principal} alt={p.nombre} className="ac-prod-thumb" />
                      : <div className="ac-prod-thumb ac-prod-thumb-ph">💍</div>
                    }
                    <div className="ac-prod-info">
                      <div className="ac-prod-nombre">{p.nombre}</div>
                      <div className="ac-prod-codigo">{p.codigo} · ${p.precio_oferta ?? p.precio_venta}</div>
                    </div>
                    <div className={`ac-check ${estaSeleccionado ? 'ac-check-on' : ''}`}>
                      {estaSeleccionado ? '✓' : '+'}
                    </div>
                  </div>
                );
              })}
              {productosFiltrados.length === 0 && (
                <div className="ac-prod-empty">Sin resultados</div>
              )}
            </div>

            {error && <p className="ac-error">{error}</p>}

            <div className="ac-modal-footer">
              <button className="ac-btn-secondary" onClick={cerrarModal}>Cancelar</button>
              <button className="ac-btn-primary" onClick={handleGuardar} disabled={saving || uploadingImage}>
                {uploadingImage ? 'Subiendo imagen...' : saving ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear colección'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE */}
      {confirmDelete && (
        <div className="ac-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="ac-modal ac-modal-sm" onClick={e => e.stopPropagation()}>
            <h2>¿Eliminar colección?</h2>
            <p>Se eliminará <strong>{confirmDelete.nombre}</strong> y se desvinculará de todos sus productos. Los productos no se borran.</p>
            <div className="ac-modal-footer">
              <button className="ac-btn-secondary" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="ac-btn-danger" onClick={handleEliminar}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminColeccionesScreen;
