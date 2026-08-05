// Ruta: Frontend/src/screens/cliente/MisPersonalizacionesScreen.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AiOutlineClockCircle, AiOutlineCheckCircle, AiOutlineCloseCircle, AiOutlineShoppingCart, AiOutlineInbox,
} from 'react-icons/ai';
import { personalizacionAPI, carritoAPI, SolicitudPersonalizacion } from '../../services/api';
import Loader from '../../components/Loader';
import './MisPersonalizacionesScreen.css';

const ESTADO_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    pendiente:  { label: 'En verificación', color: '#f5c842', icon: <AiOutlineClockCircle size={14} /> },
    aprobada:   { label: 'Aprobada', color: '#4a8c7a', icon: <AiOutlineCheckCircle size={14} /> },
    rechazada:  { label: 'Rechazada', color: '#e05a6a', icon: <AiOutlineCloseCircle size={14} /> },
};

const MisPersonalizacionesScreen: React.FC = () => {
    const navigate = useNavigate();
    const [solicitudes, setSolicitudes] = useState<SolicitudPersonalizacion[]>([]);
    const [cargando, setCargando] = useState(true);
    const [agregandoId, setAgregandoId] = useState<number | null>(null);
    const [msg, setMsg] = useState('');

    const cargar = async () => {
        setCargando(true);
        try {
            const res = await personalizacionAPI.getMisSolicitudes();
            if (res.success) setSolicitudes(res.data || []);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => { cargar(); }, []);

    const handleAgregarCarrito = async (s: SolicitudPersonalizacion) => {
        setAgregandoId(s.id);
        setMsg('');
        try {
            const res = await carritoAPI.agregarPersonalizado(s.producto_id, s.id);
            if (res.success) {
                navigate('/carrito');
            } else {
                setMsg(res.message || 'No se pudo agregar al carrito.');
            }
        } catch (err: any) {
            setMsg(err?.message || 'No se pudo agregar al carrito.');
        } finally {
            setAgregandoId(null);
        }
    };

    if (cargando) return <Loader texto="Cargando tus solicitudes..." />;

    return (
        <main className="mp-page">
            <div className="mp-header">
                <p className="mp-eyebrow">Personalización</p>
                <h1>Mis solicitudes de personalización</h1>
                <p className="mp-sub">Aquí ves el estado de cada pieza que has pedido personalizar.</p>
            </div>

            {msg && <div className="mp-msg-error">{msg}</div>}

            {solicitudes.length === 0 ? (
                <div className="mp-vacio">
                    <AiOutlineInbox size={40} />
                    <p>Aún no has solicitado ninguna personalización.</p>
                    <button className="mp-btn-primario" onClick={() => navigate('/catalogo')}>
                        Explorar catálogo
                    </button>
                </div>
            ) : (
                <div className="mp-lista">
                    {solicitudes.map(s => {
                        const meta = ESTADO_META[s.estado];
                        return (
                            <div key={s.id} className="mp-card">
                                <img
                                    src={s.producto_imagen || 'https://placehold.co/120x120?text=Sin+imagen'}
                                    alt={s.producto_nombre}
                                    className="mp-card-img"
                                />
                                <div className="mp-card-info">
                                    <div className="mp-card-top">
                                        <h3>{s.producto_nombre}</h3>
                                        <span className="mp-badge" style={{ background: `${meta.color}22`, color: meta.color, borderColor: `${meta.color}55` }}>
                                            {meta.icon} {meta.label}
                                        </span>
                                    </div>
                                    <p className="mp-detalle">{s.detalle}</p>
                                    {s.imagen_referencia_url && (
                                        <a href={s.imagen_referencia_url} target="_blank" rel="noreferrer" className="mp-ver-imagen">
                                            Ver imagen de referencia
                                        </a>
                                    )}
                                    {s.estado === 'rechazada' && s.motivo_rechazo && (
                                        <p className="mp-motivo">Motivo: {s.motivo_rechazo}</p>
                                    )}
                                    {s.estado === 'aprobada' && !s.utilizada && (
                                        <button
                                            className="mp-btn-carrito"
                                            onClick={() => handleAgregarCarrito(s)}
                                            disabled={agregandoId === s.id}
                                        >
                                            <AiOutlineShoppingCart size={16} />
                                            {agregandoId === s.id ? 'Agregando...' : 'Agregar al carrito'}
                                        </button>
                                    )}
                                    {s.estado === 'aprobada' && s.utilizada && (
                                        <p className="mp-utilizada">Ya agregada a un pedido</p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </main>
    );
};

export default MisPersonalizacionesScreen;
