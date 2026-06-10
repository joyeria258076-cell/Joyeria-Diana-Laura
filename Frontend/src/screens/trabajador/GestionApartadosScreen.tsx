// Ruta: Frontend/src/screens/trabajador/GestionApartadosScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { apartadoAPI } from '../../services/api';
import './GestionApartadosScreen.css';

interface Abono {
    id: number;
    monto: number;
    monto_antes: number;
    monto_despues: number;
    fecha_abono: string;
    fecha_limite_siguiente: string | null;
    estado: string;
    notas: string | null;
    comprobante_url: string | null;
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
    archivado: boolean;
    comprobante_url: string | null;
    cliente_nombre: string;
    cliente_email: string;
    cliente_telefono: string;
    productos: { nombre: string; cantidad: number; precio_unitario: number }[] | null;
    abonos: Abono[] | null;
    total_abonos: number;
    metodo_pago_inicial: string | null;
}

interface Meta {
    total: number;
    pagina: number;
    limite: number;
    total_paginas: number;
}

const ESTADO_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
    pendiente_pago: { label: 'Pend. pago',  color: '#a78bfa', icon: '🕐' },
    activo:         { label: 'Activo',       color: '#6bcb77', icon: '🟢' },
    liquidado:      { label: 'Liquidado',    color: '#ecb2c3', icon: '✅' },
    cancelado:      { label: 'Cancelado',    color: '#e74c3c', icon: '❌' },
    vencido:        { label: 'Vencido',      color: '#f39c12', icon: '⚠️' },
};

