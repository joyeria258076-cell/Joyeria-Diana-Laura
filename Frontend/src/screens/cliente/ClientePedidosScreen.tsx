// Ruta: Frontend/src/screens/cliente/ClientePedidosScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
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
    notas_cliente?: string;
    notas_internas?: string;
    trabajador_nombre?: string;
    fecha_creacion: string;
    fecha_estimada_entrega?: string;
    metodo_pago_nombre?: string;
    metodo_pago_codigo?: string;
    comprobante_transferencia_url?: string;
    items: ItemPedido[];
    codigo_entrega?: string;
}

interface EstadoConfig { value: string; label: string; color: string; bg: string; }
interface Notificacion { id: string; folio: string; mensaje: string; fecha: string; leida: boolean; }

const STORAGE_KEY_NOTIFS  = 'diana_laura_notifs';
const STORAGE_KEY_ESTADOS = 'diana_laura_estados_pedidos';
const POLLING_INTERVAL    = 30000;

const cargarNotifs = (): Notificacion[] => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY_NOTIFS) || '[]'); }
    catch { return []; }
};
const guardarNotifs = (n: Notificacion[]) => localStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify(n));
const cargarEstadosAnteriores = (): Record<number, string> => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY_ESTADOS) || '{}'); }
    catch { return {}; }
};
const guardarEstadosAnteriores = (e: Record<number, string>) => localStorage.setItem(STORAGE_KEY_ESTADOS, JSON.stringify(e));

const COLORES_ESTADO: Record<string, { color: string; bg: string }> = {
    pendiente:      { color: '#0f0f12', bg: '#f5c842' },
    confirmado:     { color: '#0f0f12', bg: '#6bcb77' },
    en_preparacion: { color: '#0f0f12', bg: '#4d96ff' },
    enviado:        { color: '#0f0f12', bg: '#f5d8e8' },
    entregado:      { color: '#0f0f12', bg: '#ecb2c3' },
    cancelado:      { color: '#fff',    bg: '#e05a6a' },
};
const COLOR_DEFAULT = { color: '#fff', bg: '#555555' };
const labelEstado = (v: string) => v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const MENSAJE_ESTADO: Record<string, string> = {
    confirmado:     '✅ Tu pedido fue confirmado. Ya puedes realizar el pago.',
    en_preparacion: '🔧 Tu pedido está siendo preparado.',
    enviado:        '🚚 Tu pedido fue enviado. ¡Pronto llegará!',
    entregado:      '📦 Tu pedido fue entregado. ¡Gracias por tu compra!',
    cancelado:      '🚫 Tu pedido fue cancelado.',
};

const FASES_STEPPER = [
    { key: 'pendiente',      label: 'Pedido',     icon: '📋' },
    { key: 'confirmado',     label: 'Confirmado', icon: '✅' },
    { key: 'pago',           label: 'Pago',       icon: '💳' },
    { key: 'en_preparacion', label: 'Preparando', icon: '🔧' },
    { key: 'enviado',        label: 'Enviado',    icon: '🚚' },
    { key: 'entregado',      label: 'Entregado',  icon: '📦' },
];

const getFaseIndex = (estado: string, estado_pago: string): number => {
    if (estado === 'cancelado') return -1;
    if (estado === 'entregado') return 5;
    if (estado === 'enviado') return 4;
    if (estado === 'en_preparacion') return 3;
    if (estado === 'confirmado' && estado_pago === 'aprobado') return 2;
    if (estado === 'confirmado') return 1;
    return 0;
};

const StepperPedido: React.FC<{ estado: string; estado_pago: string }> = ({ estado, estado_pago }) => {
    if (estado === 'cancelado') return <div className="cp-stepper-cancelado">🚫 Este pedido fue cancelado</div>;
    const faseActual = getFaseIndex(estado, estado_pago);
    return (
        <div className="cp-stepper">
            {FASES_STEPPER.map((fase, i) => (
                <div key={fase.key} className="cp-step-wrap">
                    <div className={`cp-step ${i < faseActual ? 'completado' : i === faseActual ? 'activo' : 'inactivo'}`}>
                        <div className="cp-step-icono">{i < faseActual ? '✓' : fase.icon}</div>
                        <div className="cp-step-label">{fase.label}</div>
                    </div>
                    {i < FASES_STEPPER.length - 1 && (
                        <div className={`cp-step-linea ${i < faseActual ? 'completada' : ''}`} />
                    )}
                </div>
            ))}
        </div>
    );
};

