// Ruta: src/screens/cliente/ProductoDetalleScreen.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AiOutlineArrowLeft, AiOutlineMinus, AiOutlinePlus, AiOutlineShoppingCart } from 'react-icons/ai';
import { productsAPI, recomendacionAPI, resenasAPI } from '../../services/api';
import { colorDeUbicacion } from '../../utils/ubicacionesEntrega';
import { useCart } from '../../contexts/CartContext';
import './ProductoDetalleScreen.css';

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

const PLACEHOLDER = `data:image/svg+xml;utf8,<svg width="600" height="600" xmlns="http://www.w3.org/2000/svg"><rect width="600" height="600" fill="%230d0d0d"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="24" fill="%23ecb2c3" font-family="Arial">Joya Diana Laura</text></svg>`;
const ProductoDetalleScreen: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [producto, setProducto] = useState<Producto | null>(null);
    const [relacionados, setRelacionados] = useState<Producto[]>([]);        // misma categoría
    const [tePodrianGustar, setTePodrianGustar] = useState<Producto[]>([]);  // otras categorías
    const [similaresIA, setSimilaresIA] = useState<Producto[]>([]);         // Content-Based Filtering (coseno)
    const [loading, setLoading] = useState(true);
    const [cantidad, setCantidad] = useState(1);
    const [agregando, setAgregando] = useState(false);
    const [exitoso, setExitoso] = useState(false);
    const [tallaMedida, setTallaMedida] = useState('');
    const [notaPersonalizacion, setNotaPersonalizacion] = useState('');
    const [errorPersonalizacion, setErrorPersonalizacion] = useState('');
    const [tabActiva, setTabActiva] = useState<'descripcion' | 'specs' | 'fabricacion'>('descripcion');

    const [resenas, setResenas] = useState<Resena[]>([]);
    const [promedioResenas, setPromedioResenas] = useState(0);
    const [totalResenas, setTotalResenas] = useState(0);
    const [puedeResenar, setPuedeResenar] = useState(false);
    const [calificacionForm, setCalificacionForm] = useState(0);
    const [comentarioForm, setComentarioForm] = useState('');
    const [enviandoResena, setEnviandoResena] = useState(false);
    const [errorResena, setErrorResena] = useState('');
    const [exitoResena, setExitoResena] = useState(false);

    const { agregarAlCarrito } = useCart();

    const cargarResenas = async (productoId: number) => {
        try {
            const resp = await resenasAPI.getByProducto(productoId);
            if (resp?.success) {
                setResenas(resp.data.resenas || []);
                setPromedioResenas(resp.data.promedio || 0);
                setTotalResenas(resp.data.total || 0);
                setPuedeResenar(!!resp.data.puedeResenar);
                if (resp.data.miResena) {
                    setCalificacionForm(resp.data.miResena.calificacion);
                    setComentarioForm(resp.data.miResena.comentario || '');
                }
            }
        } catch {
            setResenas([]);
        }
    };

    const handleEnviarResena = async () => {
        if (!producto || calificacionForm < 1) {
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
                if (!prod) { navigate('/catalogo'); return; }
                setProducto(prod);

                setCalificacionForm(0);
                setComentarioForm('');
                cargarResenas(prod.id);

                // ── 1. Productos de la misma categoría ──────────────────────
                let idsExcluir = new Set<number>([prod.id]);
                if (prod.categoria_id) {
                    try {
                        const respRel = await productsAPI.getProductsByCategory(prod.categoria_id, 10);
                        const mismaCategoria: Producto[] = Array.isArray(respRel?.data) ? respRel.data : [];
                        const filtrados = mismaCategoria.filter(p => p.id !== prod.id).slice(0, 4);
                        setRelacionados(filtrados);
                        filtrados.forEach(p => idsExcluir.add(p.id));
                    } catch {
                        setRelacionados([]);
                    }
                }

                // ── 2. "También te podría gustar" — productos de OTRAS categorías ──
                try {
                    const respRecientes = await productsAPI.getRecent(20);
                    const todos: Producto[] = Array.isArray(respRecientes?.data) ? respRecientes.data : [];
                    // Excluir el producto actual, los ya mostrados como relacionados
                    // y si es posible, de diferente categoría
                    const otrosProductos = todos
                        .filter(p => !idsExcluir.has(p.id))
                        .filter(p => p.categoria_id !== prod.categoria_id) // preferir otra categoría
                        .slice(0, 4);

                    // Si no hay suficientes de otra categoría, completar con cualquier otro
                    if (otrosProductos.length < 4) {
                        const complemento = todos
                            .filter(p => !idsExcluir.has(p.id))
                            .filter(p => !otrosProductos.find(o => o.id === p.id))
                            .slice(0, 4 - otrosProductos.length);
                        setTePodrianGustar([...otrosProductos, ...complemento]);
                    } else {
                        setTePodrianGustar(otrosProductos);
                    }
                } catch {
                    setTePodrianGustar([]);
                }

                // ── 3. Similares por Content-Based Filtering (similitud coseno) ──
                try {
                    const recs = await recomendacionAPI.recomendar([prod.nombre]);
                    setSimilaresIA(recs.map(r => ({
                        id: r.id ?? 0,
                        nombre: r.nombre,
                        precio_venta: r.precio_venta ?? 0,
                        imagen_principal: r.imagen_url ?? undefined,
                        stock_actual: 0,
                    })));
                } catch {
                    setSimilaresIA([]);
                }

            } catch (err) {
                console.error('Error cargando producto:', err);
                setProducto(null);
                navigate('/catalogo');
            } finally {
                setLoading(false);
            }
        };
        cargar();
    }, [id]);

    const handleAgregar = async () => {
        if (!producto) return;
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
            <div className="pd-loading">
                <div className="pd-loading-gem">💎</div>
                <p>Cargando producto...</p>
            </div>
        );
    }

    if (!producto) return null;

    // ── Componente de tarjeta reutilizable ───────────────────────────────────
    const TarjetaProducto = ({ item }: { item: Producto }) => (
        <div className="pd-rel-card" onClick={() => navigate(`/producto/${item.id}`)}>
            <div className="pd-rel-imagen">
                <img
                    src={item.imagen_principal || PLACEHOLDER}
                    alt={item.nombre}
                    onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER; }}
                />
                {item.es_nuevo && <span className="pd-rel-badge-new">Nuevo</span>}
                {item.precio_oferta && <span className="pd-rel-badge-sale">Oferta</span>}
            </div>
            <div className="pd-rel-info">
                <p className="pd-rel-categoria">{item.categoria_nombre}</p>
                <h4 className="pd-rel-nombre">{item.nombre}</h4>
                <div className="pd-rel-precios">
                    {item.precio_oferta ? (
                        <>
                            <span className="pd-rel-original">${Number(item.precio_venta).toLocaleString('es-MX')}</span>
                            <span className="pd-rel-final">${Number(item.precio_oferta).toLocaleString('es-MX')}</span>
                        </>
                    ) : (
                        <span className="pd-rel-final">${Number(item.precio_venta).toLocaleString('es-MX')}</span>
                    )}
                </div>
            </div>
        </div>
    );

    // ── Componente de sección de productos ───────────────────────────────────
    const SeccionProductos = ({ titulo, items }: { titulo: string; items: Producto[] }) => (
        <section className="pd-relacionados">
            <div className="pd-relacionados-header">
                <div className="pd-rel-line" aria-hidden="true" />
                <h2 className="pd-relacionados-titulo">{titulo}</h2>
                <div className="pd-rel-line" aria-hidden="true" />
            </div>
            <div className="pd-relacionados-grid">
                {items.map(item => <TarjetaProducto key={item.id} item={item} />)}
            </div>
            <div className="pd-relacionados-footer">
                <button className="pd-btn-ver-mas" onClick={() => navigate('/catalogo')}>
                    Ver catálogo completo
                </button>
            </div>
        </section>
    );

    return (
        <main className="pd-body">

            {/* ── BREADCRUMB ── */}
            <nav className="pd-breadcrumb">
                <button onClick={() => navigate('/catalogo')} className="pd-back-btn">
                    <AiOutlineArrowLeft size={16} />
                    Catálogo
                </button>
                <span className="pd-bc-sep">/</span>
                {producto.categoria_nombre && (
                    <>
                        <span className="pd-bc-cat">{producto.categoria_nombre}</span>
                        <span className="pd-bc-sep">/</span>
                    </>
                )}
                <span className="pd-bc-current">{producto.nombre}</span>
            </nav>

            {/* ── SECCIÓN PRINCIPAL ── */}
            <section className="pd-main">

                {/* GALERÍA */}
                <div className="pd-gallery">
                    <div className="pd-image-frame">
                        <img
                            src={producto.imagen_principal || PLACEHOLDER}
                            alt={producto.nombre}
                            className="pd-image-main"
                            onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER; }}
                        />
                        {producto.es_nuevo && <span className="pd-badge pd-badge-new">Nuevo</span>}
                        {hayDescuento && <span className="pd-badge pd-badge-sale">-{descuentoPct}%</span>}
                        {producto.stock_actual === 0 && (
                            <div className="pd-agotado-overlay">Agotado</div>
                        )}
                    </div>
                    <div className="pd-gallery-accent" aria-hidden="true">
                        <span>✦</span><span>✦</span><span>✦</span>
                    </div>
                </div>

                {/* INFO */}
                <div className="pd-info">
                    <div className="pd-meta-row">
                        {producto.categoria_nombre && (
                            <span className="pd-categoria">{producto.categoria_nombre}</span>
                        )}
                        {producto.tipo_producto_nombre && (
                            <span className="pd-tipo">{producto.tipo_producto_nombre}</span>
                        )}
                    </div>

                    <h1 className="pd-nombre">{producto.nombre}</h1>

                    <div className="pd-precios">
                        {hayDescuento && (
                            <span className="pd-precio-original">
                                ${producto.precio_venta.toLocaleString('es-MX')}
                            </span>
                        )}
                        <span className="pd-precio-final">
                            ${precioFinal.toLocaleString('es-MX')}
                        </span>
                        {hayDescuento && (
                            <span className="pd-ahorro">
                                {esPromocion ? '🏷️ Promoción — ' : ''}Ahorras ${(producto.precio_venta - precioFinal).toLocaleString('es-MX')} ({descuentoPct}% off)
                            </span>
                        )}
                    </div>

                    <div className="pd-stock-row">
                        <div className={`pd-stock-dot ${producto.stock_actual > 0 ? 'disponible' : 'agotado'}`} />
                        <span className="pd-stock-texto">
                            {producto.stock_actual === 0
                                ? 'Sin stock'
                                : producto.stock_actual <= 5
                                    ? `¡Solo ${producto.stock_actual} disponibles!`
                                    : `En stock (${producto.stock_actual} unidades)`}
                        </span>
                    </div>

                    {!!producto.ubicaciones_entrega?.length && (
                        <div className="pd-ubicaciones-entrega">
                            <p className="pd-ubicaciones-titulo">📍 Lugares de entrega</p>
                            <div className="pd-ubicaciones-lista">
                                {producto.ubicaciones_entrega.map(u => (
                                    <span key={u} className="pd-ubicacion-chip" style={{ background: colorDeUbicacion(u) }}>
                                        {u}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {producto.stock_actual > 0 && producto.permite_personalizacion && (
                        <div className="pd-personalizacion-form">
                            <p className="pd-personalizacion-titulo">✏️ Personaliza tu pieza</p>
                            {!!producto.precio_personalizacion && (
                                <p className="pd-personalizacion-cargo">
                                    + ${Number(producto.precio_personalizacion).toLocaleString('es-MX')} por personalización
                                </p>
                            )}
                            <div className="pd-personalizacion-campo">
                                <label>Talla / medida</label>
                                <input
                                    type="text"
                                    value={tallaMedida}
                                    onChange={e => { setTallaMedida(e.target.value); setErrorPersonalizacion(''); }}
                                    placeholder="Ej. Talla de anillo 7, 45cm de cadena..."
                                    maxLength={80}
                                />
                            </div>
                            <div className="pd-personalizacion-campo">
                                <label>Grabado / instrucciones (opcional)</label>
                                <textarea
                                    value={notaPersonalizacion}
                                    onChange={e => { setNotaPersonalizacion(e.target.value); setErrorPersonalizacion(''); }}
                                    placeholder="Ej. Grabado con el nombre 'Ana', en oro rosa..."
                                    rows={3}
                                    maxLength={300}
                                />
                            </div>
                            {errorPersonalizacion && <p className="pd-personalizacion-error">{errorPersonalizacion}</p>}
                        </div>
                    )}

                    {producto.stock_actual > 0 && (
                        <div className="pd-compra-section">
                            <div className="pd-cantidad-wrap">
                                <label className="pd-cantidad-label">Cantidad</label>
                                <div className="pd-cantidad-ctrl">
                                    <button className="pd-qty-btn" onClick={dec} disabled={cantidad === 1}>
                                        <AiOutlineMinus size={14} />
                                    </button>
                                    <span className="pd-qty-num">{cantidad}</span>
                                    <button className="pd-qty-btn" onClick={inc} disabled={cantidad >= producto.stock_actual}>
                                        <AiOutlinePlus size={14} />
                                    </button>
                                </div>
                            </div>
                            <button
                                className={`pd-btn-carrito ${exitoso ? 'success' : ''}`}
                                onClick={handleAgregar}
                                disabled={agregando}
                            >
                                <AiOutlineShoppingCart size={20} />
                                {agregando ? 'Agregando...' : exitoso ? '¡Agregado! ✓' : 'Agregar al carrito'}
                            </button>
                        </div>
                    )}

                    {producto.stock_actual === 0 && (
                        <button className="pd-btn-agotado" disabled>Producto agotado</button>
                    )}

                    <div className="pd-specs-quick">
                        {producto.material_principal && (
                            <div className="pd-spec-item">
                                <span className="pd-spec-icon">⚗️</span>
                                <div>
                                    <p className="pd-spec-label">Material</p>
                                    <p className="pd-spec-valor">{producto.material_principal}</p>
                                </div>
                            </div>
                        )}
                        {producto.peso_gramos && (
                            <div className="pd-spec-item">
                                <span className="pd-spec-icon">⚖️</span>
                                <div>
                                    <p className="pd-spec-label">Peso</p>
                                    <p className="pd-spec-valor">{producto.peso_gramos}g</p>
                                </div>
                            </div>
                        )}
                        {producto.dias_fabricacion != null && producto.dias_fabricacion > 0 && (
                            <div className="pd-spec-item">
                                <span className="pd-spec-icon">🕐</span>
                                <div>
                                    <p className="pd-spec-label">Fabricación</p>
                                    <p className="pd-spec-valor">{producto.dias_fabricacion} días</p>
                                </div>
                            </div>
                        )}
                        {producto.permite_personalizacion && (
                            <div className="pd-spec-item">
                                <span className="pd-spec-icon">✏️</span>
                                <div>
                                    <p className="pd-spec-label">Personalización</p>
                                    <p className="pd-spec-valor">Disponible</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* ── TABS ── */}
            <section className="pd-tabs-section">
                <div className="pd-tabs-nav">
                    <button className={`pd-tab ${tabActiva === 'descripcion' ? 'active' : ''}`} onClick={() => setTabActiva('descripcion')}>
                        Descripción
                    </button>
                    <button className={`pd-tab ${tabActiva === 'specs' ? 'active' : ''}`} onClick={() => setTabActiva('specs')}>
                        Especificaciones
                    </button>
                    {(producto.dias_fabricacion! > 0 || producto.permite_personalizacion) && (
                        <button className={`pd-tab ${tabActiva === 'fabricacion' ? 'active' : ''}`} onClick={() => setTabActiva('fabricacion')}>
                            Fabricación
                        </button>
                    )}
                </div>

                <div className="pd-tab-content">
                    {tabActiva === 'descripcion' && (
                        <div className="pd-tab-pane">
                            {producto.descripcion
                                ? <p className="pd-descripcion-texto">{producto.descripcion}</p>
                                : <p className="pd-descripcion-vacia">Esta joya habla por sí sola. Contáctanos para más información.</p>
                            }
                        </div>
                    )}
                    {tabActiva === 'specs' && (
                        <div className="pd-tab-pane">
                            <table className="pd-specs-table">
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
                        <div className="pd-tab-pane pd-fabricacion">
                            {producto.dias_fabricacion! > 0 && (
                                <div className="pd-fab-card">
                                    <span className="pd-fab-icon">🕐</span>
                                    <div>
                                        <h4>Tiempo de fabricación</h4>
                                        <p>Esta joya requiere <strong>{producto.dias_fabricacion} días hábiles</strong> de fabricación artesanal desde que se confirma tu pedido.</p>
                                    </div>
                                </div>
                            )}
                            {producto.permite_personalizacion && (
                                <div className="pd-fab-card">
                                    <span className="pd-fab-icon">✏️</span>
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
            <section className="pd-resenas-section">
                <div className="pd-resenas-header">
                    <h2 className="pd-resenas-titulo">💬 Opiniones y reseñas</h2>
                    {totalResenas > 0 ? (
                        <div className="pd-resenas-resumen">
                            <span className="pd-resenas-estrellas-grandes">
                                {[1, 2, 3, 4, 5].map(n => (
                                    <span key={n} className={n <= Math.round(promedioResenas) ? 'estrella-llena' : 'estrella-vacia'}>★</span>
                                ))}
                            </span>
                            <span className="pd-resenas-promedio">{promedioResenas.toFixed(1)}</span>
                            <span className="pd-resenas-total">({totalResenas} {totalResenas === 1 ? 'reseña' : 'reseñas'})</span>
                        </div>
                    ) : (
                        <p className="pd-resenas-vacio">Este producto aún no tiene reseñas.</p>
                    )}
                </div>

                {puedeResenar && (
                    <div className="pd-resena-form">
                        <p className="pd-resena-form-titulo">✏️ Escribe tu opinión</p>
                        <div className="pd-resena-estrellas-input">
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
                            className="pd-resena-textarea"
                            value={comentarioForm}
                            onChange={e => setComentarioForm(e.target.value)}
                            placeholder="Cuéntanos qué te pareció esta joya... (opcional)"
                            rows={3}
                            maxLength={500}
                        />
                        {errorResena && <p className="pd-resena-error">{errorResena}</p>}
                        {exitoResena && <p className="pd-resena-exito">✓ ¡Gracias por tu opinión!</p>}
                        <button className="pd-resena-btn-enviar" onClick={handleEnviarResena} disabled={enviandoResena}>
                            {enviandoResena ? 'Enviando...' : 'Publicar reseña'}
                        </button>
                    </div>
                )}

                {!puedeResenar && (
                    <p className="pd-resenas-aviso">
                        ⓘ Solo los clientes que ya recibieron este producto pueden dejar una reseña.
                    </p>
                )}

                {resenas.length > 0 && (
                    <div className="pd-resenas-lista">
                        {resenas.map(r => (
                            <div key={r.id} className="pd-resena-item">
                                <div className="pd-resena-item-header">
                                    <span className="pd-resena-item-nombre">{r.cliente_nombre}</span>
                                    <span className="pd-resena-item-estrellas">
                                        {[1, 2, 3, 4, 5].map(n => (
                                            <span key={n} className={n <= r.calificacion ? 'estrella-llena' : 'estrella-vacia'}>★</span>
                                        ))}
                                    </span>
                                </div>
                                {r.comentario && <p className="pd-resena-item-comentario">{r.comentario}</p>}
                                <p className="pd-resena-item-fecha">{new Date(r.fecha_creacion).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* ── SIMILARES POR CONTENT-BASED FILTERING (similitud coseno) ── */}
            {similaresIA.length > 0 && (
                <SeccionProductos
                    titulo="✨ Productos similares que te pueden interesar"
                    items={similaresIA}
                />
            )}

            {/* ── PRODUCTOS DE LA MISMA CATEGORÍA ── */}
            {relacionados.length > 0 && (
                <SeccionProductos
                    titulo={`Más en ${producto.categoria_nombre || 'esta categoría'}`}
                    items={relacionados}
                />
            )}

            {/* ── TAMBIÉN TE PODRÍA GUSTAR (otras categorías) ── */}
            {tePodrianGustar.length > 0 && (
                <SeccionProductos
                    titulo="También te podría gustar"
                    items={tePodrianGustar}
                />
            )}
        </main>
    );
};

export default ProductoDetalleScreen;