const fmtFecha = (f: string) => {
    if (!f) return '—';
    return new Date(f).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtMoneda = (n: number) =>
    `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

const diasRestantes = (fecha: string) => {
    const diff = Math.ceil((new Date(fecha).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return diff;
};

// ── Modal confirmar pago inicial ──────────────────────────────
interface ModalConfirmarPagoProps {
    apartado: Apartado;
    onCerrar: () => void;
    onExito: () => void;
}

const ModalConfirmarPago: React.FC<ModalConfirmarPagoProps> = ({ apartado, onCerrar, onExito }) => {
    const [fechaLimiteLiq, setFechaLimiteLiq] = useState('');
    const [fechaLimiteSig, setFechaLimiteSig] = useState('');
    const [notas, setNotas]                   = useState('');
    const [error, setError]                   = useState('');
    const [guardando, setGuardando]           = useState(false);

    const handleConfirmar = async () => {
        if (!fechaLimiteLiq) { setError('La fecha límite de liquidación es requerida.'); return; }
        setGuardando(true); setError('');
        try {
            const res = await apartadoAPI.confirmarPagoInicial(apartado.id, {
                fecha_limite_liquidacion: fechaLimiteLiq,
                fecha_limite_siguiente:   fechaLimiteSig || undefined,
                notas:                    notas || undefined,
            });
            if (!res.success) throw new Error(res.message);
            onExito();
        } catch (err: any) {
            setError(err.message || 'Error al confirmar pago.');
        } finally { setGuardando(false); }
    };

    // Determinar si el cliente ya realizó alguna acción de pago
    const metodoAbono = apartado.abonos?.[0];
    const tieneComprobante = !!apartado.comprobante_url;

    return (
        <div className="gapt-overlay" onClick={onCerrar}>
            <div className="gapt-modal gapt-modal--sm" onClick={e => e.stopPropagation()}>
                <div className="gapt-modal-header">
                    <h3>✅ Confirmar pago inicial — {apartado.folio}</h3>
                    <button className="gapt-modal-close" onClick={onCerrar}>×</button>
                </div>
                <div className="gapt-modal-body">
                    <div className="gapt-modal-resumen">
                        <div className="gapt-resumen-fila">
                            <span>Cliente</span>
                            <strong>{apartado.cliente_nombre}</strong>
                        </div>
                        <div className="gapt-resumen-fila">
                            <span>Abono inicial</span>
                            <strong style={{ color: '#6bcb77' }}>{fmtMoneda(apartado.monto_pagado)}</strong>
                        </div>
                        <div className="gapt-resumen-fila">
                            <span>Saldo pendiente tras confirmar</span>
                            <strong style={{ color: '#ecb2c3' }}>{fmtMoneda(apartado.saldo_pendiente)}</strong>
                        </div>
                    </div>

                    {tieneComprobante && (
                        <div className="gapt-comprobante-preview">
                            <p>📎 Comprobante subido por el cliente:</p>
                            <a href={apartado.comprobante_url!} target="_blank" rel="noreferrer">
                                Ver comprobante →
                            </a>
                        </div>
                    )}

                    <div className="gapt-form-group">
                        <label>Fecha límite para liquidar <span className="gapt-req">*</span></label>
                        <input type="date" className="gapt-input"
                            min={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                            value={fechaLimiteLiq}
                            onChange={e => setFechaLimiteLiq(e.target.value)} />
                        <small className="gapt-ayuda">Cuándo debe liquidar el cliente el total.</small>
                    </div>

                    <div className="gapt-form-group">
                        <label>Fecha límite del siguiente abono (opcional)</label>
                        <input type="date" className="gapt-input"
                            min={new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                            value={fechaLimiteSig}
                            onChange={e => setFechaLimiteSig(e.target.value)} />
                    </div>

                    <div className="gapt-form-group">
                        <label>Notas (opcional)</label>
                        <textarea className="gapt-textarea" rows={2}
                            placeholder="Ej: Pagó en efectivo, comprobante revisado..."
                            value={notas} onChange={e => setNotas(e.target.value)} />
                    </div>

                    {error && <div className="gapt-error">⚠️ {error}</div>}
                </div>
                <div className="gapt-modal-footer">
                    <button className="gapt-btn-sec" onClick={onCerrar}>Cancelar</button>
                    <button className="gapt-btn-pri" onClick={handleConfirmar} disabled={guardando}>
                        {guardando ? '⏳ Confirmando...' : '✅ Confirmar pago'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Modal registrar abono ─────────────────────────────────────
interface ModalAbonoProps {
    apartado: Apartado;
    metodosPago: { id: number; nombre: string; codigo: string }[];
    onCerrar: () => void;
    onExito: () => void;
}

const ModalAbono: React.FC<ModalAbonoProps> = ({ apartado, metodosPago, onCerrar, onExito }) => {
    const [monto, setMonto]                   = useState('');
    const [metodoPagoId, setMetodoPagoId]     = useState<number | null>(null);
    const [fechaLimiteSig, setFechaLimiteSig] = useState('');
    const [fechaLimiteLiq, setFechaLimiteLiq] = useState('');
    const [notas, setNotas]                   = useState('');
    const [error, setError]                   = useState('');
    const [guardando, setGuardando]           = useState(false);

    const handleGuardar = async () => {
        if (!monto || parseFloat(monto) <= 0) { setError('Ingresa un monto válido.'); return; }
        if (parseFloat(monto) > parseFloat(String(apartado.saldo_pendiente))) {
            setError(`El monto no puede superar el saldo pendiente (${fmtMoneda(apartado.saldo_pendiente)}).`); return;
        }
        if (!metodoPagoId) { setError('Selecciona un método de pago.'); return; }
        setGuardando(true); setError('');
        try {
            const res = await apartadoAPI.registrarAbono(apartado.id, {
                monto: parseFloat(monto),
                metodo_pago_id: metodoPagoId,
                fecha_limite_siguiente: fechaLimiteSig || undefined,
                fecha_limite_liquidacion: fechaLimiteLiq || undefined,
                notas: notas || undefined,
            } as any);
            if (!res.success) throw new Error(res.message);
            onExito();
        } catch (err: any) {
            setError(err.message || 'Error al registrar abono.');
        } finally { setGuardando(false); }
    };

    const montoNum     = parseFloat(monto) || 0;
    const saldoDespues = Math.max(0, parseFloat(String(apartado.saldo_pendiente)) - montoNum);

    return (
        <div className="gapt-overlay" onClick={onCerrar}>
            <div className="gapt-modal" onClick={e => e.stopPropagation()}>
                <div className="gapt-modal-header">
                    <h3>💰 Registrar abono — {apartado.folio}</h3>
                    <button className="gapt-modal-close" onClick={onCerrar}>×</button>
                </div>
                <div className="gapt-modal-body">
                    <div className="gapt-modal-resumen">
                        <div className="gapt-resumen-fila">
                            <span>Cliente</span>
                            <strong>{apartado.cliente_nombre}</strong>
                        </div>
                        <div className="gapt-resumen-fila">
                            <span>Saldo pendiente</span>
                            <strong style={{ color: '#ecb2c3' }}>{fmtMoneda(apartado.saldo_pendiente)}</strong>
                        </div>
                        {montoNum > 0 && (
                            <div className="gapt-resumen-fila">
                                <span>Saldo tras este abono</span>
                                <strong style={{ color: saldoDespues === 0 ? '#6bcb77' : '#e0e0e0' }}>
                                    {fmtMoneda(saldoDespues)}
                                    {saldoDespues === 0 && ' ✅ ¡Liquidado!'}
                                </strong>
                            </div>
                        )}
                    </div>

                    <div className="gapt-form-group">
                        <label>Monto del abono <span className="gapt-req">*</span></label>
                        <input type="number" className="gapt-input"
                            placeholder={`Máx: ${fmtMoneda(apartado.saldo_pendiente)}`}
                            min={1} max={parseFloat(String(apartado.saldo_pendiente))}
                            value={monto} onChange={e => setMonto(e.target.value)} />
                    </div>

                    <div className="gapt-form-group">
                        <label>Método de pago <span className="gapt-req">*</span></label>
                        <div className="gapt-metodos">
                            {metodosPago.map(m => (
                                <label key={m.id} className={`gapt-metodo-opt ${metodoPagoId === m.id ? 'sel' : ''}`}>
                                    <input type="radio" name="metodo_abono"
                                        checked={metodoPagoId === m.id}
                                        onChange={() => setMetodoPagoId(m.id)} />
                                    {m.nombre}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="gapt-form-group">
                        <label>Actualizar fecha límite liquidación (opcional)</label>
                        <input type="date" className="gapt-input"
                            value={fechaLimiteLiq}
                            onChange={e => setFechaLimiteLiq(e.target.value)} />
                        <small className="gapt-ayuda">Solo si quieres modificar la fecha límite actual.</small>
                    </div>

                    <div className="gapt-form-group">
                        <label>Fecha límite siguiente abono (opcional)</label>
                        <input type="date" className="gapt-input"
                            min={new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                            value={fechaLimiteSig}
                            onChange={e => setFechaLimiteSig(e.target.value)} />
                    </div>

                    <div className="gapt-form-group">
                        <label>Notas (opcional)</label>
                        <textarea className="gapt-textarea" rows={2}
                            placeholder="Ej: Pagó en efectivo..."
                            value={notas} onChange={e => setNotas(e.target.value)} />
                    </div>

                    {error && <div className="gapt-error">⚠️ {error}</div>}
                </div>
                <div className="gapt-modal-footer">
                    <button className="gapt-btn-sec" onClick={onCerrar}>Cancelar</button>
                    <button className="gapt-btn-pri" onClick={handleGuardar} disabled={guardando}>
                        {guardando ? '⏳ Guardando...' : '💰 Registrar abono'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Modal cancelar ────────────────────────────────────────────
interface ModalCancelarProps {
    apartado: Apartado;
    onCerrar: () => void;
    onExito: () => void;
}

const ModalCancelar: React.FC<ModalCancelarProps> = ({ apartado, onCerrar, onExito }) => {
    const [motivo, setMotivo]       = useState('');
    const [error, setError]         = useState('');
    const [guardando, setGuardando] = useState(false);

    const handleCancelar = async () => {
        if (!motivo.trim()) { setError('El motivo es requerido.'); return; }
        setGuardando(true); setError('');
        try {
            const res = await apartadoAPI.cancelar(apartado.id, motivo);
            if (!res.success) throw new Error(res.message);
            onExito();
        } catch (err: any) {
            setError(err.message || 'Error al cancelar.');
        } finally { setGuardando(false); }
    };

    return (
        <div className="gapt-overlay" onClick={onCerrar}>
            <div className="gapt-modal gapt-modal--sm" onClick={e => e.stopPropagation()}>
                <div className="gapt-modal-header">
                    <h3>❌ Cancelar apartado — {apartado.folio}</h3>
                    <button className="gapt-modal-close" onClick={onCerrar}>×</button>
                </div>
                <div className="gapt-modal-body">
                    <div className="gapt-aviso-cancelar">
                        ⚠️ Al cancelar{apartado.estado === 'activo' ? ', el stock será devuelto al inventario.' : '.'} Esta acción no se puede deshacer.
                    </div>
                    <div className="gapt-form-group">
                        <label>Motivo <span className="gapt-req">*</span></label>
                        <textarea className="gapt-textarea" rows={3}
                            placeholder="Ej: Cliente no respondió, venció el plazo..."
                            value={motivo} onChange={e => setMotivo(e.target.value)} />
                    </div>
                    {error && <div className="gapt-error">⚠️ {error}</div>}
                </div>
                <div className="gapt-modal-footer">
                    <button className="gapt-btn-sec" onClick={onCerrar}>Volver</button>
                    <button className="gapt-btn-danger" onClick={handleCancelar} disabled={guardando}>
                        {guardando ? '⏳ Cancelando...' : '❌ Confirmar cancelación'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Pantalla principal ────────────────────────────────────────
const GestionApartadosScreen: React.FC = () => {
    const [apartados, setApartados]             = useState<Apartado[]>([]);
    const [meta, setMeta]                       = useState<Meta>({ total: 0, pagina: 1, limite: 20, total_paginas: 1 });
    const [cargando, setCargando]               = useState(true);
    const [error, setError]                     = useState('');
    const [filtro, setFiltro]                   = useState('activo');
    const [busqueda, setBusqueda]               = useState('');
    const [busquedaInput, setBusquedaInput]     = useState('');
    const [pagina, setPagina]                   = useState(1);
    const [verArchivados, setVerArchivados]     = useState(false);
    const [expandido, setExpandido]             = useState<number | null>(null);
    const [modalAbono, setModalAbono]           = useState<Apartado | null>(null);
    const [modalCancelar, setModalCancelar]     = useState<Apartado | null>(null);
    const [modalConfirmar, setModalConfirmar]   = useState<Apartado | null>(null);
    const [metodosPago, setMetodosPago]         = useState<{ id: number; nombre: string; codigo: string }[]>([]);

    // Debounce búsqueda
    useEffect(() => {
        const t = setTimeout(() => { setBusqueda(busquedaInput); setPagina(1); }, 400);
        return () => clearTimeout(t);
    }, [busquedaInput]);

    useEffect(() => { cargarDatos(); }, [filtro, busqueda, pagina, verArchivados]);

    const cargarDatos = async () => {
        setCargando(true); setError('');
        try {
            const estado = filtro === 'todos' ? undefined : filtro;
            const [aptRes, mpRes] = await Promise.all([
                apartadoAPI.getTodos(estado, busqueda || undefined, pagina, verArchivados),
                fetch(`${import.meta.env.VITE_API_URL || 'https://joyeria-diana-laura-nqnq.onrender.com/api'}/carrito/metodos-pago`)
                    .then(r => r.json())
            ]);
            if (aptRes.success) {
                setApartados(aptRes.data);
                setMeta(aptRes.meta || { total: 0, pagina: 1, limite: 20, total_paginas: 1 });
            }
            if (mpRes.success) setMetodosPago(mpRes.data?.metodos || []);
        } catch {
            setError('Error al cargar los apartados.');
        } finally { setCargando(false); }
    };

    const handleAdvertencia = async (id: number) => {
        try { await apartadoAPI.marcarAdvertencia(id); cargarDatos(); } catch { }
    };

    const handleArchivar = async (id: number, archivar: boolean) => {
        try {
            await apartadoAPI.archivar(id, archivar);
            cargarDatos();
        } catch { }
    };

    const porcentaje = (a: Apartado) =>
        Math.min(100, Math.round((Number(a.monto_pagado) / Number(a.monto_total)) * 100));

    // Conteo por estado para las tarjetas resumen (solo no archivados)
    const conteoEstado = (estado: string) =>
        estado === 'todos'
            ? meta.total
            : apartados.filter(a => a.estado === estado).length;

    return (
        <main className="gapt-body">
            <div className="gapt-top-bar">
                <h1 className="gapt-titulo">📦 Gestión de Apartados</h1>
                <button
                    className={`gapt-btn-archivo ${verArchivados ? 'activo' : ''}`}
                    onClick={() => { setVerArchivados(!verArchivados); setPagina(1); setFiltro('todos'); }}>
                    {verArchivados ? '📂 Ver activos' : '🗄️ Ver archivados'}
                </button>
            </div>

            {/* Tarjetas resumen — solo cuando no se ven archivados */}
            {!verArchivados && (
                <div className="gapt-resumen-cards">
                    {[
                        { label: 'Pend. pago',  estado: 'pendiente_pago', color: '#a78bfa' },
                        { label: 'Activos',     estado: 'activo',         color: '#6bcb77' },
                        { label: 'Vencidos',    estado: 'vencido',        color: '#f39c12' },
                        { label: 'Liquidados',  estado: 'liquidado',      color: '#ecb2c3' },
                        { label: 'Cancelados',  estado: 'cancelado',      color: '#e74c3c' },
                    ].map(c => (
                        <div key={c.estado} className={`gapt-stat-card ${filtro === c.estado ? 'sel' : ''}`}
                            style={{ borderTop: `3px solid ${c.color}` }}
                            onClick={() => { setFiltro(c.estado); setPagina(1); }}>
                            <span className="gapt-stat-num" style={{ color: c.color }}>
                                {apartados.filter(a => a.estado === c.estado).length}
                            </span>
                            <span className="gapt-stat-label">{c.label}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Barra de búsqueda + filtros */}
            <div className="gapt-controles">
                <div className="gapt-search-wrap">
                    <span className="gapt-search-icon">🔍</span>
                    <input
                        type="text"
                        className="gapt-search"
                        placeholder="Buscar por cliente, folio, email o teléfono..."
                        value={busquedaInput}
                        onChange={e => setBusquedaInput(e.target.value)}
                    />
                    {busquedaInput && (
                        <button className="gapt-search-clear" onClick={() => setBusquedaInput('')}>×</button>
                    )}
                </div>

                {!verArchivados && (
                    <div className="gapt-filtros">
                        {['todos', 'pendiente_pago', 'activo', 'vencido', 'liquidado', 'cancelado'].map(f => (
                            <button key={f}
                                className={`gapt-filtro-btn ${filtro === f ? 'activo' : ''}`}
                                onClick={() => { setFiltro(f); setPagina(1); }}>
                                {f === 'todos' ? 'Todos' : ESTADO_CONFIG[f]?.icon + ' ' + ESTADO_CONFIG[f]?.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Info resultados */}
            <div className="gapt-resultados-info">
                {busqueda && <span>Resultados para "<strong>{busqueda}</strong>": </span>}
                <span>{meta.total} apartado{meta.total !== 1 ? 's' : ''}
                    {verArchivados ? ' archivados' : ''}</span>
            </div>

            {error && <div className="gapt-error-banner">⚠️ {error}</div>}

            {cargando ? (
                <div className="gapt-loading"><div className="gapt-spinner" /><p>Cargando...</p></div>
            ) : apartados.length === 0 ? (
                <div className="gapt-vacio">
                    <p>{busqueda ? `Sin resultados para "${busqueda}"` : `No hay apartados ${verArchivados ? 'archivados' : filtro !== 'todos' ? ESTADO_CONFIG[filtro]?.label?.toLowerCase() + 's' : ''}`}</p>
                </div>
            ) : (
                <>
                    <div className="gapt-lista">
                        {apartados.map(a => {
                            const cfg    = ESTADO_CONFIG[a.estado];
                            const pct    = porcentaje(a);
                            const abierto = expandido === a.id;
                            const dias   = diasRestantes(a.fecha_limite_liquidacion);

                            return (
                                <div key={a.id} className={`gapt-card gapt-card--${a.estado}`}>

                                    {/* Header */}
                                    <div className="gapt-card-header" onClick={() => setExpandido(abierto ? null : a.id)}>
                                        <div className="gapt-card-header-izq">
                                            <span className="gapt-folio">{a.folio}</span>
                                            <span className="gapt-badge" style={{ color: cfg.color }}>
                                                {cfg.icon} {cfg.label}
                                            </span>
                                            {a.estado === 'activo' && dias <= 7 && dias >= 0 && (
                                                <span className="gapt-badge-urgente">🔥 Vence en {dias}d</span>
                                            )}
                                            {a.estado === 'activo' && dias < 0 && (
                                                <span className="gapt-badge-vencido">⛔ Vencido hace {Math.abs(dias)}d</span>
                                            )}
                                            {a.estado === 'pendiente_pago' && a.comprobante_url && (
                                                <span className="gapt-badge-comprobante">📎 Comprobante listo</span>
                                            )}
                                        </div>
                                        <span className="gapt-chevron">{abierto ? '▲' : '▼'}</span>
                                    </div>

                                    {/* Info cliente */}
                                    <div className="gapt-cliente-info">
                                        <span>👤 <strong>{a.cliente_nombre}</strong></span>
                                        <span>📧 {a.cliente_email}</span>
                                        {a.cliente_telefono && <span>📱 {a.cliente_telefono}</span>}
                                        <span className="gapt-cliente-fecha">📅 {fmtFecha(a.fecha_apartado)}</span>
                                    </div>

                                    {/* Barra progreso */}
                                    <div className="gapt-progreso-wrap">
                                        <div className="gapt-progreso-bar">
                                            <div className="gapt-progreso-fill"
                                                style={{ width: `${pct}%`, backgroundColor: cfg.color }} />
                                        </div>
                                        <div className="gapt-progreso-info">
                                            <span>Pagado: <strong>{fmtMoneda(a.monto_pagado)}</strong></span>
                                            <span>{pct}%</span>
                                            <span>Total: <strong>{fmtMoneda(a.monto_total)}</strong></span>
                                        </div>
                                    </div>

                                    {/* Datos rápidos */}
                                    <div className="gapt-datos-rapidos">
                                        <div className="gapt-dato">
                                            <span className="gapt-dato-label">Saldo pendiente</span>
                                            <span className="gapt-dato-val" style={{ color: '#ecb2c3' }}>
                                                {fmtMoneda(a.saldo_pendiente)}
                                            </span>
                                        </div>
                                        <div className="gapt-dato">
                                            <span className="gapt-dato-label">Fecha límite</span>
                                            <span className="gapt-dato-val"
                                                style={{ color: dias <= 3 && a.estado === 'activo' ? '#f39c12' : 'inherit' }}>
                                                {fmtFecha(a.fecha_limite_liquidacion)}
                                            </span>
                                        </div>
                                        <div className="gapt-dato">
                                            <span className="gapt-dato-label">Abonos</span>
                                            <span className="gapt-dato-val">{a.total_abonos}</span>
                                        </div>
                                        <div className="gapt-dato">
                                            <span className="gapt-dato-label">Productos</span>
                                            <span className="gapt-dato-val" style={{ fontSize: '0.75rem', color: '#aaa' }}>
                                                {a.productos?.join(', ').substring(0, 30) || '—'}
                                                {(a.productos?.join(', ').length || 0) > 30 ? '...' : ''}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Acciones */}
                                    {!verArchivados && (
                                        <>
                                        {a.estado === 'pendiente_pago' && (
                                            <div className="gapt-acciones">
                                                {['efectivo', 'transferencia'].includes(a.metodo_pago_inicial || '') ? (
                                                    <>
                                                        <div className="gapt-pago-pendiente-info">
                                                            {a.metodo_pago_inicial === 'efectivo'
                                                                ? '💵 El cliente pagará en efectivo en tienda. Confirma cuando recibas el pago.'
                                                                : '🏦 El cliente subió un comprobante de transferencia. Verifica antes de confirmar.'
                                                            }
                                                            {a.comprobante_url && (
                                                                <a href={a.comprobante_url} target="_blank" rel="noreferrer"
                                                                    style={{ display: 'block', marginTop: '6px', color: '#6bcb77' }}>
                                                                    Ver comprobante →
                                                                </a>
                                                            )}
                                                        </div>
                                                        <button className="gapt-btn-pri"
                                                            onClick={() => setModalConfirmar(a)}>
                                                            ✅ Confirmar pago inicial
                                                        </button>
                                                        <button className="gapt-btn-danger-sm"
                                                            onClick={() => setModalCancelar(a)}>
                                                            ❌ Rechazar
                                                        </button>
                                                    </>
                                                ) : (
                                                    <div className="gapt-pago-pendiente-info">
                                                        {a.metodo_pago_inicial === 'mercadopago'
                                                            ? '🛒 El cliente está completando el pago en MercadoPago. Se confirmará automáticamente.'
                                                            : a.metodo_pago_inicial === 'paypal'
                                                            ? '🅿️ El cliente está completando el pago en PayPal. Se confirmará automáticamente.'
                                                            : '🕐 Esperando que el cliente realice el pago.'
                                                        }
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                            {a.estado === 'activo' && (
                                                <div className="gapt-acciones">
                                                    <button className="gapt-btn-pri"
                                                        onClick={() => setModalAbono(a)}>
                                                        💰 Registrar abono
                                                    </button>
                                                    {!a.advertencia_enviada ? (
                                                        <button className="gapt-btn-warn"
                                                            onClick={() => handleAdvertencia(a.id)}>
                                                            ⚠️ Marcar advertencia
                                                        </button>
                                                    ) : (
                                                        <span className="gapt-advertencia-badge">⚠️ Advertencia enviada</span>
                                                    )}
                                                    <button className="gapt-btn-danger-sm"
                                                        onClick={() => setModalCancelar(a)}>
                                                        ❌ Cancelar
                                                    </button>
                                                </div>
                                            )}
                                            {['liquidado', 'cancelado'].includes(a.estado) && (
                                                <div className="gapt-acciones">
                                                    <button className="gapt-btn-archivar"
                                                        onClick={() => handleArchivar(a.id, true)}>
                                                        🗄️ Archivar
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                    {verArchivados && (
                                        <div className="gapt-acciones">
                                            <button className="gapt-btn-sec"
                                                onClick={() => handleArchivar(a.id, false)}>
                                                📂 Desarchivar
                                            </button>
                                        </div>
                                    )}

                                    {/* Detalle expandible */}
                                    {abierto && (
                                        <div className="gapt-detalle">
                                            {a.productos && a.productos.length > 0 && (
                                                <div className="gapt-seccion">
                                                    <h4>🛍️ Productos</h4>
                                                    {(a.productos as any[]).map((p: any, i: number) => (
                                                        <div key={i} className="gapt-producto-fila">
                                                            <span>{typeof p === 'string' ? p : p.nombre}</span>
                                                            {typeof p !== 'string' && <span>x{p.cantidad}</span>}
                                                            {typeof p !== 'string' && <span>{fmtMoneda(p.precio_unitario * p.cantidad)}</span>}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="gapt-seccion">
                                                <h4>💰 Historial de abonos</h4>
                                                {a.abonos && a.abonos.length > 0 ? (
                                                    <div className="gapt-abonos-tabla">
                                                        <div className="gapt-abonos-header">
                                                            <span>#</span>
                                                            <span>Fecha</span>
                                                            <span>Monto</span>
                                                            <span>Saldo tras abono</span>
                                                            <span>Próx. límite</span>
                                                        </div>
                                                        {a.abonos.map((ab, i) => (
                                                            <div key={ab.id} className="gapt-abono-fila">
                                                                <span>{i + 1}</span>
                                                                <span>{fmtFecha(ab.fecha_abono)}</span>
                                                                <span style={{ color: '#6bcb77' }}>+{fmtMoneda(ab.monto)}</span>
                                                                <span>{fmtMoneda(ab.monto_despues)}</span>
                                                                <span>{ab.fecha_limite_siguiente ? fmtFecha(ab.fecha_limite_siguiente) : '—'}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="gapt-sin-datos">Sin abonos registrados.</p>
                                                )}
                                            </div>

                                            {a.comprobante_url && (
                                                <div className="gapt-seccion">
                                                    <h4>📎 Comprobante</h4>
                                                    <a href={a.comprobante_url} target="_blank" rel="noreferrer"
                                                        className="gapt-comprobante-link">
                                                        Ver comprobante →
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Paginación */}
                    {meta.total_paginas > 1 && (
                        <div className="gapt-paginacion">
                            <button className="gapt-pag-btn"
                                disabled={pagina === 1}
                                onClick={() => setPagina(p => p - 1)}>
                                ← Anterior
                            </button>
                            <span className="gapt-pag-info">
                                Página {pagina} de {meta.total_paginas} · {meta.total} total
                            </span>
                            <button className="gapt-pag-btn"
                                disabled={pagina === meta.total_paginas}
                                onClick={() => setPagina(p => p + 1)}>
                                Siguiente →
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Modales */}
            {modalConfirmar && (
                <ModalConfirmarPago
                    apartado={modalConfirmar}
                    onCerrar={() => setModalConfirmar(null)}
                    onExito={() => { setModalConfirmar(null); cargarDatos(); }}
                />
            )}
            {modalAbono && (
                <ModalAbono
                    apartado={modalAbono}
                    metodosPago={metodosPago}
                    onCerrar={() => setModalAbono(null)}
                    onExito={() => { setModalAbono(null); cargarDatos(); }}
                />
            )}
            {modalCancelar && (
                <ModalCancelar
                    apartado={modalCancelar}
                    onCerrar={() => setModalCancelar(null)}
                    onExito={() => { setModalCancelar(null); cargarDatos(); }}
                />
            )}
        </main>
    );
};

export default GestionApartadosScreen;