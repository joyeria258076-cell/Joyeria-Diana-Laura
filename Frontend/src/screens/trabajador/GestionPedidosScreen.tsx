// Ruta: Frontend/src/screens/trabajador/GestionPedidosScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
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
    metodo_pago_codigo?: string;
    metodo_pago_nombre?: string;
    metodo_pago_tipo?: string;
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
    fecha_estimada_entrega?: string;
    comprobante_transferencia_url?: string;
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

interface EstadoConfig { value: string; label: string; color: string; }

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

const DESCRIPCION_ESTADO: Record<string, string> = {
    pendiente:      '📋 El pedido fue creado y espera ser tomado por un trabajador.',
    confirmado:     '✅ El trabajador tomó el pedido. El cliente puede realizar el pago.',
    en_preparacion: '🔧 El pago fue recibido. Estás preparando el pedido para envío.',
    enviado:        '🚚 El pedido fue enviado. Indica al cliente cuándo llegará.',
    entregado:      '📦 El pedido llegó al cliente. Proceso completado.',
    cancelado:      '🚫 El pedido será cancelado. El stock será restaurado.',
};

// ✅ Guía de pasos por estado para el trabajador
const GUIA_ESTADO: Record<string, string> = {
    pendiente:      '1️⃣ Revisa los productos · 2️⃣ Toma el pedido · 3️⃣ Confírmalo para que el cliente pueda pagar',
    confirmado:     '1️⃣ Espera el pago del cliente · 2️⃣ Verifica el pago en "Ver detalle" · 3️⃣ Avanza a "En preparación"',
    en_preparacion: '1️⃣ Prepara los productos · 2️⃣ Empácalos · 3️⃣ Marca como "Enviado" cuando salgan',
    enviado:        '1️⃣ Comparte el número de guía si aplica · 2️⃣ Espera confirmación de entrega · 3️⃣ Marca como "Entregado"',
    entregado:      '✅ Pedido completado. No se requieren más acciones.',
    cancelado:      '🚫 Pedido cancelado. El stock fue restaurado automáticamente.',
};