// ✅ Agrupación por fecha
const agruparPorFecha = (pedidos: Pedido[]): { label: string; pedidos: Pedido[] }[] => {
    const hoy    = new Date(); hoy.setHours(0,0,0,0);
    const ayer   = new Date(hoy); ayer.setDate(ayer.getDate() - 1);
    const semana = new Date(hoy); semana.setDate(semana.getDate() - 7);
    const grupos: Record<string, Pedido[]> = { 'Hoy': [], 'Ayer': [], 'Esta semana': [], 'Más antiguos': [] };
    pedidos.forEach(p => {
        const fUTC = toUTC(p.fecha_creacion);
        const fechaMx = new Date(new Date(fUTC).toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
        fechaMx.setHours(0,0,0,0);
        if (fechaMx.getTime() === hoy.getTime())       grupos['Hoy'].push(p);
        else if (fechaMx.getTime() === ayer.getTime()) grupos['Ayer'].push(p);
        else if (fechaMx >= semana)                    grupos['Esta semana'].push(p);
        else                                           grupos['Más antiguos'].push(p);
    });
    return Object.entries(grupos).filter(([, ps]) => ps.length > 0).map(([label, ps]) => ({ label, pedidos: ps }));
};

const PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjMWExYTJlIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IiNlY2IyYzMiPvCfp6s8L3RleHQ+PC9zdmc+';

const toUTC = (f: string) => {
    if (!f) return '';
    // Producción envía "2026-04-06 10:39:55.583193+" — normalizar
    if (f.endsWith('+')) return f.slice(0, -1).replace(' ', 'T') + 'Z';
    // Sin offset — asumir UTC
    if (!/Z|[+-]\d{2}:?\d{2}$/.test(f)) return f.replace(' ', 'T') + 'Z';
    return f;
};

const formatFecha = (f: string) => {
    if (!f) return '—';
    // Solo fecha YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(f)) {
        const [y, m, d] = f.split('-');
        return `${d}/${m}/${y}`;
    }
    // ✅ Fecha con T00:00:00 — tratar como fecha pura sin conversión TZ
    if (f.includes('T00:00:00')) {
        const solo = f.split('T')[0];
        const [y, m, d] = solo.split('-');
        return `${d}/${m}/${y}`;
    }
    return new Date(toUTC(f)).toLocaleDateString('es-MX', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        timeZone: 'America/Mexico_City'
    });
};

const formatFechaHora = (f: string) => {
    if (!f) return '—';
    return new Date(toUTC(f)).toLocaleString('es-MX', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit', timeZone:'America/Mexico_City' });
};

const ClientePedidosScreen: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [pedidos, setPedidos]                 = useState<Pedido[]>([]);
    const [loading, setLoading]                 = useState(true);
    const [agrupar, setAgrupar]                 = useState(true);
    const [pedidoDetalle, setPedidoDetalle]     = useState<Pedido | null>(null);
    const [cargandoDetalle, setCargandoDetalle] = useState(false);
    const [notifPago, setNotifPago]             = useState('');
    const [estados, setEstados]                 = useState<EstadoConfig[]>([]);
    const [estadosPagables, setEstadosPagables] = useState<string[]>([]);
    const [procesandoPago, setProcesandoPago]   = useState(false);
    const [errorPago, setErrorPago]             = useState('');
    const [subiendo, setSubiendo]               = useState(false);
    const [msgComprobante, setMsgComprobante]   = useState('');
    const fileInputRef                          = useRef<HTMLInputElement>(null);
    const [notifs, setNotifs]                   = useState<Notificacion[]>(cargarNotifs);
    const [mostrarNotifs, setMostrarNotifs]     = useState(false);
    const notifRef                              = useRef<HTMLDivElement>(null);
    const estadosAnteriores                     = useRef<Record<number, string>>(cargarEstadosAnteriores());
    const pollingRef                            = useRef<ReturnType<typeof setInterval> | null>(null);
    const noLeidas = notifs.filter(n => !n.leida).length;

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) setMostrarNotifs(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const marcarTodasLeidas = () => { const u = notifs.map(n => ({ ...n, leida: true })); setNotifs(u); guardarNotifs(u); };
    const borrarNotif = (id: string) => { const u = notifs.filter(n => n.id !== id); setNotifs(u); guardarNotifs(u); };

    useEffect(() => {
        const pago = searchParams.get('pago'); const pedidoId = searchParams.get('pedido'); const metodo = searchParams.get('metodo') || '';
        if (pago === 'exitoso')   setNotifPago(`✅ Pago recibido para el pedido #${pedidoId}. ¡Gracias por tu compra!`);
        if (pago === 'fallido')   setNotifPago(`❌ El pago del pedido #${pedidoId} no se completó. Intenta de nuevo.`);
        if (pago === 'pendiente') setNotifPago(`⏳ El pago del pedido #${pedidoId} está pendiente de confirmación.`);
        if (pago === 'exitoso' && metodo === 'paypal') {
            const orderId = searchParams.get('token');
            if (orderId && pedidoId) carritoAPI.capturarPagoPayPal(orderId, Number.parseInt(pedidoId)).catch(console.error);
        }
    }, []);

    useEffect(() => {
        cargarEstados(); cargarPedidos();
        pollingRef.current = setInterval(() => pollEstados(), POLLING_INTERVAL);
        return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
    }, []);

    useEffect(() => {
        const pago = searchParams.get('pago');
        if (pago === 'exitoso') setTimeout(() => cargarPedidos(), 2000);
    }, [searchParams]);

    const pollEstados = async () => {
        try {
            const data = await carritoAPI.getEstadosPedidosCliente();
            if (!data.success) return;
            const nuevasNotifs: Notificacion[] = [];
            const estadosGuardados = cargarEstadosAnteriores();
            data.data.forEach((p: any) => {
                const anterior = estadosGuardados[p.id];
                if (anterior && anterior !== p.estado && MENSAJE_ESTADO[p.estado]) {
                    nuevasNotifs.push({ id: `${p.id}-${p.estado}-${Date.now()}`, folio: p.folio, mensaje: MENSAJE_ESTADO[p.estado], fecha: new Date().toISOString(), leida: false });
                }
                estadosAnteriores.current[p.id] = p.estado;
            });
            guardarEstadosAnteriores(estadosAnteriores.current);
            if (nuevasNotifs.length > 0) {
                const todas = [...nuevasNotifs, ...cargarNotifs()].slice(0, 20);
                setNotifs(todas); guardarNotifs(todas); cargarPedidos();
            }
        } catch { }
    };

    const cargarEstados = async () => {
        try {
            const data = await carritoAPI.getEstadosPedido();
            if (data.success) {
                setEstados(data.data.map((v: string) => ({ value: v, label: labelEstado(v), ...(COLORES_ESTADO[v] || COLOR_DEFAULT) })));
                setEstadosPagables(data.data.filter((e: string) => !['pendiente','enviado','entregado','cancelado'].includes(e)));
            }
        } catch {
            setEstados([
                { value: 'pendiente', label: 'Pendiente', color: '#0f0f12', bg: '#f5c842' },
                { value: 'confirmado', label: 'Confirmado', color: '#0f0f12', bg: '#6bcb77' },
                { value: 'en_preparacion', label: 'En Preparacion', color: '#0f0f12', bg: '#4d96ff' },
                { value: 'enviado', label: 'Enviado', color: '#0f0f12', bg: '#f5d8e8' },
                { value: 'entregado', label: 'Entregado', color: '#0f0f12', bg: '#ecb2c3' },
                { value: 'cancelado', label: 'Cancelado', color: '#fff', bg: '#e05a6a' },
            ]);
            setEstadosPagables(['confirmado', 'en_preparacion']);
        }
    };

    const cargarPedidos = async () => {
        setLoading(true);
        try {
            const data = await carritoAPI.getMisPedidos();
            if (data.success) {
                const nuevos: Pedido[] = data.data || [];
console.log('FECHA RAW CLIENTE:', nuevos[0]?.fecha_creacion);
                const nuevasNotifs: Notificacion[] = [];
                const estadosGuardados = cargarEstadosAnteriores();
                nuevos.forEach(p => {
                    const anterior = estadosGuardados[p.id];
                    if (anterior && anterior !== p.estado && MENSAJE_ESTADO[p.estado])
                        nuevasNotifs.push({ id: `${p.id}-${p.estado}-${Date.now()}`, folio: p.folio, mensaje: MENSAJE_ESTADO[p.estado], fecha: new Date().toISOString(), leida: false });
                    estadosAnteriores.current[p.id] = p.estado;
                });
                guardarEstadosAnteriores(estadosAnteriores.current);
                if (nuevasNotifs.length > 0) { const todas = [...nuevasNotifs, ...cargarNotifs()].slice(0, 20); setNotifs(todas); guardarNotifs(todas); }
                setPedidos(nuevos);
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const abrirDetalle = async (pedido: Pedido) => {
        setErrorPago(''); setMsgComprobante(''); setPedidoDetalle(pedido); setCargandoDetalle(true);
        try { const data = await carritoAPI.getPedidoById(pedido.id); if (data.success) setPedidoDetalle(data.data); } catch { }
        finally { setCargandoDetalle(false); }
    };

    const pagarConMercadoPago = async (pedido: Pedido) => {
        setProcesandoPago(true); setErrorPago('');
        try {
            const data = await carritoAPI.crearPreferenciaMercadoPago(pedido.id);
            if (!data.success) throw new Error(data.message);
            window.location.href = import.meta.env.PROD ? data.data.init_point : data.data.sandbox_init_point;
        } catch (err: any) { setErrorPago(err.message || 'Error MP'); setProcesandoPago(false); }
    };

    const pagarConPayPal = async (pedido: Pedido) => {
        setProcesandoPago(true); setErrorPago('');
        try {
            const data = await carritoAPI.crearOrdenPayPal(pedido.id);
            if (!data.success) throw new Error(data.message);
            window.location.href = data.data.approve_url;
        } catch (err: any) { setErrorPago(err.message || 'Error PayPal'); setProcesandoPago(false); }
    };

    const subirComprobante = async (pedido: Pedido, file: File) => {
        setSubiendo(true); setMsgComprobante('');
        try {
            const data = await carritoAPI.subirComprobante(pedido.id, file);
            if (!data.success) throw new Error(data.message);
            setMsgComprobante('✅ Comprobante enviado. El trabajador lo revisará pronto.');
            const det = await carritoAPI.getPedidoById(pedido.id);
            if (det.success) setPedidoDetalle(det.data);
        } catch (err: any) { setMsgComprobante(`❌ ${err.message || 'Error al subir'}`); }
        finally { setSubiendo(false); }
    };

    const descargarRecibo = (pedido: Pedido) => window.open(carritoAPI.getReciboUrl(pedido.id), '_blank');

    const getBadge = (estado: string) => {
        const cfg = estados.find(e => e.value === estado) || { label: labelEstado(estado), ...COLOR_DEFAULT };
        return <span className="cp-badge" style={{ backgroundColor: cfg.bg, color: cfg.color }}>{cfg.label}</span>;
    };

    const contar = (estado: string) => pedidos.filter(p => p.estado === estado).length;
    const enProceso = pedidos.filter(p => !['enviado','entregado','cancelado'].includes(p.estado)).length;
    const esPagable = (pedido: Pedido) => estadosPagables.includes(pedido.estado) && !['aprobado','pagado'].includes(pedido.estado_pago);
    const grupos = agrupar ? agruparPorFecha(pedidos) : [{ label: '', pedidos }];

    const renderSeccionPago = (pedido: Pedido) => {
        if (!esPagable(pedido)) return null;
        const codigo = pedido.metodo_pago_codigo || 'mercadopago';
        return (
            <div className="cp-seccion-pago">
                <div className="cp-pago-titulo">
                    <span className="cp-pago-icon">💳</span>
                    <div><h4>Tu pedido está listo para pagar</h4><p>Método: <strong>{pedido.metodo_pago_nombre || codigo}</strong></p></div>
                </div>
                {errorPago && <div className="cp-pago-error">⚠️ {errorPago}</div>}
                {codigo === 'mercadopago' && (
                    <><div className="cp-pago-botones">
                        <button className="cp-btn-mp" onClick={() => pagarConMercadoPago(pedido)} disabled={procesandoPago}>
                            {procesandoPago ? '⏳ Redirigiendo...' : <><span className="cp-btn-pago-logo">🛒</span><span><strong>Pagar con MercadoPago</strong><small>Tarjeta, transferencia o efectivo</small></span></>}
                        </button>
                    </div><p className="cp-pago-seguro">🔒 Serás redirigido a MercadoPago</p></>
                )}
                {codigo === 'paypal' && (
                    <><div className="cp-pago-botones">
                        <button className="cp-btn-paypal" onClick={() => pagarConPayPal(pedido)} disabled={procesandoPago}>
                            {procesandoPago ? '⏳ Redirigiendo...' : <><span className="cp-btn-pago-logo">🅿️</span><span><strong>Pagar con PayPal</strong><small>Cuenta PayPal o tarjeta</small></span></>}
                        </button>
                    </div><p className="cp-pago-seguro">🔒 Serás redirigido a PayPal</p></>
                )}
                {codigo === 'transferencia' && (
                    <div className="cp-pago-instrucciones">
                        <p>🏦 <strong>Datos para transferencia:</strong></p>
                        <div className="cp-transferencia-datos">
                            <div className="cp-transferencia-fila"><span>Banco:</span><strong>BBVA</strong></div>
                            <div className="cp-transferencia-fila"><span>Titular:</span><strong>Diana Laura Cabrera Cruz</strong></div>
                            <div className="cp-transferencia-fila"><span>CLABE:</span><strong>012345678901234567</strong></div>
                            <div className="cp-transferencia-fila"><span>Concepto:</span><strong>{pedido.folio}</strong></div>
                        </div>
                        {pedido.comprobante_transferencia_url ? (
                            <div className="cp-comprobante-enviado">
                                <p>✅ Comprobante enviado al trabajador</p>
                                <img src={pedido.comprobante_transferencia_url} alt="Comprobante" className="cp-comprobante-img" />
                                <p className="cp-transferencia-nota">El trabajador verificará tu pago pronto.</p>
                            </div>
                        ) : (
                            <div className="cp-comprobante-upload">
                                <p className="cp-transferencia-nota">📎 Una vez realizada la transferencia, sube tu comprobante:</p>
                                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                                    onChange={e => { const file = e.target.files?.[0]; if (file) subirComprobante(pedido, file); }} />
                                <button className="cp-btn-subir-comprobante" onClick={() => fileInputRef.current?.click()} disabled={subiendo}>
                                    {subiendo ? '⏳ Subiendo...' : '📎 Subir comprobante'}
                                </button>
                                {msgComprobante && <div className={`cp-comprobante-msg ${msgComprobante.startsWith('✅') ? 'ok' : 'error'}`}>{msgComprobante}</div>}
                            </div>
                        )}
                    </div>
                )}
                {codigo === 'efectivo' && (
                    <div className="cp-pago-instrucciones">
                        <p>💵 <strong>Pago en efectivo:</strong></p>
                        <p className="cp-transferencia-nota">El trabajador confirmará tu pago al momento de la entrega o en tienda.</p>
                    </div>
                )}
            </div>
        );
    };

    const renderFilaPedido = (pedido: Pedido) => (
        <tr key={pedido.id}>
            <td className="cp-folio">{pedido.folio}</td>
            <td>{formatFechaHora(pedido.fecha_creacion)}</td>
            <td className="cp-fecha-est">
                {pedido.fecha_estimada_entrega && ['aprobado','pagado'].includes(pedido.estado_pago)
                    ? formatFecha(pedido.fecha_estimada_entrega)
                    : <span className="cp-fecha-est-vacia">Por confirmar</span>}
            </td>
            <td>
                {getBadge(pedido.estado)}
                {['aprobado','pagado'].includes(pedido.estado_pago) ? (
                    <span className="cp-pago-badge cp-pago-ok">✅ Pago completado</span>
                ) : esPagable(pedido) ? (
                    <span className="cp-pago-badge cp-pago-pendiente">
                        {pedido.metodo_pago_codigo === 'efectivo' ? '💵 Pago en efectivo' :
                         pedido.metodo_pago_codigo === 'transferencia' ? '🏦 Transferencia pendiente' : '💳 Pago pendiente'}
                    </span>
                ) : null}
            </td>
            <td className="cp-total">${Number.parseFloat(String(pedido.total)).toLocaleString('es-MX')}</td>
            <td><button className="cp-btn-ver" onClick={() => abrirDetalle(pedido)}>👁 Ver</button></td>
        </tr>
    );

    return (
        <main className="cp-body">
            {notifPago && (
                <div className={`cp-notif-pago ${notifPago.startsWith('✅') ? 'ok' : notifPago.startsWith('❌') ? 'error' : 'pending'}`}>
                    {notifPago}<button onClick={() => setNotifPago('')}>×</button>
                </div>
            )}

            <div className="cp-header">
                <h2 className="cp-titulo">Mis Pedidos</h2>
                <div className="cp-header-acciones">
                    <div className="cp-notif-wrap" ref={notifRef}>
                        <button className="cp-notif-btn" onClick={() => { setMostrarNotifs(!mostrarNotifs); if (!mostrarNotifs) marcarTodasLeidas(); }}>
                            🔔{noLeidas > 0 && <span className="cp-notif-badge">{noLeidas}</span>}
                        </button>
                        {mostrarNotifs && (
                            <div className="cp-notif-dropdown">
                                <div className="cp-notif-header">
                                    <span>Notificaciones</span>
                                    {notifs.length > 0 && <button className="cp-notif-limpiar" onClick={() => { setNotifs([]); guardarNotifs([]); }}>Limpiar todo</button>}
                                </div>
                                {notifs.length === 0 ? <div className="cp-notif-vacio">Sin notificaciones</div> : notifs.map(n => (
                                    <div key={n.id} className={`cp-notif-item ${n.leida ? 'leida' : ''}`}>
                                        <div className="cp-notif-content">
                                            <p className="cp-notif-folio">{n.folio}</p>
                                            <p className="cp-notif-msg">{n.mensaje}</p>
                                            <p className="cp-notif-fecha">{formatFechaHora(n.fecha)}</p>
                                        </div>
                                        <button className="cp-notif-borrar" onClick={() => borrarNotif(n.id)}>×</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <button className="cp-btn-nuevo" onClick={() => navigate('/carrito')}>🛒 Ir al carrito</button>
                </div>
            </div>

            <div className="cp-stats">
                {[
                    { label: 'En proceso', value: enProceso, icon: '⏳' },
                    { label: 'Enviados', value: contar('enviado'), icon: '🚚' },
                    { label: 'Entregados', value: contar('entregado'), icon: '✅' },
                    { label: 'Cancelados', value: contar('cancelado'), icon: '❌' },
                ].map((s, i) => (
                    <div key={i} className="cp-stat-card">
                        <span className="cp-stat-icon">{s.icon}</span>
                        <p className="cp-stat-label">{s.label}</p>
                        <p className="cp-stat-valor">{loading ? '…' : s.value}</p>
                    </div>
                ))}
            </div>

            {/* ✅ Checkbox agrupar por fecha */}
            {!loading && pedidos.length > 0 && (
                <div className="cp-filtros">
                    <label className="cp-filtro-agrupar">
                        <input type="checkbox" checked={agrupar} onChange={e => setAgrupar(e.target.checked)} />
                        📅 Agrupar por fecha
                    </label>
                </div>
            )}

            {loading ? (
                <div className="cp-loading"><div className="cp-spinner" /><p>Cargando pedidos...</p></div>
            ) : pedidos.length === 0 ? (
                <div className="cp-vacio">
                    <p>Aún no tienes pedidos.</p>
                    <button className="cp-btn-nuevo" onClick={() => navigate('/catalogo')}>Ver catálogo</button>
                </div>
            ) : (
                <div className="cp-tabla-wrap">
                    {grupos.map(({ label, pedidos: ps }) => (
                        <div key={label || 'todos'}>
                            {/* ✅ Encabezado de grupo */}
                            {label && (
                                <div className="cp-grupo-label">
                                    <span>{label}</span>
                                    <span className="cp-grupo-count">{ps.length} pedido{ps.length !== 1 ? 's' : ''}</span>
                                </div>
                            )}
                            <table className="cp-tabla">
                                <thead>
                                    <tr>
                                        <th>Folio</th><th>Fecha pedido</th><th>Entrega est.</th>
                                        <th>Estado</th><th>Total</th><th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>{ps.map(renderFilaPedido)}</tbody>
                            </table>
                        </div>
                    ))}
                </div>
            )}

            {pedidoDetalle && (
                <div className="cp-modal-overlay" onClick={() => setPedidoDetalle(null)}>
                    <div className="cp-modal" onClick={e => e.stopPropagation()}>
                        <div className="cp-modal-header">
                            <div>
                                <h3>Pedido {pedidoDetalle.folio}</h3>
                                <p className="cp-modal-fecha">{formatFechaHora(pedidoDetalle.fecha_creacion)}</p>
                            </div>
                            <button className="cp-modal-close" onClick={() => setPedidoDetalle(null)}>×</button>
                        </div>
                        <div className="cp-modal-body">
                            {cargandoDetalle ? (
                                <div className="cp-loading"><div className="cp-spinner" /><p>Cargando detalle...</p></div>
                            ) : (
                                <>
                                    <StepperPedido estado={pedidoDetalle.estado} estado_pago={pedidoDetalle.estado_pago || 'pendiente'} />
                                    <div className="cp-modal-estado">
                                        {getBadge(pedidoDetalle.estado)}
                                        {['aprobado','pagado'].includes(pedidoDetalle.estado_pago) && <span className="cp-pago-badge cp-pago-ok">✅ Pago completado</span>}
                                        {pedidoDetalle.trabajador_nombre && pedidoDetalle.estado !== 'pendiente' && (
                                            <span className="cp-modal-trabajador">Atendido por: {pedidoDetalle.trabajador_nombre}</span>
                                        )}
                                    </div>
                                    {pedidoDetalle.notas_internas && (
                                        <div className="cp-modal-nota-trabajador">
                                            <p>💬 <strong>Nota del trabajador:</strong> {pedidoDetalle.notas_internas}</p>
                                        </div>
                                    )}
                                    <div className="cp-modal-seccion">
                                        <h4>📅 Fecha estimada de entrega</h4>
                                        <p>{pedidoDetalle.fecha_estimada_entrega ? formatFecha(pedidoDetalle.fecha_estimada_entrega) : 'Por confirmar — el trabajador la indicará al procesar tu pedido'}</p>
                                    </div>
                                    {pedidoDetalle.notas_cliente && (
                                        <div className="cp-modal-seccion"><h4>📍 Dirección de envío</h4><p>{pedidoDetalle.notas_cliente}</p></div>
                                    )}
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
                                                        <p className="cp-modal-item-sub">{item.cantidad} × ${Number.parseFloat(String(item.precio_unitario)).toLocaleString('es-MX')}</p>
                                                    </div>
                                                    <p className="cp-modal-item-subtotal">${Number.parseFloat(String(item.subtotal)).toLocaleString('es-MX')}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="cp-modal-totales">
                                        <div className="cp-modal-total-fila"><span>Subtotal</span><span>${Number.parseFloat(String(pedidoDetalle.subtotal)).toLocaleString('es-MX')}</span></div>
                                        <div className="cp-modal-total-fila"><span>IVA (16%)</span><span>${Number.parseFloat(String(pedidoDetalle.iva)).toLocaleString('es-MX')}</span></div>
                                        <div className="cp-modal-total-fila cp-modal-total-final"><span>Total</span><span>${Number.parseFloat(String(pedidoDetalle.total)).toLocaleString('es-MX')}</span></div>
                                    </div>
                                    {renderSeccionPago(pedidoDetalle)}
                                    {['aprobado','pagado'].includes(pedidoDetalle.estado_pago) && (
                                        <div className="cp-pago-completado">✅ <strong>Pago completado</strong></div>
                                    )}

                                    {/* ✅ Código de entrega */}
                                    {['aprobado','pagado'].includes(pedidoDetalle.estado_pago) && 
                                    pedidoDetalle.codigo_entrega &&
                                    !['entregado','cancelado'].includes(pedidoDetalle.estado) && (
                                        <div className="cp-codigo-entrega">
                                            <h4>🎟️ Tu código de entrega</h4>
                                            <p className="cp-codigo-entrega-desc">Muestra este código al trabajador al momento de recibir tu pedido</p>
                                            <div className="cp-codigo-valor">{pedidoDetalle.codigo_entrega}</div>
                                        </div>
                                    )}


                                    {(['aprobado','pagado'].includes(pedidoDetalle.estado_pago) || pedidoDetalle.estado === 'entregado') && (
                                        <button className="cp-btn-recibo" onClick={() => descargarRecibo(pedidoDetalle)}>📄 Ver / Descargar recibo</button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

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