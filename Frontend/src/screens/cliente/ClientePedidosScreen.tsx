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

const ClientePedidosScreen: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [pedidos, setPedidos]         = useState<Pedido[]>([]);
    const [loading, setLoading]         = useState(true);
    const [pedidoDetalle, setPedidoDetalle] = useState<Pedido | null>(null);
    const [notifPago, setNotifPago]     = useState('');

    // Detectar retorno de MercadoPago
    useEffect(() => {
        const pago = searchParams.get('pago');
        const pedidoId = searchParams.get('pedido');
        if (pago === 'exitoso') setNotifPago(`✅ Pago recibido para el pedido #${pedidoId}. ¡Gracias!`);
        if (pago === 'fallido') setNotifPago(`❌ El pago del pedido #${pedidoId} no se completó. Intenta de nuevo.`);
        if (pago === 'pendiente') setNotifPago(`⏳ El pago del pedido #${pedidoId} está pendiente de confirmación.`);
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

    // Contadores por estado
    const contar = (estado: string) => pedidos.filter(p => p.estado === estado).length;
    const pendientes  = contar('pendiente') + contar('confirmado') + contar('en_proceso') + contar('listo');
    const enviados    = contar('enviado');
    const entregados  = contar('entregado');
    const cancelados  = contar('cancelado');

    const formatFecha = (f: string) => {
        if (!f) return '—';
        return new Date(f).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
                    { label: 'En proceso', value: pendientes,  icon: '⏳' },
                    { label: 'Enviados',   value: enviados,    icon: '🚚' },
                    { label: 'Entregados', value: entregados,  icon: '✅' },
                    { label: 'Cancelados', value: cancelados,  icon: '❌' },
                ].map((s, i) => (
                    <div key={i} className="cp-stat-card">
                        <span className="cp-stat-icon">{s.icon}</span>
                        <p className="cp-stat-label">{s.label}</p>
                        <p className="cp-stat-valor">{loading ? '…' : s.value}</p>
                    </div>
                ))}
            </div>

            {/* Tabla de pedidos */}
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
                                    <td>{getBadge(pedido.estado)}</td>
                                    <td className="cp-total">${parseFloat(String(pedido.total)).toLocaleString('es-MX')}</td>
                                    <td>
                                        <button className="cp-btn-ver" onClick={() => setPedidoDetalle(pedido)}>
                                            👁 Ver
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal detalle pedido */}
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

                            {/* Notas del trabajador */}
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

                            {/* Notas del cliente */}
                            {pedidoDetalle.notas_cliente && (
                                <div className="cp-modal-seccion">
                                    <h4>📝 Tus notas</h4>
                                    <p>{pedidoDetalle.notas_cliente}</p>
                                </div>
                            )}

                            {/* Items */}
                            <div className="cp-modal-seccion">
                                <h4>🛍 Productos</h4>
                                <div className="cp-modal-items">
                                    {(pedidoDetalle.items || []).map((item, i) => (
                                        <div key={i} className="cp-modal-item">
                                            <img
                                                src={item.producto_imagen || PLACEHOLDER}
                                                alt={item.producto_nombre}
                                                onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER; }}
                                            />
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
                                <div className="cp-modal-total-fila">
                                    <span>Subtotal</span>
                                    <span>${parseFloat(String(pedidoDetalle.subtotal)).toLocaleString('es-MX')}</span>
                                </div>
                                <div className="cp-modal-total-fila">
                                    <span>IVA (16%)</span>
                                    <span>${parseFloat(String(pedidoDetalle.iva)).toLocaleString('es-MX')}</span>
                                </div>
                                <div className="cp-modal-total-fila cp-modal-total-final">
                                    <span>Total</span>
                                    <span>${parseFloat(String(pedidoDetalle.total)).toLocaleString('es-MX')}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer */}
            <footer className="cp-footer">
                <div className="cp-footer-grid">
                    <div>
                        <h6>Contacto</h6>
                        <p><span>info@dianaalaura.com</span><br /><span>+1 (234) 567-890</span></p>
                    </div>
                    <div>
                        <h6>Acerca de</h6>
                        <p>Joyería y Bisutería con esencia femenina. Diseños exclusivos y de calidad.</p>
                    </div>
                    <div>
                        <h6>Ubicación</h6>
                        <p>Calle Principal 123<br />Ciudad, Estado 12345</p>
                    </div>
                    <div>
                        <h6>Redes Sociales</h6>
                        <div className="cp-footer-social">
                            <span>📸</span><span>👥</span><span>🎵</span>
                        </div>
                    </div>
                </div>
                <hr className="cp-footer-hr" />
            </footer>
        </main>
    );
};

export default ClientePedidosScreen;