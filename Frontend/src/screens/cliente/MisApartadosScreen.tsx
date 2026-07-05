// Ruta: Frontend/src/screens/cliente/MisApartadosScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apartadoAPI, carritoAPI, productsAPI } from '../../services/api';
import './MisApartadosScreen.css';

interface Abono {
    id: number;
    monto: number;
    monto_antes: number;
    monto_despues: number;
    fecha_abono: string;
    fecha_limite_siguiente: string | null;
    estado: string;
    metodo_pago_id: number;
    comprobante_url: string | null;
    notas: string | null;
}

interface AbonoPendiente {
    id: number;
    monto: number;
    monto_antes: number;
    fecha_creacion: string;
    comprobante_url: string | null;
    metodo_nombre: string;
    metodo_codigo: string;
}

interface Apartado {
    id: number;
    folio: string;
    venta_folio: string;
    monto_total: number;
    monto_minimo_inicial: number;
    monto_pagado: number;
    saldo_pendiente: number;
    fecha_apartado: string;
    fecha_limite_liquidacion: string;
    fecha_liquidacion_real: string | null;
    estado: 'pendiente_pago' | 'activo' | 'liquidado' | 'cancelado' | 'vencido';
    advertencia_enviada: boolean;
    productos: { nombre: string; cantidad: number; precio_unitario: number; imagen: string }[] | null;
    abonos: Abono[] | null;
    total_abonos: number;
    abono_pendiente: AbonoPendiente | null;
}

interface MetodoPago {
    id: number;
    nombre: string;
    codigo: string;
    es_pasarela: boolean;
}

const ESTADO_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
    pendiente_pago: { label: 'Pendiente de pago', color: '#a78bfa', icon: '🕐' },
    activo:         { label: 'Activo',             color: '#6bcb77', icon: '🟢' },
    liquidado:      { label: 'Liquidado',           color: '#ecb2c3', icon: '✅' },
    cancelado:      { label: 'Cancelado',           color: '#e74c3c', icon: '❌' },
    vencido:        { label: 'Vencido',             color: '#f39c12', icon: '⚠️' },
};

const ICONOS_METODO: Record<string, string> = {
    mercadopago:   '🛒',
    paypal:        '🅿️',
    transferencia: '🏦',
    efectivo:      '💵',
};

