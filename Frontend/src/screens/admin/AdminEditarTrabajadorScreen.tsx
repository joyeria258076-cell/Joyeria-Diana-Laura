import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { workersAPI } from '../../services/api';
import './AdminEditarTrabajadorScreen.css';

const AdminEditarTrabajadorScreen = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    
    // Estado del formulario
    const [formData, setFormData] = useState({ 
        nombre: '', 
        rol: '', 
        email: '' 
    });
    
    // Estado para la lista dinámica de roles
    const [roles, setRoles] = useState<string[]>([]); 
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initializeData = async () => {
            try {
                setLoading(true);
                
                // 1. Llamadas en paralelo: Datos del trabajador + Lista de roles
                const [workerRes, rolesRes] = await Promise.all([
                    workersAPI.getById(id!),
                    workersAPI.getRoles()
                ]);

                // 2. Procesar y guardar la lista de roles
                let rolesList: string[] = [];
                if (Array.isArray(rolesRes)) {
                    rolesList = rolesRes;
                } else if (rolesRes && rolesRes.data) {
                    rolesList = rolesRes.data;
                }
                setRoles(rolesList);

                // 3. Procesar datos del trabajador
                const actualData = workerRes.data || workerRes;
                
                // Normalización del rol para que coincida con el select
                const rolRecibido = actualData.rol ? actualData.rol.toString().toLowerCase() : '';

                setFormData({ 
                    nombre: actualData.nombre || '', 
                    rol: rolRecibido, 
                    email: actualData.email || '' 
                });

                setLoading(false);
            } catch (err) {
                console.error("❌ Error inicializando:", err);
                navigate('/admin-trabajadores');
            }
        };

        initializeData();
    }, [id, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.rol) {
            alert("Por favor, selecciona un rol válido.");
            return;
        }

        try {
            await workersAPI.update(id!, { 
                nombre: formData.nombre, 
                rol: formData.rol, 
                email: formData.email 
            });
            // Usamos un alert sencillo, pero el diseño ya invita a una navegación fluida
            navigate('/admin-trabajadores');
        } catch (err) {
            console.error("Error al actualizar:", err);
            alert("Error al actualizar: Verifica si el correo ya existe.");
        }
    };

    if (loading) {
        return (
            <div className="admin-edit-wrap">
                <div className="at-state">
                    <div className="at-spinner"><div className="at-ring"/><div className="at-ring at-ring--2"/></div>
                    <p>Cargando información...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-edit-wrap animate-in">
            <div className="admin-container">
                {/* Icono de cabecera decorativo */}
                <div className="admin-header-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/>
                    </svg>
                </div>

                <h1>Editar Perfil</h1>
                <p className="admin-subtitle">Modifica los accesos y datos del personal</p>
                
                <form onSubmit={handleSubmit} className="admin-form">
                    
                    <div className="form-group">
                        <label>Nombre Completo</label>
                        <input 
                            type="text" 
                            placeholder="Ej: Juan Pérez"
                            required
                            value={formData.nombre} 
                            onChange={(e) => setFormData({...formData, nombre: e.target.value})} 
                        />
                    </div>

                    <div className="form-group">
                        <label>Correo Electrónico</label>
                        <input 
                            type="email" 
                            placeholder="correo@ejemplo.com"
                            required
                            value={formData.email} 
                            onChange={(e) => setFormData({...formData, email: e.target.value})} 
                        />
                    </div>

                    <div className="form-group">
                        <label>Rol Asignado</label>
                        <select 
                            value={formData.rol} 
                            onChange={(e) => setFormData({...formData, rol: e.target.value})}
                            required
                        >
                            <option value="" disabled>-- Seleccione un rol --</option>
                            {roles.map((rol) => (
                                <option key={rol} value={rol.toLowerCase()}>
                                    {rol.charAt(0).toUpperCase() + rol.slice(1)}
                                </option>
                            ))}
                        </select>
                        {formData.rol === '' && (
                            <small>⚠️ Debes re-asignar un rol para continuar.</small>
                        )}
                    </div>

                    <div className="button-group">
                        <button type="submit" className="btn-submit">
                            Actualizar Trabajador
                        </button>
                        <button type="button" onClick={() => navigate(-1)} className="btn-cancel">
                            Volver atrás
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminEditarTrabajadorScreen;