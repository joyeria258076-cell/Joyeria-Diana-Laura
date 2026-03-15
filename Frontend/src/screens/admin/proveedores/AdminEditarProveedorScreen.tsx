// Frontend/src/screens/admin/proveedores/AdminEditarProveedorScreen.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AiOutlineArrowLeft, AiOutlineSave, AiOutlineClose } from 'react-icons/ai';
import { proveedoresAPI } from '../../../services/api';
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
}

const AdminEditarProveedorScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
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
    activo: true
  });

  useEffect(() => {
    if (id) {
      cargarProveedor(parseInt(id));
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
          activo: data.activo !== false
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
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
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

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await proveedoresAPI.update(parseInt(id!), formData);

      if (response.success) {
        setSuccess(true);
        alert('¡Proveedor actualizado exitosamente!');
        
        setTimeout(() => {
          navigate(`/admin/proveedor/${id}`);
        }, 1000);
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

  if (loadingData) {
    return (
      <div className="editar-proveedor-loading">
        <div className="spinner"></div>
        <p>Cargando proveedor...</p>
      </div>
    );
  }

  return (
    <div className="editar-proveedor-container">
      <div className="editar-proveedor-wrapper">
        {/* Header */}
        <div className="editar-proveedor-header">
          <button className="btn-back" onClick={() => navigate(`/admin/proveedor/${id}`)}>
            <AiOutlineArrowLeft size={20} />
            <span>Volver al Detalle</span>
          </button>
          <h1>✏️ Editar Proveedor</h1>
        </div>

        {/* Alerts */}
        {error && (
          <div className="alert alert-error">
            <AiOutlineClose size={20} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            <span>¡Proveedor actualizado exitosamente!</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="editar-proveedor-form">
          
          {/* Información básica */}
          <fieldset className="form-section">
            <legend>📋 Información Básica</legend>
            
            <div className="form-row">
              <div className="form-group full">
                <label htmlFor="nombre">Nombre del Proveedor *</label>
                <input
                  type="text"
                  id="nombre"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="razon_social">Razón Social</label>
                <input
                  type="text"
                  id="razon_social"
                  name="razon_social"
                  value={formData.razon_social}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="rfc">RFC</label>
                <input
                  type="text"
                  id="rfc"
                  name="rfc"
                  value={formData.rfc}
                  onChange={handleInputChange}
                  maxLength={13}
                />
              </div>
            </div>
          </fieldset>

          {/* Contacto */}
          <fieldset className="form-section">
            <legend>📞 Contacto</legend>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="persona_contacto">Persona de Contacto</label>
                <input
                  type="text"
                  id="persona_contacto"
                  name="persona_contacto"
                  value={formData.persona_contacto}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="telefono">Teléfono</label>
                <input
                  type="text"
                  id="telefono"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="sitio_web">Sitio Web</label>
                <input
                  type="url"
                  id="sitio_web"
                  name="sitio_web"
                  value={formData.sitio_web}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </fieldset>

          {/* Dirección */}
          <fieldset className="form-section">
            <legend>📍 Dirección</legend>
            
            <div className="form-row">
              <div className="form-group full">
                <label htmlFor="direccion">Dirección Completa</label>
                <textarea
                  id="direccion"
                  name="direccion"
                  value={formData.direccion}
                  onChange={handleInputChange}
                  rows={3}
                />
              </div>
            </div>
          </fieldset>

          {/* Notas adicionales */}
          <fieldset className="form-section">
            <legend>📝 Notas Adicionales</legend>
            
            <div className="form-row">
              <div className="form-group full">
                <label htmlFor="notas">Notas</label>
                <textarea
                  id="notas"
                  name="notas"
                  value={formData.notas}
                  onChange={handleInputChange}
                  rows={4}
                />
              </div>
            </div>
          </fieldset>

          {/* Estado */}
          <fieldset className="form-section">
            <legend>⚙️ Estado</legend>
            
            <div className="form-row">
              <div className="form-group checkbox">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="activo"
                    checked={formData.activo}
                    onChange={handleCheckboxChange}
                  />
                  Proveedor activo
                </label>
              </div>
            </div>
          </fieldset>

          {/* Botones */}
          <div className="form-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={() => navigate(`/admin/proveedor/${id}`)}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-save"
              disabled={loading}
            >
              <AiOutlineSave size={18} />
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminEditarProveedorScreen;