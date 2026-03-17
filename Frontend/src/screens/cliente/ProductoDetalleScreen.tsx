// Ruta: src/screens/cliente/ProductoDetalleScreen.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AiOutlineArrowLeft, AiOutlineMinus, AiOutlinePlus, AiOutlineShoppingCart } from 'react-icons/ai';
import { productsAPI } from '../../services/api';
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
    imagen_principal?: string;
    stock_actual: number;
    es_nuevo?: boolean;
    es_destacado?: boolean;
    dias_fabricacion?: number;
    permite_personalizacion?: boolean;
}

const PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNjAwIiBoZWlnaHQ9IjYwMCIgZmlsbD0iIzFhMWEyZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjgwIiBmaWxsPSIjZWNiMmMzIj7oo6s8L3RleHQ+PC9zdmc+';

const ProductoDetalleScreen: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [producto, setProducto] = useState<Producto | null>(null);
    const [relacionados, setRelacionados] = useState<Producto[]>([]);        // misma categoría
    const [tePodrianGustar, setTePodrianGustar] = useState<Producto[]>([]);  // otras categorías
    const [loading, setLoading] = useState(true);
    const [cantidad, setCantidad] = useState(1);
    const [agregando, setAgregando] = useState(false);
    const [exitoso, setExitoso] = useState(false);
    const [tabActiva, setTabActiva] = useState<'descripcion' | 'specs' | 'fabricacion'>('descripcion');

    const { agregarAlCarrito } = useCart();

    useEffect(() => {
        if (!id) return;
        const cargar = async () => {
            try {
                setLoading(true);
                setCantidad(1);
                setTabActiva('descripcion');
                window.scrollTo({ top: 0, behavior: 'smooth' });

                const resp = await productsAPI.getById(parseInt(id));
                const prod: Producto = resp?.data;
                if (!prod) { navigate('/catalogo'); return; }
                setProducto(prod);

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
        setAgregando(true);
        try {
            await agregarAlCarrito(producto.id, cantidad);
            setExitoso(true);
            setTimeout(() => setExitoso(false), 2500);
        } catch (err: any) {
            alert(err?.message || 'No se pudo agregar. Intenta de nuevo.');
        } finally {
            setAgregando(false);
        }
    };

    const inc = () => { if (producto && cantidad < producto.stock_actual) setCantidad(c => c + 1); };
    const dec = () => { if (cantidad > 1) setCantidad(c => c - 1); };

    const precioFinal = producto?.precio_oferta || producto?.precio_venta || 0;
    const hayDescuento = !!(producto?.precio_oferta && producto.precio_oferta < producto.precio_venta);
    const descuentoPct = hayDescuento
        ? Math.round(100 - (producto!.precio_oferta! / producto!.precio_venta) * 100)
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
                                Ahorras ${(producto.precio_venta - precioFinal).toLocaleString('es-MX')}
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
                                        <p>Esta pieza puede personalizarse con grabado, talla o material a tu elección. Contáctanos para coordinar los detalles.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </section>

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


            {/* ── SECCIÓN MAPA ── */}
            <section className="pd-mapa-section">
                <div className="pd-relacionados-header">
                    <div className="pd-rel-line" aria-hidden="true" />
                    <h2 className="pd-relacionados-titulo">Visítanos</h2>
                    <div className="pd-rel-line" aria-hidden="true" />
                </div>
                <div className="pd-mapa-layout">
                    <div className="pd-mapa-frame">
                        <iframe
                            title="Ubicación Diana Laura"
                            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3762.539571588721!2d-99.1652643!3d19.4270245!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x85d1ff35f5bd1563%3A0x6c666571936959!2sAv.%20Paseo%20de%20la%20Reforma%20456%2C%20Ju%C3%A1rez%2C%20Cuauht%C3%A9moc%2C%2006600%20Ciudad%20de%20M%C3%A9xico%2C%20CDMX!5e0!3m2!1ses-419!2smx!4v1700000000000"
                            width="100%" height="100%"
                            style={{ border: 0 }}
                            allowFullScreen loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                        />
                    </div>
                    <div className="pd-mapa-info">
                        <div className="pd-mapa-info-card pd-mapa-featured">
                            <span className="pd-mapa-gem">💎</span>
                            <h3>Diana Laura Boutique</h3>
                            <p>Tu destino de joyería exclusiva en el corazón de la ciudad.</p>
                        </div>
                        <div className="pd-mapa-info-card">
                            <span className="pd-mapa-icon">📍</span>
                            <div>
                                <h4>Dirección</h4>
                                <p>Av. de la Reforma 456, Piso 10<br />Juárez, Cuauhtémoc<br /><strong>CDMX, México</strong></p>
                            </div>
                        </div>
                        <div className="pd-mapa-info-card">
                            <span className="pd-mapa-icon">🕐</span>
                            <div>
                                <h4>Horario</h4>
                                <p>Lunes a Sábado<br /><strong>10:00 AM – 8:00 PM</strong><br />Domingos: Cerrado</p>
                            </div>
                        </div>
                        <div className="pd-mapa-info-card">
                            <span className="pd-mapa-icon">📞</span>
                            <div>
                                <h4>Contacto</h4>
                                <p><strong>+52 55 1234 5678</strong><br />info@dianalaura.com</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

        </main>
    );
};

export default ProductoDetalleScreen;