const fmtFecha = (f: string) => {
    if (!f) return '—';
    if (f.length > 10) {
        return new Date(f).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Mexico_City' });
    }
    const [y, m, d] = f.substring(0, 10).split('-').map(Number);
    if (!y || !m || !d) return '—';
    return new Date(y, m - 1, d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtMoneda = (n: number) =>
    `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

// ── Modal de pago inicial ─────────────────────────────────────
interface ModalPagoProps {
    apartado: Apartado;
    metodosPago: MetodoPago[];
    onCerrar: () => void;
    onExito: () => void;
}

const ModalPago: React.FC<ModalPagoProps> = ({ apartado, metodosPago, onCerrar, onExito }) => {
    const [metodoPagoId, setMetodoPagoId]   = useState<number | null>(null);
    const [comprobante, setComprobante]     = useState<File | null>(null);
    const [procesando, setProcesando]       = useState(false);
    const [error, setError]                 = useState('');
    const fileRef                           = useRef<HTMLInputElement>(null);

    const metodoSeleccionado = metodosPago.find(m => m.id === metodoPagoId);

    const handlePagar = async () => {
        if (!metodoPagoId || !metodoSeleccionado) {
            setError('Selecciona un método de pago.'); return;
        }
        setProcesando(true); setError('');
        try {
            // Efectivo — solo notifica, el trabajador confirma
            if (metodoSeleccionado.codigo === 'efectivo') {
                onExito();
                return;
            }

            // Transferencia — subir comprobante
            if (metodoSeleccionado.codigo === 'transferencia') {
                if (!comprobante) {
                    setError('Debes subir el comprobante de transferencia.'); return;
                }
                const res = await apartadoAPI.subirComprobante(apartado.id, comprobante);
                if (!res.success) throw new Error(res.message);
                onExito();
                return;
            }

            // MercadoPago
            if (metodoSeleccionado.codigo === 'mercadopago') {
                const res = await apartadoAPI.crearPreferenciaMP(apartado.id);
                if (!res.success) throw new Error(res.message);
                const url = res.data.sandbox_init_point || res.data.init_point;
                window.location.href = url;
                return;
            }

            // PayPal
            if (metodoSeleccionado.codigo === 'paypal') {
                const res = await apartadoAPI.crearOrdenPayPal(apartado.id);
                if (!res.success) throw new Error(res.message);
                window.location.href = res.data.approve_url;
                return;
            }
        } catch (err: any) {
            setError(err.message || 'Error al procesar el pago.');
        } finally { setProcesando(false); }
    };

    return (
        <div className="mapt-overlay" onClick={onCerrar}>
            <div className="mapt-modal" onClick={e => e.stopPropagation()}>
                <div className="mapt-modal-header">
                    <h3>💳 Realizar pago inicial — {apartado.folio}</h3>
                    <button className="mapt-modal-close" onClick={onCerrar}>×</button>
                </div>
                <div className="mapt-modal-body">
                    <div className="mapt-modal-resumen">
                        <div className="mapt-resumen-fila">
                            <span>Monto a pagar ahora</span>
                            <strong style={{ color: '#6bcb77' }}>{fmtMoneda(apartado.monto_pagado)}</strong>
                        </div>
                        <div className="mapt-resumen-fila">
                            <span>Total del apartado</span>
                            <strong>{fmtMoneda(apartado.monto_total)}</strong>
                        </div>
                    </div>

                    <div className="mapt-form-group">
                        <label>Método de pago <span className="mapt-req">*</span></label>
                        <div className="mapt-metodos">
                            {metodosPago.map(m => (
                                <label key={m.id} className={`mapt-metodo-opt ${metodoPagoId === m.id ? 'sel' : ''}`}>
                                    <input type="radio" name="metodo_pago_inicial"
                                        checked={metodoPagoId === m.id}
                                        onChange={() => setMetodoPagoId(m.id)} />
                                    <span>{ICONOS_METODO[m.codigo] || '💰'}</span>
                                    <span>{m.nombre}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Info por método */}
                    {metodoSeleccionado?.codigo === 'efectivo' && (
                        <div className="mapt-metodo-info">
                            💵 Acércate a la tienda y realiza el pago en efectivo. El trabajador confirmará tu apartado al recibirlo.
                        </div>
                    )}
                    {metodoSeleccionado?.codigo === 'transferencia' && (
                        <div className="mapt-form-group">
                            <div className="mapt-metodo-info">
                                🏦 Realiza la transferencia y sube tu comprobante. El trabajador lo verificará.
                            </div>
                            <label style={{ marginTop: '12px' }}>
                                Comprobante de transferencia <span className="mapt-req">*</span>
                            </label>
                            <div className="mapt-upload-area" onClick={() => fileRef.current?.click()}>
                                {comprobante
                                    ? <span>📎 {comprobante.name}</span>
                                    : <span>📤 Toca para subir comprobante</span>
                                }
                                <input ref={fileRef} type="file" accept="image/*"
                                    style={{ display: 'none' }}
                                    onChange={e => setComprobante(e.target.files?.[0] || null)} />
                            </div>
                        </div>
                    )}
                    {metodoSeleccionado?.codigo === 'mercadopago' && (
                        <div className="mapt-metodo-info">
                            🛒 Serás redirigido a MercadoPago para completar el pago de <strong>{fmtMoneda(apartado.monto_pagado)}</strong>.
                        </div>
                    )}
                    {metodoSeleccionado?.codigo === 'paypal' && (
                        <div className="mapt-metodo-info">
                            🅿️ Serás redirigido a PayPal para completar el pago de <strong>{fmtMoneda(apartado.monto_pagado)}</strong>.
                        </div>
                    )}

                    {error && <div className="mapt-error-msg">⚠️ {error}</div>}
                </div>
                <div className="mapt-modal-footer">
                    <button className="mapt-btn-sec" onClick={onCerrar}>Cancelar</button>
                    <button className="mapt-btn-primario" onClick={handlePagar} disabled={procesando}>
                        {procesando ? '⏳ Procesando...' : '💳 Proceder al pago'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Modal registrar abono (cliente) ──────────────────────────
interface ModalAbonoClienteProps {
    apartado: Apartado;
    metodosPago: MetodoPago[];
    onCerrar: () => void;
    onExito: () => void;
}

const ModalAbonoCliente: React.FC<ModalAbonoClienteProps> = ({ apartado, metodosPago, onCerrar, onExito }) => {
    const [metodoPagoId, setMetodoPagoId] = useState<number | null>(null);
    const [monto, setMonto]               = useState('');
    const [comprobante, setComprobante]   = useState<File | null>(null);
    const [procesando, setProcesando]     = useState(false);
    const [error, setError]               = useState('');
    const fileRef                         = useRef<HTMLInputElement>(null);

    const metodoSel = metodosPago.find(m => m.id === metodoPagoId);
    const montoNum  = parseFloat(monto) || 0;

    const handleEnviar = async () => {
        if (!metodoPagoId || !metodoSel) { setError('Selecciona un método de pago.'); return; }
        if (!monto || montoNum <= 0)     { setError('Ingresa un monto válido.'); return; }
        if (montoNum > parseFloat(String(apartado.saldo_pendiente)))
            { setError(`El monto no puede superar el saldo pendiente (${fmtMoneda(apartado.saldo_pendiente)}).`); return; }
        if (metodoSel.codigo === 'transferencia' && !comprobante)
            { setError('Debes subir el comprobante de transferencia.'); return; }

        setProcesando(true); setError('');
        try {
            const res = await apartadoAPI.solicitarAbono(
                apartado.id,
                { monto: montoNum, metodo_pago_id: metodoPagoId },
                metodoSel.codigo === 'transferencia' ? comprobante || undefined : undefined
            );
            if (!res.success) throw new Error(res.message);

            if (res.data?.requiere_pago_externo) {
                if (metodoSel.codigo === 'mercadopago') {
                    const mpRes = await apartadoAPI.crearPreferenciaMPAbono(res.data.abono_id);
                    if (!mpRes.success) throw new Error(mpRes.message);
                    window.location.href = mpRes.data.sandbox_init_point || mpRes.data.init_point;
                    return;
                }
                if (metodoSel.codigo === 'paypal') {
                    const ppRes = await apartadoAPI.crearOrdenPayPalAbono(res.data.abono_id);
                    if (!ppRes.success) throw new Error(ppRes.message);
                    window.location.href = ppRes.data.approve_url;
                    return;
                }
            }
            onExito();
        } catch (err: any) {
            setError(err.message || 'Error al registrar el abono.');
        } finally { setProcesando(false); }
    };

    const metodosDisponibles = metodosPago;

    return (
        <div className="mapt-overlay" onClick={onCerrar}>
            <div className="mapt-modal" onClick={e => e.stopPropagation()}>
                <div className="mapt-modal-header">
                    <h3>💰 Registrar abono — {apartado.folio}</h3>
                    <button className="mapt-modal-close" onClick={onCerrar}>×</button>
                </div>
                <div className="mapt-modal-body">
                    <div className="mapt-modal-resumen">
                        <div className="mapt-resumen-fila">
                            <span>Saldo pendiente</span>
                            <strong style={{ color: '#ecb2c3' }}>{fmtMoneda(apartado.saldo_pendiente)}</strong>
                        </div>
                        {montoNum > 0 && (
                            <div className="mapt-resumen-fila">
                                <span>Saldo tras este abono</span>
                                <strong style={{ color: montoNum >= parseFloat(String(apartado.saldo_pendiente)) ? '#6bcb77' : '#e0e0e0' }}>
                                    {fmtMoneda(Math.max(0, parseFloat(String(apartado.saldo_pendiente)) - montoNum))}
                                </strong>
                            </div>
                        )}
                    </div>

                    <div className="mapt-form-group">
                        <label>Monto a abonar <span className="mapt-req">*</span></label>
                        <input type="number" className="mapt-input" style={{ width: '100%', marginTop: 4 }}
                            placeholder={`Máx: ${fmtMoneda(apartado.saldo_pendiente)}`}
                            min={1} max={parseFloat(String(apartado.saldo_pendiente))}
                            value={monto} onChange={e => setMonto(e.target.value)} />
                    </div>

                    <div className="mapt-form-group">
                        <label>Método de pago <span className="mapt-req">*</span></label>
                        <div className="mapt-metodos">
                            {metodosDisponibles.map(m => (
                                <label key={m.id} className={`mapt-metodo-opt ${metodoPagoId === m.id ? 'sel' : ''}`}>
                                    <input type="radio" name="metodo_abono"
                                        checked={metodoPagoId === m.id}
                                        onChange={() => { setMetodoPagoId(m.id); setComprobante(null); }} />
                                    <span>{ICONOS_METODO[m.codigo] || '💰'}</span>
                                    <span>{m.nombre}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="mapt-metodo-info" style={{ marginBottom: 8, fontSize: '0.82em', opacity: 0.85 }}>
                        💡 Puedes realizar tu abono con el método de tu preferencia: en línea, transferencia o en efectivo en tienda.
                    </div>

                    {metodoSel?.codigo === 'efectivo' && (
                        <div className="mapt-metodo-info">
                            💵 Acércate a la tienda y realiza tu abono en efectivo. El trabajador lo registrará y confirmará.
                        </div>
                    )}
                    {metodoSel?.codigo === 'transferencia' && (
                        <div className="mapt-form-group">
                            <div className="mapt-metodo-info">
                                🏦 Realiza la transferencia y sube tu comprobante. El trabajador lo verificará y confirmará tu abono.
                            </div>
                            <label style={{ marginTop: '12px' }}>
                                Comprobante <span className="mapt-req">*</span>
                            </label>
                            <div className="mapt-upload-area" onClick={() => fileRef.current?.click()}>
                                {comprobante ? <span>📎 {comprobante.name}</span> : <span>📤 Toca para subir comprobante</span>}
                                <input ref={fileRef} type="file" accept="image/*"
                                    style={{ display: 'none' }}
                                    onChange={e => setComprobante(e.target.files?.[0] || null)} />
                            </div>
                        </div>
                    )}
                    {metodoSel?.codigo === 'mercadopago' && (
                        <div className="mapt-metodo-info">
                            🛒 Serás redirigido a MercadoPago para pagar <strong>{montoNum > 0 ? fmtMoneda(montoNum) : '…'}</strong>. El pago se confirmará automáticamente.
                        </div>
                    )}
                    {metodoSel?.codigo === 'paypal' && (
                        <div className="mapt-metodo-info">
                            🅿️ Serás redirigido a PayPal para pagar <strong>{montoNum > 0 ? fmtMoneda(montoNum) : '…'}</strong>. El pago se confirmará automáticamente.
                        </div>
                    )}

                    {error && <div className="mapt-error-msg">⚠️ {error}</div>}
                </div>
                <div className="mapt-modal-footer">
                    <button className="mapt-btn-sec" onClick={onCerrar}>Cancelar</button>
                    <button className="mapt-btn-primario" onClick={handleEnviar}
                        disabled={procesando || !metodoPagoId || !monto || parseFloat(monto) <= 0}>
                        {procesando ? '⏳ Procesando...' : !metodoPagoId ? 'Selecciona un método de pago' : '💰 Enviar abono'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Pantalla principal ────────────────────────────────────────
const MisApartadosScreen: React.FC = () => {
    const navigate  = useNavigate();
    const location  = useLocation();
    const [apartados, setApartados]     = useState<Apartado[]>([]);
    const [cargando, setCargando]       = useState(true);
    const [error, setError]             = useState('');
    const [expandido, setExpandido]     = useState<number | null>(null);
    const [filtro, setFiltro]           = useState<string>('todos');
    const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);
    const [modalPago, setModalPago]     = useState<Apartado | null>(null);
    const [modalAbono, setModalAbono]   = useState<Apartado | null>(null);
    const [msgExito, setMsgExito]       = useState('');
    const [diasEntrega, setDiasEntrega] = useState<number | null>(null);

    useEffect(() => {
        cargarDatos();
        // Verificar si viene de redirección de pago
        const params = new URLSearchParams(location.search);
        const pago   = params.get('pago');
        const aptId  = params.get('apartado');
        const metodo = params.get('metodo');

        const abonoId = params.get('abono');

        if (pago === 'exitoso' && aptId) {
            const token = params.get('token');
            if (metodo === 'paypal' && token) {
                capturarPayPal(parseInt(aptId), token);
            } else {
                setMsgExito('✅ ¡Pago realizado! Tu apartado está siendo confirmado.');
            }
        } else if (pago === 'exitoso' && abonoId) {
            const token = params.get('token');
            if (metodo === 'paypal' && token) {
                capturarPayPalAbono(parseInt(abonoId), token);
            } else {
                setMsgExito('✅ ¡Abono realizado! Se confirmará automáticamente.');
                cargarDatos();
            }
        } else if (pago === 'fallido') {
            setError('⚠️ El pago no fue completado. Intenta de nuevo.');
        }
    }, []);

    const capturarPayPalAbono = async (abono_id: number, order_id: string) => {
        try {
            const res = await apartadoAPI.capturarPayPalAbono(abono_id, order_id);
            if (res.success) {
                setMsgExito('✅ ¡Abono PayPal confirmado!');
                cargarDatos();
            }
        } catch { }
    };

    const capturarPayPal = async (apartado_id: number, order_id: string) => {
        try {
            const res = await apartadoAPI.capturarPayPal(apartado_id, order_id);
            if (res.success) {
                setMsgExito('✅ ¡Pago PayPal confirmado! Tu apartado está activo.');
                cargarDatos();
            }
        } catch { }
    };

    const cargarDatos = async () => {
        setCargando(true); setError('');
        try {
            const [aptRes, mpRes, cfgRes]: any[] = await Promise.all([
                apartadoAPI.getMisApartados(),
                carritoAPI.getMetodosPago(),
                productsAPI.getConfiguracionByClave('dias_entrega_default')
            ]);
            if (aptRes.success) setApartados(aptRes.data);
            if (mpRes.success)  setMetodosPago(mpRes.data?.metodos || []);
            if (cfgRes?.success && cfgRes?.data?.valor) setDiasEntrega(parseInt(cfgRes.data.valor));
        } catch {
            setError('No se pudieron cargar tus apartados.');
        } finally { setCargando(false); }
    };

    const apartadosFiltrados = filtro === 'todos'
        ? apartados
        : apartados.filter(a => a.estado === filtro);

    const porcentajePagado = (a: Apartado) =>
        Math.min(100, Math.round((Number(a.monto_pagado) / Number(a.monto_total)) * 100));

    const estadoVisual = (a: Apartado): { icon: string; label: string; color: string } => {
        if (a.estado === 'liquidado')       return { icon: '✅', label: 'Liquidado',   color: '#ecb2c3' };
        if (a.estado === 'cancelado')       return { icon: '❌', label: 'Cancelado',   color: '#e74c3c' };
        if (a.estado === 'vencido')         return { icon: '⚠️', label: 'Vencido',     color: '#f39c12' };
        if (a.estado === 'pendiente_pago')  return { icon: '⏳', label: 'Pendiente',   color: '#a78bfa' };
        const pct = porcentajePagado(a);
        if (pct < 50)  return { icon: '🔒', label: 'Reservado',   color: '#60a5fa' };
        if (pct < 100) return { icon: '📦', label: 'En proceso',  color: '#f59e0b' };
        return { icon: '✅', label: 'Liquidado', color: '#ecb2c3' };
    };

    const onPagoExito = () => {
        setModalPago(null);
        setMsgExito('✅ Pago registrado. El trabajador lo confirmará pronto.');
        cargarDatos();
    };

    if (cargando) return (
        <main className="mapt-body">
            <div className="mapt-loading"><div className="mapt-spinner" /><p>Cargando tus apartados...</p></div>
        </main>
    );

    return (
        <main className="mapt-body">
            <nav className="mapt-breadcrumb">
                <button className="mapt-back-btn" onClick={() => navigate('/inicio')}>← Inicio</button>
                <span>/</span>
                <span>Mis Apartados</span>
            </nav>

            <h1 className="mapt-titulo">🔖 Mis Apartados</h1>

            {msgExito && (
                <div className="mapt-exito-banner">
                    {msgExito}
                    <button onClick={() => setMsgExito('')}>×</button>
                </div>
            )}
            {error && <div className="mapt-error">⚠️ {error}</div>}

            {/* Filtros */}
            <div className="mapt-filtros">
                {['todos', 'pendiente_pago', 'activo', 'liquidado', 'cancelado', 'vencido'].map(f => (
                    <button key={f}
                        className={`mapt-filtro-btn ${filtro === f ? 'activo' : ''}`}
                        onClick={() => setFiltro(f)}>
                        {f === 'todos' ? 'Todos' : ESTADO_CONFIG[f]?.icon + ' ' + ESTADO_CONFIG[f]?.label}
                        <span className="mapt-filtro-count">
                            {f === 'todos' ? apartados.length : apartados.filter(a => a.estado === f).length}
                        </span>
                    </button>
                ))}
            </div>

            {apartadosFiltrados.length === 0 ? (
                <div className="mapt-vacio">
                    <p>🔖</p>
                    <h3>{filtro === 'todos' ? 'No tienes apartados aún' : `No tienes apartados ${ESTADO_CONFIG[filtro]?.label?.toLowerCase()}`}</h3>
                    {filtro === 'todos' && (
                        <button className="mapt-btn-primario" onClick={() => navigate('/catalogo')}>
                            Ir al catálogo
                        </button>
                    )}
                </div>
            ) : (
                <div className="mapt-lista">
                    {apartadosFiltrados.map(a => {
                        const cfg    = estadoVisual(a);
                        const pct    = porcentajePagado(a);
                        const abierto = expandido === a.id;
                        return (
                            <div key={a.id} className={`mapt-card mapt-card--${a.estado}`}>

                                {/* Cabecera */}
                                <div className="mapt-card-header" onClick={() => setExpandido(abierto ? null : a.id)}>
                                    <div className="mapt-card-header-izq">
                                        <span className="mapt-folio">{a.folio}</span>
                                        <span className="mapt-estado-badge" style={{ color: cfg.color }}>
                                            {cfg.icon} {cfg.label}
                                        </span>
                                    </div>
                                    <div className="mapt-card-header-der">
                                        <span className="mapt-fecha">{fmtFecha(a.fecha_apartado)}</span>
                                        <span className="mapt-chevron">{abierto ? '▲' : '▼'}</span>
                                    </div>
                                </div>

                                {/* Barra de progreso */}
                                <div className="mapt-progreso-wrap">
                                    <div className="mapt-progreso-bar">
                                        <div className="mapt-progreso-fill" style={{ width: `${pct}%`, backgroundColor: cfg.color }} />
                                    </div>
                                    <div className="mapt-progreso-info">
                                        <span>Pagado: <strong>{fmtMoneda(a.monto_pagado)}</strong></span>
                                        <span>{pct}%</span>
                                        <span>Total: <strong>{fmtMoneda(a.monto_total)}</strong></span>
                                    </div>
                                </div>

                                {/* Resumen rápido */}
                                {(() => {
                                    const ultimoAbono = a.abonos && a.abonos.length > 0
                                        ? [...a.abonos].filter(ab => ab.fecha_limite_siguiente).sort((x, y) => new Date(y.fecha_limite_siguiente!).getTime() - new Date(x.fecha_limite_siguiente!).getTime())[0]
                                            ?? a.abonos[a.abonos.length - 1]
                                        : null;
                                    const proxFecha = ultimoAbono?.fecha_limite_siguiente;
                                    return (
                                    <div className="mapt-resumen-rapido">
                                        <div className="mapt-dato">
                                            <span className="mapt-dato-label">Saldo pendiente</span>
                                            <span className="mapt-dato-valor" style={{ color: '#ecb2c3' }}>
                                                {fmtMoneda(a.saldo_pendiente)}
                                            </span>
                                        </div>
                                        <div className="mapt-dato">
                                            <span className="mapt-dato-label">
                                                {a.estado === 'activo' && proxFecha ? 'Próximo abono' : 'Fecha límite'}
                                            </span>
                                            <span className="mapt-dato-valor">
                                                {a.estado === 'pendiente_pago' ? '—'
                                                    : a.estado === 'activo' && proxFecha ? fmtFecha(proxFecha)
                                                    : fmtFecha(a.fecha_limite_liquidacion)}
                                            </span>
                                        </div>
                                        <div className="mapt-dato">
                                            <span className="mapt-dato-label">Abonos</span>
                                            <span className="mapt-dato-valor">{a.total_abonos}</span>
                                        </div>
                                    </div>
                                    );
                                })()}

                                {/* Mensaje liquidado */}
                                {a.estado === 'liquidado' && (
                                    <div className="mapt-accion-pago" style={{ background: '#0f2a1a', borderColor: '#6bcb77' }}>
                                        <div className="mapt-pago-info" style={{ color: '#6bcb77', textAlign: 'center' }}>
                                            🎉 <strong>¡Apartado liquidado!</strong><br />
                                            Completaste todos tus pagos exitosamente. ¡Muchas gracias por tu preferencia!
                                            {diasEntrega !== null && (
                                                <><br /><span style={{ fontSize: '0.85em', opacity: 0.85 }}>
                                                    🏪 Debes pasar a recoger tu pedido a la tienda en un plazo de <strong>{diasEntrega} días hábiles</strong>. Puedes rastrear el estado en <em>Mis Pedidos</em>.
                                                </span></>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Acción pagar si está pendiente */}
                                {a.estado === 'pendiente_pago' && (
                                    <div className="mapt-accion-pago">
                                        <div className="mapt-pago-info">
                                            🕐 Aún no has realizado tu pago inicial de <strong>{fmtMoneda(a.monto_pagado)}</strong>.
                                        </div>
                                        <button className="mapt-btn-pagar"
                                            onClick={() => setModalPago(a)}>
                                            💳 Realizar pago inicial
                                        </button>
                                    </div>
                                )}

                                {/* Abono pendiente en espera */}
                                {a.estado === 'activo' && a.abono_pendiente && (
                                    <div className="mapt-accion-pago" style={{ background: '#1a2a1a', borderColor: '#6bcb77' }}>
                                        <div className="mapt-pago-info" style={{ color: '#6bcb77' }}>
                                            ⏳ Tienes un abono de <strong>{fmtMoneda(a.abono_pendiente.monto)}</strong> via {a.abono_pendiente.metodo_nombre} esperando confirmación del trabajador.
                                        </div>
                                    </div>
                                )}

                                {/* Botón registrar abono / adelantar */}
                                {a.estado === 'activo' && !a.abono_pendiente && parseFloat(String(a.saldo_pendiente)) > 0 && (() => {
                                    const parseLocal = (s: string) => {
                                        const [y,m,d] = s.substring(0,10).split('-').map(Number);
                                        const f = new Date(y, m-1, d); f.setHours(0,0,0,0); return f;
                                    };
                                    // Abono con fecha_limite_siguiente más lejana (parseo local para evitar UTC)
                                    const abonosConFecha = a.abonos?.filter(ab => ab.fecha_limite_siguiente) ?? [];
                                    const ultimoAbono = abonosConFecha.length > 0
                                        ? abonosConFecha.reduce((prev, cur) =>
                                            parseLocal(cur.fecha_limite_siguiente!).getTime() > parseLocal(prev.fecha_limite_siguiente!).getTime() ? cur : prev
                                          )
                                        : (a.abonos && a.abonos.length > 0 ? a.abonos[a.abonos.length - 1] : null);
                                    const proxFecha     = ultimoAbono?.fecha_limite_siguiente;
                                    const hoy           = new Date(); hoy.setHours(0,0,0,0);
                                    const proxFechaLocal = proxFecha ? parseLocal(proxFecha) : null;
                                    const esFutura      = proxFechaLocal !== null && proxFechaLocal > hoy;
                                    const diasRestantes = proxFechaLocal !== null
                                        ? Math.round((proxFechaLocal.getTime() - hoy.getTime()) / 86400000)
                                        : null;
                                    console.log('[ApartadoBtn]', a.folio, { proxFecha, proxFechaLocal: proxFechaLocal?.toISOString(), hoy: hoy.toISOString(), esFutura, diasRestantes });
                                    return (
                                        <div className="mapt-accion-pago">
                                            {esFutura && proxFecha && (
                                                <div className="mapt-pago-info" style={{ marginBottom: 8, color: '#aaa', fontSize: '0.85rem' }}>
                                                    📅 Próximo abono vence el <strong>{fmtFecha(proxFecha)}</strong>
                                                    {diasRestantes !== null && diasRestantes > 0 && ` (en ${diasRestantes} día${diasRestantes !== 1 ? 's' : ''})`}
                                                </div>
                                            )}
                                            <button className="mapt-btn-pagar"
                                                style={esFutura ? { background: '#2a3a1a', borderColor: '#8bc34a', color: '#8bc34a' } : {}}
                                                onClick={() => setModalAbono(a)}>
                                                {esFutura ? '⚡ Adelantar pago' : '💰 Realizar abono'}
                                            </button>
                                            {esFutura && (
                                                <small style={{ display: 'block', textAlign: 'center', color: '#777', marginTop: 4, fontSize: '0.75rem' }}>
                                                    Tu fecha de vencimiento aún no llega — este pago es anticipado
                                                </small>
                                            )}
                                        </div>
                                    );
                                })()}

                                {/* Advertencia */}
                                {a.estado === 'activo' && a.advertencia_enviada && (
                                    <div className="mapt-advertencia">
                                        ⚠️ Se ha enviado una advertencia de vencimiento. Realiza un abono para mantener tu apartado.
                                    </div>
                                )}

                                {/* Detalle expandible */}
                                {abierto && (
                                    <div className="mapt-detalle">
                                        {a.productos && a.productos.length > 0 && (
                                            <div className="mapt-seccion">
                                                <h4>🛍️ Productos apartados</h4>
                                                {a.productos.map((p, i) => (
                                                    <div key={i} className="mapt-producto-fila">
                                                        <span>{p.nombre}</span>
                                                        <span>x{p.cantidad}</span>
                                                        <span>{fmtMoneda(p.precio_unitario * p.cantidad)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="mapt-seccion">
                                            <h4>💰 Historial de abonos</h4>
                                            {a.abonos && a.abonos.length > 0 ? (
                                                <div className="mapt-abonos-tabla">
                                                    <div className="mapt-abonos-header" style={{ gridTemplateColumns: '80px 1fr 1fr 1fr 1fr' }}>
                                                        <span>Pago</span>
                                                        <span>Fecha</span>
                                                        <span>Monto</span>
                                                        <span>Saldo tras abono</span>
                                                        <span>Próx. límite</span>
                                                    </div>
                                                    {a.abonos.map((ab, i) => (
                                                        <div key={ab.id} className="mapt-abono-fila" style={{ gridTemplateColumns: '80px 1fr 1fr 1fr 1fr' }}>
                                                            <span style={{ fontWeight: 600, color: '#ecb2c3' }}>Pago {i + 1}</span>
                                                            <span>{fmtFecha(ab.fecha_abono)}</span>
                                                            <span style={{ color: '#6bcb77' }}>+{fmtMoneda(ab.monto)}</span>
                                                            <span>{fmtMoneda(ab.monto_despues)}</span>
                                                            <span style={{ color: '#888', fontSize: '0.8rem' }}>{ab.fecha_limite_siguiente ? fmtFecha(ab.fecha_limite_siguiente) : '—'}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="mapt-sin-abonos">Sin abonos registrados aún.</p>
                                            )}
                                        </div>

                                        {a.estado === 'activo' && a.abonos && a.abonos.length > 0 && (() => {
                                            const ultimo = a.abonos[a.abonos.length - 1];
                                            if (ultimo?.fecha_limite_siguiente) return (
                                                <div className="mapt-proximo-abono">
                                                    📅 Próximo abono recomendado antes del: <strong>{fmtFecha(ultimo.fecha_limite_siguiente)}</strong>
                                                </div>
                                            );
                                            return null;
                                        })()}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal pago inicial */}
            {modalPago && (
                <ModalPago
                    apartado={modalPago}
                    metodosPago={metodosPago}
                    onCerrar={() => setModalPago(null)}
                    onExito={onPagoExito}
                />
            )}
            {/* Modal abono siguiente */}
            {modalAbono && (
                <ModalAbonoCliente
                    apartado={modalAbono}
                    metodosPago={metodosPago}
                    onCerrar={() => setModalAbono(null)}
                    onExito={() => {
                        setModalAbono(null);
                        setMsgExito('✅ Abono registrado. El trabajador lo confirmará pronto.');
                        cargarDatos();
                    }}
                />
            )}
        </main>
    );
};

export default MisApartadosScreen;