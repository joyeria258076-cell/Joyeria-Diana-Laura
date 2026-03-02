import React, { useState, useEffect, useRef } from 'react';
import { carruselAPI, promocionesAPI } from '../../services/api';
import '../../screens/admin/contenido/AdminContentManager.css'; // Usamos las clases de lujo

interface CarouselItem {
    id: string | number;
    titulo: string;
    descripcion: string;
    imagen: string;
    enlace?: string;
}

interface PromocionItem {
    id: string | number;
    titulo: string;
    descripcion: string;
    descuento: number;
    activa: boolean;
}

const AdminInitoManager: React.FC = () => {
    // ── ESTADOS DE CARGA Y ERRORES ──
    const [initialLoading, setInitialLoading] = useState(true);
    const [backendError, setBackendError] = useState<string | null>(null);

    // ── ESTADOS DE DATOS (Vacíos por defecto, sin info estática) ──
    const [carouselItems, setCarouselItems] = useState<CarouselItem[]>([]);
    const [promociones, setPromociones] = useState<PromocionItem[]>([]);

    const [newCarousel, setNewCarousel] = useState<Partial<CarouselItem>>({ titulo: '', descripcion: '', enlace: '', imagen: '' });
    const [newPromocion, setNewPromocion] = useState<Partial<PromocionItem>>({ titulo: '', descripcion: '', descuento: 0 });
    const [actionLoading, setActionLoading] = useState(false);

    // Ref para el input de archivo
    const carouselInputRef = useRef<HTMLInputElement>(null);

    // ── CARGAR DATOS ──
    useEffect(() => {
        const fetchInicioData = async () => {
            try {
                setBackendError(null);
                const [cRes, pRes] = await Promise.all([
                    carruselAPI.getAll(),
                    promocionesAPI.getAll()
                ]);

                const cData = Array.isArray(cRes) ? cRes : (cRes?.data || []);
                const pData = Array.isArray(pRes) ? pRes : (pRes?.data || []);

                setCarouselItems(cData);
                setPromociones(pData);
            } catch (error) {
                console.error("Falló la petición al backend:", error);
                setBackendError("No se pudo conectar con el servidor. Revisar si el backend está encendido.");
            } finally {
                setInitialLoading(false);
            }
        };
        fetchInicioData();
    }, []);

    // ── MANEJO DE IMAGEN DESDE PC → Base64 ──
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            setNewCarousel(prev => ({ ...prev, imagen: reader.result as string }));
        };
        reader.readAsDataURL(file);
    };

    const clearImage = () => {
        setNewCarousel(prev => ({ ...prev, imagen: '' }));
        if (carouselInputRef.current) carouselInputRef.current.value = '';
    };

    // ── FUNCIONES DE CARRUSEL ──
    const addCarouselItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCarousel.titulo || !newCarousel.imagen) return alert("El título y la imagen son obligatorios");
        setActionLoading(true);
        try {
            const data = {
                titulo: newCarousel.titulo,
                descripcion: newCarousel.descripcion || '',
                imagen: newCarousel.imagen,
                enlace: newCarousel.enlace || ''
            };
            const created = await carruselAPI.create(data);
            const newObj = created?.data || created;
            setCarouselItems(prev => [...(Array.isArray(prev) ? prev : []), newObj]);
            // Limpiar formulario
            setNewCarousel({ titulo: '', descripcion: '', enlace: '', imagen: '' });
            if (carouselInputRef.current) carouselInputRef.current.value = '';
        } catch (error) {
            console.error(error);
            alert("Error al guardar el carrusel en la BD");
        } finally {
            setActionLoading(false);
        }
    };

    const deleteCarouselItem = async (id: string | number) => {
        if (!window.confirm("¿Seguro que deseas eliminar este elemento del carrusel?")) return;
        try {
            await carruselAPI.delete(id);
            setCarouselItems(prev => prev.filter(item => item.id !== id));
        } catch (error) {
            console.error(error);
            alert("Error al eliminar");
        }
    };

    // ── FUNCIONES DE PROMOCIONES ──
    const addPromocion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPromocion.titulo || !newPromocion.descuento) return alert("El título y el descuento son obligatorios");
        setActionLoading(true);
        try {
            const data = {
                titulo: newPromocion.titulo,
                descripcion: newPromocion.descripcion || '',
                descuento: Number(newPromocion.descuento),
                activa: true
            };
            const created = await promocionesAPI.create(data);
            const newObj = created?.data || created;
            setPromociones(prev => [newObj, ...(Array.isArray(prev) ? prev : [])]);
            setNewPromocion({ titulo: '', descripcion: '', descuento: 0 });
        } catch (error) {
            console.error(error);
            alert("Error al crear la promoción");
        } finally {
            setActionLoading(false);
        }
    };

    const deletePromocion = async (id: string | number) => {
        if (!window.confirm("¿Seguro que deseas eliminar esta promoción?")) return;
        try {
            await promocionesAPI.delete(id);
            setPromociones(prev => prev.filter(item => item.id !== id));
        } catch (error) {
            console.error(error);
            alert("Error al eliminar");
        }
    };

    const togglePromocion = async (id: string | number, activaActual: boolean) => {
        try {
            const nuevaActiva = !activaActual;
            await promocionesAPI.toggleStatus(id, nuevaActiva);
            setPromociones(prev => prev.map(p => p.id === id ? { ...p, activa: nuevaActiva } : p));
        } catch (error) {
            console.error(error);
            alert("Error al cambiar el estado");
        }
    };

    // ── COMPONENTE REUTILIZABLE DE IMAGEN (El mismo de Noticias) ──
    const ImageField = () => (
        <div className="upload-area-lux" style={{ flexDirection: newCarousel.imagen ? 'row' : 'column', alignItems: newCarousel.imagen ? 'center' : 'stretch', padding: newCarousel.imagen ? '1rem' : '1.5rem 1rem' }}>
            {newCarousel.imagen ? (
                <>
                    <div className="preview-img-wrapper" style={{ width: '120px', height: '80px', flexShrink: 0 }}>
                        <img src={newCarousel.imagen} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                        <button type="button" className="btn-remove-img" onClick={clearImage} title="Quitar imagen">✕</button>
                    </div>
                    <div style={{ flex: 1, paddingLeft: '1rem' }}>
                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', margin: '0 0 4px 0', fontWeight: 600 }}>✓ Imagen seleccionada</p>
                        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', margin: 0 }}>Haz clic en <strong style={{ color: '#e74c3c' }}>✕</strong> para cambiarla</p>
                    </div>
                </>
            ) : (
                <div className="upload-input-container">
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', margin: '0 0 0.75rem 0', textAlign: 'center' }}>🖼️ &nbsp;JPG, PNG, WEBP — Recomendado 1400×600 px</p>
                    <input type="file" accept="image/*" ref={carouselInputRef} onChange={handleImageChange} required style={{ width: '100%' }} />
                </div>
            )}
        </div>
    );

    // ── PANTALLA DE CARGA ──
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

    return (
        <div className="content-page animate-fade-in">
            <h2 className="content-page-title">🏠 Gestionar Página de Inicio</h2>
            <p className="content-page-subtitle">Personaliza el carrusel principal y las promociones destacadas.</p>

            {/* ── DISCLAIMER DE ERROR ── */}
            {backendError && (
                <div style={{ background: 'rgba(231, 76, 60, 0.1)', border: '1px solid #e74c3c', padding: '1rem 1.5rem', borderRadius: '8px', marginBottom: '2rem', color: '#ff8a80', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <span style={{ fontSize: '1.5rem', lineHeight: '1' }}>⚠️</span>
                    <div>
                        <strong style={{ display: 'block', marginBottom: '4px', color: '#ffb3b3' }}>Aviso de conexión:</strong>
                        <span style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>{backendError}</span>
                    </div>
                </div>
            )}

            {/* ==========================================
                SECCIÓN 1: CARRUSEL
            ========================================== */}
            <div className="manager-subsection glass-panel" style={{ borderLeft: '4px solid var(--gold-lux)' }}>
                <div className="subsection-header">
                    <h3 className="subsection-title">🎠 1. Añadir al Carrusel</h3>
                </div>
                
                {/* Formulario mejorado (Estilo Noticias) */}
                <form onSubmit={addCarouselItem} className="noticia-form-lux">
                    <div className="form-group-lux full-width">
                        <label>✦ Título del Slide</label>
                        <input type="text" placeholder="Ej: Nueva Colección de Oro" value={newCarousel.titulo} onChange={e => setNewCarousel({ ...newCarousel, titulo: e.target.value })} required />
                    </div>
                    <div className="form-group-lux full-width">
                        <label>✦ Descripción Breve</label>
                        <textarea rows={2} placeholder="Piezas únicas forjadas en..." value={newCarousel.descripcion} onChange={e => setNewCarousel({ ...newCarousel, descripcion: e.target.value })} />
                    </div>
                    <div className="form-group-lux full-width">
                        <label>✦ Enlace del Botón (Opcional)</label>
                        <input type="text" placeholder="Ej: /catalogo" value={newCarousel.enlace} onChange={e => setNewCarousel({ ...newCarousel, enlace: e.target.value })} />
                    </div>
                    <div className="form-group-lux full-width">
                        <label>✦ Imagen de Fondo</label>
                        <ImageField />
                    </div>
                    <div className="form-submit-container">
                        <button type="submit" className="btn-submit-admin" disabled={actionLoading || !newCarousel.imagen}>
                            {actionLoading ? 'GUARDANDO...' : '+ PUBLICAR EN CARRUSEL'}
                        </button>
                    </div>
                </form>

                {/* Lista de Carrusel Estilizada */}
                <div className="noticias-grid" style={{ marginTop: '2rem' }}>
                    {(!carouselItems || carouselItems.length === 0) ? (
                        <div className="no-data-lux">El carrusel está vacío.</div>
                    ) : (
                        carouselItems.map(item => (
                            <div key={item.id} className="noticia-card-lux" style={{ display: 'flex', flexDirection: 'column' }}>
                                <div className="card-image-wrapper" style={{ height: '140px' }}>
                                    <img src={item.imagen} alt={item.titulo} className="noticia-image" />
                                </div>
                                <div className="card-content-lux" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                    <div>
                                        <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{item.titulo}</h4>
                                        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>{item.descripcion}</p>
                                    </div>
                                    <div className="card-actions-lux" style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                                        <button type="button" className="btn-action-lux delete" onClick={() => deleteCarouselItem(item.id)} style={{ width: '100%' }}>
                                            🗑️ Eliminar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* ==========================================
                SECCIÓN 2: PROMOCIONES
            ========================================== */}
            <div className="manager-subsection glass-panel" style={{ marginTop: '3rem' }}>
                <div className="subsection-header">
                    <h3 className="subsection-title">🎁 2. Añadir Promoción</h3>
                </div>

                {/* Formulario mejorado */}
                <form onSubmit={addPromocion} className="noticia-form-lux">
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
                        <div className="form-group-lux">
                            <label>✦ Título de la Promoción</label>
                            <input type="text" placeholder="Ej: 20% en Anillos" value={newPromocion.titulo} onChange={e => setNewPromocion({ ...newPromocion, titulo: e.target.value })} required />
                        </div>
                        <div className="form-group-lux">
                            <label>✦ % Descuento</label>
                            <input type="number" min="0" max="100" placeholder="Ej: 20" value={newPromocion.descuento || ''} onChange={e => setNewPromocion({ ...newPromocion, descuento: parseInt(e.target.value) || 0 })} required />
                        </div>
                    </div>
                    <div className="form-group-lux full-width">
                        <label>✦ Descripción</label>
                        <textarea rows={2} placeholder="Aplica en toda la tienda..." value={newPromocion.descripcion} onChange={e => setNewPromocion({ ...newPromocion, descripcion: e.target.value })} />
                    </div>
                    <div className="form-submit-container">
                        <button type="submit" className="btn-submit-admin" disabled={actionLoading}>
                            {actionLoading ? 'GUARDANDO...' : '+ PUBLICAR PROMOCIÓN'}
                        </button>
                    </div>
                </form>

                {/* Lista de Promociones */}
                <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {(!promociones || promociones.length === 0) ? (
                        <div className="no-data-lux">No hay promociones activas.</div>
                    ) : (
                        promociones.map(promo => (
                            <div key={promo.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--rose-border)' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                                        <h4 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)' }}>{promo.titulo}</h4>
                                        <span style={{ background: 'var(--rose-vivid)', color: 'white', padding: '0.2rem 0.8rem', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                            -{promo.descuento}%
                                        </span>
                                        <span className={`status-badge ${promo.activa ? 'active' : 'inactive'}`} style={{ position: 'static' }}>
                                            {promo.activa ? '● Activa' : '○ Oculta'}
                                        </span>
                                    </div>
                                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>{promo.descripcion}</p>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button type="button" className="btn-action-lux" onClick={() => togglePromocion(promo.id, promo.activa)}>
                                        {promo.activa ? '👁️ Ocultar' : '👁️‍🗨️ Mostrar'}
                                    </button>
                                    <button type="button" className="btn-action-lux delete" onClick={() => deletePromocion(promo.id)}>
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminInitoManager;