// Ruta: src/screens/publico/ProductoDetallePublicScreen.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    AiOutlineShoppingCart, AiOutlineStar, AiOutlineLock, AiOutlineMinus, AiOutlinePlus,
    AiOutlineLogin,
} from 'react-icons/ai';
import { productsAPI, recomendacionAPI, resenasAPI, favoritosAPI } from '../../services/api';
import { colorDeUbicacion } from '../../utils/ubicacionesEntrega';
import { useCart } from '../../contexts/CartContext';
import PublicHeader from '../../components/PublicHeader';
import PublicFooter from '../../components/PublicFooter';
import './ProductoDetallePublicScreen.css';

const estaLogueado = (): boolean => {
    try {
        const userData = localStorage.getItem('diana_laura_user');
        const sessionToken = localStorage.getItem('diana_laura_session_token');
        return !!(userData && sessionToken);
    } catch {
        return false;
    }
};

interface Producto {
    id: number;
    nombre: string;
    descripcion?: string;
    categoria_id?: number;
    categoria_nombre?: string;
    tipo_producto_nombre?: string;
    material_principal?: string;
    peso_gramos?: number;
    precio_venta: number;
    precio_oferta?: number;
    precio_promocion?: number;
    imagen_principal?: string;
    stock_actual: number;
    es_nuevo?: boolean;
    es_destacado?: boolean;
    dias_fabricacion?: number;
    permite_personalizacion?: boolean;
    precio_personalizacion?: number;
    ubicaciones_entrega?: string[];
}

interface Resena {
    id: number;
    cliente_nombre: string;
    calificacion: number;
    comentario?: string;
    fecha_creacion: string;
}

// Mismo placeholder (diamante vectorial) que usa el catálogo — evita mostrar
// una foto real "de la nada" cuando el producto no tiene imagen propia.
const PLACEHOLDER = `data:image/svg+xml;utf8,<svg width="600" height="600" xmlns="http://www.w3.org/2000/svg"><rect width="600" height="600" fill="%23141414"/><g transform="translate(300,300)" stroke="%23594936" stroke-width="1.5" fill="none" opacity="0.7"><path d="M-22,-14 L22,-14 L32,-2 L0,34 L-32,-2 Z"/><path d="M-22,-14 L0,-2 L22,-14 M-32,-2 L32,-2 M0,-2 L0,34"/></g></svg>`;
const placeholderPara = (_id: number) => PLACEHOLDER;

