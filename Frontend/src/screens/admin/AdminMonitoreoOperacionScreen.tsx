// Ruta: Frontend/src/screens/admin/AdminMonitoreoOperacionScreen.tsx
// Vista de SOLO LECTURA para el admin: consulta pedidos y apartados, sin
// botones de accion (tomar, cambiar estado, confirmar pago, etc.) — esas
// acciones son exclusivas del trabajador (ver GestionPedidosScreen /
// GestionApartadosScreen), tanto en la UI como ya validado en el backend.
import React, { useEffect, useMemo, useState } from 'react';
import {
    AiOutlineShoppingCart, AiOutlineFlag, AiOutlineEye, AiOutlineSearch, AiOutlineReload,
    AiOutlineUser, AiOutlineShop, AiOutlineCar, AiOutlineClockCircle, AiOutlineWarning, AiOutlineCalendar,
} from 'react-icons/ai';
import { carritoAPI, apartadoAPI } from '../../services/api';
import Loader from '../../components/Loader';
import '../../styles/SitioSecciones.css';
import '../../styles/GestionSitio.css';
import './AdminMonitoreoOperacionScreen.css';

type Tab = 'pedidos' | 'apartados';

const ETIQUETA: Record<string, string> = {
    pendiente: 'Pendiente', confirmado: 'Confirmado', en_preparacion: 'En preparación', enviado: 'Enviado',
    entregado: 'Entregado', cancelado: 'Cancelado', expirado: 'Expirado',
    activo: 'Activo', liquidado: 'Liquidado', vencido: 'Vencido', pendiente_pago: 'Esperando pago',
};
const TONO: Record<string, string> = {
    pendiente: 'warning', pendiente_pago: 'warning', confirmado: 'info', en_preparacion: 'accent', enviado: 'primary',
    entregado: 'success', liquidado: 'success', activo: 'info', cancelado: 'danger', vencido: 'danger', expirado: 'muted',
};
const PAGO: Record<string, { t: string; tono: string }> = {
    aprobado: { t: 'Pagado', tono: 'success' }, pendiente: { t: 'Pago pendiente', tono: 'warning' },
    en_revision: { t: 'Pago en revisión', tono: 'info' }, rechazado: { t: 'Pago rechazado', tono: 'danger' },
};
const ORDEN_PEDIDO = ['pendiente', 'confirmado', 'en_preparacion', 'enviado', 'entregado'];
const ORDEN_APARTADO = ['pendiente_pago', 'activo', 'liquidado', 'vencido', 'cancelado'];
// Lo que sigue en curso (lo que se muestra al entrar) y cuántos se pintan por tanda
const CERRADOS = ['entregado', 'cancelado', 'expirado', 'liquidado', 'vencido'];
const POR_TANDA = 12;

const dinero = (v: any) => `$${Number(v || 0).toLocaleString('es-MX')}`;
const hace = (f?: string) => {
    if (!f) return '';
    const min = Math.max(0, Math.round((Date.now() - new Date(f).getTime()) / 60000));
    if (min < 60) return `hace ${min} min`;
    const h = Math.round(min / 60);
    if (h < 24) return `hace ${h} h`;
    const d = Math.round(h / 24);
    return `hace ${d} día${d === 1 ? '' : 's'}`;
};
const diasPara = (f?: string) => f ? Math.ceil((new Date(f).getTime() - Date.now()) / 86400000) : null;

// Pasos del pedido; si es "recoger en tienda" no hay "Enviado"
const pasosDe = (p: any) => (p.tipo_entrega === 'domicilio' ? ORDEN_PEDIDO : ORDEN_PEDIDO.filter(e => e !== 'enviado'));

const AdminMonitoreoOperacionScreen: React.FC = () => {
    const [tab, setTab] = useState<Tab>('pedidos');
    const [pedidos, setPedidos] = useState<any[]>([]);
    const [apartados, setApartados] = useState<any[]>([]);
    const [cargando, setCargando] = useState(true);
    const [filtro, setFiltro] = useState<string>('en_curso');
    const [mostrar, setMostrar] = useState(POR_TANDA);
    const [busqueda, setBusqueda] = useState('');
    const [recarga, setRecarga] = useState(0);

    useEffect(() => {
        const cargar = async () => {
            setCargando(true);
            try {
                if (tab === 'pedidos') {
                    const res = await carritoAPI.getAllPedidos();
                    if (res.success) setPedidos(res.data || []);
                } else {
                    const res = await apartadoAPI.getTodos(undefined, undefined, 1, false);
                    if (res.success) setApartados(res.data || []);
                }
            } finally {
                setCargando(false);
            }
        };
        cargar();
    }, [tab, recarga]);

    useEffect(() => { setFiltro('en_curso'); setBusqueda(''); }, [tab]);
    useEffect(() => { setMostrar(POR_TANDA); }, [tab, filtro, busqueda]);

    const lista = tab === 'pedidos' ? pedidos : apartados;
    const orden = tab === 'pedidos' ? [...ORDEN_PEDIDO, 'cancelado'] : ORDEN_APARTADO;
    const conteo = useMemo(() => {
        const c: Record<string, number> = {};
        lista.forEach(x => { c[x.estado] = (c[x.estado] || 0) + 1; });
        return c;
    }, [lista]);

    const visibles = useMemo(() => {
        const q = busqueda.trim().toLowerCase();
        return lista.filter(x =>
            (filtro === 'todos' || (filtro === 'en_curso' ? !CERRADOS.includes(x.estado) : x.estado === filtro)) &&
            (!q || `${x.folio} ${x.cliente_nombre_completo || ''} ${x.cliente_nombre || ''}`.toLowerCase().includes(q)))
            // Siempre del más reciente al más antiguo
            .sort((a, b) => new Date(b.fecha_creacion || 0).getTime() - new Date(a.fecha_creacion || 0).getTime());
    }, [lista, filtro, busqueda]);
    const enCurso = useMemo(() => lista.filter(x => !CERRADOS.includes(x.estado)).length, [lista]);
    const pagina = visibles.slice(0, mostrar);

    // Resumen rápido de lo que requiere atención
    const atencion = tab === 'pedidos'
        ? pedidos.filter(p => !['entregado', 'cancelado', 'expirado'].includes(p.estado) && !p.trabajador_asignado_nombre).length
        : apartados.filter(a => a.estado === 'activo' && (diasPara(a.fecha_limite_liquidacion) ?? 99) <= 3).length;

    return (
        <main className="mop-page">
            <div className="gs-head">
                <h1 className="sx-title">Monitoreo de <span>pedidos y apartados</span></h1>
                <p className="sx-subtitle">Mira en qué paso va cada pedido y cuánto llevan pagado los apartados. Los cambios los hace el personal trabajador.</p>
            </div>

            <div className="mop-barra">
                <div className="mop-tabs">
                    <button className={`mop-tab ${tab === 'pedidos' ? 'activo' : ''}`} onClick={() => setTab('pedidos')}>
                        <AiOutlineShoppingCart size={16} /> Pedidos
                    </button>
                    <button className={`mop-tab ${tab === 'apartados' ? 'activo' : ''}`} onClick={() => setTab('apartados')}>
                        <AiOutlineFlag size={16} /> Apartados
                    </button>
                </div>
                <label className="mop-buscar">
                    <AiOutlineSearch size={17} />
                    <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por folio o cliente" />
                </label>
                <button className="mop-recargar" onClick={() => setRecarga(r => r + 1)} aria-label="Actualizar"><AiOutlineReload size={17} /></button>
            </div>

            {/* Conteo por estado (también filtra) */}
            <div className="mop-estados">
                <button className={`mop-estado ${filtro === 'en_curso' ? 'activo' : ''}`} onClick={() => setFiltro('en_curso')}>
                    <strong>{enCurso}</strong><span>En curso</span>
                </button>
                <button className={`mop-estado ${filtro === 'todos' ? 'activo' : ''}`} onClick={() => setFiltro('todos')}>
                    <strong>{lista.length}</strong><span>Todos</span>
                </button>
                {orden.map(e => (
                    <button key={e} className={`mop-estado mop-tono--${TONO[e]} ${filtro === e ? 'activo' : ''}`} onClick={() => setFiltro(filtro === e ? 'en_curso' : e)}>
                        <strong>{conteo[e] || 0}</strong><span>{ETIQUETA[e]}</span>
                    </button>
                ))}
            </div>

            {atencion > 0 && !cargando && (
                <div className="mop-aviso">
                    <AiOutlineWarning size={17} />
                    {tab === 'pedidos'
                        ? `${atencion} pedido${atencion === 1 ? '' : 's'} en curso sin trabajador asignado.`
                        : `${atencion} apartado${atencion === 1 ? '' : 's'} vence${atencion === 1 ? '' : 'n'} en 3 días o menos.`}
                </div>
            )}

            {cargando ? (
                <Loader texto={`Cargando ${tab}...`} />
            ) : visibles.length === 0 ? (
                <div className="mop-vacio">No hay {tab} {filtro === 'en_curso' ? 'en curso' : filtro !== 'todos' ? `en "${ETIQUETA[filtro]}"` : ''}{busqueda ? ' que coincidan con la búsqueda' : ''}.</div>
            ) : tab === 'pedidos' ? (
                <div className="mop-grid">
                    {pagina.map(p => {
                        const pasos = pasosDe(p);
                        const idx = pasos.indexOf(p.estado);
                        const terminado = ['cancelado', 'expirado'].includes(p.estado);
                        const pago = PAGO[p.estado_pago] || { t: p.estado_pago, tono: 'muted' };
                        const dEst = diasPara(p.fecha_estimada_entrega);
                        return (
                            <article key={p.id} className={`mop-card mop-tono--${TONO[p.estado] || 'muted'}`}>
                                <header className="mop-card-cabeza">
                                    <div>
                                        <strong className="mop-folio">{p.folio}</strong>
                                        <small>{hace(p.fecha_creacion)}</small>
                                    </div>
                                    <span className="mop-badge">{ETIQUETA[p.estado] || p.estado}</span>
                                </header>

                                {terminado ? (
                                    <p className="mop-cancelado">Este pedido fue {ETIQUETA[p.estado]?.toLowerCase()}.</p>
                                ) : (
                                    <div className="mop-pasos">
                                        {pasos.map((e, i) => (
                                            <div key={e} className={`mop-paso ${i < idx ? 'hecho' : ''} ${i === idx ? 'actual' : ''}`}>
                                                <i />
                                                <span>{e === 'entregado' && p.tipo_entrega !== 'domicilio' ? 'Recogido' : ETIQUETA[e]}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="mop-datos">
                                    <span><AiOutlineUser size={14} /> {p.cliente_nombre_completo || p.cliente_nombre || '—'}</span>
                                    <span>{p.tipo_entrega === 'domicilio' ? <><AiOutlineCar size={14} /> A domicilio</> : <><AiOutlineShop size={14} /> Recoger en tienda</>}</span>
                                    <span><AiOutlineShoppingCart size={14} /> {p.total_items || 0} pieza{Number(p.total_items) === 1 ? '' : 's'}{p.es_personalizado ? ' · personalizado' : ''}</span>
                                    {p.fecha_estimada_entrega && !terminado && p.estado !== 'entregado' && (
                                        <span className={dEst !== null && dEst < 0 ? 'mop-rojo' : ''}><AiOutlineCalendar size={14} /> Entrega {new Date(p.fecha_estimada_entrega).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}{dEst !== null && dEst < 0 ? ' (atrasado)' : ''}</span>
                                    )}
                                </div>

                                <footer className="mop-card-pie">
                                    <span className={`mop-pill mop-tono--${pago.tono}`}>{pago.t}</span>
                                    <span className={`mop-pill ${p.trabajador_asignado_nombre ? '' : 'mop-tono--warning'}`}>
                                        {p.trabajador_asignado_nombre ? `Atiende: ${p.trabajador_asignado_nombre}` : 'Sin asignar'}
                                    </span>
                                    <b className="mop-total">{dinero(p.total)}</b>
                                </footer>
                            </article>
                        );
                    })}
                </div>
            ) : (
                <div className="mop-grid">
                    {pagina.map(a => {
                        const total = Number(a.monto_total) || (Number(a.monto_pagado) + Number(a.saldo_pendiente));
                        const pct = total > 0 ? Math.min(100, Math.round((Number(a.monto_pagado) / total) * 100)) : 0;
                        const dias = diasPara(a.fecha_limite_liquidacion);
                        const abierto = ['activo', 'pendiente_pago'].includes(a.estado);
                        return (
                            <article key={a.id} className={`mop-card mop-tono--${TONO[a.estado] || 'muted'}`}>
                                <header className="mop-card-cabeza">
                                    <div>
                                        <strong className="mop-folio">{a.folio}</strong>
                                        <small>{hace(a.fecha_creacion)}</small>
                                    </div>
                                    <span className="mop-badge">{ETIQUETA[a.estado] || a.estado}</span>
                                </header>

                                <div className="mop-progreso">
                                    <div className="mop-progreso-txt">
                                        <span>Pagado <b>{dinero(a.monto_pagado)}</b> de {dinero(total)}</span>
                                        <b>{pct}%</b>
                                    </div>
                                    <div className="mop-barra-pago"><i style={{ width: `${pct}%` }} /></div>
                                </div>

                                <div className="mop-datos">
                                    <span><AiOutlineUser size={14} /> {a.cliente_nombre || '—'}</span>
                                    <span><AiOutlineClockCircle size={14} /> Falta {dinero(a.saldo_pendiente)}</span>
                                    {a.fecha_limite_liquidacion && (
                                        <span className={abierto && dias !== null && dias <= 3 ? 'mop-rojo' : ''}>
                                            <AiOutlineCalendar size={14} /> Límite {new Date(a.fecha_limite_liquidacion).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                                            {abierto && dias !== null ? (dias < 0 ? ' (vencido)' : ` (${dias} día${dias === 1 ? '' : 's'})`) : ''}
                                        </span>
                                    )}
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            {!cargando && visibles.length > mostrar && (
                <button className="mop-mas" onClick={() => setMostrar(m => m + POR_TANDA)}>
                    Ver {Math.min(POR_TANDA, visibles.length - mostrar)} más <span>· quedan {visibles.length - mostrar}</span>
                </button>
            )}

            <p className="mop-nota"><AiOutlineEye size={14} /> Esta pantalla es solo informativa. Para mover un pedido o registrar un abono, lo hace un trabajador.</p>
        </main>
    );
};

export default AdminMonitoreoOperacionScreen;
