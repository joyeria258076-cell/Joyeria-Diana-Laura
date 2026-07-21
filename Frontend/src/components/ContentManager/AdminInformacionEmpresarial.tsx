import React, { useState, useEffect } from 'react';
import { contentAPI, uploadAPI } from '../../services/api';

interface InfoEmpresa {
    nombre: string;
    descripcion: string;
    direccion: string;
    telefono: string;
    email: string;
    horario: string;
    mision: string;
    artesania: string;
    anios_tradicion: number;
    clientes_felices: number;
    facebook_url: string;
    instagram_url: string;
    whatsapp: string;
    tiktok_url: string;
    imagen_hero: string;
}

const VACIO: InfoEmpresa = {
    nombre: '', descripcion: '', direccion: '', telefono: '', email: '', horario: '',
    mision: '', artesania: '', anios_tradicion: 0, clientes_felices: 0,
    facebook_url: '', instagram_url: '', whatsapp: '', tiktok_url: '', imagen_hero: ''
};

const AdminInformacionEmpresarial: React.FC = () => {
    const [info, setInfo] = useState<InfoEmpresa>(VACIO);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

    useEffect(() => { cargar(); }, []);

    const cargar = async () => {
        setLoading(true);
        try {
            const res = await contentAPI.getInfoEmpresa();
            if (res.success && res.data) {
                setInfo({
                    nombre: res.data.nombre || '',
                    descripcion: res.data.descripcion || '',
                    direccion: res.data.direccion || '',
                    telefono: res.data.telefono || '',
                    email: res.data.email || '',
                    horario: res.data.horario || '',
                    mision: res.data.mision || '',
                    artesania: res.data.artesania || '',
                    anios_tradicion: res.data.anios_tradicion || 0,
                    clientes_felices: res.data.clientes_felices || 0,
                    facebook_url: res.data.facebook_url || '',
                    instagram_url: res.data.instagram_url || '',
                    whatsapp: res.data.whatsapp || '',
                    tiktok_url: res.data.tiktok_url || '',
                    imagen_hero: res.data.imagen_hero || '',
                });
            }
        } catch {
            setMensaje({ tipo: 'error', texto: 'No se pudo cargar la información empresarial.' });
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field: keyof InfoEmpresa, value: string | number) => {
        setInfo(prev => ({ ...prev, [field]: value }));
    };

    const handleImagenHero = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingImage(true);
        try {
            const res = await uploadAPI.uploadImage(file, 'joyeria/sobre-nosotros');
            if (res.success) handleChange('imagen_hero', res.data.url);
        } catch {
            setMensaje({ tipo: 'error', texto: 'Error al subir la imagen.' });
        } finally {
            setUploadingImage(false);
        }
    };

    const saveChanges = async () => {
        if (!info.nombre.trim()) {
            setMensaje({ tipo: 'error', texto: 'El nombre de la empresa es obligatorio.' });
            return;
        }
        setSaving(true);
        setMensaje(null);
        try {
            const res = await contentAPI.updateInfoEmpresa(info);
            if (res.success) {
                setMensaje({ tipo: 'ok', texto: '✓ Información actualizada — ya se refleja en "Sobre Nosotros".' });
            } else {
                setMensaje({ tipo: 'error', texto: res.message || 'Error al guardar.' });
            }
        } catch (err: any) {
            setMensaje({ tipo: 'error', texto: err.message || 'Error al guardar.' });
        } finally {
            setSaving(false);
            setTimeout(() => setMensaje(null), 4000);
        }
    };

    if (loading) {
        return <div className="content-page"><p>Cargando información empresarial...</p></div>;
    }

    return (
        <div className="content-page">
            <h2 className="content-page-title">ℹ️ Información Empresarial</h2>
            <p className="content-page-subtitle">
                Esta información se muestra en tiempo real en la página pública "Sobre Nosotros".
            </p>

            {mensaje && (
                <div className={mensaje.tipo === 'ok' ? 'message success-message' : 'message error-message'}>
                    {mensaje.texto}
                </div>
            )}

            <div className="manager-subsection">
                <h3 className="subsection-title">🏢 Datos de la Empresa</h3>
                <p className="subsection-description">Información de contacto y detalles generales de tu negocio</p>

                <div className="info-form">
                    <div className="form-group">
                        <label>Nombre de la Empresa *</label>
                        <input type="text" value={info.nombre} onChange={e => handleChange('nombre', e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Dirección</label>
                        <input type="text" value={info.direccion} onChange={e => handleChange('direccion', e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Teléfono</label>
                        <input type="tel" value={info.telefono} onChange={e => handleChange('telefono', e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Email</label>
                        <input type="email" value={info.email} onChange={e => handleChange('email', e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Horario de Atención</label>
                        <textarea value={info.horario} onChange={e => handleChange('horario', e.target.value)} rows={3} placeholder="Una línea por día/rango" />
                    </div>
                    <div className="form-group">
                        <label>Descripción breve (usada en el pie de página y meta descripción)</label>
                        <textarea value={info.descripcion} onChange={e => handleChange('descripcion', e.target.value)} rows={2} />
                    </div>
                </div>
            </div>

            <div className="manager-subsection">
                <h3 className="subsection-title">💎 Sobre Nosotros</h3>
                <p className="subsection-description">Contenido que aparece en la página pública "Sobre Nosotros"</p>

                <div className="info-form">
                    <div className="form-group">
                        <label>Misión</label>
                        <textarea value={info.mision} onChange={e => handleChange('mision', e.target.value)} rows={3} />
                    </div>
                    <div className="form-group">
                        <label>Artesanía / Calidad</label>
                        <textarea value={info.artesania} onChange={e => handleChange('artesania', e.target.value)} rows={3} />
                    </div>
                    <div className="form-group">
                        <label>Años de tradición</label>
                        <input type="number" min={0} value={info.anios_tradicion} onChange={e => handleChange('anios_tradicion', Number.parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="form-group">
                        <label>Clientes felices</label>
                        <input type="number" min={0} value={info.clientes_felices} onChange={e => handleChange('clientes_felices', Number.parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="form-group">
                        <label>Imagen de portada (opcional)</label>
                        {info.imagen_hero && <img src={info.imagen_hero} alt="Portada" style={{ maxWidth: 220, borderRadius: 10, marginBottom: 8, display: 'block' }} />}
                        <input type="file" accept="image/*" onChange={handleImagenHero} />
                        {uploadingImage && <small>Subiendo imagen...</small>}
                    </div>
                </div>
            </div>

            <div className="manager-subsection">
                <h3 className="subsection-title">📱 Redes Sociales</h3>
                <p className="subsection-description">Vincula tus perfiles en redes sociales</p>

                <div className="social-form">
                    <div className="form-group">
                        <label>Facebook</label>
                        <input type="url" placeholder="https://facebook.com/..." value={info.facebook_url} onChange={e => handleChange('facebook_url', e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>Instagram</label>
                        <input type="url" placeholder="https://instagram.com/..." value={info.instagram_url} onChange={e => handleChange('instagram_url', e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>WhatsApp</label>
                        <input type="tel" placeholder="+1 234 567 8900" value={info.whatsapp} onChange={e => handleChange('whatsapp', e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>TikTok</label>
                        <input type="url" placeholder="https://tiktok.com/@..." value={info.tiktok_url} onChange={e => handleChange('tiktok_url', e.target.value)} />
                    </div>
                </div>
            </div>

            <div className="save-section">
                <button className="btn-primary btn-save" onClick={saveChanges} disabled={saving}>
                    {saving ? 'Guardando...' : '💾 Guardar Todos los Cambios'}
                </button>
            </div>
        </div>
    );
};

export default AdminInformacionEmpresarial;
