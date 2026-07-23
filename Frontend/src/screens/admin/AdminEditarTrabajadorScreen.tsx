import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { workersAPI } from '../../services/api';
import { AiOutlineEdit } from 'react-icons/ai';
import './AdminEditarTrabajadorScreen.css';

const initials = (nombre: string) => {
    const partes = nombre.trim().split(/\s+/);
    return `${partes[0]?.[0] || ''}${partes[1]?.[0] || partes[0]?.[1] || ''}`.toUpperCase();
};

const AdminEditarTrabajadorScreen = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        nombre: '',
        rol: '',
        email: ''
    });

    const [roles, setRoles] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const initializeData = async () => {
            try {
                setLoading(true);
                const [workerRes, rolesRes] = await Promise.all([
                    workersAPI.getById(id!),
                    workersAPI.getRoles()
                ]);

                let rolesList: string[] = [];
                if (Array.isArray(rolesRes)) {
                    rolesList = rolesRes;
                } else if (rolesRes && rolesRes.data) {
                    rolesList = rolesRes.data;
                }
                setRoles(rolesList);

                const actualData = workerRes.data || workerRes;
                const rolRecibido = actualData.rol ? actualData.rol.toString().toLowerCase() : '';

                setFormData({
                    nombre: actualData.nombre || '',
                    rol: rolRecibido,
                    email: actualData.email || ''
                });

                setLoading(false);
            } catch (err) {
                console.error("Error inicializando:", err);
                navigate('/admin-trabajadores');
            }
        };

        initializeData();
    }, [id, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.rol) {
            setError('Debes seleccionar un rol válido.');
            return;
        }

        setGuardando(true);
        try {
            await workersAPI.update(id!, {
                nombre: formData.nombre,
                rol: formData.rol,
                email: formData.email
            });
            navigate('/admin-trabajadores');
        } catch (err) {
            console.error("Error al actualizar:", err);
            setError('Error al actualizar: verifica si el correo ya existe.');
        } finally {
            setGuardando(false);
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
            <div className="ae-layout">
                {/* ── Panel de identidad: vista previa en vivo ── */}
                <aside className="ae-identidad">
                    <div className="ae-identidad-avatar">{initials(formData.nombre) || '—'}</div>
                    <p className="ae-identidad-nombre">{formData.nombre || 'Sin nombre'}</p>
                    <p className="ae-identidad-email">{formData.email || 'sin-correo@ejemplo.com'}</p>
                    {formData.rol && (
                        <span className="ae-identidad-rol">{formData.rol.charAt(0).toUpperCase() + formData.rol.slice(1)}</span>
                    )}
                    <div className="ae-identidad-nota">
                        Esta es una vista previa de cómo se identificará este usuario en el panel de personal.
                    </div>
                </aside>

                {/* ── Formulario en filas ── */}
                <div className="ae-panel">
                    <h1 className="ae-titulo"><AiOutlineEdit size={22} /> Editar perfil</h1>
                    <p className="ae-subtitulo">Modifica los accesos y datos del personal</p>

                    {error && <div className="ae-error">{error}</div>}

                    <form onSubmit={handleSubmit} className="ae-form">
                        <div className="ae-fila">
                            <label>Nombre completo</label>
                            <input
                                type="text"
                                placeholder="Ej: Juan Pérez"
                                required
                                value={formData.nombre}
                                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                            />
                        </div>

                        <div className="ae-fila">
                            <label>Correo electrónico</label>
                            <input
                                type="email"
                                placeholder="correo@ejemplo.com"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>

                        <div className="ae-fila">
                            <label>Rol asignado</label>
                            <select
                                value={formData.rol}
                                onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
                                required
                            >
                                <option value="" disabled>— Selecciona un rol —</option>
                                {roles.map((rol) => (
                                    <option key={rol} value={rol.toLowerCase()}>
                                        {rol.charAt(0).toUpperCase() + rol.slice(1)}
                                    </option>
                                ))}
                            </select>
                            {formData.rol === '' && (
                                <small className="ae-hint-warn">Debes re-asignar un rol para continuar.</small>
                            )}
                        </div>

                        <div className="ae-acciones">
                            <button type="button" onClick={() => navigate(-1)} className="ae-btn-cancel">
                                Cancelar
                            </button>
                            <button type="submit" className="ae-btn-submit" disabled={guardando}>
                                {guardando ? 'Guardando...' : 'Guardar cambios'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AdminEditarTrabajadorScreen;
