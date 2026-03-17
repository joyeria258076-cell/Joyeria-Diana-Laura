// Ruta: Frontend/src/screens/cliente/CarritoScreen.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AiOutlineDelete, AiOutlineMinus, AiOutlinePlus, AiOutlineShoppingCart, AiOutlineArrowLeft } from 'react-icons/ai';
import { useCart } from '../../contexts/CartContext';
import { carritoAPI } from '../../services/api';
import './CarritoScreen.css';

const PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzFhMWEyZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjQwIiBmaWxsPSIjZWNiMmMzIj7oo6s8L3RleHQ+PC9zdmc+';

const CarritoScreen: React.FC = () => {
    const navigate = useNavigate();
    const { items, count, total, loading, actualizarCantidad, eliminarItem, vaciarCarrito } = useCart();

    const [solicitando, setSolicitando]     = useState(false);
    const [pedidoExitoso, setPedidoExitoso] = useState(false);
    const [folioPedido, setFolioPedido]     = useState('');
    const [showCheckout, setShowCheckout]   = useState(false);
    const [direccion, setDireccion]         = useState('');
    const [notasCliente, setNotasCliente]   = useState('');
    const [errorMsg, setErrorMsg]           = useState('');

    const handleSolicitarPedido = async () => {
        if (!direccion.trim()) { setErrorMsg('La dirección de envío es obligatoria'); return; }
        setSolicitando(true);
        setErrorMsg('');
        try {
            const data = await carritoAPI.crearPedido({ direccion_envio: direccion, notas_cliente: notasCliente });
            if (!data.success) throw new Error(data.message);
            setFolioPedido(data.data.folio || `#${data.data.id}`);
            setPedidoExitoso(true);
            setShowCheckout(false);
        } catch (err: any) {
            setErrorMsg(err.message || 'Error al solicitar el pedido');
        } finally {
            setSolicitando(false);
        }
    };

    if (pedidoExitoso) {
        return (
            <main className="carrito-body">
                <div className="carrito-exito">
                    <div className="carrito-exito-icon">🎉</div>
                    <h2>¡Pedido solicitado!</h2>
                    <p>Tu pedido <strong>{folioPedido}</strong> fue recibido correctamente.</p>
                    <p className="carrito-exito-sub">
                        Un trabajador revisará tu pedido y te notificará cuando esté confirmado.
                    </p>
                    <div className="carrito-exito-acciones">
                        <button className="carrito-btn-primario" onClick={() => navigate('/pedidos')}>
                            Ver mis pedidos
                        </button>
                        <button className="carrito-btn-secundario" onClick={() => navigate('/catalogo')}>
                            Seguir comprando
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    if (!loading && items.length === 0) {
        return (
            <main className="carrito-body">
                <div className="carrito-vacio">
                    <AiOutlineShoppingCart size={80} className="carrito-vacio-icon" />
                    <h2>Tu carrito está vacío</h2>
                    <p>Agrega productos desde el catálogo para empezar.</p>
                    <button className="carrito-btn-primario" onClick={() => navigate('/catalogo')}>
                        Ir al catálogo
                    </button>
                </div>
            </main>
        );
    }

    return (
        <main className="carrito-body">

            <nav className="carrito-breadcrumb">
                <button className="carrito-back-btn" onClick={() => navigate('/catalogo')}>
                    <AiOutlineArrowLeft size={16} /> Catálogo
                </button>
                <span className="carrito-bc-sep">/</span>
                <span className="carrito-bc-current">Mi Carrito</span>
            </nav>

            <h1 className="carrito-titulo">
                Mi Carrito <span className="carrito-count-badge">{count}</span>
            </h1>

            <div className="carrito-layout">

                {/* ── Lista de items ── */}
                <section className="carrito-items">
                    {loading ? (
                        <div className="carrito-loading">
                            <div className="carrito-spinner" />
                            <p>Cargando carrito...</p>
                        </div>
                    ) : (
                        items.map(item => {
                            const precio   = parseFloat(String(item.precio_oferta || item.precio_venta));
                            const subtotal = precio * item.cantidad;
                            const hayDescuento = item.precio_oferta &&
                                parseFloat(String(item.precio_oferta)) < parseFloat(String(item.precio_venta));

                            return (
                                <div key={item.id} className="carrito-item">
                                    <div className="carrito-item-imagen">
                                        <img
                                            src={item.producto_imagen || PLACEHOLDER}
                                            alt={item.producto_nombre}
                                            onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER; }}
                                        />
                                    </div>
                                    <div className="carrito-item-info">
                                        <p className="carrito-item-categoria">{item.categoria_nombre}</p>
                                        <h3 className="carrito-item-nombre">{item.producto_nombre}</h3>
                                        {item.talla_medida && (
                                            <p className="carrito-item-detalle">
                                                Talla/Medida: <strong>{item.talla_medida}</strong>
                                            </p>
                                        )}
                                        {item.nota && (
                                            <p className="carrito-item-detalle carrito-item-nota">📝 {item.nota}</p>
                                        )}
                                        <div className="carrito-item-precios">
                                            {hayDescuento && (
                                                <span className="carrito-precio-tachado">
                                                    ${parseFloat(String(item.precio_venta)).toLocaleString('es-MX')}
                                                </span>
                                            )}
                                            <span className="carrito-precio-final">
                                                ${precio.toLocaleString('es-MX')}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="carrito-item-acciones">
                                        <div className="carrito-cantidad-ctrl">
                                            <button
                                                className="carrito-qty-btn"
                                                onClick={() => actualizarCantidad(item.id, item.cantidad - 1)}
                                                disabled={item.cantidad <= 1}
                                            >
                                                <AiOutlineMinus size={14} />
                                            </button>
                                            <span className="carrito-qty-num">{item.cantidad}</span>
                                            <button
                                                className="carrito-qty-btn"
                                                onClick={() => actualizarCantidad(item.id, item.cantidad + 1)}
                                                disabled={item.cantidad >= item.stock_actual}
                                            >
                                                <AiOutlinePlus size={14} />
                                            </button>
                                        </div>
                                        <p className="carrito-item-subtotal">
                                            ${subtotal.toLocaleString('es-MX')}
                                        </p>
                                        <button
                                            className="carrito-btn-eliminar"
                                            onClick={() => eliminarItem(item.id)}
                                            title="Eliminar"
                                        >
                                            <AiOutlineDelete size={18} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}

                    {items.length > 0 && (
                        <div className="carrito-vaciar-row">
                            <button className="carrito-btn-vaciar" onClick={vaciarCarrito}>
                                🗑️ Vaciar carrito
                            </button>
                        </div>
                    )}
                </section>

                {/* ── Resumen ── */}
                <aside className="carrito-resumen">
                    <div className="carrito-resumen-card">
                        <h3 className="carrito-resumen-titulo">Resumen del pedido</h3>
                        <div className="carrito-resumen-fila">
                            <span>Productos ({count})</span>
                            <span>${total.toLocaleString('es-MX')}</span>
                        </div>
                        <div className="carrito-resumen-fila">
                            <span>Envío</span>
                            <span className="carrito-envio-texto">Por confirmar</span>
                        </div>
                        <div className="carrito-resumen-divider" />
                        <div className="carrito-resumen-fila carrito-resumen-total">
                            <span>Total estimado</span>
                            <span>${total.toLocaleString('es-MX')}</span>
                        </div>
                        <button
                            className="carrito-btn-primario carrito-btn-checkout"
                            onClick={() => setShowCheckout(true)}
                            disabled={items.length === 0}
                        >
                            Solicitar pedido →
                        </button>
                        <p className="carrito-resumen-nota">
                            Un trabajador revisará tu pedido antes de confirmar el pago.
                        </p>
                    </div>
                </aside>
            </div>

            {/* ── Modal Checkout ── */}
            {showCheckout && (
                <div className="carrito-modal-overlay" onClick={() => setShowCheckout(false)}>
                    <div className="carrito-modal" onClick={e => e.stopPropagation()}>
                        <div className="carrito-modal-header">
                            <h2>Datos del pedido</h2>
                            <button className="carrito-modal-close" onClick={() => setShowCheckout(false)}>×</button>
                        </div>
                        <div className="carrito-modal-body">
                            <div className="carrito-form-group">
                                <label>Dirección de envío <span className="carrito-requerido">*</span></label>
                                <textarea
                                    rows={3}
                                    placeholder="Calle, número, colonia, ciudad, estado, CP"
                                    value={direccion}
                                    onChange={e => setDireccion(e.target.value)}
                                    className="carrito-textarea"
                                />
                            </div>
                            <div className="carrito-form-group">
                                <label>Notas o personalizaciones (opcional)</label>
                                <textarea
                                    rows={3}
                                    placeholder="Ej: talla del anillo 7, grabado con nombre 'Ana'..."
                                    value={notasCliente}
                                    onChange={e => setNotasCliente(e.target.value)}
                                    className="carrito-textarea"
                                />
                                <small className="carrito-form-ayuda">
                                    Incluye aquí tallas, medidas o cualquier personalización.
                                </small>
                            </div>
                            {errorMsg && <div className="carrito-error-msg">⚠️ {errorMsg}</div>}
                            <div className="carrito-modal-resumen">
                                <div className="carrito-resumen-fila">
                                    <span>Total ({count} productos)</span>
                                    <strong>${total.toLocaleString('es-MX')}</strong>
                                </div>
                                <p className="carrito-modal-nota">
                                    💳 El pago se realizará después de que el trabajador confirme tu pedido.
                                </p>
                            </div>
                        </div>
                        <div className="carrito-modal-footer">
                            <button className="carrito-btn-secundario" onClick={() => setShowCheckout(false)}>
                                Cancelar
                            </button>
                            <button
                                className="carrito-btn-primario"
                                onClick={handleSolicitarPedido}
                                disabled={solicitando}
                            >
                                {solicitando ? '⏳ Enviando...' : '✅ Confirmar pedido'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
};

export default CarritoScreen;