// Frontend/src/components/ContentManager/AdminNoticiasManager.tsx
import React, { useState, useEffect, useRef } from 'react';
import '../../screens/admin/contenido/AdminContentManager.css';
import { contentAPI } from '../../services/api';

interface Noticia {
    id: string;
    titulo: string;
    contenido: string;
    imagen: string;
    fecha: string;
    activa: boolean;
}

const AdminNoticiasManager: React.FC = () => {
    // Estados principales
    const [pageConfig, setPageConfig] = useState({
        titulo: '',
        contenido: '',
        imagen: '',
        fecha: new Date().toISOString().split('T')[0]
    });
    const [noticias, setNoticias] = useState<Noticia[]>([]);
    const [newNoticia, setNewNoticia] = useState<Partial<Noticia>>({
        titulo: '', contenido: '', imagen: ''
    });

    // ── ESTADOS DE CARGA Y ERRORES ──
    const [initialLoading, setInitialLoading] = useState(true); // <-- Loader al abrir la página
    const [backendError, setBackendError] = useState<string | null>(null); // <-- Estado para el disclaimer

    const [loadingPage, setLoadingPage] = useState(false);
    const [loadingNoticia, setLoadingNoticia] = useState(false);

    // Refs para resetear el input file después de limpiar
    const bannerInputRef = useRef<HTMLInputElement>(null);
    const noticiaInputRef = useRef<HTMLInputElement>(null);

    // ── CARGAR DATOS ──
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Empezamos asumiendo que todo irá bien
                setBackendError(null);
                
                const configRes = await contentAPI.getPageConfig('noticias');
                if (configRes) setPageConfig(configRes);

                const noticiasRes = await contentAPI.getNoticias();
                if (noticiasRes) setNoticias(noticiasRes);
            } catch (error) {
                console.error("Falló la petición al backend:", error);
                // Si falla, activamos el disclaimer
                setBackendError("No se pudo conectar con el servidor. Los datos mostrados están vacíos y los cambios no se guardarán.");
            } finally {
                // Termine bien o mal, quitamos el loader
                setInitialLoading(false);
            }
        };
        fetchData();
    }, []);

    // ── MANEJO DE IMAGEN → Base64 ──
    const handleImageChange = (
        e: React.ChangeEvent<HTMLInputElement>,
        isPage: boolean
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            if (isPage) setPageConfig(prev => ({ ...prev, imagen: result }));
            else        setNewNoticia(prev => ({ ...prev, imagen: result }));
        };
        reader.readAsDataURL(file);
    };

    // ── QUITAR IMAGEN ──
    const clearImage = (isPage: boolean) => {
        if (isPage) {
            setPageConfig(prev => ({ ...prev, imagen: '' }));
            if (bannerInputRef.current) bannerInputRef.current.value = '';
        } else {
            setNewNoticia(prev => ({ ...prev, imagen: '' }));
            if (noticiaInputRef.current) noticiaInputRef.current.value = '';
        }
    };

    // ── GUARDAR CONFIG ──
    const savePageConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoadingPage(true);
        try {
            await contentAPI.updatePageConfig('noticias', pageConfig);
            alert("✅ Configuración de la página guardada en la base de datos.");
            setBackendError(null); // Si logramos guardar, quitamos el error
        } catch (error) {
            console.error(error);
            alert("Error al guardar. ¿El backend está encendido?");
        } finally {
            setLoadingPage(false);
        }
    };

    // ── PUBLICAR NOTICIA ──
    const addNoticia = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNoticia.titulo || !newNoticia.contenido || !newNoticia.imagen) return;
        setLoadingNoticia(true);
        try {
            const res = await contentAPI.createNoticia(newNoticia);
            setNoticias(prev => [res.noticia || res, ...prev]);
            setNewNoticia({ titulo: '', contenido: '', imagen: '' });
            if (noticiaInputRef.current) noticiaInputRef.current.value = '';
            setBackendError(null);
        } catch (error) {
            console.error(error);
            alert("Error al publicar la noticia. Revisa el servidor.");
        } finally {
            setLoadingNoticia(false);
        }
    };

    // ── ELIMINAR / TOGGLE ──
    const deleteNoticia = async (id: string) => {
        if (window.confirm("🚨 ¿Seguro que deseas eliminar esta noticia?")) {
            try {
                await contentAPI.deleteNoticia(id);
                setNoticias(prev => prev.filter(n => n.id !== id));
            } catch (error) {
                console.error("Error al eliminar", error);
            }
        }
    };

    const toggleNoticia = async (id: string, activaActual: boolean) => {
        try {
            await contentAPI.toggleNoticiaStatus(id, !activaActual);
            setNoticias(prev =>
                prev.map(n => n.id === id ? { ...n, activa: !activaActual } : n)
            );
        } catch (error) {
            console.error("Error al cambiar estado", error);
        }
    };

    // ── COMPONENTE REUTILIZABLE: campo de imagen ──
    const ImageField = ({ imagen, isPage, inputRef, required = false, hint = "JPG, PNG, WEBP" }: any) => (
        <div className="upload-area-lux" style={{ flexDirection: imagen ? 'row' : 'column', alignItems: imagen ? 'center' : 'stretch', padding: imagen ? '1rem' : '1.5rem 1rem' }}>
            {imagen ? (
                <>
                    <div className="preview-img-wrapper">
                        <img src={imagen} alt="Preview" />
                        <button type="button" className="btn-remove-img" onClick={() => clearImage(isPage)} title="Quitar imagen">✕</button>
                    </div>
                    <div style={{ flex: 1, paddingLeft: '1rem' }}>
                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', margin: '0 0 4px 0', fontWeight: 600 }}>✓ Imagen cargada</p>
                        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', margin: 0 }}>Haz clic en <strong style={{ color: '#e74c3c' }}>✕</strong> para quitarla</p>
                    </div>
                </>
            ) : (
                <div className="upload-input-container">
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', margin: '0 0 0.75rem 0', textAlign: 'center' }}>🖼️ &nbsp;{hint}</p>
                    <input type="file" accept="image/*" ref={inputRef} onChange={e => handleImageChange(e, isPage)} required={required} style={{ width: '100%' }} />
                </div>
            )}
        </div>
    );

    // ── 1. PANTALLA DE CARGA INICIAL ──
    if (initialLoading) {
        return (
            <div className="content-page animate-fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <div className="noticias-loading">
                    <div className="loading-spinner">
                        <div className="spinner-ring" />
                        <div className="spinner-ring spinner-ring--2" />
                        <div className="spinner-dot" />
                    </div>
                    <p className="loading-text" style={{ marginTop: '1.5rem' }}>Conectando con la base de datos...</p>
                    <div className="loading-dots"><span /><span /><span /></div>
                </div>
            </div>
        );
    }

    // ── 2. PANTALLA PRINCIPAL ──
    return (
        <div className="content-page animate-fade-in">
            <h2 className="content-page-title">📰 Gestión de Página: Noticias</h2>

            {/* ── DISCLAIMER DE ERROR AL CONECTAR AL BACKEND ── */}
            {backendError && (
                <div style={{ 
                    background: 'rgba(231, 76, 60, 0.1)', 
                    border: '1px solid #e74c3c', 
                    padding: '1rem 1.5rem', 
                    borderRadius: '8px', 
                    marginBottom: '2rem', 
                    color: '#ff8a80', 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    gap: '12px' 
                }}>
                    <span style={{ fontSize: '1.5rem', lineHeight: '1' }}>⚠️</span>
                    <div>
                        <strong style={{ display: 'block', marginBottom: '4px', color: '#ffb3b3' }}>Aviso de conexión:</strong>
                        <span style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>{backendError}</span>
                    </div>
                </div>
            )}

            {/* ── SECCIÓN 1: CONFIG GLOBAL ── */}
            <div className="manager-subsection glass-panel" style={{ borderLeft: '4px solid var(--gold-lux)' }}>
                <div className="subsection-header">
                    <h3 className="subsection-title">⚙️ 1. Apariencia de la Página Pública</h3>
                </div>
                <form onSubmit={savePageConfig} className="noticia-form-lux">
                    <div className="form-group-lux full-width">
                        <label>✦ Título Principal</label>
                        <input type="text" value={pageConfig.titulo} onChange={e => setPageConfig(prev => ({ ...prev, titulo: e.target.value }))} required />
                    </div>
                    <div className="form-group-lux full-width">
                        <label>✦ Descripción / Mensaje</label>
                        <textarea rows={3} value={pageConfig.contenido} onChange={e => setPageConfig(prev => ({ ...prev, contenido: e.target.value }))} required />
                    </div>
                    <div className="form-group-lux full-width">
                        <label>✦ Imagen de Banner (Opcional)</label>
                        <ImageField imagen={pageConfig.imagen} isPage={true} inputRef={bannerInputRef} hint="JPG, PNG, WEBP — recomendado 1200×400 px" />
                    </div>
                    <div className="form-submit-container">
                        <button type="submit" className="btn-submit-admin" disabled={loadingPage}>
                            {loadingPage ? 'GUARDANDO...' : '💾 GUARDAR EN BASE DE DATOS'}
                        </button>
                    </div>
                </form>
            </div>

            {/* ── SECCIÓN 2: NUEVA NOTICIA ── */}
            <div className="manager-subsection glass-panel">
                <div className="subsection-header">
                    <h3 className="subsection-title">✍️ 2. Redactar Nueva Noticia</h3>
                </div>
                <form onSubmit={addNoticia} className="noticia-form-lux">
                    <div className="form-group-lux full-width">
                        <label>✦ Titular</label>
                        <input type="text" value={newNoticia.titulo} onChange={e => setNewNoticia(prev => ({ ...prev, titulo: e.target.value }))} required />
                    </div>
                    <div className="form-group-lux full-width">
                        <label>✦ Contenido</label>
                        <textarea rows={4} value={newNoticia.contenido} onChange={e => setNewNoticia(prev => ({ ...prev, contenido: e.target.value }))} required />
                    </div>
                    <div className="form-group-lux full-width">
                        <label>✦ Imagen de Portada</label>
                        <ImageField imagen={newNoticia.imagen || ''} isPage={false} inputRef={noticiaInputRef} required={!newNoticia.imagen} hint="JPG, PNG, WEBP — recomendado 800×500 px" />
                    </div>
                    <div className="form-submit-container">
                        <button type="submit" className="btn-submit-admin" disabled={loadingNoticia || !newNoticia.imagen} title={!newNoticia.imagen ? 'Selecciona una imagen primero' : ''}>
                            {loadingNoticia ? 'PUBLICANDO...' : '📢 PUBLICAR NOTICIA'}
                        </button>
                    </div>
                </form>
            </div>

            {/* ── SECCIÓN 3: LISTADO ── */}
            <div className="manager-subsection glass-panel transparent-bg">
                <div className="subsection-header">
                    <h3 className="subsection-title">📚 3. Artículos Publicados ({noticias.length})</h3>
                </div>
                <div className="noticias-grid">
                    {noticias.length === 0 ? (
                        <div className="no-data-lux">No hay noticias en la BD.</div>
                    ) : (
                        noticias.map(noticia => (
                            <div key={noticia.id} className="noticia-card-lux">
                                <div className="card-image-wrapper">
                                    <img src={noticia.imagen} alt="Noticia" className="noticia-image" />
                                    <div className="card-overlay">
                                        <span className={`status-badge ${noticia.activa ? 'active' : 'inactive'}`}>
                                            {noticia.activa ? '● Activa' : '○ Oculta'}
                                        </span>
                                    </div>
                                </div>
                                <div className="card-content-lux">
                                    <h4>{noticia.titulo}</h4>
                                    <p>{noticia.contenido.substring(0, 80)}...</p>
                                    <div className="card-actions-lux">
                                        <button type="button" className="btn-action-lux" onClick={() => toggleNoticia(noticia.id, noticia.activa)}>
                                            {noticia.activa ? '👁️ Ocultar' : '👁️‍🗨️ Mostrar'}
                                        </button>
                                        <button type="button" className="btn-action-lux delete" onClick={() => deleteNoticia(noticia.id)}>
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminNoticiasManager;