import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { workersAPI } from '../../services/api';
import './AdminAltaTrabajadorForm.css';

const AdminAltaTrabajadorForm: React.FC = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    rol: '', // Aquí guardamos lo que el admin elija en el select
    password: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password.length < 6) {
      alert("⚠️ La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setSubmitting(true);
    
    try {
      console.log("🚀 Enviando datos de alta:", formData);

      // Enviamos el objeto mapeado para que el controlador lo reciba correctamente
      const response = await workersAPI.create({
        nombre: formData.nombre,
        email: formData.email,
        puesto: formData.rol, // El controlador en backend usa 'puesto' del body para llenar el 'rol' de la BD
        password: formData.password
      });
      
      if (response.success) {
        alert("🎉 Personal registrado con éxito");
        navigate('/admin-trabajadores'); 
      }
    } catch (error: any) {
      console.error("❌ Error en registro:", error);
      alert("❌ Error: " + (error.message || "No se pudo conectar con el servidor"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-trabajadores-container animate-in">
      <div className="admin-page-header">
        <h2>Nuevo Registro de Personal</h2>
        <button className="btn-cancel" onClick={() => navigate('/admin-trabajadores')}>
          <i className="fas fa-arrow-left"></i> Cancelar
        </button>
      </div>

      <div className="admin-table-responsive">
        <form onSubmit={handleSubmit} className="worker-form">
          <div className="form-group">
            <label>Nombre Completo</label>
            <input 
              type="text" required
              placeholder="Ej. Juan Pérez"
              value={formData.nombre}
              onChange={(e) => setFormData({...formData, nombre: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label>Correo Electrónico</label>
            <input 
              type="email" required
              placeholder="correo@joyeriadiana.com"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label>Asignar Rol (Puesto)</label>
            <select 
              className="form-control-select"
              required
              value={formData.rol}
              onChange={(e) => setFormData({...formData, rol: e.target.value})}
            >
              <option value="">Seleccione una opción...</option>
              <option value="trabajador">Trabajador (Ventas / Taller)</option>
              <option value="admin">Administrador (Gestión)</option>
            </select>
          </div>

          <div className="form-group">
            <label>Contraseña Temporal</label>
            <input 
              type="password" required
              placeholder="Mínimo 6 caracteres"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>

          <div className="modal-actions">
            <button type="submit" className="btn-save" disabled={submitting}>
              {submitting ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> Guardando...
                </>
              ) : (
                'Confirmar Alta'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminAltaTrabajadorForm;