// Ruta: Frontend/src/screens/trabajador/GestionApartadosScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { apartadoAPI } from '../../services/api';
import {
    AiOutlineCheckCircle, AiOutlineDollarCircle, AiOutlineStop, AiOutlineFlag,
    AiOutlineShoppingCart, AiOutlineHistory, AiOutlinePaperClip, AiOutlineShopping,
    AiOutlineBank, AiOutlineCreditCard, AiOutlineWallet, AiOutlineClockCircle,
    AiOutlineWarning, AiOutlineCloseCircle, AiOutlineLock, AiOutlineInbox,
    AiOutlineUser, AiOutlineMail, AiOutlinePhone, AiOutlineCalendar, AiOutlineSearch,
    AiOutlineInbox as AiOutlineArchive, AiOutlineFolderOpen, AiOutlineFire,
    AiOutlineThunderbolt, AiOutlineDown, AiOutlineUp, AiOutlineReload, AiOutlineClose,
} from 'react-icons/ai';
import './GestionApartadosScreen.css';

const IconoMetodo: React.FC<{ codigo?: string; size?: number }> = ({ codigo, size = 13 }) => {
    if (codigo === 'mercadopago')   return <AiOutlineShopping size={size} />;
    if (codigo === 'paypal')        return <AiOutlineCreditCard size={size} />;
    if (codigo === 'transferencia') return <AiOutlineBank size={size} />;
    if (codigo === 'efectivo')      return <AiOutlineWallet size={size} />;
    return <AiOutlineDollarCircle size={size} />;
};

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
    metodo_nombre: string | null;
    metodo_codigo: string | null;
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
    archivado: boolean;
    comprobante_url: string | null;
    cliente_nombre: string;
    cliente_email: string;
    cliente_telefono: string;
    productos: { nombre: string; cantidad: number; precio_unitario: number }[] | null;
    abonos: Abono[] | null;
    total_abonos: number;
    metodo_pago_inicial: string | null;
    metodo_pago_inicial_nombre: string | null;
    abono_pendiente: AbonoPendiente | null;
}

interface Meta {
    total: number;
    pagina: number;
    limite: number;
    total_paginas: number;
}

const ESTADO_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{size?:number}> }> = {
    pendiente_pago: { label: 'Pend. pago',  color: '#a78bfa', icon: AiOutlineClockCircle },
    activo:         { label: 'Activo',       color: '#6bcb77', icon: AiOutlineThunderbolt },
    liquidado:      { label: 'Liquidado',    color: '#ecb2c3', icon: AiOutlineCheckCircle },
    cancelado:      { label: 'Cancelado',    color: '#e74c3c', icon: AiOutlineCloseCircle },
    vencido:        { label: 'Vencido',      color: '#f39c12', icon: AiOutlineWarning },
};

const fmtFecha = (f: string) => {
    if (!f) return '—';
    // Si tiene componente de hora es un timestamp UTC — convertir a México antes de extraer la fecha
    if (f.length > 10) {
        return new Date(f).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Mexico_City' });
    }
    const [y, m, d] = f.substring(0, 10).split('-').map(Number);
    if (!y || !m || !d) return '—';
    return new Date(y, m - 1, d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtMoneda = (n: number) =>
    `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

const diasRestantes = (fecha: string) => {
    const [y, m, d] = fecha.substring(0, 10).split('-').map(Number);
    const fechaLocal = new Date(y, m - 1, d);
    fechaLocal.setHours(0, 0, 0, 0);
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    return Math.ceil((fechaLocal.getTime() - hoy.getTime()) / 86400000);
};

// Agrupa apartados por fecha de creación — para no mostrarlos todos de golpe
const agruparApartadosPorFecha = (lista: Apartado[]): { label: string; items: Apartado[] }[] => {
    const hoy    = new Date(); hoy.setHours(0, 0, 0, 0);
    const ayer   = new Date(hoy); ayer.setDate(ayer.getDate() - 1);
    const semana = new Date(hoy); semana.setDate(semana.getDate() - 7);
    const grupos: Record<string, Apartado[]> = { 'Hoy': [], 'Ayer': [], 'Esta semana': [], 'Más antiguos': [] };
    lista.forEach(a => {
        const [y, m, d] = a.fecha_apartado.substring(0, 10).split('-').map(Number);
        const fecha = new Date(y, m - 1, d);
        fecha.setHours(0, 0, 0, 0);
        if (fecha.getTime() === hoy.getTime())       grupos['Hoy'].push(a);
        else if (fecha.getTime() === ayer.getTime()) grupos['Ayer'].push(a);
        else if (fecha >= semana)                    grupos['Esta semana'].push(a);
        else                                          grupos['Más antiguos'].push(a);
    });
    return Object.entries(grupos).filter(([, items]) => items.length > 0).map(([label, items]) => ({ label, items }));
};

// ── Modal confirmar pago inicial ──────────────────────────────
interface ModalConfirmarPagoProps {
    apartado: Apartado;
    onCerrar: () => void;
    onExito: () => void;
}

const ModalConfirmarPago: React.FC<ModalConfirmarPagoProps> = ({ apartado, onCerrar, onExito }) => {
    const [fechaLimiteLiq, setFechaLimiteLiq]   = useState('');
    const [fechaLimiteSig, setFechaLimiteSig]   = useState('');
    const [notas, setNotas]                     = useState('');
    const [error, setError]                     = useState('');
    const [guardando, setGuardando]             = useState(false);

    const metodo        = apartado.metodo_pago_inicial || '';
    const metodoNombre  = apartado.metodo_pago_inicial_nombre || metodo;
    const esPasarela    = ['mercadopago', 'paypal'].includes(metodo);
    const tieneComprobante = !!apartado.comprobante_url;

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

    return (
        <div className="gapt-overlay" onClick={onCerrar}>
            <div className="gapt-modal gapt-modal--sm" onClick={e => e.stopPropagation()}>
                <div className="gapt-modal-header">
                    <h3><AiOutlineCheckCircle size={18} /> Confirmar pago inicial — {apartado.folio}</h3>
                    <button className="gapt-modal-close" onClick={onCerrar}>×</button>
                </div>
                <div className="gapt-modal-body">

                    {/* Datos del pago */}
                    <div className="gapt-modal-resumen">
                        <div className="gapt-resumen-fila">
                            <span>Cliente</span>
                            <strong>{apartado.cliente_nombre}</strong>
                        </div>
                        <div className="gapt-resumen-fila">
                            <span>Método de pago</span>
                            <strong><IconoMetodo codigo={metodo} /> {metodoNombre}</strong>
                        </div>
                        <div className="gapt-resumen-fila">
                            <span>Abono inicial</span>
                            <strong style={{ color: '#6bcb77' }}>{fmtMoneda(apartado.monto_pagado)}</strong>
                        </div>
                        <div className="gapt-resumen-fila">
                            <span>Saldo pendiente tras confirmar</span>
                            <strong style={{ color: '#ecb2c3' }}>{fmtMoneda(apartado.saldo_pendiente)}</strong>
                        </div>
                        <div className="gapt-resumen-fila">
                            <span>Total del apartado</span>
                            <strong>{fmtMoneda(apartado.monto_total)}</strong>
                        </div>
                    </div>

                    {/* Pasarela: aviso de auto-confirmación — sin botón de confirmar manual */}
                    {esPasarela && (
                        <div className="gapt-pago-pendiente-info" style={{ background: '#1a2e1a', borderColor: '#6bcb77', color: '#6bcb77' }}>
                            {metodo === 'paypal' ? '🅿️' : '🛒'} El cliente eligió <strong>{metodoNombre}</strong>. Cuando complete el pago, este apartado <strong>se actualiza automáticamente</strong> — no necesitas hacer nada.
                            <br /><br />
                            Si ya pagó y la pantalla no cambió, recárgala.
                            <br /><br />
                            <button className="gapt-btn-sec" style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                                onClick={() => window.location.reload()}>
                                🔄 Recargar pantalla
                            </button>
                        </div>
                    )}

                    {/* Comprobante de transferencia */}
                    {tieneComprobante && (
                        <div className="gapt-comprobante-preview">
                            <p><AiOutlinePaperClip size={13} /> Comprobante subido por el cliente:</p>
                            <a href={apartado.comprobante_url!} target="_blank" rel="noreferrer">Ver comprobante →</a>
                            <img src={apartado.comprobante_url!} alt="Comprobante"
                                style={{ display: 'block', marginTop: 8, maxWidth: '100%', maxHeight: 160, borderRadius: 6, objectFit: 'contain' }} />
                        </div>
                    )}

                    {/* Formulario de confirmación — solo para efectivo y transferencia */}
                    {!esPasarela && (
                        <>
                            <div className="gapt-form-group" style={{ marginTop: 12 }}>
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
                        </>
                    )}

                    {error && <div className="gapt-error"><AiOutlineWarning size={13} /> {error}</div>}
                </div>
                <div className="gapt-modal-footer">
                    <button className="gapt-btn-sec" onClick={onCerrar}>Cancelar</button>
                    {!esPasarela && (
                        <button className="gapt-btn-pri" onClick={handleConfirmar} disabled={guardando}>
                            {guardando ? 'Confirmando...' : <><AiOutlineCheckCircle size={14} /> Confirmar pago</>}
                        </button>
                    )}
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
    const [monto, setMonto]                             = useState('');
    const [metodoPagoId, setMetodoPagoId]               = useState<number | null>(null);
    const [fechaLimiteSig, setFechaLimiteSig]           = useState('');
    const [fechaLimiteLiq, setFechaLimiteLiq]           = useState('');
    const [notas, setNotas]                             = useState('');
    const [confirmarLiquidacion, setConfirmarLiquidacion] = useState(false);
    const [error, setError]                             = useState('');
    const [guardando, setGuardando]                     = useState(false);

    const handleGuardar = async () => {
        if (!monto || parseFloat(monto) <= 0) { setError('Ingresa un monto válido.'); return; }
        if (parseFloat(monto) > parseFloat(String(apartado.saldo_pendiente))) {
            setError(`El monto no puede superar el saldo pendiente (${fmtMoneda(apartado.saldo_pendiente)}).`); return;
        }
        if (!metodoPagoId) { setError('Selecciona un método de pago.'); return; }
        const montoNum = parseFloat(monto);
        const saldoDespues = Math.round((parseFloat(String(apartado.saldo_pendiente)) - montoNum) * 100) / 100;
        if (saldoDespues === 0 && !confirmarLiquidacion) {
            setError('Este abono liquidará el apartado completo. Marca la casilla de confirmación.'); return;
        }
        setGuardando(true); setError('');
        try {
            const res = await apartadoAPI.registrarAbono(apartado.id, {
                monto: parseFloat(monto),
                metodo_pago_id: metodoPagoId,
                fecha_limite_siguiente: fechaLimiteSig || undefined,
                fecha_limite_liquidacion: fechaLimiteLiq || undefined,
                notas: notas || undefined,
                confirmar_liquidacion: saldoDespues === 0 ? true : undefined,
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
                    <h3><AiOutlineDollarCircle size={18} /> Registrar abono — {apartado.folio}</h3>
                    <button className="gapt-modal-close" onClick={onCerrar}>×</button>
                </div>
                <div className="gapt-modal-body">

                    {/* Franja cliente + saldo */}
                    <div className="gapt-abono-franja">
                        <div>
                            <span className="gapt-abono-franja-label">Cliente</span>
                            <strong>{apartado.cliente_nombre}</strong>
                        </div>
                        <div>
                            <span className="gapt-abono-franja-label">Saldo pendiente</span>
                            <strong style={{ color: '#ecb2c3' }}>{fmtMoneda(apartado.saldo_pendiente)}</strong>
                        </div>
                    </div>

                    {/* Entrada de monto tipo "hero" */}
                    <div className="gapt-abono-hero">
                        <span className="gapt-abono-hero-simbolo">$</span>
                        <input type="number" className="gapt-abono-hero-input"
                            placeholder="0.00"
                            min={1} max={parseFloat(String(apartado.saldo_pendiente))}
                            value={monto} onChange={e => setMonto(e.target.value)} />
                    </div>
                    <div className="gapt-abono-barra-wrap">
                        <div className="gapt-abono-barra">
                            <div className="gapt-abono-barra-fill"
                                style={{ width: `${Math.min(100, (montoNum / parseFloat(String(apartado.saldo_pendiente))) * 100)}%` }} />
                        </div>
                        <div className="gapt-abono-barra-info">
                            {montoNum > 0 ? (
                                <span style={{ color: saldoDespues === 0 ? '#6bcb77' : '#aaa' }}>
                                    Saldo tras este abono: <strong>{fmtMoneda(saldoDespues)}</strong>
                                    {saldoDespues === 0 && ' — ¡Liquidado!'}
                                </span>
                            ) : <span>Ingresa un monto (máx. {fmtMoneda(apartado.saldo_pendiente)})</span>}
                        </div>
                    </div>

                    {saldoDespues === 0 && montoNum > 0 && (
                        <label className="gapt-abono-confirmar-liq">
                            <input
                                type="checkbox"
                                checked={confirmarLiquidacion}
                                onChange={e => setConfirmarLiquidacion(e.target.checked)}
                            />
                            Confirmo que el cliente ya realizó el pago total del saldo pendiente
                        </label>
                    )}

                    <div className="gapt-form-group">
                        <label>Método de pago <span className="gapt-req">*</span></label>
                        <div className="gapt-metodos-chips">
                            {metodosPago.filter(m => m.codigo === 'efectivo').map(m => (
                                <button type="button" key={m.id}
                                    className={`gapt-metodo-chip ${metodoPagoId === m.id ? 'sel' : ''}`}
                                    onClick={() => setMetodoPagoId(m.id)}>
                                    <IconoMetodo codigo={m.codigo} size={15} /> {m.nombre}
                                </button>
                            ))}
                        </div>
                        <small className="gapt-ayuda" style={{ color: '#888', marginTop: 4, display: 'block' }}>
                            Solo efectivo en tienda. Transferencia: el cliente sube su comprobante y aparece el botón "Confirmar abono pendiente". MP/PayPal se confirman solos al pagar en línea.
                        </small>
                    </div>

                    <details className="gapt-abono-opcionales">
                        <summary>Opciones adicionales (fechas y notas)</summary>
                        <div className="gapt-form-group">
                            <label>Actualizar fecha límite liquidación</label>
                            <input type="date" className="gapt-input"
                                value={fechaLimiteLiq}
                                onChange={e => setFechaLimiteLiq(e.target.value)} />
                            <small className="gapt-ayuda">Solo si quieres modificar la fecha límite actual.</small>
                        </div>

                        <div className="gapt-form-group">
                            <label>Fecha límite siguiente abono</label>
                            <input type="date" className="gapt-input"
                                min={new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                                value={fechaLimiteSig}
                                onChange={e => setFechaLimiteSig(e.target.value)} />
                        </div>

                        <div className="gapt-form-group">
                            <label>Notas</label>
                            <textarea className="gapt-textarea" rows={2}
                                placeholder="Ej: Pagó en efectivo..."
                                value={notas} onChange={e => setNotas(e.target.value)} />
                        </div>
                    </details>

                    {error && <div className="gapt-error"><AiOutlineWarning size={13} /> {error}</div>}
                </div>
                <div className="gapt-modal-footer">
                    <button className="gapt-btn-sec" onClick={onCerrar}>Cancelar</button>
                    <button className="gapt-btn-pri" onClick={handleGuardar} disabled={guardando}>
                        {guardando ? 'Guardando...' : <><AiOutlineDollarCircle size={14} /> Registrar abono</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Modal confirmar abono pendiente (trabajador) ──────────────
interface ModalConfirmarAbonoProps {
    apartado: Apartado;
    onCerrar: () => void;
    onExito: () => void;
}

const ModalConfirmarAbono: React.FC<ModalConfirmarAbonoProps> = ({ apartado, onCerrar, onExito }) => {
    const ab = apartado.abono_pendiente!;
    const saldoDespues = Math.max(0, Math.round((parseFloat(String(apartado.saldo_pendiente)) - parseFloat(String(ab.monto))) * 100) / 100);
    const liquidado    = saldoDespues === 0;

    const [notas, setNotas]                             = useState('');
    const [fechaLimiteSig, setFechaLimiteSig]           = useState('');
    const [confirmarLiquidacion, setConfirmarLiquidacion] = useState(false);
    const [error, setError]                             = useState('');
    const [guardando, setGuardando]                     = useState(false);

    const handleConfirmar = async () => {
        if (liquidado && !confirmarLiquidacion) {
            setError('Marca la casilla para confirmar que el cliente ya realizó el pago total.'); return;
        }
        setGuardando(true); setError('');
        try {
            const res = await apartadoAPI.confirmarAbonoPendiente(apartado.id, {
                notas: notas || undefined,
                fecha_limite_siguiente: fechaLimiteSig || undefined,
                confirmar_liquidacion: liquidado ? true : undefined,
            });
            if (!res.success) throw new Error(res.message);
            onExito();
        } catch (err: any) {
            setError(err.message || 'Error al confirmar el abono.');
        } finally { setGuardando(false); }
    };

    return (
        <div className="gapt-overlay" onClick={onCerrar}>
            <div className="gapt-modal gapt-modal--sm" onClick={e => e.stopPropagation()}>
                <div className="gapt-modal-header">
                    <h3><AiOutlineCheckCircle size={18} /> Confirmar abono — {apartado.folio}</h3>
                    <button className="gapt-modal-close" onClick={onCerrar}>×</button>
                </div>
                <div className="gapt-modal-body">
                    {/* Datos del abono pendiente */}
                    <div className="gapt-modal-resumen">
                        <div className="gapt-resumen-fila">
                            <span>Cliente</span>
                            <strong>{apartado.cliente_nombre}</strong>
                        </div>
                        <div className="gapt-resumen-fila">
                            <span>Método de pago</span>
                            <strong>{ab.metodo_nombre}</strong>
                        </div>
                        <div className="gapt-resumen-fila">
                            <span>Monto declarado</span>
                            <strong style={{ color: '#6bcb77' }}>{fmtMoneda(ab.monto)}</strong>
                        </div>
                        <div className="gapt-resumen-fila">
                            <span>Solicitado el</span>
                            <strong>{fmtFecha(ab.fecha_creacion)}</strong>
                        </div>
                        <div className="gapt-resumen-fila">
                            <span>Saldo tras confirmar</span>
                            <strong style={{ color: liquidado ? '#6bcb77' : '#ecb2c3' }}>
                                {fmtMoneda(saldoDespues)}
                                {liquidado && ' Liquidado'}
                            </strong>
                        </div>
                    </div>

                    {/* Comprobante si existe */}
                    {ab.comprobante_url && (
                        <div className="gapt-form-group">
                            <label>Comprobante del cliente</label>
                            <a href={ab.comprobante_url} target="_blank" rel="noreferrer"
                                className="gapt-comprobante-link" style={{ display: 'block', marginTop: 6 }}>
                                <AiOutlinePaperClip size={13} /> Ver comprobante →
                            </a>
                            <img src={ab.comprobante_url} alt="Comprobante"
                                style={{ marginTop: 8, maxWidth: '100%', maxHeight: 180, borderRadius: 6, objectFit: 'contain' }} />
                        </div>
                    )}

                    {ab.metodo_codigo === 'efectivo' && (
                        <div className="gapt-pago-pendiente-info">
                            💵 El cliente reportó pago en efectivo. Confirma solo si ya recibiste el dinero físicamente.
                        </div>
                    )}

                    {liquidado && (
                        <div style={{ background: '#2d1f0e', borderRadius: 6, padding: '8px 12px', marginTop: 8 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: '#f39c12', fontWeight: 500, fontSize: '0.85rem' }}>
                                <input type="checkbox" checked={confirmarLiquidacion}
                                    onChange={e => setConfirmarLiquidacion(e.target.checked)}
                                    style={{ width: 16, height: 16, accentColor: '#f39c12' }} />
                                Confirmo que el cliente ya realizó el pago total del saldo pendiente
                            </label>
                        </div>
                    )}

                    <div className="gapt-form-group" style={{ marginTop: 12 }}>
                        <label>Fecha límite siguiente abono (opcional)</label>
                        <input type="date" className="gapt-input"
                            min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                            value={fechaLimiteSig}
                            onChange={e => setFechaLimiteSig(e.target.value)} />
                    </div>

                    <div className="gapt-form-group">
                        <label>Notas (opcional)</label>
                        <textarea className="gapt-textarea" rows={2}
                            placeholder="Ej: Comprobante verificado, transferencia recibida..."
                            value={notas} onChange={e => setNotas(e.target.value)} />
                    </div>

                    {error && <div className="gapt-error"><AiOutlineWarning size={13} /> {error}</div>}
                </div>
                <div className="gapt-modal-footer">
                    <button className="gapt-btn-sec" onClick={onCerrar}>Cancelar</button>
                    <button className="gapt-btn-pri" onClick={handleConfirmar} disabled={guardando}>
                        {guardando ? 'Confirmando...' : <><AiOutlineCheckCircle size={14} /> Confirmar abono</>}
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
                    <h3><AiOutlineStop size={18} /> Cancelar apartado — {apartado.folio}</h3>
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
                    {error && <div className="gapt-error"><AiOutlineWarning size={13} /> {error}</div>}
                </div>
                <div className="gapt-modal-footer">
                    <button className="gapt-btn-sec" onClick={onCerrar}>Volver</button>
                    <button className="gapt-btn-danger" onClick={handleCancelar} disabled={guardando}>
                        {guardando ? 'Cancelando...' : <><AiOutlineClose size={14} /> Confirmar cancelación</>}
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
    const [modalAbono, setModalAbono]                 = useState<Apartado | null>(null);
    const [modalCancelar, setModalCancelar]           = useState<Apartado | null>(null);
    const [modalConfirmar, setModalConfirmar]         = useState<Apartado | null>(null);
    const [modalConfirmarAbono, setModalConfirmarAbono] = useState<Apartado | null>(null);
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

    const estadoVisual = (a: Apartado): { icon: React.ComponentType<{size?:number}>; label: string; color: string } => {
        if (a.estado === 'liquidado')      return { icon: AiOutlineCheckCircle, label: 'Liquidado',  color: '#ecb2c3' };
        if (a.estado === 'cancelado')      return { icon: AiOutlineCloseCircle, label: 'Cancelado',  color: '#e74c3c' };
        if (a.estado === 'vencido')        return { icon: AiOutlineWarning, label: 'Vencido',    color: '#f39c12' };
        if (a.estado === 'pendiente_pago') return { icon: AiOutlineClockCircle, label: 'Pendiente',  color: '#a78bfa' };
        const pct = porcentaje(a);
        if (pct < 50)  return { icon: AiOutlineLock, label: 'Reservado',  color: '#60a5fa' };
        if (pct < 100) return { icon: AiOutlineInbox, label: 'En proceso', color: '#f59e0b' };
        return { icon: AiOutlineCheckCircle, label: 'Liquidado', color: '#ecb2c3' };
    };

    // Conteo por estado para las tarjetas resumen (solo no archivados)
    const conteoEstado = (estado: string) =>
        estado === 'todos'
            ? meta.total
            : apartados.filter(a => a.estado === estado).length;

    return (
        <main className="gapt-body">
            <div className="gapt-top-bar">
                <h1 className="gapt-titulo"><AiOutlineFlag size={20} /> Gestión de Apartados</h1>
                <button
                    className={`gapt-btn-archivo ${verArchivados ? 'activo' : ''}`}
                    onClick={() => { setVerArchivados(!verArchivados); setPagina(1); setFiltro('todos'); }}>
                    {verArchivados ? <><AiOutlineFolderOpen size={14} /> Ver activos</> : <><AiOutlineArchive size={14} /> Ver archivados</>}
                </button>
            </div>

            {/* Tarjetas resumen — solo cuando no se ven archivados */}
            {!verArchivados && (
                <div className="gapt-resumen-cards">
                    {[
                        { label: 'Pend. pago',  estado: 'pendiente_pago' },
                        { label: 'Activos',     estado: 'activo' },
                        { label: 'Vencidos',    estado: 'vencido' },
                        { label: 'Liquidados',  estado: 'liquidado' },
                        { label: 'Cancelados',  estado: 'cancelado' },
                    ].map(c => (
                        <div key={c.estado} className={`gapt-stat-card ${filtro === c.estado ? 'sel' : ''}`}
                            onClick={() => { setFiltro(c.estado); setPagina(1); }}>
                            <span className="gapt-stat-num">
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
                    <span className="gapt-search-icon"><AiOutlineSearch size={15} /></span>
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
                                {f === 'todos' ? 'Todos' : (
                                    <>{React.createElement(ESTADO_CONFIG[f].icon, { size: 13 })} {ESTADO_CONFIG[f]?.label}</>
                                )}
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

            {error && <div className="gapt-error-banner"><AiOutlineWarning size={13} /> {error}</div>}

            {cargando ? (
                <div className="gapt-loading"><div className="gapt-spinner" /><p>Cargando...</p></div>
            ) : apartados.length === 0 ? (
                <div className="gapt-vacio">
                    <p>{busqueda ? `Sin resultados para "${busqueda}"` : `No hay apartados ${verArchivados ? 'archivados' : filtro !== 'todos' ? ESTADO_CONFIG[filtro]?.label?.toLowerCase() + 's' : ''}`}</p>
                </div>
            ) : (
                <>
                    {agruparApartadosPorFecha(apartados).map(grupo => (
                    <div key={grupo.label} className="gapt-fecha-grupo">
                        <div className="gapt-fecha-grupo-label">
                            <span>{grupo.label}</span>
                            <span className="gapt-fecha-grupo-count">{grupo.items.length} apartado{grupo.items.length !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="gapt-lista">
                        {grupo.items.map(a => {
                            const cfg    = estadoVisual(a);
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
                                                <cfg.icon size={12} /> {cfg.label}
                                            </span>
                                            {a.estado === 'activo' && dias <= 7 && dias >= 0 && (
                                                <span className="gapt-badge-urgente"><AiOutlineFire size={11} /> Vence en {dias}d</span>
                                            )}
                                            {a.estado === 'activo' && dias < 0 && (
                                                <span className="gapt-badge-vencido"><AiOutlineStop size={11} /> Vencido hace {Math.abs(dias)}d</span>
                                            )}
                                            {a.estado === 'pendiente_pago' && a.comprobante_url && (
                                                <span className="gapt-badge-comprobante"><AiOutlinePaperClip size={11} /> Comprobante listo</span>
                                            )}
                                            {a.estado === 'activo' && a.abono_pendiente && (
                                                <span className="gapt-badge-comprobante" style={{ background: '#1a3a1a', color: '#6bcb77' }}>
                                                    <AiOutlineDollarCircle size={11} /> Abono pendiente ({a.abono_pendiente.metodo_nombre})
                                                </span>
                                            )}
                                        </div>
                                        <span className="gapt-chevron">{abierto ? <AiOutlineUp size={14} /> : <AiOutlineDown size={14} />}</span>
                                    </div>

                                    {/* Info cliente */}
                                    <div className="gapt-cliente-info">
                                        <span><AiOutlineUser size={13} /> <strong>{a.cliente_nombre}</strong></span>
                                        <span><AiOutlineMail size={13} /> {a.cliente_email}</span>
                                        {a.cliente_telefono && <span><AiOutlinePhone size={13} /> {a.cliente_telefono}</span>}
                                        <span className="gapt-cliente-fecha"><AiOutlineCalendar size={13} /> {fmtFecha(a.fecha_apartado)}</span>
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
                                            <span className="gapt-dato-label">Método pago</span>
                                            <span className="gapt-dato-val">
                                                <IconoMetodo codigo={a.metodo_pago_inicial || undefined} /> {a.metodo_pago_inicial_nombre || '—'}
                                            </span>
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
                                                            <IconoMetodo codigo={a.metodo_pago_inicial || undefined} />{' '}
                                                            {a.metodo_pago_inicial === 'efectivo'
                                                                ? 'El cliente pagará en efectivo en tienda. Confirma cuando recibas el pago.'
                                                                : 'El cliente subió un comprobante de transferencia. Verifica antes de confirmar.'
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
                                                            <AiOutlineCheckCircle size={14} /> Confirmar pago inicial
                                                        </button>
                                                        <button className="gapt-btn-danger-sm"
                                                            onClick={() => setModalCancelar(a)}>
                                                            <AiOutlineClose size={14} /> Rechazar
                                                        </button>
                                                    </>
                                                ) : (
                                                    <div className="gapt-pago-pendiente-info">
                                                        <IconoMetodo codigo={a.metodo_pago_inicial || undefined} />{' '}
                                                        {a.metodo_pago_inicial === 'mercadopago'
                                                            ? 'El cliente está completando el pago en MercadoPago. Se confirmará automáticamente.'
                                                            : a.metodo_pago_inicial === 'paypal'
                                                            ? 'El cliente está completando el pago en PayPal. Se confirmará automáticamente.'
                                                            : 'Esperando que el cliente realice el pago.'
                                                        }
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                            {a.estado === 'activo' && (
                                                <div className="gapt-acciones">
                                                    {a.abono_pendiente && (() => {
                                                        const cod = a.abono_pendiente.metodo_codigo;
                                                        const esPas = cod === 'paypal' || cod === 'mercadopago';
                                                        return esPas ? (
                                                            <div className="gapt-pago-pendiente-info" style={{ background: '#1a2e1a', borderColor: '#6bcb77', color: '#6bcb77' }}>
                                                                <IconoMetodo codigo={cod} /> Abono de <strong>{fmtMoneda(a.abono_pendiente.monto)}</strong> via {a.abono_pendiente.metodo_nombre} — se confirma automáticamente al completar el pago. Recarga si ya pagó.
                                                                <button className="gapt-btn-sec" style={{ fontSize: '0.78rem', padding: '3px 8px', marginLeft: 8 }}
                                                                    onClick={() => window.location.reload()}><AiOutlineReload size={12} /> Recargar</button>
                                                            </div>
                                                        ) : (
                                                            <button className="gapt-btn-pri"
                                                                onClick={() => setModalConfirmarAbono(a)}
                                                                style={{ background: '#1a4a2a', borderColor: '#6bcb77' }}>
                                                                <AiOutlineCheckCircle size={14} /> Confirmar abono de {fmtMoneda(a.abono_pendiente.monto)} ({a.abono_pendiente.metodo_nombre})
                                                            </button>
                                                        );
                                                    })()}
                                                    <button className="gapt-btn-pri"
                                                        onClick={() => setModalAbono(a)}>
                                                        <AiOutlineDollarCircle size={14} /> Registrar abono
                                                    </button>
                                                    {!a.advertencia_enviada ? (
                                                        <button className="gapt-btn-warn"
                                                            onClick={() => handleAdvertencia(a.id)}>
                                                            <AiOutlineWarning size={14} /> Marcar advertencia
                                                        </button>
                                                    ) : (
                                                        <span className="gapt-advertencia-badge"><AiOutlineWarning size={12} /> Advertencia enviada</span>
                                                    )}
                                                    <button className="gapt-btn-danger-sm"
                                                        onClick={() => setModalCancelar(a)}>
                                                        <AiOutlineClose size={14} /> Cancelar
                                                    </button>
                                                </div>
                                            )}
                                            {a.estado === 'liquidado' && (
                                                <div style={{ margin: '12px 0', padding: '14px 18px', background: '#0f2a1a', border: '1px solid #6bcb77', borderRadius: 10, color: '#6bcb77', textAlign: 'center' }}>
                                                    <AiOutlineCheckCircle size={15} /> <strong>Apartado liquidado</strong> — El cliente completó todos sus pagos.
                                                </div>
                                            )}
                                            {['liquidado', 'cancelado'].includes(a.estado) && (
                                                <div className="gapt-acciones">
                                                    <button className="gapt-btn-archivar"
                                                        onClick={() => handleArchivar(a.id, true)}>
                                                        <AiOutlineArchive size={14} /> Archivar
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                    {verArchivados && (
                                        <div className="gapt-acciones">
                                            <button className="gapt-btn-sec"
                                                onClick={() => handleArchivar(a.id, false)}>
                                                <AiOutlineFolderOpen size={14} /> Desarchivar
                                            </button>
                                        </div>
                                    )}

                                    {/* Detalle expandible */}
                                    {abierto && (
                                        <div className="gapt-detalle">
                                            {a.productos && a.productos.length > 0 && (
                                                <div className="gapt-seccion">
                                                    <h4><AiOutlineShoppingCart size={14} /> Productos</h4>
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
                                                <h4><AiOutlineHistory size={14} /> Historial de abonos</h4>
                                                {a.abonos && a.abonos.length > 0 ? (
                                                    <div className="gapt-abonos-timeline">
                                                        {a.abonos.map((ab, i) => {
                                                            const parseLocal = (s: string) => { const [y,m,d] = s.substring(0,10).split('-').map(Number); return new Date(y,m-1,d); };
                                                            const esAdelanto = ab.fecha_limite_siguiente &&
                                                                parseLocal(ab.fecha_abono) < parseLocal(ab.fecha_limite_siguiente) &&
                                                                i > 0 && a.abonos[i - 1].fecha_limite_siguiente &&
                                                                parseLocal(ab.fecha_abono) < parseLocal(a.abonos[i - 1].fecha_limite_siguiente!);
                                                            return (
                                                            <div key={ab.id} className="gapt-abono-item">
                                                                <div className="gapt-abono-dot"><IconoMetodo codigo={ab.metodo_codigo || undefined} size={12} /></div>
                                                                <div className="gapt-abono-contenido">
                                                                    <div className="gapt-abono-top">
                                                                        <strong>Pago {i + 1}</strong>
                                                                        <span className="gapt-abono-monto">+{fmtMoneda(ab.monto)}</span>
                                                                    </div>
                                                                    <div className="gapt-abono-meta">
                                                                        <span>{fmtFecha(ab.fecha_abono)}</span>
                                                                        <span>{ab.metodo_nombre || '—'}</span>
                                                                        <span>Saldo restante: <strong>{fmtMoneda(ab.monto_despues)}</strong></span>
                                                                        {ab.fecha_limite_siguiente && <span>Próx. límite: {fmtFecha(ab.fecha_limite_siguiente)}</span>}
                                                                        {esAdelanto && <span className="gapt-abono-adelanto"><AiOutlineThunderbolt size={10} /> adelanto</span>}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <p className="gapt-sin-datos">Sin abonos registrados.</p>
                                                )}
                                            </div>

                                            {a.comprobante_url && (
                                                <div className="gapt-seccion">
                                                    <h4><AiOutlinePaperClip size={14} /> Comprobante</h4>
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
                    </div>
                    ))}

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
            {modalConfirmarAbono && modalConfirmarAbono.abono_pendiente && (
                <ModalConfirmarAbono
                    apartado={modalConfirmarAbono}
                    onCerrar={() => setModalConfirmarAbono(null)}
                    onExito={() => { setModalConfirmarAbono(null); cargarDatos(); }}
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