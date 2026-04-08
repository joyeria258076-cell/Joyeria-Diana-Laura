// Ruta: src/screens/publico/ProductoDetallePublicScreen.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AiOutlineArrowLeft, AiOutlineShoppingCart, AiOutlineStar, AiOutlineLock } from 'react-icons/ai';
import { productsAPI } from '../../services/api';
import PublicHeader from '../../components/PublicHeader';
import PublicFooter from '../../components/PublicFooter';
import './ProductoDetallePublicScreen.css';

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

const ProductoDetallePublicScreen: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [producto, setProducto] = useState<Producto | null>(null);
    const [relacionados, setRelacionados] = useState<Producto[]>([]);
    const [tePodrianGustar, setTePodrianGustar] = useState<Producto[]>([]);
    const [loading, setLoading] = useState(true);
    const [tabActiva, setTabActiva] = useState<'descripcion' | 'specs' | 'fabricacion'>('descripcion');
    const [showLoginAlert, setShowLoginAlert] = useState(false);

    useEffect(() => {
        if (!id) return;
        const cargar = async () => {
            try {
                setLoading(true);
                setTabActiva('descripcion');
                window.scrollTo({ top: 0, behavior: 'smooth' });

                const resp = await productsAPI.getById(Number.parseInt(id));
                const prod: Producto = resp?.data;
                if (!prod) { navigate('/catalogo-publico'); return; }
                setProducto(prod);

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

            } catch {
                navigate('/catalogo-publico');
            } finally {
                setLoading(false);
            }
        };
        cargar();
    }, [id]);

    // Cualquier acción protegida muestra el alert
    const handleAccionProtegida = () => setShowLoginAlert(true);
    const handleIrLogin = () => navigate('/login');

    const precioFinal = producto?.precio_oferta || producto?.precio_venta || 0;
    const hayDescuento = !!(producto?.precio_oferta && producto.precio_oferta < producto.precio_venta);
    const descuentoPct = hayDescuento
        ? Math.round(100 - (producto!.precio_oferta! / producto!.precio_venta) * 100)
        : 0;

    if (loading) {
        return (
            <div className="pdp-wrapper">
                <PublicHeader />
                <div className="pdp-loading">
                    <div className="pdp-loading-gem">💎</div>
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
                <img src={item.imagen_principal || PLACEHOLDER} alt={item.nombre}
                    onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER; }} />
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
                <div className="pdp-rel-line" />
                <h2 className="pdp-relacionados-titulo">{titulo}</h2>
                <div className="pdp-rel-line" />
            </div>
            <div className="pdp-relacionados-grid">
                {items.map(item => <TarjetaProducto key={item.id} item={item} />)}
            </div>
            <div className="pdp-relacionados-footer">
                <button className="pdp-btn-ver-mas" onClick={() => navigate('/catalogo-publico')}>
                    Ver catálogo completo
                </button>
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
                            <p>Inicia sesión para agregar productos al carrito, guardar favoritos y mucho más.</p>
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

                {/* ── BREADCRUMB ── */}
                <nav className="pdp-breadcrumb">
                    <button onClick={() => navigate('/catalogo-publico')} className="pdp-back-btn">
                        <AiOutlineArrowLeft size={16} />
                        Catálogo
                    </button>
                    <span className="pdp-bc-sep">/</span>
                    {producto.categoria_nombre && (
                        <>
                            <span className="pdp-bc-cat">{producto.categoria_nombre}</span>
                            <span className="pdp-bc-sep">/</span>
                        </>
                    )}
                    <span className="pdp-bc-current">{producto.nombre}</span>
                </nav>

                {/* ── SECCIÓN PRINCIPAL ── */}
                <section className="pdp-main">
                    <div className="pdp-gallery">
                        <div className="pdp-image-frame">
                            <img src={producto.imagen_principal || PLACEHOLDER} alt={producto.nombre}
                                className="pdp-image-main"
                                onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER; }} />
                            {producto.es_nuevo && <span className="pdp-badge pdp-badge-new">Nuevo</span>}
                            {hayDescuento && <span className="pdp-badge pdp-badge-sale">-{descuentoPct}%</span>}
                            {producto.stock_actual === 0 && <div className="pdp-agotado-overlay">Agotado</div>}
                        </div>
                        <div className="pdp-gallery-accent" aria-hidden="true">
                            <span>✦</span><span>✦</span><span>✦</span>
                        </div>
                    </div>

                    <div className="pdp-info">
                        <div className="pdp-meta-row">
                            {producto.categoria_nombre && <span className="pdp-categoria">{producto.categoria_nombre}</span>}
                        </div>

                        <h1 className="pdp-nombre">{producto.nombre}</h1>

                        <div className="pdp-precios">
                            {hayDescuento && (
                                <span className="pdp-precio-original">${producto.precio_venta.toLocaleString('es-MX')}</span>
                            )}
                            <span className="pdp-precio-final">${precioFinal.toLocaleString('es-MX')}</span>
                            {hayDescuento && (
                                <span className="pdp-ahorro">Ahorras ${(producto.precio_venta - precioFinal).toLocaleString('es-MX')}</span>
                            )}
                        </div>

                        <div className="pdp-stock-row">
                            <div className={`pdp-stock-dot ${producto.stock_actual > 0 ? 'disponible' : 'agotado'}`} />
                            <span className="pdp-stock-texto">
                                {producto.stock_actual === 0 ? 'Sin stock'
                                    : producto.stock_actual <= 5 ? `¡Solo ${producto.stock_actual} disponibles!`
                                    : `En stock`}
                            </span>
                        </div>

                        {/* Botones protegidos */}
                        <div className="pdp-acciones-publico">
                            <button className="pdp-btn-accion pdp-btn-carrito" onClick={handleAccionProtegida}>
                                <AiOutlineShoppingCart size={20} />
                                Agregar al carrito
                                <AiOutlineLock size={14} className="pdp-lock-icon" />
                            </button>
                            <button className="pdp-btn-accion pdp-btn-favorito" onClick={handleAccionProtegida}>
                                <AiOutlineStar size={20} />
                                Guardar favorito
                                <AiOutlineLock size={14} className="pdp-lock-icon" />
                            </button>
                        </div>

                        {/* Banner de registro */}
                        <div className="pdp-registro-banner" onClick={handleIrLogin}>
                            <span>🔐 Inicia sesión para comprar y guardar tus favoritos</span>
                            <span className="pdp-registro-link">Entrar →</span>
                        </div>

                        <div className="pdp-specs-quick">
                            {producto.material_principal && (
                                <div className="pdp-spec-item">
                                    <span className="pdp-spec-icon">⚗️</span>
                                    <div>
                                        <p className="pdp-spec-label">Material</p>
                                        <p className="pdp-spec-valor">{producto.material_principal}</p>
                                    </div>
                                </div>
                            )}
                            {producto.peso_gramos && (
                                <div className="pdp-spec-item">
                                    <span className="pdp-spec-icon">⚖️</span>
                                    <div>
                                        <p className="pdp-spec-label">Peso</p>
                                        <p className="pdp-spec-valor">{producto.peso_gramos}g</p>
                                    </div>
                                </div>
                            )}
                            {producto.dias_fabricacion != null && producto.dias_fabricacion > 0 && (
                                <div className="pdp-spec-item">
                                    <span className="pdp-spec-icon">🕐</span>
                                    <div>
                                        <p className="pdp-spec-label">Fabricación</p>
                                        <p className="pdp-spec-valor">{producto.dias_fabricacion} días</p>
                                    </div>
                                </div>
                            )}
                        </div>
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
                                        <span className="pdp-fab-icon">🕐</span>
                                        <div>
                                            <h4>Tiempo de fabricación</h4>
                                            <p>Esta joya requiere <strong>{producto.dias_fabricacion} días hábiles</strong> de fabricación artesanal.</p>
                                        </div>
                                    </div>
                                )}
                                {producto.permite_personalizacion && (
                                    <div className="pdp-fab-card">
                                        <span className="pdp-fab-icon">✏️</span>
                                        <div>
                                            <h4>Personalización disponible</h4>
                                            <p>Esta pieza puede personalizarse. <button className="pdp-link-btn" onClick={handleAccionProtegida}>Inicia sesión para solicitar personalización.</button></p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </section>

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