const ProductoDetallePublicScreen: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const logueado = estaLogueado();
    const { agregarAlCarrito } = useCart();

    const [producto, setProducto] = useState<Producto | null>(null);
    const [relacionados, setRelacionados] = useState<Producto[]>([]);
    const [tePodrianGustar, setTePodrianGustar] = useState<Producto[]>([]);
    const [similaresIA, setSimilaresIA] = useState<Producto[]>([]);
    const [loading, setLoading] = useState(true);
    const [cantidad, setCantidad] = useState(1);
    const [agregando, setAgregando] = useState(false);
    const [exitoso, setExitoso] = useState(false);
    const [tallaMedida, setTallaMedida] = useState('');
    const [notaPersonalizacion, setNotaPersonalizacion] = useState('');
    const [errorPersonalizacion, setErrorPersonalizacion] = useState('');
    const [tabActiva, setTabActiva] = useState<'descripcion' | 'specs' | 'fabricacion'>('descripcion');
    const [showLoginAlert, setShowLoginAlert] = useState(false);
    const [esFavorito, setEsFavorito] = useState(false);

    const [resenas, setResenas] = useState<Resena[]>([]);
    const [promedioResenas, setPromedioResenas] = useState(0);
    const [totalResenas, setTotalResenas] = useState(0);
    const [puedeResenar, setPuedeResenar] = useState(false);
    const [calificacionForm, setCalificacionForm] = useState(0);
    const [comentarioForm, setComentarioForm] = useState('');
    const [enviandoResena, setEnviandoResena] = useState(false);
    const [errorResena, setErrorResena] = useState('');
    const [exitoResena, setExitoResena] = useState(false);

    const cargarResenas = async (productoId: number) => {
        try {
            const resp = await resenasAPI.getByProducto(productoId);
            if (resp?.success) {
                setResenas(resp.data.resenas || []);
                setPromedioResenas(resp.data.promedio || 0);
                setTotalResenas(resp.data.total || 0);
                setPuedeResenar(!!resp.data.puedeResenar);
            }
        } catch {
            setResenas([]);
        }
    };

    useEffect(() => {
        if (!id) return;
        const cargar = async () => {
            try {
                setLoading(true);
                setCantidad(1);
                setTabActiva('descripcion');
                window.scrollTo({ top: 0, behavior: 'smooth' });

                const resp = await productsAPI.getById(Number.parseInt(id));
                const prod: Producto = resp?.data;
                if (!prod) { navigate('/catalogo-publico'); return; }
                setProducto(prod);
                cargarResenas(prod.id);

                if (logueado) {
                    try {
                        const resFav = await favoritosAPI.check(prod.id);
                        setEsFavorito(!!resFav?.favorito);
                    } catch { /* ignorar */ }
                }

                let idsExcluir = new Set<number>([prod.id]);

                if (prod.categoria_id) {
                    try {
                        const respRel = await productsAPI.getProductsByCategory(prod.categoria_id, 10);
                        const mismaCategoria: Producto[] = Array.isArray(respRel?.data) ? respRel.data : [];
                        const filtrados = mismaCategoria.filter(p => p.id !== prod.id).slice(0, 4);
                        setRelacionados(filtrados);
                        filtrados.forEach(p => idsExcluir.add(p.id));
                    } catch { setRelacionados([]); }
                }

                try {
                    const respRecientes = await productsAPI.getRecent(20);
                    const todos: Producto[] = Array.isArray(respRecientes?.data) ? respRecientes.data : [];
                    const otros = todos
                        .filter(p => !idsExcluir.has(p.id))
                        .filter(p => p.categoria_id !== prod.categoria_id)
                        .slice(0, 4);
                    if (otros.length < 4) {
                        const complemento = todos
                            .filter(p => !idsExcluir.has(p.id))
                            .filter(p => !otros.find(o => o.id === p.id))
                            .slice(0, 4 - otros.length);
                        setTePodrianGustar([...otros, ...complemento]);
                    } else {
                        setTePodrianGustar(otros);
                    }
                } catch { setTePodrianGustar([]); }

                try {
                    const recs = await recomendacionAPI.recomendar([prod.nombre]);
                    setSimilaresIA(recs.map(r => ({
                        id: r.id ?? 0,
                        nombre: r.nombre,
                        precio_venta: r.precio_venta ?? 0,
                        imagen_principal: r.imagen_url ?? undefined,
                        stock_actual: 0,
                    })));
                } catch { setSimilaresIA([]); }

            } catch {
                navigate('/catalogo-publico');
            } finally {
                setLoading(false);
            }
        };
        cargar();
    }, [id]);

    const handleIrLogin = () => navigate('/login');

    const handleAgregar = async () => {
        if (!producto) return;
        if (!logueado) { setShowLoginAlert(true); return; }
        if (producto.permite_personalizacion && !tallaMedida.trim() && !notaPersonalizacion.trim()) {
            setErrorPersonalizacion('Indica al menos la talla/medida o describe cómo quieres personalizar tu pieza.');
            return;
        }
        setErrorPersonalizacion('');
        setAgregando(true);
        try {
            await agregarAlCarrito(producto.id, cantidad, tallaMedida.trim() || undefined, notaPersonalizacion.trim() || undefined);
            setExitoso(true);
            setTallaMedida('');
            setNotaPersonalizacion('');
            setTimeout(() => setExitoso(false), 2500);
        } catch (err: any) {
            alert(err?.message || 'No se pudo agregar. Intenta de nuevo.');
        } finally {
            setAgregando(false);
        }
    };

    const handleToggleFavorito = async () => {
        if (!producto) return;
        if (!logueado) { setShowLoginAlert(true); return; }
        try {
            const res = await favoritosAPI.toggle(producto.id);
            setEsFavorito(!!res.favorito);
        } catch { /* ignorar */ }
    };

    const handleEnviarResena = async () => {
        if (!producto) return;
        if (!logueado) { setShowLoginAlert(true); return; }
        if (calificacionForm < 1) {
            setErrorResena('Selecciona una calificación de 1 a 5 estrellas.');
            return;
        }
        setErrorResena('');
        setEnviandoResena(true);
        try {
            await resenasAPI.crear(producto.id, calificacionForm, comentarioForm.trim() || undefined);
            setExitoResena(true);
            await cargarResenas(producto.id);
            setTimeout(() => setExitoResena(false), 3000);
        } catch (err: any) {
            setErrorResena(err?.message || 'No se pudo enviar tu reseña. Intenta de nuevo.');
        } finally {
            setEnviandoResena(false);
        }
    };

    const inc = () => { if (producto && cantidad < producto.stock_actual) setCantidad(c => c + 1); };
    const dec = () => { if (cantidad > 1) setCantidad(c => c - 1); };

    const precioFinal = Number(producto?.precio_promocion ?? producto?.precio_oferta ?? producto?.precio_venta ?? 0);
    const hayDescuento = precioFinal < (producto?.precio_venta ?? 0);
    const esPromocion = !!(producto?.precio_promocion);
    const descuentoPct = hayDescuento
        ? Math.round(100 - (precioFinal / producto!.precio_venta) * 100)
        : 0;

    if (loading) {
        return (
            <div className="pdp-wrapper">
                <PublicHeader />
                <div className="pdp-loading">
                    <div className="pdp-loading-spinner" />
                    <p>Cargando producto...</p>
                </div>
                <PublicFooter />
            </div>
        );
    }

    if (!producto) return null;

    const TarjetaProducto = ({ item }: { item: Producto }) => (
        <div className="pdp-rel-card" onClick={() => navigate(`/producto-publico/${item.id}`)}>
            <div className="pdp-rel-imagen">
                <img src={item.imagen_principal || placeholderPara(item.id)} alt={item.nombre}
                    onError={(e) => { (e.target as HTMLImageElement).src = placeholderPara(item.id); }} />
                <div className="pdp-rel-overlay"><span>Ver pieza →</span></div>
                {item.es_nuevo && <span className="pdp-rel-badge-new">Nuevo</span>}
                {item.precio_oferta && <span className="pdp-rel-badge-sale">Oferta</span>}
            </div>
            <div className="pdp-rel-info">
                <p className="pdp-rel-categoria">{item.categoria_nombre}</p>
                <h4 className="pdp-rel-nombre">{item.nombre}</h4>
                <div className="pdp-rel-precios">
                    {item.precio_oferta ? (
                        <>
                            <span className="pdp-rel-original">${Number(item.precio_venta).toLocaleString('es-MX')}</span>
                            <span className="pdp-rel-final">${Number(item.precio_oferta).toLocaleString('es-MX')}</span>
                        </>
                    ) : (
                        <span className="pdp-rel-final">${Number(item.precio_venta).toLocaleString('es-MX')}</span>
                    )}
                </div>
            </div>
        </div>
    );

    const SeccionProductos = ({ titulo, items }: { titulo: string; items: Producto[] }) => (
        <section className="pdp-relacionados">
            <div className="pdp-relacionados-header">
                <span className="pdp-rel-eyebrow">Más piezas para ti</span>
                <div className="pdp-relacionados-header-row">
                    <h2 className="pdp-relacionados-titulo">{titulo}</h2>
                    <button className="pdp-btn-ver-mas" onClick={() => navigate('/catalogo-publico')}>
                        Ver catálogo completo →
                    </button>
                </div>
            </div>
            <div className="pdp-relacionados-grid">
                {items.map(item => <TarjetaProducto key={item.id} item={item} />)}
            </div>
        </section>
    );

    return (
        <div className="pdp-wrapper">
            <PublicHeader />
            <main className="pdp-body">

                {/* ── ALERTA DE LOGIN ── */}
                {showLoginAlert && (
                    <div className="pdp-login-alert-overlay" onClick={() => setShowLoginAlert(false)}>
                        <div className="pdp-login-alert" onClick={e => e.stopPropagation()}>
                            <AiOutlineLock size={32} className="pdp-login-alert-icon" />
                            <h3>Crea una cuenta para continuar</h3>
                            <p>Inicia sesión para agregar productos al carrito, guardar favoritos y dejar reseñas.</p>
                            <div className="pdp-login-alert-btns">
                                <button className="pdp-btn-login" onClick={handleIrLogin}>
                                    Iniciar sesión
                                </button>
                                <button className="pdp-btn-registro" onClick={() => navigate('/registro')}>
                                    Crear cuenta
                                </button>
                            </div>
                            <button className="pdp-btn-cerrar-alert" onClick={() => setShowLoginAlert(false)}>
                                Seguir explorando
                            </button>
                        </div>
                    </div>
                )}

                {/* ── SECCIÓN PRINCIPAL ── */}
                <section className="pdp-main">
                    <div className="pdp-gallery">
                        <div className="pdp-image-frame">
                            <img src={producto.imagen_principal || placeholderPara(producto.id)} alt={producto.nombre}
                                className="pdp-image-main"
                                onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER; }} />
                            {producto.es_nuevo && <span className="pdp-badge pdp-badge-new">Nuevo</span>}
                            {hayDescuento && <span className="pdp-badge pdp-badge-sale">-{descuentoPct}%</span>}
                            {producto.stock_actual === 0 && <div className="pdp-agotado-overlay">Agotado</div>}
                            <span className="pdp-gallery-tag">Pieza Diana Laura</span>
                        </div>
                    </div>

                    <div className="pdp-info">
                        <div className="pdp-meta-row">
                            {producto.categoria_nombre && <span className="pdp-categoria">{producto.categoria_nombre}</span>}
                            {producto.tipo_producto_nombre && <span className="pdp-tipo">{producto.tipo_producto_nombre}</span>}
                        </div>

                        <h1 className="pdp-nombre">{producto.nombre}</h1>

                        <div className="pdp-precios">
                            {hayDescuento && (
                                <span className="pdp-precio-original">${producto.precio_venta.toLocaleString('es-MX')}</span>
                            )}
                            <span className="pdp-precio-final">${precioFinal.toLocaleString('es-MX')}</span>
                            {hayDescuento && (
                                <span className="pdp-ahorro">
                                    {esPromocion ? 'Promoción — ' : ''}Ahorras ${(producto.precio_venta - precioFinal).toLocaleString('es-MX')} ({descuentoPct}% off)
                                </span>
                            )}
                        </div>

                        <div className="pdp-stock-row">
                            <div className={`pdp-stock-dot ${producto.stock_actual > 0 ? 'disponible' : 'agotado'}`} />
                            <span className="pdp-stock-texto">
                                {producto.stock_actual === 0 ? 'Sin stock'
                                    : producto.stock_actual <= 5 ? `¡Solo ${producto.stock_actual} disponibles!`
                                    : `En stock (${producto.stock_actual} unidades)`}
                            </span>
                        </div>

                        {producto.stock_actual > 0 && producto.permite_personalizacion && (
                            <div className="pdp-personalizacion-form">
                                <p className="pdp-personalizacion-titulo">Personaliza tu pieza</p>
                                {!!producto.precio_personalizacion && (
                                    <p className="pdp-personalizacion-cargo">
                                        + ${Number(producto.precio_personalizacion).toLocaleString('es-MX')} por personalización
                                    </p>
                                )}
                                <div className="pdp-personalizacion-campo">
                                    <label>Talla / medida</label>
                                    <input
                                        type="text"
                                        value={tallaMedida}
                                        onChange={e => { setTallaMedida(e.target.value); setErrorPersonalizacion(''); }}
                                        placeholder="Ej. Talla de anillo 7, 45cm de cadena..."
                                        maxLength={80}
                                    />
                                </div>
                                <div className="pdp-personalizacion-campo">
                                    <label>Grabado / instrucciones (opcional)</label>
                                    <textarea
                                        value={notaPersonalizacion}
                                        onChange={e => { setNotaPersonalizacion(e.target.value); setErrorPersonalizacion(''); }}
                                        placeholder="Ej. Grabado con el nombre 'Ana', en oro rosa..."
                                        rows={3}
                                        maxLength={300}
                                    />
                                </div>
                                {errorPersonalizacion && <p className="pdp-personalizacion-error">{errorPersonalizacion}</p>}
                            </div>
                        )}

                        {producto.stock_actual > 0 && (
                            <div className="pdp-compra-section">
                                <div className="pdp-cantidad-wrap">
                                    <label className="pdp-cantidad-label">Cantidad</label>
                                    <div className="pdp-cantidad-ctrl">
                                        <button className="pdp-qty-btn" onClick={dec} disabled={cantidad === 1}>
                                            <AiOutlineMinus size={14} />
                                        </button>
                                        <span className="pdp-qty-num">{cantidad}</span>
                                        <button className="pdp-qty-btn" onClick={inc} disabled={cantidad >= producto.stock_actual}>
                                            <AiOutlinePlus size={14} />
                                        </button>
                                    </div>
                                </div>
                                <div className="pdp-acciones-publico">
                                    <button
                                        className={`pdp-btn-accion pdp-btn-carrito ${exitoso ? 'success' : ''}`}
                                        onClick={handleAgregar}
                                        disabled={agregando}
                                    >
                                        <AiOutlineShoppingCart size={20} />
                                        {agregando ? 'Agregando...' : exitoso ? 'Agregado' : 'Agregar al carrito'}
                                        {!logueado && <AiOutlineLock size={14} className="pdp-lock-icon" />}
                                    </button>
                                    <button
                                        className={`pdp-btn-accion pdp-btn-favorito ${esFavorito ? 'active' : ''}`}
                                        onClick={handleToggleFavorito}
                                    >
                                        <AiOutlineStar size={20} />
                                        {esFavorito ? 'En favoritos' : 'Guardar favorito'}
                                        {!logueado && <AiOutlineLock size={14} className="pdp-lock-icon" />}
                                    </button>
                                </div>
                            </div>
                        )}

                        {producto.stock_actual === 0 && (
                            <button className="pdp-btn-agotado" disabled>Producto agotado</button>
                        )}

                        {!logueado && (
                            <div className="pdp-registro-banner" onClick={handleIrLogin}>
                                <AiOutlineLogin size={16} />
                                <span>Inicia sesión para comprar y guardar tus favoritos</span>
                                <span className="pdp-registro-link">Entrar →</span>
                            </div>
                        )}

                        <div className="pdp-specs-quick">
                            {producto.material_principal && (
                                <div className="pdp-spec-item">
                                    <div>
                                        <p className="pdp-spec-label">Material</p>
                                        <p className="pdp-spec-valor">{producto.material_principal}</p>
                                    </div>
                                </div>
                            )}
                            {producto.peso_gramos && (
                                <div className="pdp-spec-item">
                                    <div>
                                        <p className="pdp-spec-label">Peso</p>
                                        <p className="pdp-spec-valor">{producto.peso_gramos}g</p>
                                    </div>
                                </div>
                            )}
                            {producto.dias_fabricacion != null && producto.dias_fabricacion > 0 && (
                                <div className="pdp-spec-item">
                                    <div>
                                        <p className="pdp-spec-label">Fabricación</p>
                                        <p className="pdp-spec-valor">{producto.dias_fabricacion} días</p>
                                    </div>
                                </div>
                            )}
                            {producto.permite_personalizacion && (
                                <div className="pdp-spec-item">
                                    <div>
                                        <p className="pdp-spec-label">Personalización</p>
                                        <p className="pdp-spec-valor">Disponible</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {!!producto.ubicaciones_entrega?.length && (
                            <div className="pdp-ubicaciones-entrega">
                                <p className="pdp-ubicaciones-titulo">Lugares de entrega</p>
                                <div className="pdp-ubicaciones-lista">
                                    {producto.ubicaciones_entrega.map(u => (
                                        <button
                                            key={u}
                                            type="button"
                                            className="pdp-ubicacion-boton"
                                            style={{ background: colorDeUbicacion(u), boxShadow: `0 4px 14px ${colorDeUbicacion(u)}55` }}
                                        >
                                            {u}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* ── TABS ── */}
                <section className="pdp-tabs-section">
                    <div className="pdp-tabs-nav">
                        <button className={`pdp-tab ${tabActiva === 'descripcion' ? 'active' : ''}`} onClick={() => setTabActiva('descripcion')}>Descripción</button>
                        <button className={`pdp-tab ${tabActiva === 'specs' ? 'active' : ''}`} onClick={() => setTabActiva('specs')}>Especificaciones</button>
                        {(producto.dias_fabricacion! > 0 || producto.permite_personalizacion) && (
                            <button className={`pdp-tab ${tabActiva === 'fabricacion' ? 'active' : ''}`} onClick={() => setTabActiva('fabricacion')}>Fabricación</button>
                        )}
                    </div>
                    <div className="pdp-tab-content">
                        {tabActiva === 'descripcion' && (
                            <div className="pdp-tab-pane">
                                {producto.descripcion
                                    ? <p className="pdp-descripcion-texto">{producto.descripcion}</p>
                                    : <p className="pdp-descripcion-vacia">Esta joya habla por sí sola. Contáctanos para más información.</p>
                                }
                            </div>
                        )}
                        {tabActiva === 'specs' && (
                            <div className="pdp-tab-pane">
                                <table className="pdp-specs-table">
                                    <tbody>
                                        {producto.categoria_nombre && <tr><td>Categoría</td><td>{producto.categoria_nombre}</td></tr>}
                                        {producto.tipo_producto_nombre && <tr><td>Tipo</td><td>{producto.tipo_producto_nombre}</td></tr>}
                                        {producto.material_principal && <tr><td>Material</td><td>{producto.material_principal}</td></tr>}
                                        {producto.peso_gramos && <tr><td>Peso</td><td>{producto.peso_gramos} gramos</td></tr>}
                                        <tr>
                                            <td>Disponibilidad</td>
                                            <td className={producto.stock_actual > 0 ? 'spec-ok' : 'spec-no'}>
                                                {producto.stock_actual > 0 ? 'En stock' : 'Agotado'}
                                            </td>
                                        </tr>
                                        {producto.es_nuevo && <tr><td>Colección</td><td>Nueva temporada</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {tabActiva === 'fabricacion' && (
                            <div className="pdp-tab-pane pdp-fabricacion">
                                {producto.dias_fabricacion! > 0 && (
                                    <div className="pdp-fab-card">
                                        <div>
                                            <h4>Tiempo de fabricación</h4>
                                            <p>Esta joya requiere <strong>{producto.dias_fabricacion} días hábiles</strong> de fabricación artesanal desde que se confirma tu pedido.</p>
                                        </div>
                                    </div>
                                )}
                                {producto.permite_personalizacion && (
                                    <div className="pdp-fab-card">
                                        <div>
                                            <h4>Personalización disponible</h4>
                                            <p>Esta pieza puede personalizarse con grabado, talla o material a tu elección. Indica los detalles en el formulario de personalización antes de agregarla al carrito.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </section>

                {/* ── OPINIONES Y RESEÑAS ── */}
                <section className="pdp-resenas-section">
                    <div className="pdp-resenas-header">
                        <h2 className="pdp-resenas-titulo">Opiniones y reseñas</h2>
                        {totalResenas > 0 ? (
                            <div className="pdp-resenas-resumen">
                                <span className="pdp-resenas-estrellas-grandes">
                                    {[1, 2, 3, 4, 5].map(n => (
                                        <span key={n} className={n <= Math.round(promedioResenas) ? 'estrella-llena' : 'estrella-vacia'}>★</span>
                                    ))}
                                </span>
                                <span className="pdp-resenas-promedio">{promedioResenas.toFixed(1)}</span>
                                <span className="pdp-resenas-total">({totalResenas} {totalResenas === 1 ? 'reseña' : 'reseñas'})</span>
                            </div>
                        ) : (
                            <p className="pdp-resenas-vacio">Este producto aún no tiene reseñas.</p>
                        )}
                    </div>

                    {puedeResenar && (
                        <div className="pdp-resena-form">
                            <p className="pdp-resena-form-titulo">Escribe tu opinión</p>
                            <div className="pdp-resena-estrellas-input">
                                {[1, 2, 3, 4, 5].map(n => (
                                    <button
                                        key={n}
                                        type="button"
                                        className={n <= calificacionForm ? 'estrella-llena' : 'estrella-vacia'}
                                        onClick={() => { setCalificacionForm(n); setErrorResena(''); }}
                                        aria-label={`${n} estrellas`}
                                    >★</button>
                                ))}
                            </div>
                            <textarea
                                className="pdp-resena-textarea"
                                value={comentarioForm}
                                onChange={e => setComentarioForm(e.target.value)}
                                placeholder="Cuéntanos qué te pareció esta joya... (opcional)"
                                rows={3}
                                maxLength={500}
                            />
                            {errorResena && <p className="pdp-resena-error">{errorResena}</p>}
                            {exitoResena && <p className="pdp-resena-exito">¡Gracias por tu opinión!</p>}
                            <button className="pdp-resena-btn-enviar" onClick={handleEnviarResena} disabled={enviandoResena}>
                                {enviandoResena ? 'Enviando...' : 'Publicar reseña'}
                            </button>
                        </div>
                    )}

                    {!puedeResenar && !logueado && (
                        <p className="pdp-resenas-aviso">
                            <button className="pdp-link-btn" onClick={handleIrLogin}>Inicia sesión</button> para dejar tu opinión sobre este producto.
                        </p>
                    )}

                    {resenas.length > 0 && (
                        <div className="pdp-resenas-lista">
                            {resenas.map(r => (
                                <div key={r.id} className="pdp-resena-item">
                                    <div className="pdp-resena-item-header">
                                        <span className="pdp-resena-item-nombre">{r.cliente_nombre}</span>
                                        <span className="pdp-resena-item-estrellas">
                                            {[1, 2, 3, 4, 5].map(n => (
                                                <span key={n} className={n <= r.calificacion ? 'estrella-llena' : 'estrella-vacia'}>★</span>
                                            ))}
                                        </span>
                                    </div>
                                    {r.comentario && <p className="pdp-resena-item-comentario">{r.comentario}</p>}
                                    <p className="pdp-resena-item-fecha">{new Date(r.fecha_creacion).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {similaresIA.length > 0 && (
                    <SeccionProductos titulo="Productos similares que te pueden interesar" items={similaresIA} />
                )}
                {relacionados.length > 0 && (
                    <SeccionProductos titulo={`Más en ${producto.categoria_nombre || 'esta categoría'}`} items={relacionados} />
                )}
                {tePodrianGustar.length > 0 && (
                    <SeccionProductos titulo="También te podría gustar" items={tePodrianGustar} />
                )}

            </main>
            <PublicFooter />
        </div>
    );
};

export default ProductoDetallePublicScreen;
