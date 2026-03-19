// Ruta: Frontend/src/screens/cliente/ClientePedidosScreen.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { carritoAPI } from '../../services/api';
import './ClientePedidosScreen.css';

interface ItemPedido {
    id: number;
    producto_nombre: string;
    producto_imagen?: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
    talla_medida?: string;
    nota?: string;
}

interface Pedido {
    id: number;
    folio: string;
    estado: string;
    estado_pago: string;
    total: number;
    subtotal: number;
    iva: number;
    direccion_entrega?: string;
    notas_cliente?: string;
    notas_internas?: string;
    trabajador_nombre?: string;
    fecha_creacion: string;
    fecha_confirmacion?: string;
    items: ItemPedido[];
}

const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    pendiente:   { label: 'Pendiente',   color: '#0f0f12', bg: '#f5c842' },
    confirmado:  { label: 'Confirmado',  color: '#0f0f12', bg: '#6bcb77' },
    en_proceso:  { label: 'En proceso',  color: '#0f0f12', bg: '#4d96ff' },
    listo:       { label: 'Listo',       color: '#0f0f12', bg: '#c77dff' },
    enviado:     { label: 'Enviado',     color: '#0f0f12', bg: '#f5d8e8' },
    entregado:   { label: 'Entregado',   color: '#0f0f12', bg: '#ecb2c3' },
    cancelado:   { label: 'Cancelado',   color: '#fff',    bg: '#e05a6a' },
};

const PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjMWExYTJlIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IiNlY2IyYzMiPvCfp6s8L3RleHQ+PC9zdmc+';

// Estados que permiten pagar
const ESTADOS_PAGABLES = ['confirmado', 'en_proceso', 'listo'];

