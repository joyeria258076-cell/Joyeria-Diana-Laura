// Ruta: Frontend/src/screens/trabajador/DashboardTrabajadorScreen.tsx
// Panel de inicio del trabajador: qué hay que atender ahora (pedidos por tomar,
// pagos por verificar, pedidos por preparar, apartados y personalizaciones),
// con acceso directo a cada gestión. Se refresca solo cada minuto.
import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { carritoAPI, apartadoAPI, personalizacionAPI } from "../../services/api";
import {
    AiOutlineShoppingCart, AiOutlineCreditCard, AiOutlineGift, AiOutlineFlag, AiOutlineEdit,
    AiOutlineArrowRight, AiOutlineReload, AiOutlineCheckCircle,
} from "react-icons/ai";
import "../../styles/SitioSecciones.css";
import "./DashboardTrabajadorScreen.css";

const ESTADO_LABEL: Record<string, string> = {
    pendiente: 'Pendiente', confirmado: 'Confirmado', en_preparacion: 'En preparación',
    enviado: 'Enviado', entregado: 'Entregado', cancelado: 'Cancelado', expirado: 'Expirado',
};

const REFRESCO_MS = 60 * 1000;

const tiempoDesde = (f: string) => {
    const min = Math.max(0, Math.round((Date.now() - new Date(f).getTime()) / 60000));
    if (min < 60) return `hace ${min} min`;
    const h = Math.round(min / 60);
    if (h < 24) return `hace ${h} h`;
    return `hace ${Math.round(h / 24)} d`;
};
const diasPara = (f: string) => Math.ceil((new Date(f).getTime() - Date.now()) / 86400000);
const dinero = (n: number) => `$${Number(n || 0).toLocaleString('es-MX', { maximumFractionDigits: 2 })}`;

export default function DashboardTrabajadorScreen() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const miId = user?.dbId;

    const [pedidos, setPedidos] = useState<any[]>([]);
    const [apartados, setApartados] = useState<any[]>([]);
    const [persPendientes, setPersPendientes] = useState(0);
    const [loading, setLoading] = useState(true);
    const [actualizado, setActualizado] = useState<Date | null>(null);
    const [tomandoId, setTomandoId] = useState<number | null>(null);
    const [aviso, setAviso] = useState('');

    const cargar = useCallback(async (silencioso = false) => {
        if (!silencioso) setLoading(true);
        try {
            const [ped, apActivos, apPendPago, pers] = await Promise.all([
                carritoAPI.getAllPedidos().catch(() => null),
                apartadoAPI.getTodos('activo').catch(() => null),
                apartadoAPI.getTodos('pendiente_pago').catch(() => null),
                personalizacionAPI.getSolicitudes('pendiente').catch(() => null),
            ]);
            if (ped?.success) setPedidos(ped.data || []);
            setApartados([...(apPendPago?.data || []), ...(apActivos?.data || [])]);
            setPersPendientes(pers?.success ? (pers.data || []).length : 0);
            setActualizado(new Date());
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        cargar();
        const t = setInterval(() => cargar(true), REFRESCO_MS);
        return () => clearInterval(t);
    }, [cargar]);

    // ── Clasificación ──
    const porTomar = pedidos
        .filter(p => p.estado === 'pendiente' && !p.trabajador_id && !p.es_apartado)
        .sort((a, b) => +new Date(a.fecha_creacion) - +new Date(b.fecha_creacion));
    const mios = pedidos.filter(p => p.trabajador_id === miId);
    const pagosPorVerificar = mios.filter(p =>
        p.estado === 'confirmado' && p.estado_pago !== 'aprobado' && !!p.comprobante_transferencia_url);
    const porPreparar = mios.filter(p =>
        p.estado === 'en_preparacion' || (p.estado === 'confirmado' && p.estado_pago === 'aprobado'));
    const enCurso = mios
        .filter(p => !['entregado', 'cancelado', 'expirado'].includes(p.estado))
        .sort((a, b) => +new Date(b.fecha_creacion) - +new Date(a.fecha_creacion));
    const apartadosPendPago = apartados.filter(a => a.estado === 'pendiente_pago');
    const apartadosPorVencer = apartados
        .filter(a => a.estado === 'activo' && a.fecha_limite_liquidacion && diasPara(a.fecha_limite_liquidacion) <= 7)
        .sort((a, b) => +new Date(a.fecha_limite_liquidacion) - +new Date(b.fecha_limite_liquidacion));

    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const entregadosMes = mios.filter(p => p.estado === 'entregado' &&
        new Date(p.fecha_actualizacion || p.fecha_creacion) >= inicioMes).length;

    const tarjetas = [
        { icon: <AiOutlineShoppingCart size={20} />, n: porTomar.length, titulo: 'Pedidos por tomar', desc: 'Nadie los atiende aún', ruta: '/pedidos-admin' },
        { icon: <AiOutlineCreditCard size={20} />, n: pagosPorVerificar.length, titulo: 'Pagos por verificar', desc: 'Comprobantes de tus pedidos', ruta: '/pedidos-admin' },
        { icon: <AiOutlineGift size={20} />, n: porPreparar.length, titulo: 'Por preparar o enviar', desc: 'Pagados y listos para armar', ruta: '/pedidos-admin' },
        { icon: <AiOutlineFlag size={20} />, n: apartadosPendPago.length + apartadosPorVencer.length, titulo: 'Apartados por atender', desc: `${apartadosPendPago.length} por confirmar · ${apartadosPorVencer.length} por vencer`, ruta: '/apartados-admin' },
        { icon: <AiOutlineEdit size={20} />, n: persPendientes, titulo: 'Personalizaciones', desc: 'Solicitudes por revisar', ruta: '/personalizaciones-admin' },
    ];
    const totalPendiente = tarjetas.reduce((s, t) => s + t.n, 0);

    const tomar = async (p: any) => {
        setTomandoId(p.id);
        setAviso('');
        try {
            const res: any = await carritoAPI.tomarPedido(p.id);
            setAviso(res?.success === false ? `⚠️ ${res.message}` : `✅ Tomaste el pedido ${p.folio}.`);
            await cargar(true);
        } catch (err: any) {
            setAviso(`⚠️ ${err?.message || 'No se pudo tomar el pedido'}`);
            await cargar(true);
        } finally {
            setTomandoId(null);
        }
    };

    const nombre = user?.nombre?.split(' ')[0] || 'Trabajador';
    const hoy = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });

    return (
        <div className="tr2-wrap">
            <header className="tr2-head">
                <div>
                    <div className="sx-eyebrow tr2-eyebrow">{hoy}</div>
                    <h1 className="sx-title tr2-title">Hola, <span>{nombre}</span></h1>
                    <p className="sx-subtitle tr2-sub">
                        {loading ? 'Revisando pendientes…'
                            : totalPendiente === 0 ? 'Todo al día: no hay nada pendiente por ahora.'
                            : `Tienes ${totalPendiente} ${totalPendiente === 1 ? 'asunto' : 'asuntos'} por atender.`}
                    </p>
                </div>
                <button className="tr2-refresh" onClick={() => cargar()} title="Actualizar">
                    <AiOutlineReload size={16} />
                    <span>{actualizado ? `Actualizado ${actualizado.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}` : 'Actualizar'}</span>
                </button>
            </header>

            {aviso && <div className="tr2-aviso" role="status">{aviso}<button onClick={() => setAviso('')} aria-label="Cerrar">×</button></div>}

            {/* ── Qué atender ahora ── */}
            <section className="tr2-tarjetas">
                {tarjetas.map(t => (
                    <button key={t.titulo} className={`tr2-tarjeta${t.n > 0 ? ' tr2-tarjeta--alerta' : ''}`} onClick={() => navigate(t.ruta)}>
                        <span className="tr2-tarjeta-icon">{t.icon}</span>
                        <span className="tr2-tarjeta-n">{loading ? '—' : t.n}</span>
                        <span className="tr2-tarjeta-titulo">{t.titulo}</span>
                        <span className="tr2-tarjeta-desc">{t.desc}</span>
                    </button>
                ))}
            </section>

            <div className="tr2-grid">
                {/* ── Disponibles para tomar ── */}
                <section className="tr2-panel">
                    <div className="tr2-panel-head">
                        <h2>Disponibles para tomar</h2>
                        <Link to="/pedidos-admin">Ver todos <AiOutlineArrowRight size={12} /></Link>
                    </div>
                    {porTomar.length === 0 ? (
                        <p className="tr2-vacio"><AiOutlineCheckCircle size={16} /> {loading ? 'Cargando…' : 'No hay pedidos esperando.'}</p>
                    ) : (
                        <ul className="tr2-lista">
                            {porTomar.slice(0, 5).map(p => (
                                <li key={p.id} className="tr2-fila">
                                    <div className="tr2-fila-info">
                                        <strong>{p.folio}</strong>
                                        <span>{p.cliente_nombre_completo} · {dinero(p.total)} · {p.tipo_entrega === 'domicilio' ? 'Domicilio' : 'Tienda'}</span>
                                    </div>
                                    <span className="tr2-fila-tiempo">{tiempoDesde(p.fecha_creacion)}</span>
                                    <button className="sx-btn tr2-btn-tomar" onClick={() => tomar(p)} disabled={tomandoId === p.id}>
                                        {tomandoId === p.id ? 'Tomando…' : 'Tomar'}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                {/* ── Mis pedidos en curso ── */}
                <section className="tr2-panel">
                    <div className="tr2-panel-head">
                        <h2>Mis pedidos en curso</h2>
                        <Link to="/pedidos-admin">Gestionar <AiOutlineArrowRight size={12} /></Link>
                    </div>
                    {enCurso.length === 0 ? (
                        <p className="tr2-vacio"><AiOutlineCheckCircle size={16} /> {loading ? 'Cargando…' : 'No tienes pedidos activos.'}</p>
                    ) : (
                        <ul className="tr2-lista">
                            {enCurso.slice(0, 5).map(p => (
                                <li key={p.id} className="tr2-fila tr2-fila--link" onClick={() => navigate('/pedidos-admin')}>
                                    <div className="tr2-fila-info">
                                        <strong>{p.folio}</strong>
                                        <span>{p.cliente_nombre_completo} · {dinero(p.total)}</span>
                                    </div>
                                    <span className={`tr2-estado tr2-estado--${p.estado}`}>
                                        {ESTADO_LABEL[p.estado] || p.estado}
                                        {p.estado === 'confirmado' && p.estado_pago !== 'aprobado' && ' · sin pago'}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                {/* ── Apartados por vencer ── */}
                <section className="tr2-panel">
                    <div className="tr2-panel-head">
                        <h2>Apartados por vencer</h2>
                        <Link to="/apartados-admin">Ver apartados <AiOutlineArrowRight size={12} /></Link>
                    </div>
                    {apartadosPorVencer.length === 0 ? (
                        <p className="tr2-vacio"><AiOutlineCheckCircle size={16} /> {loading ? 'Cargando…' : 'Ninguno vence en los próximos 7 días.'}</p>
                    ) : (
                        <ul className="tr2-lista">
                            {apartadosPorVencer.slice(0, 4).map(a => {
                                const d = diasPara(a.fecha_limite_liquidacion);
                                return (
                                    <li key={a.id} className="tr2-fila tr2-fila--link" onClick={() => navigate('/apartados-admin')}>
                                        <div className="tr2-fila-info">
                                            <strong>{a.folio}</strong>
                                            <span>{a.cliente_nombre} · falta {dinero(a.saldo_pendiente)}</span>
                                        </div>
                                        <span className={`tr2-estado${d <= 2 ? ' tr2-estado--urgente' : ''}`}>
                                            {d < 0 ? 'Vencido' : d === 0 ? 'Vence hoy' : `Vence en ${d} d`}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </section>

                {/* ── Mi mes ── */}
                <section className="tr2-panel tr2-panel--resumen">
                    <div className="tr2-panel-head"><h2>Mi mes</h2></div>
                    <div className="tr2-resumen">
                        <div><strong>{loading ? '—' : entregadosMes}</strong><span>Entregados este mes</span></div>
                        <div><strong>{loading ? '—' : enCurso.length}</strong><span>Pedidos activos</span></div>
                        <div><strong>{loading ? '—' : mios.filter(p => p.estado === 'entregado').length}</strong><span>Entregados en total</span></div>
                    </div>
                    <Link to="/trabajador/actividades" className="sx-btn sx-btn--ghost tr2-btn-actividades">Ver mis actividades</Link>
                </section>
            </div>
        </div>
    );
}
