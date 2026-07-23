import React, { useState, useEffect, useRef } from 'react';
import './CategoriaModal.css';
import { AiOutlineClose, AiOutlineCheck, AiOutlineCloudUpload, AiOutlineDelete, AiOutlineHolder } from 'react-icons/ai';
import { uploadAPI } from '../../services/api';

interface CategoriaData {
  id?: number;
  nombre: string;
  descripcion?: string;
  categoria_padre_id?: number | null;
  imagen_url?: string;
  orden?: number;
  activo?: boolean;
}

interface CategoriaModalProps {
  isOpen: boolean;
  isEditing: boolean;
  categoriales?: CategoriaData | null;
  todascategorias?: CategoriaData[];
  onClose: () => void;
  onSubmit: (data: CategoriaData) => void;
  onReorderHermanas?: (cambios: { id: number; orden: number }[]) => void;
  loading?: boolean;
}

const CategoriaModal: React.FC<CategoriaModalProps> = ({
  isOpen,
  isEditing,
  categoriales,
  todascategorias = [],
  onClose,
  onSubmit,
  onReorderHermanas,
  loading = false
}) => {
  const [formData, setFormData] = useState<CategoriaData>({
    nombre: '',
    descripcion: '',
    categoria_padre_id: null,
    imagen_url: '',
    orden: 0,
    activo: true
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedKey, setDraggedKey] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && categoriales) {
      setFormData(categoriales);
    } else {
      setFormData({
        nombre: '',
        descripcion: '',
        categoria_padre_id: null,
        imagen_url: '',
        orden: 0,
        activo: true
      });
    }
  }, [isOpen, isEditing, categoriales]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked
      }));
    } else if (name === 'orden' || name === 'categoria_padre_id') {
      setFormData(prev => ({
        ...prev,
        [name]: value === '' ? null : Number.parseInt(value)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const subirImagen = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('El archivo debe ser una imagen');
      return;
    }
    setUploadingImage(true);
    try {
      const response = await uploadAPI.uploadImage(file, 'joyeria/categorias');
      if (response.success) {
        setFormData(prev => ({ ...prev, imagen_url: response.data.url }));
      } else {
        alert(response.message || 'Error al subir la imagen');
      }
    } catch (err: any) {
      console.error('Error uploading image:', err);
      alert(err.message || 'Error al subir la imagen');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) subirImagen(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) subirImagen(file);
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({ ...prev, imagen_url: '' }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nombre || formData.nombre.trim().length === 0) {
      alert('El nombre de la categoría es requerido');
      return;
    }

    if (formData.nombre.length > 100) {
      alert('El nombre no puede exceder 100 caracteres');
      return;
    }

    if (formData.descripcion && formData.descripcion.length > 300) {
      alert('La descripción no puede exceder 300 caracteres');
      return;
    }

    onSubmit(formData);
  };

  const hermanas = todascategorias
    .filter(c => c.id !== formData.id)
    .filter(c => (c.categoria_padre_id || null) === (formData.categoria_padre_id || null))
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

  type ChipItem = { key: string; id?: number; nombre: string; orden: number; esActual: boolean };

  const chips: ChipItem[] = [
    ...hermanas.map(h => ({ key: String(h.id), id: h.id, nombre: h.nombre, orden: h.orden ?? 0, esActual: false })),
    { key: 'actual', id: formData.id, nombre: formData.nombre || 'Esta categoría', orden: formData.orden ?? hermanas.length, esActual: true }
  ].sort((a, b) => a.orden - b.orden || (a.esActual ? 1 : -1));

  const handleChipDrop = (targetKey: string) => {
    if (draggedKey == null || draggedKey === targetKey) {
      setDraggedKey(null);
      setDragOverKey(null);
      return;
    }
    const nueva = [...chips];
    const fromIndex = nueva.findIndex(c => c.key === draggedKey);
    const toIndex = nueva.findIndex(c => c.key === targetKey);
    if (fromIndex === -1 || toIndex === -1) {
      setDraggedKey(null);
      setDragOverKey(null);
      return;
    }
    const [movido] = nueva.splice(fromIndex, 1);
    nueva.splice(toIndex, 0, movido);

    const nuevoOrdenActual = nueva.findIndex(c => c.esActual);
    setFormData(prev => ({ ...prev, orden: nuevoOrdenActual }));

    const cambiosHermanas = nueva
      .filter(c => !c.esActual)
      .map((c, idx) => ({ id: c.id!, ordenNuevo: idx }))
      .filter(c => hermanas.find(h => h.id === c.id)?.orden !== c.ordenNuevo)
      .map(c => ({ id: c.id, orden: c.ordenNuevo }));

    if (cambiosHermanas.length > 0 && onReorderHermanas) {
      onReorderHermanas(cambiosHermanas);
    }

    setDraggedKey(null);
    setDragOverKey(null);
  };

  if (!isOpen) return null;

  return (
    <div className="cm2-overlay" onClick={onClose}>
      <div className="cm2-content" onClick={e => e.stopPropagation()}>
        <div className="cm2-header">
          <h2>{isEditing ? 'Editar Categoría' : 'Nueva Categoría'}</h2>
          <button className="cm2-close-btn" onClick={onClose}>
            <AiOutlineClose size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="cm2-form">
          {/* Nombre */}
          <div className="cm2-field">
            <label htmlFor="nombre">Nombre de la Categoría <span className="cm2-req">*</span></label>
            <input
              type="text"
              id="nombre"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Ej: Anillos, Collares, Pulseras..."
              maxLength={100}
              required
            />
            <small>{formData.nombre?.length || 0}/100 caracteres</small>
          </div>

          {/* Descripción */}
          <div className="cm2-field">
            <label htmlFor="descripcion">Descripción</label>
            <textarea
              id="descripcion"
              name="descripcion"
              value={formData.descripcion || ''}
              onChange={handleChange}
              placeholder="Descripción de la categoría..."
              maxLength={300}
              rows={3}
            />
            <small>{(formData.descripcion?.length || 0)}/300 caracteres</small>
          </div>

          {/* Tipo de categoría */}
          <div className="cm2-field">
            <label>Tipo de Categoría</label>
            <small className="cm2-help">
              Una categoría <strong>principal</strong> aparece sola en el menú. Una <strong>subcategoría</strong> vive dentro de otra (ej: "Anillos" dentro de "Joyería").
            </small>

            <div className="cm2-tipo-toggle">
              <button
                type="button"
                className={`cm2-tipo-btn ${!formData.categoria_padre_id ? 'active' : ''}`}
                onClick={() => setFormData(prev => ({ ...prev, categoria_padre_id: null }))}
              >
                Categoría principal
              </button>
              <button
                type="button"
                className={`cm2-tipo-btn ${formData.categoria_padre_id ? 'active' : ''}`}
                onClick={() => setFormData(prev => ({
                  ...prev,
                  categoria_padre_id: prev.categoria_padre_id || todascategorias.find(c => !isEditing || c.id !== formData.id)?.id || null
                }))}
                disabled={todascategorias.filter(cat => !isEditing || cat.id !== formData.id).length === 0}
              >
                Es subcategoría de otra
              </button>
            </div>

            {formData.categoria_padre_id != null && (
              <select
                id="categoria_padre_id"
                name="categoria_padre_id"
                value={formData.categoria_padre_id || ''}
                onChange={handleChange}
                className="cm2-tipo-select"
              >
                {todascategorias
                  ?.filter(cat => !isEditing || cat.id !== formData.id)
                  .map(cat => {
                    const esSub = !!cat.categoria_padre_id;
                    const nombrePadre = esSub
                      ? todascategorias.find(c => c.id === cat.categoria_padre_id)?.nombre
                      : null;
                    const etiquetaTipo = esSub
                      ? `Subcategoría${nombrePadre ? ` de ${nombrePadre}` : ''}`
                      : 'Principal';
                    return (
                      <option key={cat.id} value={cat.id}>
                        {cat.nombre} — {etiquetaTipo}
                      </option>
                    );
                  })}
              </select>
            )}
          </div>

          {/* Imagen de la categoría */}
          <div className="cm2-field">
            <label>Imagen de la Categoría</label>

            {formData.imagen_url ? (
              <div className="cm2-image-preview">
                <img src={formData.imagen_url} alt="Vista previa" />
                <button type="button" className="cm2-image-remove" onClick={handleRemoveImage}>
                  <AiOutlineDelete size={14} /> Quitar imagen
                </button>
              </div>
            ) : (
              <div
                className={`cm2-dropzone ${isDragging ? 'dragging' : ''} ${uploadingImage ? 'uploading' : ''}`}
                onClick={() => !uploadingImage && fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleFileInputChange}
                  hidden
                />
                <AiOutlineCloudUpload size={28} />
                <p>
                  {uploadingImage
                    ? 'Subiendo imagen...'
                    : <>Arrastra una imagen aquí o <span>haz clic para elegir</span></>}
                </p>
                <small>JPG, PNG, WEBP o GIF · máx. 10MB</small>
              </div>
            )}
          </div>

          {/* Orden */}
          <div className="cm2-field">
            <label htmlFor="orden">Orden de Aparición</label>
            <input
              type="number"
              id="orden"
              name="orden"
              value={formData.orden || 0}
              onChange={handleChange}
              min="0"
              max="999"
            />
            <small>Menor número = Aparece primero</small>

            {hermanas.length > 0 && (
              <div className="cm2-orden-hint">
                <span className="cm2-orden-hint-titulo">
                  Arrastra para decidir el orden {formData.categoria_padre_id ? 'dentro de esta categoría' : 'entre categorías principales'}:
                </span>
                <div className="cm2-orden-hint-lista">
                  {chips.map((c, idx) => (
                    <span
                      key={c.key}
                      className={`cm2-orden-chip ${c.esActual ? 'cm2-orden-chip-actual' : ''} ${dragOverKey === c.key ? 'cm2-orden-chip-over' : ''} ${draggedKey === c.key ? 'cm2-orden-chip-dragging' : ''}`}
                      draggable
                      onDragStart={() => setDraggedKey(c.key)}
                      onDragOver={e => { e.preventDefault(); setDragOverKey(c.key); }}
                      onDragLeave={() => setDragOverKey(prev => prev === c.key ? null : prev)}
                      onDrop={e => { e.preventDefault(); handleChipDrop(c.key); }}
                      onDragEnd={() => { setDraggedKey(null); setDragOverKey(null); }}
                    >
                      <AiOutlineHolder size={12} className="cm2-orden-chip-handle" />
                      <strong>{idx}</strong> {c.nombre}
                      {c.esActual && <span className="cm2-orden-chip-tag">esta</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Estado */}
          {isEditing && (
            <div className="cm2-field cm2-checkbox-field">
              <label htmlFor="activo" className="cm2-checkbox-label">
                <input
                  type="checkbox"
                  id="activo"
                  name="activo"
                  checked={formData.activo || false}
                  onChange={handleChange}
                />
                <span>Categoría Activa</span>
              </label>
            </div>
          )}

          {/* Botones */}
          <div className="cm2-actions">
            <button
              type="button"
              className="cm2-btn-cancel"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="cm2-btn-submit"
              disabled={loading}
            >
              <AiOutlineCheck size={16} />
              {loading ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear Categoría'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoriaModal;