const ClientePedidosScreen: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [pedidos, setPedidos]             = useState<Pedido[]>([]);
    const [loading, setLoading]             = useState(true);
    const [pedidoDetalle, setPedidoDetalle] = useState<Pedido | null>(null);
    const [notifPago, setNotifPago]         = useState('');

    // Estados de pago
    const [procesandoPago, setProcesandoPago] = useState(false);
    const [errorPago, setErrorPago]           = useState('');

    // Detectar retorno de pasarela
    useEffect(() => {
        const pago     = searchParams.get('pago');
        const pedidoId = searchParams.get('pedido');
        const metodo   = searchParams.get('metodo') || '';
        if (pago === 'exitoso')  setNotifPago(`✅ Pago recibido para el pedido #${pedidoId}. ¡Gracias por tu compra!`);
        if (pago === 'fallido')  setNotifPago(`❌ El pago del pedido #${pedidoId} no se completó. Intenta de nuevo.`);
        if (pago === 'pendiente') setNotifPago(`⏳ El pago del pedido #${pedidoId} está pendiente de confirmación.`);
        if (pago === 'exitoso' && metodo === 'paypal') {
            // Capturar pago PayPal si viene con order_id
            const orderId = searchParams.get('token');
            if (orderId && pedidoId) {
                carritoAPI.capturarPagoPayPal(orderId, parseInt(pedidoId))
                    .catch(e => console.error('Error capturando PayPal:', e));
            }
        }
    }, []);

    useEffect(() => { cargarPedidos(); }, []);

    const cargarPedidos = async () => {
        setLoading(true);
        try {
            const data = await carritoAPI.getMisPedidos();
            if (data.success) setPedidos(data.data || []);
        } catch (err) {
            console.error('Error cargando pedidos:', err);
        } finally {
            setLoading(false);
        }
    };

    // ── Pagar con MercadoPago ─────────────────────────────────
    const pagarConMercadoPago = async (pedido: Pedido) => {
        setProcesandoPago(true);
        setErrorPago('');
        try {
            const data = await carritoAPI.crearPreferenciaMercadoPago(pedido.id);
            if (!data.success) throw new Error(data.message);
            // Redirigir a MercadoPago
            const url = process.env.NODE_ENV === 'production'
                ? data.data.init_point
                : data.data.sandbox_init_point;
            window.location.href = url;
        } catch (err: any) {
            setErrorPago(err.message || 'Error al iniciar el pago con MercadoPago');
            setProcesandoPago(false);
        }
    };

    // ── Pagar con PayPal ──────────────────────────────────────
    const pagarConPayPal = async (pedido: Pedido) => {
        setProcesandoPago(true);
        setErrorPago('');
        try {
            const data = await carritoAPI.crearOrdenPayPal(pedido.id);
            if (!data.success) throw new Error(data.message);
            // Redirigir a PayPal
            window.location.href = data.data.approve_url;
        } catch (err: any) {
            setErrorPago(err.message || 'Error al iniciar el pago con PayPal');
            setProcesandoPago(false);
        }
    };

    // ── Descargar recibo ──────────────────────────────────────
    const descargarRecibo = (pedido: Pedido) => {
        const url = carritoAPI.getReciboUrl(pedido.id);
        window.open(url, '_blank');
    };

    const contar = (estado: string) => pedidos.filter(p => p.estado === estado).length;
    const pendientes = contar('pendiente') + contar('confirmado') + contar('en_proceso') + contar('listo');
    const enviados   = contar('enviado');
    const entregados = contar('entregado');
    const cancelados = contar('cancelado');

    const formatFecha = (f: string) => {
        if (!f) return '—';
        return new Date(f).toLocaleDateString('es-MX', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            timeZone: 'America/Mexico_City'
        });
    };

    const getBadge = (estado: string) => {
        const cfg = ESTADO_CONFIG[estado] || { label: estado, color: '#fff', bg: '#555' };
        return (
            <span className="cp-badge" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                {cfg.label}
            </span>
        );
    };

    return (
        <main className="cp-body">

            {/* Notificación de pago */}
            {notifPago && (
                <div className={`cp-notif-pago ${notifPago.startsWith('✅') ? 'ok' : notifPago.startsWith('❌') ? 'error' : 'pending'}`}>
                    {notifPago}
                    <button onClick={() => setNotifPago('')}>×</button>
                </div>
            )}

            {/* Header */}
            <div className="cp-header">
                <h2 className="cp-titulo">Mis Pedidos</h2>
                <button className="cp-btn-nuevo" onClick={() => navigate('/carrito')}>
                    🛒 Ir al carrito
                </button>
            </div>

            {/* Cards de resumen */}
            <div className="cp-stats">
                {[
                    { label: 'En proceso', value: pendientes, icon: '⏳' },
                    { label: 'Enviados',   value: enviados,   icon: '🚚' },
                    { label: 'Entregados', value: entregados, icon: '✅' },
                    { label: 'Cancelados', value: cancelados, icon: '❌' },
                ].map((s, i) => (
                    <div key={i} className="cp-stat-card">
                        <span className="cp-stat-icon">{s.icon}</span>
                        <p className="cp-stat-label">{s.label}</p>
                        <p className="cp-stat-valor">{loading ? '…' : s.value}</p>
                    </div>
                ))}
            </div>

            {/* Tabla */}
            {loading ? (
                <div className="cp-loading"><div className="cp-spinner" /><p>Cargando pedidos...</p></div>
            ) : pedidos.length === 0 ? (
                <div className="cp-vacio">
                    <p>Aún no tienes pedidos.</p>
                    <button className="cp-btn-nuevo" onClick={() => navigate('/catalogo')}>Ver catálogo</button>
                </div>
            ) : (
                <div className="cp-tabla-wrap">
                    <table className="cp-tabla">
                        <thead>
                            <tr>
                                <th>Folio</th>
                                <th>Fecha</th>
                                <th>Estado</th>
                                <th>Total</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pedidos.map(pedido => (
                                <tr key={pedido.id}>
                                    <td className="cp-folio">{pedido.folio}</td>
                                    <td>{formatFecha(pedido.fecha_creacion)}</td>
                                    <td>
                                        {getBadge(pedido.estado)}
                                        {/* Indicador visual de que se puede pagar */}
                                        {ESTADOS_PAGABLES.includes(pedido.estado) && !['aprobado','pagado'].includes(pedido.estado_pago) && (
                                            <span className="cp-pago-pendiente">💳 Pago pendiente</span>
                                        )}
                                    </td>
                                    <td className="cp-total">${parseFloat(String(pedido.total)).toLocaleString('es-MX')}</td>
                                    <td>
                                        <button className="cp-btn-ver" onClick={() => { setPedidoDetalle(pedido); setErrorPago(''); }}>
                                            👁 Ver
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal detalle */}
            {pedidoDetalle && (
                <div className="cp-modal-overlay" onClick={() => setPedidoDetalle(null)}>
                    <div className="cp-modal" onClick={e => e.stopPropagation()}>
                        <div className="cp-modal-header">
                            <div>
                                <h3>Pedido {pedidoDetalle.folio}</h3>
                                <p className="cp-modal-fecha">{formatFecha(pedidoDetalle.fecha_creacion)}</p>
                            </div>
                            <button className="cp-modal-close" onClick={() => setPedidoDetalle(null)}>×</button>
                        </div>

                        <div className="cp-modal-body">

                            {/* Estado */}
                            <div className="cp-modal-estado">
                                {getBadge(pedidoDetalle.estado)}
                                {pedidoDetalle.trabajador_nombre && (
                                    <span className="cp-modal-trabajador">Atendido por: {pedidoDetalle.trabajador_nombre}</span>
                                )}
                            </div>

                            {/* Nota del trabajador */}
                            {pedidoDetalle.notas_internas && (
                                <div className="cp-modal-nota-trabajador">
                                    <p>💬 <strong>Nota del trabajador:</strong> {pedidoDetalle.notas_internas}</p>
                                </div>
                            )}

                            {/* Dirección */}
                            {pedidoDetalle.direccion_entrega && (
                                <div className="cp-modal-seccion">
                                    <h4>📍 Dirección de envío</h4>
                                    <p>{pedidoDetalle.direccion_entrega}</p>
                                </div>
                            )}

                            {/* Notas cliente */}
                            {pedidoDetalle.notas_cliente && (
                                <div className="cp-modal-seccion">
                                    <h4>📝 Tus notas</h4>
                                    <p>{pedidoDetalle.notas_cliente}</p>
                                </div>
                            )}

                            {/* Productos */}
                            <div className="cp-modal-seccion">
                                <h4>🛍 Productos</h4>
                                <div className="cp-modal-items">
                                    {(pedidoDetalle.items || []).map((item, i) => (
                                        <div key={i} className="cp-modal-item">
                                            <img src={item.producto_imagen || PLACEHOLDER} alt={item.producto_nombre}
                                                onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER; }} />
                                            <div className="cp-modal-item-info">
                                                <p className="cp-modal-item-nombre">{item.producto_nombre}</p>
                                                {item.talla_medida && <p className="cp-modal-item-sub">Talla: {item.talla_medida}</p>}
                                                {item.nota && <p className="cp-modal-item-sub">Nota: {item.nota}</p>}
                                                <p className="cp-modal-item-sub">{item.cantidad} × ${parseFloat(String(item.precio_unitario)).toLocaleString('es-MX')}</p>
                                            </div>
                                            <p className="cp-modal-item-subtotal">${parseFloat(String(item.subtotal)).toLocaleString('es-MX')}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Totales */}
                            <div className="cp-modal-totales">
                                <div className="cp-modal-total-fila"><span>Subtotal</span><span>${parseFloat(String(pedidoDetalle.subtotal)).toLocaleString('es-MX')}</span></div>
                                <div className="cp-modal-total-fila"><span>IVA (16%)</span><span>${parseFloat(String(pedidoDetalle.iva)).toLocaleString('es-MX')}</span></div>
                                <div className="cp-modal-total-fila cp-modal-total-final">
                                    <span>Total</span>
                                    <span>${parseFloat(String(pedidoDetalle.total)).toLocaleString('es-MX')}</span>
                                </div>
                            </div>

                            {/* ── SECCIÓN DE PAGO (solo si está confirmado y no pagado) ── */}
                            {ESTADOS_PAGABLES.includes(pedidoDetalle.estado) && !['aprobado','pagado'].includes(pedidoDetalle.estado_pago) && (
                                <div className="cp-seccion-pago">
                                    <div className="cp-pago-titulo">
                                        <span className="cp-pago-icon">💳</span>
                                        <div>
                                            <h4>Tu pedido está listo para pagar</h4>
                                            <p>El trabajador confirmó tu pedido. Elige tu método de pago:</p>
                                        </div>
                                    </div>

                                    {errorPago && (
                                        <div className="cp-pago-error">⚠️ {errorPago}</div>
                                    )}

                                    <div className="cp-pago-botones">
                                        {/* MercadoPago */}
                                        <button
                                            className="cp-btn-mp"
                                            onClick={() => pagarConMercadoPago(pedidoDetalle)}
                                            disabled={procesandoPago}
                                        >
                                            {procesandoPago ? '⏳ Redirigiendo...' : (
                                                <>
                                                    <span className="cp-btn-pago-logo">🛒</span>
                                                    <span>
                                                        <strong>MercadoPago</strong>
                                                        <small>Tarjeta, transferencia o efectivo</small>
                                                    </span>
                                                </>
                                            )}
                                        </button>

                                        {/* PayPal */}
                                        <button
                                            className="cp-btn-paypal"
                                            onClick={() => pagarConPayPal(pedidoDetalle)}
                                            disabled={procesandoPago}
                                        >
                                            {procesandoPago ? '⏳ Redirigiendo...' : (
                                                <>
                                                    <span className="cp-btn-pago-logo">🅿️</span>
                                                    <span>
                                                        <strong>PayPal</strong>
                                                        <small>Cuenta PayPal o tarjeta</small>
                                                    </span>
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    <p className="cp-pago-seguro">🔒 Pago seguro — serás redirigido a la pasarela de pago</p>
                                </div>
                            )}

                            {/* Pedido ya pagado */}
                            {['aprobado','pagado'].includes(pedidoDetalle.estado_pago) && (
                                <div className="cp-pago-completado">
                                    ✅ <strong>Pago completado</strong>
                                </div>
                            )}

                            {/* Recibo PDF — solo si está pagado o entregado */}
                            {(['aprobado','pagado'].includes(pedidoDetalle.estado_pago) || pedidoDetalle.estado === 'entregado') && (
                                <button className="cp-btn-recibo" onClick={() => descargarRecibo(pedidoDetalle)}>
                                    📄 Ver / Descargar recibo
                                </button>
                            )}

                        </div>
                    </div>
                </div>
            )}

            {/* Footer */}
            <footer className="cp-footer">
                <div className="cp-footer-grid">
                    <div><h6>Contacto</h6><p><span>info@dianaalaura.com</span><br /><span>+1 (234) 567-890</span></p></div>
                    <div><h6>Acerca de</h6><p>Joyería y Bisutería con esencia femenina. Diseños exclusivos y de calidad.</p></div>
                    <div><h6>Ubicación</h6><p>Calle Principal 123<br />Ciudad, Estado 12345</p></div>
                    <div><h6>Redes Sociales</h6><div className="cp-footer-social"><span>📸</span><span>👥</span><span>🎵</span></div></div>
                </div>
                <hr className="cp-footer-hr" />
            </footer>
        </main>
    );
};

export default ClientePedidosScreen;