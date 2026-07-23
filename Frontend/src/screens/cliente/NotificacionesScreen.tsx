// Ruta: Frontend/src/screens/cliente/NotificacionesScreen.tsx
import React, { useMemo, useState } from 'react';
import { useNotificaciones, Notificacion } from '../../contexts/NotificacionesContext';
import { AiOutlineBell, AiOutlineInbox, AiOutlineClose } from 'react-icons/ai';
import './NotificacionesScreen.css';

type Filtro = 'dia' | 'semana' | 'mes' | 'todas';

const FILTROS: { key: Filtro; label: string }[] = [
    { key: 'dia',    label: 'Hoy' },
    { key: 'semana', label: 'Esta semana' },
    { key: 'mes',    label: 'Este mes' },
    { key: 'todas',  label: 'Todas' },
];

const formatFechaHora = (f: string) => {
    const d = new Date(f);
    return d.toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const dentroDeRango = (fechaISO: string, filtro: Filtro): boolean => {
    if (filtro === 'todas') return true;
    const fecha = new Date(fechaISO);
    const ahora = new Date();
    if (filtro === 'dia') {
        return fecha.toDateString() === ahora.toDateString();
    }
    if (filtro === 'semana') {
        const inicioSemana = new Date(ahora); inicioSemana.setDate(ahora.getDate() - 7);
        return fecha >= inicioSemana;
    }
    // mes
    const inicioMes = new Date(ahora); inicioMes.setDate(ahora.getDate() - 30);
    return fecha >= inicioMes;
};

const agruparPorDia = (notifs: Notificacion[]): { label: string; items: Notificacion[] }[] => {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const ayer = new Date(hoy); ayer.setDate(ayer.getDate() - 1);
    const grupos: Record<string, Notificacion[]> = { 'Hoy': [], 'Ayer': [], 'Esta semana': [], 'Anteriores': [] };

    notifs.forEach(n => {
        const f = new Date(n.fecha); f.setHours(0, 0, 0, 0);
        if (f.getTime() === hoy.getTime()) grupos['Hoy'].push(n);
        else if (f.getTime() === ayer.getTime()) grupos['Ayer'].push(n);
        else if (f.getTime() >= hoy.getTime() - 7 * 86400000) grupos['Esta semana'].push(n);
        else grupos['Anteriores'].push(n);
    });

    return Object.entries(grupos).filter(([, items]) => items.length > 0).map(([label, items]) => ({ label, items }));
};

const NotificacionesScreen: React.FC = () => {
    const { notifs, noLeidas, marcarTodasLeidas, marcarLeida, borrarNotif, limpiarTodo } = useNotificaciones();
    const [filtro, setFiltro] = useState<Filtro>('todas');

    const filtradas = useMemo(() => notifs.filter(n => dentroDeRango(n.fecha, filtro)), [notifs, filtro]);
    const grupos = useMemo(() => agruparPorDia(filtradas), [filtradas]);

    return (
        <main className="notif-page">
            <div className="notif-page-header">
                <div>
                    <p className="notif-page-eyebrow"><AiOutlineBell size={14} />Centro de avisos</p>
                    <h2 className="notif-page-titulo">Notificaciones</h2>
                    <p className="notif-page-sub">{noLeidas > 0 ? `${noLeidas} sin leer` : 'Estás al día'}</p>
                </div>
                <div className="notif-page-acciones">
                    {noLeidas > 0 && <button className="notif-btn-secundario" onClick={marcarTodasLeidas}>Marcar todas leídas</button>}
                    {notifs.length > 0 && <button className="notif-btn-peligro" onClick={limpiarTodo}>Limpiar todo</button>}
                </div>
            </div>

            <div className="notif-filtros">
                {FILTROS.map(f => (
                    <button
                        key={f.key}
                        className={`notif-filtro-btn ${filtro === f.key ? 'activo' : ''}`}
                        onClick={() => setFiltro(f.key)}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {grupos.length === 0 ? (
                <div className="notif-vacio">
                    <span className="notif-vacio-icono"><AiOutlineInbox size={40} /></span>
                    <p>No tienes notificaciones en este periodo.</p>
                </div>
            ) : (
                grupos.map(grupo => (
                    <section key={grupo.label} className="notif-grupo">
                        <h3 className="notif-grupo-titulo">{grupo.label}</h3>
                        <div className="notif-lista">
                            {grupo.items.map(n => (
                                <div
                                    key={n.id}
                                    className={`notif-item ${n.leida ? 'leida' : ''}`}
                                    onClick={() => marcarLeida(n.id)}
                                >
                                    {!n.leida && <span className="notif-dot" />}
                                    <div className="notif-item-content">
                                        <p className="notif-item-folio">{n.folio}</p>
                                        <p className="notif-item-msg">{n.mensaje}</p>
                                        <p className="notif-item-fecha">{formatFechaHora(n.fecha)}</p>
                                    </div>
                                    <button
                                        className="notif-item-borrar"
                                        onClick={(e) => { e.stopPropagation(); borrarNotif(n.id); }}
                                        aria-label="Borrar notificación"
                                    ><AiOutlineClose size={14} /></button>
                                </div>
                            ))}
                        </div>
                    </section>
                ))
            )}
        </main>
    );
};

export default NotificacionesScreen;
