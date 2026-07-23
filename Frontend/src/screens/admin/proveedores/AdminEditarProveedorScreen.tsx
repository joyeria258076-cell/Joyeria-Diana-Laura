// Frontend/src/screens/admin/proveedores/AdminEditarProveedorScreen.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  AiOutlineSave, AiOutlineClose, AiOutlineEdit, AiOutlineFileText, AiOutlinePhone,
  AiOutlineEnvironment, AiOutlineMail, AiOutlineGlobal, AiOutlineUser, AiOutlineIdcard,
  AiOutlineShop, AiOutlineCheckCircle, AiOutlineCamera, AiOutlineDelete,
} from 'react-icons/ai';
import { proveedoresAPI, uploadAPI } from '../../../services/api';
import './AdminEditarProveedorScreen.css';

interface FormData {
  nombre: string;
  razon_social: string;
  rfc: string;
  direccion: string;
  telefono: string;
  email: string;
  sitio_web: string;
  persona_contacto: string;
  notas: string;
  activo: boolean;
  imagen_url: string;
}

const AdminEditarProveedorScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    nombre: '',
    razon_social: '',
    rfc: '',
    direccion: '',
    telefono: '',
    email: '',
    sitio_web: '',
    persona_contacto: '',
    notas: '',
    activo: true,
    imagen_url: ''
  });

  useEffect(() => {
    if (id) {
      cargarProveedor(Number.parseInt(id));
    }
  }, [id]);

  const cargarProveedor = async (proveedorId: number) => {
    try {
      setLoadingData(true);
      const response = await proveedoresAPI.getById(proveedorId);

      if (response.success) {
        const data = response.data;
        setFormData({
          nombre: data.nombre || '',
          razon_social: data.razon_social || '',
          rfc: data.rfc || '',
          direccion: data.direccion || '',
          telefono: data.telefono || '',
          email: data.email || '',
          sitio_web: data.sitio_web || '',
          persona_contacto: data.persona_contacto || '',
          notas: data.notas || '',
          activo: data.activo !== false,
          imagen_url: data.imagen_url || ''
        });
      } else {
        setError('No se pudo cargar el proveedor');
      }
    } catch (err: any) {
      console.error('Error cargando proveedor:', err);
      setError(err.message || 'Error al cargar el proveedor');
    } finally {
      setLoadingData(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setError('');
    try {
      const response = await uploadAPI.uploadImage(file, 'joyeria/proveedores');
      if (response.success) {
        setFormData(prev => ({ ...prev, imagen_url: response.data.url }));
      } else {
        setError(response.message || 'Error al subir la imagen');
      }
    } catch (err: any) {
      console.error('Error uploading image:', err);
      setError(err.message || 'Error al subir la imagen');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({ ...prev, imagen_url: '' }));
  };

  const validateForm = (): boolean => {
    if (!formData.nombre.trim()) {
      setError('El nombre del proveedor es requerido');
      return false;
    }
    if (formData.email && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email)) {
      setError('El email no es válido');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await proveedoresAPI.update(Number.parseInt(id!), formData);
      if (response.success) {
        setSuccess(true);
        alert('¡Proveedor actualizado exitosamente!');
        setTimeout(() => navigate(`/admin/proveedor/${id}`), 1000);
      } else {
        setError(response.message || 'Error al actualizar el proveedor');
      }
    } catch (err: any) {
      console.error('Error updating proveedor:', err);
      setError(err.message || 'Error al actualizar el proveedor');
    } finally {
      setLoading(false);
    }
  };

  const iniciales = formData.nombre.trim()
    ? formData.nombre.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase()).join('')
    : '?';

  if (loadingData) {
    return (
      <div className="ep2-loading">
        <div className="ep2-spinner" />
        <p>Cargando proveedor...</p>
      </div>
    );
  }

  return (
    <div className="ep2-container">
      <div className="ep2-header">
        <h1><AiOutlineEdit size={22} /> Editar Proveedor</h1>
        <p>Actualiza la información del proveedor #{id}</p>
      </div>

      {error && (
        <div className="ep2-alert ep2-alert-error">
          <AiOutlineClose size={18} />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="ep2-alert ep2-alert-success">
          <AiOutlineCheckCircle size={18} />
          <span>¡Proveedor actualizado exitosamente!</span>
        </div>
      )}

      <div className="ep2-layout">
        <form onSubmit={handleSubmit} className="ep2-form">

          <div className="ep2-card">
            <div className="ep2-card-num">1</div>
            <div className="ep2-card-body">
              <h3><AiOutlineCamera size={16} /> Foto del Proveedor</h3>

              <div className="ep2-photo-row">
                <div className="ep2-photo-preview">
                  {formData.imagen_url ? (
                    <img src={formData.imagen_url} alt="Proveedor" />
                  ) : (
                    <span>{iniciales}</span>
                  )}
                </div>
                <div className="ep2-photo-actions">
                  <label className="ep2-photo-upload">
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} disabled={uploadingImage} hidden />
                    <AiOutlineCamera size={16} />
                    {uploadingImage ? 'Subiendo...' : formData.imagen_url ? 'Cambiar foto' : 'Subir foto'}
                  </label>
                  {formData.imagen_url && (
                    <button type="button" className="ep2-photo-remove" onClick={handleRemoveImage}>
                      <AiOutlineDelete size={15} /> Quitar
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="ep2-card">
            <div className="ep2-card-num">2</div>
            <div className="ep2-card-body">
              <h3><AiOutlineFileText size={16} /> Información Básica</h3>

              <div className="ep2-field ep2-field-full">
                <label htmlFor="nombre">Nombre del Proveedor <span className="ep2-req">*</span></label>
                <input
                  type="text" id="nombre" name="nombre"
                  value={formData.nombre} onChange={handleInputChange} required
                />
              </div>

              <div className="ep2-row">
                <div className="ep2-field">
                  <label htmlFor="razon_social">Razón Social</label>
                  <input
                    type="text" id="razon_social" name="razon_social"
                    value={formData.razon_social} onChange={handleInputChange}
                  />
                </div>
                <div className="ep2-field">
                  <label htmlFor="rfc">RFC</label>
                  <input
                    type="text" id="rfc" name="rfc"
                    value={formData.rfc} onChange={handleInputChange} maxLength={13}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="ep2-card">
            <div className="ep2-card-num">3</div>
            <div className="ep2-card-body">
              <h3><AiOutlinePhone size={16} /> Contacto</h3>

              <div className="ep2-row">
                <div className="ep2-field">
                  <label htmlFor="persona_contacto">Persona de Contacto</label>
                  <input
                    type="text" id="persona_contacto" name="persona_contacto"
                    value={formData.persona_contacto} onChange={handleInputChange}
                  />
                </div>
                <div className="ep2-field">
                  <label htmlFor="telefono">Teléfono</label>
                  <input
                    type="text" id="telefono" name="telefono"
                    value={formData.telefono} onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="ep2-row">
                <div className="ep2-field">
                  <label htmlFor="email">Email</label>
                  <input
                    type="email" id="email" name="email"
                    value={formData.email} onChange={handleInputChange}
                  />
                </div>
                <div className="ep2-field">
                  <label htmlFor="sitio_web">Sitio Web</label>
                  <input
                    type="url" id="sitio_web" name="sitio_web"
                    value={formData.sitio_web} onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="ep2-card">
            <div className="ep2-card-num">4</div>
            <div className="ep2-card-body">
              <h3><AiOutlineEnvironment size={16} /> Dirección</h3>
              <div className="ep2-field ep2-field-full">
                <label htmlFor="direccion">Dirección Completa</label>
                <textarea
                  id="direccion" name="direccion"
                  value={formData.direccion} onChange={handleInputChange} rows={3}
                />
              </div>
            </div>
          </div>

          <div className="ep2-card">
            <div className="ep2-card-num">5</div>
            <div className="ep2-card-body">
              <h3><AiOutlineEdit size={16} /> Notas Adicionales</h3>
              <div className="ep2-field ep2-field-full">
                <label htmlFor="notas">Notas</label>
                <textarea
                  id="notas" name="notas"
                  value={formData.notas} onChange={handleInputChange} rows={4}
                />
              </div>

              <label className="ep2-toggle-row">
                <span
                  className={`ep2-toggle ${formData.activo ? 'ep2-toggle-on' : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, activo: !prev.activo }))}
                  role="checkbox"
                  aria-checked={formData.activo}
                  tabIndex={0}
                >
                  <span className="ep2-toggle-knob" />
                </span>
                <span className="ep2-toggle-text">
                  <strong>Proveedor activo</strong>
                  <small>Si está inactivo, no aparecerá en las listas de selección</small>
                </span>
              </label>
            </div>
          </div>

          <div className="ep2-actions">
            <button type="button" className="ep2-btn-cancel" onClick={() => navigate(-1)}>
              Cancelar
            </button>
            <button type="submit" className="ep2-btn-save" disabled={loading}>
              <AiOutlineSave size={18} />
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>

        {/* Vista previa en vivo */}
        <aside className="ep2-preview">
          <div className="ep2-preview-sticky">
            <span className="ep2-preview-eyebrow">Vista previa</span>
            <div className="ep2-preview-card">
              <div className="ep2-preview-top">
                <div className="ep2-preview-avatar">
                  {formData.imagen_url ? <img src={formData.imagen_url} alt="" /> : iniciales}
                </div>
                <span className={`ep2-preview-badge ${formData.activo ? 'on' : 'off'}`}>
                  {formData.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <h4 className="ep2-preview-nombre">{formData.nombre || 'Nombre del proveedor'}</h4>
              {formData.razon_social && <p className="ep2-preview-razon">{formData.razon_social}</p>}

              <div className="ep2-preview-divider" />

              <div className="ep2-preview-item">
                <AiOutlineIdcard size={15} />
                <span>{formData.rfc || 'RFC no especificado'}</span>
              </div>
              <div className="ep2-preview-item">
                <AiOutlineUser size={15} />
                <span>{formData.persona_contacto || 'Sin persona de contacto'}</span>
              </div>
              <div className="ep2-preview-item">
                <AiOutlineMail size={15} />
                <span>{formData.email || 'Sin correo'}</span>
              </div>
              <div className="ep2-preview-item">
                <AiOutlinePhone size={15} />
                <span>{formData.telefono || 'Sin teléfono'}</span>
              </div>
              <div className="ep2-preview-item">
                <AiOutlineGlobal size={15} />
                <span>{formData.sitio_web || 'Sin sitio web'}</span>
              </div>
              <div className="ep2-preview-item">
                <AiOutlineEnvironment size={15} />
                <span>{formData.direccion || 'Sin dirección'}</span>
              </div>

              <div className="ep2-preview-footer">
                <AiOutlineShop size={14} />
                Así se ve en tu lista de proveedores
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default AdminEditarProveedorScreen;
