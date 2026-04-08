import React, { useState, useEffect } from 'react';
import './CategoriaModal.css';
import { AiOutlineClose, AiOutlineCheck } from 'react-icons/ai';

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
  loading?: boolean;
}

const CategoriaModal: React.FC<CategoriaModalProps> = ({
  isOpen,
  isEditing,
  categoriales,
  todascategorias = [],
  onClose,
  onSubmit,
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

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content-categoria" onClick={e => e.stopPropagation()}>
        <div className="modal-header-categoria">
          <h2>{isEditing ? 'Editar Categoría' : 'Nueva Categoría'}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <AiOutlineClose size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="categoria-form">
          {/* Nombre */}
          <div className="form-group-modal">
            <label htmlFor="nombre">✦ Nombre de la Categoría *</label>
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
          <div className="form-group-modal">
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

          {/* Categoría Padre */}
          <div className="form-group-modal">
            <label htmlFor="categoria_padre_id">Categoría Padre (Subcategoría)</label>
            <select
              id="categoria_padre_id"
              name="categoria_padre_id"
              value={formData.categoria_padre_id || ''}
              onChange={handleChange}
            >
              <option value="">Sin categoría padre (Principal)</option>
              {todascategorias
                ?.filter(cat => !isEditing || cat.id !== formData.id)
                .map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nombre}
                  </option>
                ))}
            </select>
          </div>

          {/* URL de Imagen */}
          <div className="form-group-modal">
            <label htmlFor="imagen_url">URL de Imagen</label>
            <input
              type="url"
              id="imagen_url"
              name="imagen_url"
              value={formData.imagen_url || ''}
              onChange={handleChange}
              placeholder="https://ejemplo.com/imagen.jpg"
            />
          </div>

          {/* Orden */}
          <div className="form-group-modal">
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
          </div>

          {/* Estado */}
          {isEditing && (
            <div className="form-group-modal checkbox">
              <label htmlFor="activo">
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
          <div className="modal-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-submit-modal"
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
