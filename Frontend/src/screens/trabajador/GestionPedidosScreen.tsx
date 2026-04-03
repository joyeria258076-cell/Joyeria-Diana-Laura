// Ruta: Frontend/src/screens/trabajador/GestionPedidosScreen.tsx
import React, { useState, useEffect } from 'react';
import { carritoAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import './GestionPedidosScreen.css';

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
    cliente_nombre_completo: string;
    cliente_email: string;
    total: number;
    subtotal: number;
    iva: number;
    total_items: number;
    notas_cliente?: string;
    notas_internas?: string;
    trabajador_nombre?: string;
    trabajador_asignado_nombre?: string;
    trabajador_id?: number;
    fecha_creacion: string;
    numero_guia?: string;
    paqueteria?: string;
    fecha_estimada_entrega?: string;
    items?: ItemPedido[];
}

interface ClienteInfo {
    cliente_nombre_completo: string;
    cliente_email: string;
    cliente_telefono?: string;
    telefono?: string;
    celular?: string;
    direccion_envio?: string;
    fecha_nacimiento?: string;
}

interface EstadoConfig {
    value: string;
    label: string;
    color: string;
}

type ModalTipo = 'detalle' | 'editar' | 'cancelar' | 'cliente' | 'estado' | null;

const COLORES_ESTADO: Record<string, string> = {
    pendiente:      '#f5c842',
    confirmado:     '#6bcb77',
    en_preparacion: '#4d96ff',
    enviado:        '#f5d8e8',
    entregado:      '#ecb2c3',
    cancelado:      '#e05a6a',
};

const COLOR_DEFAULT = '#888888';

const labelEstado = (value: string) =>
    value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

// ── Descripción por estado ───────────────────────────────────
const DESCRIPCION_ESTADO: Record<string, string> = {
    pendiente:      '📋 El pedido fue creado y espera ser tomado por un trabajador.',
    confirmado:     '✅ El trabajador tomó el pedido. El cliente puede realizar el pago.',
    en_preparacion: '🔧 El pago fue recibido. Estás preparando el pedido para envío.',
    enviado:        '🚚 El pedido fue enviado. Comparte el número de guía con el cliente.',
    entregado:      '📦 El pedido llegó al cliente. Proceso completado.',
    cancelado:      '🚫 El pedido será cancelado. El stock será restaurado.',
};

// ── Stepper de fases ─────────────────────────────────────────
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
    if (estado === 'cancelado') {
        return <div className="gp-stepper-cancelado">🚫 Pedido cancelado</div>;
    }
    const faseActual = getFaseIndex(estado, estado_pago);
    return (
        <div className="gp-stepper">
            {FASES_STEPPER.map((fase, i) => (
                <div key={fase.key} className="gp-step-wrap">
                    <div className={`gp-step ${i < faseActual ? 'completado' : i === faseActual ? 'activo' : 'inactivo'}`}>
                        <div className="gp-step-icono">{i < faseActual ? '✓' : fase.icon}</div>
                        <div className="gp-step-label">{fase.label}</div>
                    </div>
                    {i < FASES_STEPPER.length - 1 && (
                        <div className={`gp-step-linea ${i < faseActual ? 'completada' : ''}`} />
                    )}
                </div>
            ))}
        </div>
    );
};

const PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjMWExYTJlIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IiNlY2IyYzMiPvCfp6s8L3RleHQ+PC9zdmc+';

const GestionPedidosScreen: React.FC = () => {
    const { user } = useAuth();
    const miId = user?.dbId;

    const [pedidos, setPedidos]           = useState<Pedido[]>([]);
    const [loading, setLoading]           = useState(true);
    const [filtroEstado, setFiltroEstado] = useState('');
    const [filtroPagoPendiente, setFiltroPagoPendiente] = useState(false);
    const [pedidoSel, setPedidoSel]       = useState<Pedido | null>(null);
    const [modalTipo, setModalTipo]       = useState<ModalTipo>(null);
    const [cargando, setCargando]         = useState(false);
    const [msg, setMsg]                   = useState('');
    const [tomando, setTomando]           = useState(false);
    const [estados, setEstados]           = useState<EstadoConfig[]>([]);

    const [editDireccion, setEditDireccion]         = useState('');
    const [editNotas, setEditNotas]                 = useState('');
    const [editGuia, setEditGuia]                   = useState('');
    const [editPaqueteria, setEditPaqueteria]       = useState('');
    const [editFechaEst, setEditFechaEst]           = useState('');
    const [nuevoEstado, setNuevoEstado]             = useState('');
    const [notasTrabajador, setNotasTrabajador]     = useState('');
    const [motivoCancelacion, setMotivoCancelacion] = useState('');
    const [clienteInfo, setClienteInfo]             = useState<ClienteInfo | null>(null);

    useEffect(() => { cargarEstados(); }, []);
    useEffect(() => { cargarPedidos(); }, [filtroEstado]);

    const cargarEstados = async () => {
        try {
            const data = await carritoAPI.getEstadosPedido();
            if (data.success) {
                setEstados(data.data.map((valor: string) => ({
                    value: valor,
                    label: labelEstado(valor),
                    color: COLORES_ESTADO[valor] || COLOR_DEFAULT,
                })));
            }
        } catch {
            setEstados([
                { value: 'pendiente',      label: 'Pendiente',      color: '#f5c842' },
                { value: 'confirmado',     label: 'Confirmado',     color: '#6bcb77' },
                { value: 'en_preparacion', label: 'En Preparacion', color: '#4d96ff' },
                { value: 'enviado',        label: 'Enviado',        color: '#f5d8e8' },
                { value: 'entregado',      label: 'Entregado',      color: '#ecb2c3' },
                { value: 'cancelado',      label: 'Cancelado',      color: '#e05a6a' },
            ]);
        }
    };

    const cargarPedidos = async () => {
        setLoading(true);
        try {
            const data = await carritoAPI.getAllPedidos(filtroEstado || undefined);
            if (data.success) setPedidos(data.data || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const abrirModal = async (pedido: Pedido, tipo: ModalTipo) => {
        setPedidoSel(pedido);
        setModalTipo(tipo);
        setMsg('');
        if (tipo === 'editar') {
            setEditDireccion(pedido.notas_cliente || '');
            setEditNotas(pedido.notas_internas || '');
            setEditGuia(pedido.numero_guia || '');
            setEditPaqueteria(pedido.paqueteria || '');
            setEditFechaEst(pedido.fecha_estimada_entrega?.split('T')[0] || '');
        }
        if (tipo === 'estado') {
            setNuevoEstado(pedido.estado);
            setNotasTrabajador(pedido.notas_internas || '');
        }
        if (tipo === 'detalle') {
            setCargando(true);
            try {
                const data = await carritoAPI.getPedidoById(pedido.id);
                if (data.success) setPedidoSel(data.data);
            } catch { } finally { setCargando(false); }
        }
        if (tipo === 'cliente') {
            setCargando(true);
            try {
                const data = await carritoAPI.getClienteVenta(pedido.id);
                if (data.success) setClienteInfo(data.data);
            } catch { } finally { setCargando(false); }
        }
    };

    const cerrar = () => { setModalTipo(null); setPedidoSel(null); setMsg(''); };

    const tomarPedido = async (pedido: Pedido) => {
        setTomando(true);
        try {
            const data = await carritoAPI.tomarPedido(pedido.id);
            if (data.success) {
                setPedidos(prev => prev.map(p =>
                    p.id === pedido.id ? { ...p, trabajador_id: miId, trabajador_asignado_nombre: user?.nombre } : p
                ));
                if (pedidoSel?.id === pedido.id)
                    setPedidoSel(prev => prev ? { ...prev, trabajador_id: miId, trabajador_asignado_nombre: user?.nombre } : prev);
                setMsg('✅ Pedido tomado. Ya puedes gestionarlo.');
            }
        } catch (err: any) { setMsg(`❌ ${err.message}`); }
        finally { setTomando(false); }
    };

    const guardarDetalles = async () => {
        if (!pedidoSel) return;
        setCargando(true); setMsg('');
        try {
            await carritoAPI.editarDetalles(pedidoSel.id, {
                direccion_envio: editDireccion,
                notas_internas: editNotas,
                numero_guia: editGuia,
                paqueteria: editPaqueteria,
                fecha_estimada_entrega: editFechaEst
            });
            setPedidos(prev => prev.map(p =>
                p.id === pedidoSel.id ? { ...p, notas_internas: editNotas, numero_guia: editGuia, paqueteria: editPaqueteria } : p
            ));
            setMsg('✅ ¡Detalles guardados! Puedes cerrar esta ventana.');
        } catch (err: any) { setMsg(`❌ ${err.message}`); }
        finally { setCargando(false); }
    };

    const cancelarPedido = async () => {
        if (!pedidoSel) return;
        if (!motivoCancelacion.trim()) { setMsg('❌ Debes escribir el motivo de cancelación'); return; }
        setCargando(true); setMsg('');
        try {
            await carritoAPI.actualizarEstado(pedidoSel.id, 'cancelado', `CANCELADO: ${motivoCancelacion}`);
            setPedidos(prev => prev.map(p => p.id === pedidoSel.id ? { ...p, estado: 'cancelado' } : p));
            setPedidoSel(prev => prev ? { ...prev, estado: 'cancelado' } : prev);
            setMsg('✅ Pedido cancelado. El cliente será notificado. Puedes cerrar esta ventana.');
        } catch (err: any) { setMsg(`❌ ${err.message}`); }
        finally { setCargando(false); }
    };

    const actualizarEstado = async () => {
        if (!pedidoSel) return;
        setCargando(true); setMsg('');
        try {
            await carritoAPI.actualizarEstado(pedidoSel.id, nuevoEstado, notasTrabajador);
            const label = estados.find(e => e.value === nuevoEstado)?.label || nuevoEstado;
            setPedidos(prev => prev.map(p => p.id === pedidoSel.id ? { ...p, estado: nuevoEstado } : p));
            setPedidoSel(prev => prev ? { ...prev, estado: nuevoEstado, notas_internas: notasTrabajador } : prev);
            setMsg(`✅ ¡Listo! Estado actualizado a "${label}". Puedes cerrar esta ventana.`);
        } catch (err: any) {
            // ✅ Mensaje amigable para error de pago pendiente
            const rawMsg = err.message || '';
            if (rawMsg.includes('pago') || rawMsg.includes('pagado')) {
                setMsg(`⚠️ No puedes marcar como "${labelEstado(nuevoEstado)}" — el cliente aún no ha realizado el pago. Espera a que complete el pago antes de continuar.`);
            } else {
                setMsg(`❌ ${rawMsg}`);
            }
        }
        finally { setCargando(false); }
    };

    const getBadge = (estado: string) => {
        const cfg = estados.find(e => e.value === estado) || { label: labelEstado(estado), color: COLOR_DEFAULT };
        return <span className="gp-badge" style={{ background: cfg.color, color: '#0f0f12' }}>{cfg.label}</span>;
    };

    const formatFecha = (f: string) => {
        if (!f) return '—';
        return new Date(f).toLocaleString('es-MX', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
            timeZone: 'America/Mexico_City'
        });
    };

    const contar = (estado: string) => pedidos.filter(p => p.estado === estado).length;
    const esMio = (p: Pedido) => p.trabajador_id === miId;
    const estaAsignado = (p: Pedido) => !!p.trabajador_id;
    const puedoTomar = (p: Pedido) => p.estado === 'pendiente' && !estaAsignado(p);
    const puedoEditar = (p: Pedido) => esMio(p) || user?.rol === 'admin';

    return (
        <div className="gp-container">
            <div className="gp-header">
                <h2 className="gp-titulo">Gestión de Pedidos</h2>
                <button className="gp-btn-refrescar" onClick={cargarPedidos}>🔄 Refrescar</button>
            </div>

            <div className="gp-resumen">
                {estados.filter(e => e.value !== 'cancelado').map((e) => (
                    <div key={e.value} className="gp-stat"
                        style={{ borderTop: `3px solid ${e.color}`, cursor: 'pointer' }}
                        onClick={() => setFiltroEstado(filtroEstado === e.value ? '' : e.value)}>
                        <p className="gp-stat-val" style={{ color: e.color }}>{loading ? '…' : contar(e.value)}</p>
                        <p className="gp-stat-label">{e.label}</p>
                    </div>
                ))}
            </div>

            <div className="gp-filtros">
                <select className="gp-select" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
                    <option value="">Todos los estados</option>
                    {estados.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                </select>
                <label className="gp-filtro-pago">
                    <input type="checkbox" checked={filtroPagoPendiente}
                        onChange={e => setFiltroPagoPendiente(e.target.checked)} />
                    💳 Solo pago pendiente
                </label>
                {(filtroEstado || filtroPagoPendiente) && (
                    <button className="gp-btn-limpiar" onClick={() => { setFiltroEstado(''); setFiltroPagoPendiente(false); }}>✕ Limpiar</button>
                )}
            </div>

            {loading ? (
                <div className="gp-loading"><div className="gp-spinner" /><p>Cargando pedidos...</p></div>
            ) : pedidos.length === 0 ? (
                <div className="gp-vacio">No hay pedidos{filtroEstado ? ` con estado "${filtroEstado}"` : ''}.</div>
            ) : (
                <div className="gp-tabla-wrap">
                    <table className="gp-tabla">
                        <thead>
                            <tr>
                                <th>Folio</th><th>Cliente</th><th>Prods.</th>
                                <th>Fecha</th><th>Total</th><th>Estado</th>
                                <th>Asignado</th><th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pedidos
                                .filter(p => {
                                    if (filtroPagoPendiente)
                                        return !['cancelado','entregado'].includes(p.estado) && p.estado_pago !== 'aprobado';
                                    return true;
                                })
                                .map(pedido => (
                                    <tr key={pedido.id} className={esMio(pedido) ? 'gp-fila-mia' : ''}>
                                        <td className="gp-folio">{pedido.folio}</td>
                                        <td>
                                            <p className="gp-cliente-nombre">{pedido.cliente_nombre_completo}</p>
                                            <p className="gp-cliente-email">{pedido.cliente_email}</p>
                                        </td>
                                        <td className="gp-num-items">{pedido.total_items}</td>
                                        <td className="gp-fecha">{formatFecha(pedido.fecha_creacion)}</td>
                                        <td className="gp-total">${parseFloat(String(pedido.total)).toLocaleString('es-MX')}</td>
                                        <td>
                                            {getBadge(pedido.estado)}
                                            {pedido.estado_pago === 'aprobado' ? (
                                                <span className="gp-pago-badge gp-pago-aprobado">💳 Pagado</span>
                                            ) : (
                                                <span className="gp-pago-badge gp-pago-pendiente">⏳ Sin pago</span>
                                            )}
                                        </td>
                                        <td>
                                            {pedido.trabajador_asignado_nombre ? (
                                                <span className={`gp-asignado ${esMio(pedido) ? 'gp-asignado-mio' : ''}`}>
                                                    {esMio(pedido) ? '👤 Yo' : `👤 ${pedido.trabajador_asignado_nombre}`}
                                                </span>
                                            ) : (
                                                <span className="gp-sin-asignar">Sin asignar</span>
                                            )}
                                        </td>
                                        <td className="gp-acciones-col">
                                            {puedoTomar(pedido) && (
                                                <button className="gp-btn-tomar" onClick={() => tomarPedido(pedido)} disabled={tomando}>
                                                    🙋 Tomar
                                                </button>
                                            )}
                                            <div className="gp-acciones-menu">
                                                <button className="gp-btn-accion" title="Ver detalle" onClick={() => abrirModal(pedido, 'detalle')}>👁</button>
                                                {puedoEditar(pedido) && (
                                                    <>
                                                        <button className="gp-btn-accion" title="Editar detalles" onClick={() => abrirModal(pedido, 'editar')}>✏️</button>
                                                        <button className="gp-btn-accion gp-btn-cancelar" title="Cancelar pedido" onClick={() => abrirModal(pedido, 'cancelar')} disabled={['cancelado','entregado'].includes(pedido.estado)}>🚫</button>
                                                        <button className="gp-btn-accion gp-btn-estado" title="Cambiar estado" onClick={() => abrirModal(pedido, 'estado')}>🔄</button>
                                                    </>
                                                )}
                                                <button className="gp-btn-accion" title="Datos cliente" onClick={() => abrirModal(pedido, 'cliente')}>👤</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            )}

            {modalTipo && pedidoSel && (
                <div className="gp-modal-overlay" onClick={cerrar}>
                    <div className="gp-modal" onClick={e => e.stopPropagation()}>
                        <div className="gp-modal-header">
                            <div>
                                <h3>
                                    {modalTipo === 'detalle'  && '📋 Detalle del pedido'}
                                    {modalTipo === 'editar'   && '✏️ Editar detalles'}
                                    {modalTipo === 'cancelar' && '🚫 Cancelar pedido'}
                                    {modalTipo === 'cliente'  && '👤 Datos del cliente'}
                                    {modalTipo === 'estado'   && '🔄 Cambiar estado'}
                                </h3>
                                <p className="gp-modal-sub">{pedidoSel.folio} · {formatFecha(pedidoSel.fecha_creacion)}</p>
                            </div>
                            <button className="gp-modal-close" onClick={cerrar}>×</button>
                        </div>

                        <div className="gp-modal-body">
                            {cargando ? (
                                <div className="gp-loading"><div className="gp-spinner" /></div>
                            ) : (
                                <>
                                    {modalTipo === 'detalle' && (
                                        <>
                                            {/* ✅ Stepper */}
                                            <StepperPedido
                                                estado={pedidoSel.estado}
                                                estado_pago={pedidoSel.estado_pago || 'pendiente'}
                                            />
                                            <div className="gp-modal-estado">
                                                {getBadge(pedidoSel.estado)}
                                                {pedidoSel.trabajador_asignado_nombre && (
                                                    <span className="gp-modal-trabajador">
                                                        Atendido por: {esMio(pedidoSel) ? 'Tú' : pedidoSel.trabajador_asignado_nombre}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="gp-modal-seccion">
                                                <h4>👤 Cliente</h4>
                                                <p>{pedidoSel.cliente_nombre_completo} — {pedidoSel.cliente_email}</p>
                                            </div>
                                            {pedidoSel.notas_cliente && (
                                                <div className="gp-modal-seccion">
                                                    <h4>📍 Dirección de envío</h4>
                                                    <p>{pedidoSel.notas_cliente}</p>
                                                </div>
                                            )}
                                            {pedidoSel.numero_guia && (
                                                <div className="gp-modal-seccion">
                                                    <h4>🚚 Guía de envío</h4>
                                                    <p>{pedidoSel.paqueteria} — {pedidoSel.numero_guia}</p>
                                                </div>
                                            )}
                                            <div className="gp-modal-seccion">
                                                <h4>🛍 Productos</h4>
                                                <div className="gp-modal-items">
                                                    {(pedidoSel.items || []).map((item, i) => (
                                                        <div key={i} className="gp-modal-item">
                                                            <img src={item.producto_imagen || PLACEHOLDER} alt={item.producto_nombre}
                                                                onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER; }} />
                                                            <div className="gp-modal-item-info">
                                                                <p className="gp-modal-item-nombre">{item.producto_nombre}</p>
                                                                {item.talla_medida && <p className="gp-modal-item-sub">Talla: {item.talla_medida}</p>}
                                                                {item.nota && <p className="gp-modal-item-sub">Nota: {item.nota}</p>}
                                                                <p className="gp-modal-item-sub">{item.cantidad} × ${parseFloat(String(item.precio_unitario)).toLocaleString('es-MX')}</p>
                                                            </div>
                                                            <p className="gp-modal-item-total">${parseFloat(String(item.subtotal)).toLocaleString('es-MX')}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="gp-modal-totales">
                                                <div className="gp-total-fila"><span>Subtotal</span><span>${parseFloat(String(pedidoSel.subtotal)).toLocaleString('es-MX')}</span></div>
                                                <div className="gp-total-fila"><span>IVA (16%)</span><span>${parseFloat(String(pedidoSel.iva)).toLocaleString('es-MX')}</span></div>
                                                <div className="gp-total-fila gp-total-final"><span>Total</span><span>${parseFloat(String(pedidoSel.total)).toLocaleString('es-MX')}</span></div>
                                            </div>
                                        </>
                                    )}

                                    {modalTipo === 'editar' && (
                                        <div className="gp-modal-form">
                                            <div className="gp-form-grupo">
                                                <label>Dirección de envío</label>
                                                <textarea className="gp-textarea" rows={3} value={editDireccion}
                                                    onChange={e => setEditDireccion(e.target.value)}
                                                    placeholder="Dirección completa del cliente" />
                                            </div>
                                            <div className="gp-form-grupo">
                                                <label>Notas internas</label>
                                                <textarea className="gp-textarea" rows={3} value={editNotas}
                                                    onChange={e => setEditNotas(e.target.value)}
                                                    placeholder="Notas visibles para el cliente..." />
                                            </div>
                                            <div className="gp-form-fila2">
                                                <div className="gp-form-grupo">
                                                    <label>Paquetería</label>
                                                    <input className="gp-input" type="text" value={editPaqueteria}
                                                        onChange={e => setEditPaqueteria(e.target.value)}
                                                        placeholder="Ej: DHL, FedEx, Estafeta" />
                                                </div>
                                                <div className="gp-form-grupo">
                                                    <label>Número de guía</label>
                                                    <input className="gp-input" type="text" value={editGuia}
                                                        onChange={e => setEditGuia(e.target.value)}
                                                        placeholder="Número de rastreo" />
                                                </div>
                                            </div>
                                            <div className="gp-form-grupo">
                                                <label>Fecha estimada de entrega</label>
                                                <input className="gp-input" type="date" value={editFechaEst}
                                                    onChange={e => setEditFechaEst(e.target.value)} />
                                            </div>
                                            {msg && <div className={`gp-msg ${msg.startsWith('✅') ? 'ok' : 'error'}`}>{msg}</div>}
                                            <button className={`gp-btn-actualizar ${msg.startsWith('✅') ? 'gp-btn-guardado' : ''}`}
                                                onClick={guardarDetalles} disabled={cargando || msg.startsWith('✅')}>
                                                {cargando ? '⏳ Guardando...' : msg.startsWith('✅') ? '✅ Guardado' : '💾 Guardar cambios'}
                                            </button>
                                        </div>
                                    )}

                                    {modalTipo === 'cancelar' && (
                                        <div className="gp-modal-form">
                                            <div className="gp-cancelar-aviso">
                                                ⚠️ <strong>¿Estás seguro?</strong> Esta acción cancelará el pedido y restaurará el stock.
                                                El cliente verá el estado como "Cancelado".
                                            </div>
                                            <div className="gp-form-grupo">
                                                <label>Motivo de cancelación <span style={{color:'#e05a6a'}}>*</span></label>
                                                <textarea className="gp-textarea" rows={4}
                                                    placeholder="Ej: Producto sin stock, cliente solicitó cancelación..."
                                                    value={motivoCancelacion}
                                                    onChange={e => setMotivoCancelacion(e.target.value)} />
                                            </div>
                                            {msg && <div className={`gp-msg ${msg.startsWith('✅') ? 'ok' : 'error'}`}>{msg}</div>}
                                            <button className="gp-btn-cancelar-confirm" onClick={cancelarPedido}
                                                disabled={cargando || msg.startsWith('✅')}>
                                                {cargando ? '⏳ Cancelando...' : msg.startsWith('✅') ? '✅ Cancelado' : '🚫 Confirmar cancelación'}
                                            </button>
                                        </div>
                                    )}

                                    {modalTipo === 'cliente' && clienteInfo && (
                                        <div className="gp-cliente-info">
                                            <div className="gp-cliente-avatar">
                                                {clienteInfo.cliente_nombre_completo?.charAt(0).toUpperCase()}
                                            </div>
                                            <h3 className="gp-cliente-nombre-big">{clienteInfo.cliente_nombre_completo}</h3>
                                            <div className="gp-cliente-datos">
                                                <div className="gp-dato-fila">
                                                    <span className="gp-dato-label">📧 Email</span>
                                                    <span className="gp-dato-valor">{clienteInfo.cliente_email || '—'}</span>
                                                </div>
                                                <div className="gp-dato-fila">
                                                    <span className="gp-dato-label">📱 Teléfono</span>
                                                    <span className="gp-dato-valor">{clienteInfo.telefono || clienteInfo.celular || clienteInfo.cliente_telefono || '—'}</span>
                                                </div>
                                                <div className="gp-dato-fila">
                                                    <span className="gp-dato-label">📍 Dirección de envío</span>
                                                    <span className="gp-dato-valor">{clienteInfo.direccion_envio || '—'}</span>
                                                </div>
                                                {clienteInfo.fecha_nacimiento && (
                                                    <div className="gp-dato-fila">
                                                        <span className="gp-dato-label">🎂 Fecha nacimiento</span>
                                                        <span className="gp-dato-valor">
                                                            {new Date(clienteInfo.fecha_nacimiento).toLocaleDateString('es-MX')}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {modalTipo === 'estado' && (
                                        <div className="gp-modal-form">
                                            <div className="gp-estado-actual">
                                                <span>Estado actual:</span> {getBadge(pedidoSel.estado)}
                                            </div>
                                            <div className="gp-form-grupo">
                                                <label>Nuevo estado</label>
                                                <select className="gp-select" value={nuevoEstado}
                                                    onChange={e => setNuevoEstado(e.target.value)}>
                                                    {estados.map(e => (
                                                        <option key={e.value} value={e.value}>{e.label}</option>
                                                    ))}
                                                </select>
                                                {/* ✅ Descripción del estado seleccionado */}
                                                {nuevoEstado && DESCRIPCION_ESTADO[nuevoEstado] && (
                                                    <div className="gp-estado-desc">
                                                        {DESCRIPCION_ESTADO[nuevoEstado]}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="gp-form-grupo">
                                                <label>Nota para el cliente (opcional)</label>
                                                <textarea className="gp-textarea" rows={3} value={notasTrabajador}
                                                    onChange={e => setNotasTrabajador(e.target.value)}
                                                    placeholder="Ej: Tu pedido está listo para envío..." />
                                            </div>
                                            {msg && (
                                                <div className={`gp-msg ${msg.startsWith('✅') ? 'ok' : msg.startsWith('⚠️') ? 'warning' : 'error'}`}>
                                                    {msg}
                                                </div>
                                            )}
                                            <button className={`gp-btn-actualizar ${msg.startsWith('✅') ? 'gp-btn-guardado' : ''}`}
                                                onClick={actualizarEstado} disabled={cargando || msg.startsWith('✅')}>
                                                {cargando ? '⏳ Guardando...' : msg.startsWith('✅') ? '✅ Guardado' : '💾 Guardar cambios'}
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GestionPedidosScreen;