const getEstadosDisponibles = (estados: EstadoConfig[], metodoCodigo?: string): EstadoConfig[] => {
    if (metodoCodigo === 'efectivo')
        return estados.filter(e => ['confirmado', 'entregado', 'cancelado'].includes(e.value));
    if (metodoCodigo === 'transferencia')
        return estados.filter(e => ['confirmado', 'en_preparacion', 'entregado', 'cancelado'].includes(e.value));
    return estados;
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
    if (estado === 'cancelado') return <div className="gp-stepper-cancelado">🚫 Pedido cancelado</div>;
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

const agruparPorFecha = (pedidos: Pedido[]): { label: string; pedidos: Pedido[] }[] => {
    const hoy    = new Date(); hoy.setHours(0,0,0,0);
    const ayer   = new Date(hoy); ayer.setDate(ayer.getDate() - 1);
    const semana = new Date(hoy); semana.setDate(semana.getDate() - 7);
    const grupos: Record<string, Pedido[]> = { 'Hoy': [], 'Ayer': [], 'Esta semana': [], 'Más antiguos': [] };
    pedidos.forEach(p => {
        const fecha = new Date(p.fecha_creacion); fecha.setHours(0,0,0,0);
        if (fecha.getTime() === hoy.getTime())       grupos['Hoy'].push(p);
        else if (fecha.getTime() === ayer.getTime()) grupos['Ayer'].push(p);
        else if (fecha >= semana)                    grupos['Esta semana'].push(p);
        else                                         grupos['Más antiguos'].push(p);
    });
    return Object.entries(grupos).filter(([, ps]) => ps.length > 0).map(([label, ps]) => ({ label, pedidos: ps }));
};

const PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjMWExYTJlIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IiNlY2IyYzMiPvCfp6s8L3RleHQ+PC9zdmc+';
const POLLING_INTERVAL = 20000; // 20 segundos

const GestionPedidosScreen: React.FC = () => {
    const { user } = useAuth();
    const miId = user?.dbId;

    const [pedidos, setPedidos]           = useState<Pedido[]>([]);
    const [loading, setLoading]           = useState(true);
    const [filtroEstado, setFiltroEstado] = useState('');
    const [filtroPagoPendiente, setFiltroPagoPendiente] = useState(false);
    const [agrupar, setAgrupar]           = useState(true);
    const [pedidoSel, setPedidoSel]       = useState<Pedido | null>(null);
    const [modalTipo, setModalTipo]       = useState<ModalTipo>(null);
    const [cargando, setCargando]         = useState(false);
    const [msg, setMsg]                   = useState('');
    const [tomando, setTomando]           = useState(false);
    const [estados, setEstados]           = useState<EstadoConfig[]>([]);
    const pollingRef                      = useRef<ReturnType<typeof setInterval> | null>(null);
    // ✅ Rastrear estados anteriores para polling
    const estadosRef                      = useRef<Record<number, string>>({});

    const [editNotas, setEditNotas]             = useState('');
    const [editFechaEst, setEditFechaEst]       = useState('');
    const [nuevoEstado, setNuevoEstado]         = useState('');
    const [notasTrabajador, setNotasTrabajador] = useState('');
    const [fechaEstModal, setFechaEstModal]     = useState('');
    const [motivoCancelacion, setMotivoCancelacion] = useState('');
    const [clienteInfo, setClienteInfo]         = useState<ClienteInfo | null>(null);

    useEffect(() => {
        cargarEstados();
        cargarPedidos();
        // ✅ Polling para detectar nuevos comprobantes o cambios
        pollingRef.current = setInterval(() => pollPedidos(), POLLING_INTERVAL);
        return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
    }, []);

    useEffect(() => { cargarPedidos(); }, [filtroEstado]);

    // ✅ Polling ligero para detectar comprobantes nuevos y cambios en pedidos
    const pollPedidos = async () => {
        try {
            const data = await carritoAPI.getAllPedidos(undefined);
            if (!data.success) return;
            const nuevos: Pedido[] = data.data || [];
            let hayCambios = false;
            nuevos.forEach(p => {
                if (estadosRef.current[p.id] !== p.estado) {
                    hayCambios = true;
                }
                estadosRef.current[p.id] = p.estado;
            });
            if (hayCambios) setPedidos(nuevos);
        } catch { /* silencioso */ }
    };

    const cargarEstados = async () => {
        try {
            const data = await carritoAPI.getEstadosPedido();
            if (data.success) {
                setEstados(data.data.map((valor: string) => ({
                    value: valor, label: labelEstado(valor),
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
            if (data.success) {
                const nuevos = data.data || [];
                nuevos.forEach((p: Pedido) => { estadosRef.current[p.id] = p.estado; });
                setPedidos(nuevos);
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const abrirModal = async (pedido: Pedido, tipo: ModalTipo) => {
        setPedidoSel(pedido); setModalTipo(tipo); setMsg('');
        if (tipo === 'editar') {
            setEditNotas(pedido.notas_internas || '');
            setEditFechaEst(pedido.fecha_estimada_entrega?.split('T')[0] || '');
        }
        if (tipo === 'estado') {
            const disponibles = getEstadosDisponibles(estados, pedido.metodo_pago_codigo);
            const estadoInicial = disponibles.find(e => e.value === pedido.estado)
                ? pedido.estado : disponibles[0]?.value || pedido.estado;
            setNuevoEstado(estadoInicial);
            setNotasTrabajador(pedido.notas_internas || '');
            // ✅ Solo pre-llenar fecha si ya tiene una
            setFechaEstModal(pedido.fecha_estimada_entrega?.split('T')[0] || '');
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
                notas_internas: editNotas,
                fecha_estimada_entrega: editFechaEst
            });
            setPedidos(prev => prev.map(p =>
                p.id === pedidoSel.id ? { ...p, notas_internas: editNotas, fecha_estimada_entrega: editFechaEst } : p
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
            setMsg('✅ Pedido cancelado. Puedes cerrar esta ventana.');
        } catch (err: any) { setMsg(`❌ ${err.message}`); }
        finally { setCargando(false); }
    };

    const actualizarEstado = async () => {
        if (!pedidoSel) return;
        setCargando(true); setMsg('');
        try {
            await carritoAPI.actualizarEstado(pedidoSel.id, nuevoEstado, notasTrabajador);
            // ✅ Guardar fecha estimada solo si se proporcionó una nueva
            if (fechaEstModal && fechaEstModal !== (pedidoSel.fecha_estimada_entrega?.split('T')[0] || '')) {
                await carritoAPI.editarDetalles(pedidoSel.id, { fecha_estimada_entrega: fechaEstModal });
            }
            const label = estados.find(e => e.value === nuevoEstado)?.label || nuevoEstado;
            setPedidos(prev => prev.map(p => p.id === pedidoSel.id ? {
                ...p, estado: nuevoEstado,
                fecha_estimada_entrega: fechaEstModal || p.fecha_estimada_entrega
            } : p));
            setPedidoSel(prev => prev ? {
                ...prev, estado: nuevoEstado, notas_internas: notasTrabajador,
                fecha_estimada_entrega: fechaEstModal || prev.fecha_estimada_entrega
            } : prev);
            setMsg(`✅ ¡Listo! Estado actualizado a "${label}". Puedes cerrar esta ventana.`);
        } catch (err: any) {
            const rawMsg = err.message || '';
            if (rawMsg.includes('pago') || rawMsg.includes('pagado'))
                setMsg(`⚠️ No puedes marcar como "${labelEstado(nuevoEstado)}" — el cliente aún no ha realizado el pago.`);
            else if (rawMsg.includes('regresar') || rawMsg.includes('avanzar'))
                setMsg(`⚠️ ${rawMsg}`);
            else
                setMsg(`❌ ${rawMsg}`);
        }
        finally { setCargando(false); }
    };

    const confirmarPagoEfectivo = async () => {
        if (!pedidoSel) return;
        setCargando(true); setMsg('');
        try {
            await carritoAPI.confirmarPagoEfectivo(pedidoSel.id);
            setPedidos(prev => prev.map(p => p.id === pedidoSel.id ? { ...p, estado_pago: 'aprobado', estado: 'en_preparacion' } : p));
            setPedidoSel(prev => prev ? { ...prev, estado_pago: 'aprobado', estado: 'en_preparacion' } : prev);
            setMsg('✅ Pago confirmado correctamente.');
        } catch (err: any) { setMsg(`❌ ${err.message}`); }
        finally { setCargando(false); }
    };

    const getBadge = (estado: string) => {
        const cfg = estados.find(e => e.value === estado) || { label: labelEstado(estado), color: COLOR_DEFAULT };
        return <span className="gp-badge" style={{ background: cfg.color, color: '#0f0f12' }}>{cfg.label}</span>;
    };

    const getBadgePago = (pedido: Pedido) => {
        if (pedido.estado_pago === 'aprobado')
            return <span className="gp-pago-badge gp-pago-aprobado">💳 Pagado</span>;
        const codigo = pedido.metodo_pago_codigo || '';
        if (codigo === 'efectivo') return <span className="gp-pago-badge gp-pago-efectivo">💵 Efectivo</span>;
        if (codigo === 'transferencia') return <span className="gp-pago-badge gp-pago-transferencia">🏦 Transferencia</span>;
        return <span className="gp-pago-badge gp-pago-pendiente">⏳ Sin pago</span>;
    };

    // ✅ Fix UTC — hora correcta México
    const formatFecha = (f: string) => {
        if (!f) return '—';
        return new Date(f).toLocaleString('es-MX', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
            timeZone: 'America/Mexico_City'
        });
    };

    const formatFechaSolo = (f: string) => {
        if (!f) return '—';
        if (/^\d{4}-\d{2}-\d{2}$/.test(f)) {
            const [y, m, d] = f.split('-');
            return `${d}/${m}/${y}`;
        }
        return new Date(f).toLocaleDateString('es-MX', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            timeZone: 'America/Mexico_City'
        });
    };

    const contar = (estado: string) => pedidos.filter(p => p.estado === estado).length;
    const esMio = (p: Pedido) => p.trabajador_id === miId;
    const estaAsignado = (p: Pedido) => !!p.trabajador_id;
    const puedoTomar = (p: Pedido) => p.estado === 'pendiente' && !estaAsignado(p);
    const puedoEditar = (p: Pedido) => esMio(p) || user?.rol === 'admin';

    const pedidosFiltrados = pedidos.filter(p => {
        if (filtroPagoPendiente)
            return !['cancelado','entregado'].includes(p.estado) && p.estado_pago !== 'aprobado';
        return true;
    });

    const grupos = agrupar ? agruparPorFecha(pedidosFiltrados) : [{ label: '', pedidos: pedidosFiltrados }];

    const renderFilaPedido = (pedido: Pedido) => (
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
                {getBadgePago(pedido)}
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
                    <button className="gp-btn-tomar" onClick={() => tomarPedido(pedido)} disabled={tomando}>🙋 Tomar</button>
                )}
                <div className="gp-acciones-menu">
                    <button className="gp-btn-accion" title="Ver detalle" onClick={() => abrirModal(pedido, 'detalle')}>👁</button>
                    {puedoEditar(pedido) && (
                        <>
                            <button className="gp-btn-accion" title="Editar detalles" onClick={() => abrirModal(pedido, 'editar')}>✏️</button>
                            <button className="gp-btn-accion gp-btn-cancelar" title="Cancelar pedido"
                                onClick={() => abrirModal(pedido, 'cancelar')}
                                disabled={['cancelado','entregado'].includes(pedido.estado)}>🚫</button>
                            <button className="gp-btn-accion gp-btn-estado" title="Cambiar estado"
                                onClick={() => abrirModal(pedido, 'estado')}>🔄</button>
                        </>
                    )}
                    <button className="gp-btn-accion" title="Datos cliente" onClick={() => abrirModal(pedido, 'cliente')}>👤</button>
                </div>
            </td>
        </tr>
    );

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
                <label className="gp-filtro-pago">
                    <input type="checkbox" checked={agrupar}
                        onChange={e => setAgrupar(e.target.checked)} />
                    📅 Agrupar por fecha
                </label>
                {(filtroEstado || filtroPagoPendiente) && (
                    <button className="gp-btn-limpiar" onClick={() => { setFiltroEstado(''); setFiltroPagoPendiente(false); }}>✕ Limpiar</button>
                )}
            </div>

            {loading ? (
                <div className="gp-loading"><div className="gp-spinner" /><p>Cargando pedidos...</p></div>
            ) : pedidosFiltrados.length === 0 ? (
                <div className="gp-vacio">No hay pedidos{filtroEstado ? ` con estado "${filtroEstado}"` : ''}.</div>
            ) : (
                <div className="gp-tabla-wrap">
                    {grupos.map(({ label, pedidos: ps }) => (
                        <div key={label}>
                            {label && (
                                <div className="gp-grupo-label">
                                    <span>{label}</span>
                                    <span className="gp-grupo-count">{ps.length} pedido{ps.length !== 1 ? 's' : ''}</span>
                                </div>
                            )}
                            <table className="gp-tabla">
                                <thead>
                                    <tr>
                                        <th>Folio</th><th>Cliente</th><th>Prods.</th>
                                        <th>Fecha</th><th>Total</th><th>Estado</th>
                                        <th>Asignado</th><th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>{ps.map(renderFilaPedido)}</tbody>
                            </table>
                        </div>
                    ))}
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
                                            <StepperPedido estado={pedidoSel.estado} estado_pago={pedidoSel.estado_pago || 'pendiente'} />

                                            {/* ✅ Guía paso a paso para el trabajador */}
                                            {GUIA_ESTADO[pedidoSel.estado] && (
                                                <div className="gp-guia-pasos">
                                                    <span className="gp-guia-titulo">📌 ¿Qué sigue?</span>
                                                    <p>{GUIA_ESTADO[pedidoSel.estado]}</p>
                                                </div>
                                            )}

                                            <div className="gp-modal-estado">
                                                {getBadge(pedidoSel.estado)}
                                                {getBadgePago(pedidoSel)}
                                                {pedidoSel.trabajador_asignado_nombre && (
                                                    <span className="gp-modal-trabajador">
                                                        Atendido por: {esMio(pedidoSel) ? 'Tú' : pedidoSel.trabajador_asignado_nombre}
                                                    </span>
                                                )}
                                            </div>

                                            {pedidoSel.metodo_pago_nombre && (
                                                <div className="gp-modal-seccion">
                                                    <h4>💳 Método de pago</h4>
                                                    <p>{pedidoSel.metodo_pago_nombre}</p>
                                                </div>
                                            )}

                                            {/* ✅ Comprobante de transferencia */}
                                            {pedidoSel.metodo_pago_codigo === 'transferencia' && (
                                                <div className="gp-modal-seccion">
                                                    <h4>📎 Comprobante de transferencia</h4>
                                                    {(pedidoSel as any).comprobante_transferencia_url ? (
                                                        <div className="gp-comprobante-wrap">
                                                            <img
                                                                src={(pedidoSel as any).comprobante_transferencia_url}
                                                                alt="Comprobante de transferencia"
                                                                className="gp-comprobante-img"
                                                                onClick={() => window.open((pedidoSel as any).comprobante_transferencia_url, '_blank')}
                                                            />
                                                            <p className="gp-comprobante-hint">🔍 Clic para ver en tamaño completo</p>
                                                        </div>
                                                    ) : (
                                                        <p className="gp-comprobante-pendiente">⏳ El cliente aún no ha subido el comprobante.</p>
                                                    )}
                                                </div>
                                            )}

                                            {/* ✅ Confirmar pago efectivo/transferencia */}
                                            {pedidoSel.estado_pago !== 'aprobado' &&
                                             ['efectivo','transferencia'].includes(pedidoSel.metodo_pago_codigo || '') &&
                                             ['confirmado','en_preparacion','enviado'].includes(pedidoSel.estado) && (
                                                <div className="gp-confirmar-pago">
                                                    <p>
                                                        {pedidoSel.metodo_pago_codigo === 'efectivo'
                                                            ? '💵 Confirma que recibiste el pago en efectivo del cliente.'
                                                            : '🏦 Revisa el comprobante y confirma que la transferencia fue recibida.'}
                                                    </p>
                                                    {msg && <div className={`gp-msg ${msg.startsWith('✅') ? 'ok' : 'error'}`}>{msg}</div>}
                                                    <button className="gp-btn-confirmar-pago" onClick={confirmarPagoEfectivo}
                                                        disabled={cargando || msg.startsWith('✅')}>
                                                        {cargando ? '⏳ Confirmando...' : msg.startsWith('✅') ? '✅ Pago confirmado' : '✅ Confirmar pago recibido'}
                                                    </button>
                                                </div>
                                            )}

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
                                            {pedidoSel.fecha_estimada_entrega && (
                                                <div className="gp-modal-seccion">
                                                    <h4>📅 Fecha estimada de entrega</h4>
                                                    <p>{formatFechaSolo(pedidoSel.fecha_estimada_entrega)}</p>
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
                                                <label>Notas para el cliente</label>
                                                <textarea className="gp-textarea" rows={3} value={editNotas}
                                                    onChange={e => setEditNotas(e.target.value)}
                                                    placeholder="Notas visibles para el cliente..." />
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
                                                    <span className="gp-dato-label">📍 Dirección</span>
                                                    <span className="gp-dato-valor">{clienteInfo.direccion_envio || '—'}</span>
                                                </div>
                                                {clienteInfo.fecha_nacimiento && (
                                                    <div className="gp-dato-fila">
                                                        <span className="gp-dato-label">🎂 Nacimiento</span>
                                                        <span className="gp-dato-valor">{new Date(clienteInfo.fecha_nacimiento).toLocaleDateString('es-MX')}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {modalTipo === 'estado' && (
                                        <div className="gp-modal-form">
                                            <div className="gp-estado-actual">
                                                <span>Estado actual:</span> {getBadge(pedidoSel.estado)}
                                                {pedidoSel.metodo_pago_nombre && (
                                                    <span className="gp-metodo-tag">💳 {pedidoSel.metodo_pago_nombre}</span>
                                                )}
                                            </div>
                                            <div className="gp-form-grupo">
                                                <label>Nuevo estado</label>
                                                <select className="gp-select" value={nuevoEstado}
                                                    onChange={e => setNuevoEstado(e.target.value)}>
                                                    {getEstadosDisponibles(estados, pedidoSel.metodo_pago_codigo).map(e => (
                                                        <option key={e.value} value={e.value}>{e.label}</option>
                                                    ))}
                                                </select>
                                                {nuevoEstado && DESCRIPCION_ESTADO[nuevoEstado] && (
                                                    <div className="gp-estado-desc">{DESCRIPCION_ESTADO[nuevoEstado]}</div>
                                                )}
                                            </div>

                                            {/* ✅ Aviso para confirmar pago primero */}
                                            {['efectivo','transferencia'].includes(pedidoSel.metodo_pago_codigo || '') &&
                                             pedidoSel.estado_pago !== 'aprobado' &&
                                             ['en_preparacion','enviado','entregado'].includes(nuevoEstado) && (
                                                <div className="gp-aviso-pago-manual">
                                                    💡 Para avanzar a este estado, primero confirma el pago del cliente en <strong>👁 Ver detalle</strong> del pedido.
                                                </div>
                                            )}

                                            {/* ✅ Fecha estimada — solo si no tiene o si es la primera vez */}
                                            {['confirmado','en_preparacion','enviado','entregado'].includes(nuevoEstado) && (
                                                <div className="gp-form-grupo">
                                                    <label>📅 Fecha estimada de entrega {pedidoSel.fecha_estimada_entrega ? '(actualizar)' : '(opcional)'}</label>
                                                    <input className="gp-input" type="date" value={fechaEstModal}
                                                        onChange={e => setFechaEstModal(e.target.value)} />
                                                    {!pedidoSel.fecha_estimada_entrega && (
                                                        <small style={{ color: '#8a7a82', fontSize: '0.72rem' }}>
                                                            Puedes indicar cuándo estará listo el pedido. El cliente lo verá en sus pedidos.
                                                        </small>
                                                    )}
                                                </div>
                                            )}

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