// Frontend/src/screens/admin/proveedores/AdminNuevoProveedorScreen.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AiOutlineArrowLeft, AiOutlineSave, AiOutlineClose } from 'react-icons/ai';
import { proveedoresAPI } from '../../../services/api';
import './AdminNuevoProveedorScreen.css';

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

const AdminNuevoProveedorScreen: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
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
      const response = await proveedoresAPI.create(formData);

      if (response.success) {
        setSuccess(true);
        alert('¡Proveedor registrado exitosamente!');
        
        setTimeout(() => {
          navigate('/admin/proveedores');
        }, 1000);
      } else {
        setError(response.message || 'Error al crear el proveedor');
      }
    } catch (err: any) {
      console.error('Error creating proveedor:', err);
      setError(err.message || 'Error al crear el proveedor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="nuevo-proveedor-container">
      <div className="nuevo-proveedor-wrapper">
        {/* Header */}
        <div className="nuevo-proveedor-header">
          <button className="btn-back" onClick={() => navigate('/admin/proveedores')}>
            <AiOutlineArrowLeft size={20} />
            <span>Volver a Proveedores</span>
          </button>
          <h1>➕ Nuevo Proveedor</h1>
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
            <span>¡Proveedor creado exitosamente!</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="nuevo-proveedor-form">
          
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
                  placeholder="Ej: Joyerías López S.A. de C.V."
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
                  placeholder="Ej: Joyerías López, S.A. de C.V."
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
                  placeholder="Ej: JLSA123456XYZ"
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
                  placeholder="Ej: Juan Pérez"
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
                  placeholder="Ej: 555-123-4567"
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
                  placeholder="Ej: contacto@proveedor.com"
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
                  placeholder="Ej: https://www.proveedor.com"
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
                  placeholder="Calle, número, colonia, ciudad, estado, código postal"
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
                  placeholder="Información adicional sobre el proveedor..."
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
                <small>Si está inactivo, no aparecerá en las listas de selección</small>
              </div>
            </div>
          </fieldset>

          {/* Botones */}
          <div className="form-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={() => navigate('/admin/proveedores')}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-save"
              disabled={loading}
            >
              <AiOutlineSave size={18} />
              {loading ? 'Guardando...' : 'Guardar Proveedor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminNuevoProveedorScreen;