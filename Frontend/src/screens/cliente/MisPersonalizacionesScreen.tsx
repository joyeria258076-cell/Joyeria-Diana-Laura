// Ruta: Frontend/src/screens/cliente/MisPersonalizacionesScreen.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AiOutlineClockCircle, AiOutlineCheckCircle, AiOutlineCloseCircle, AiOutlineShoppingCart, AiOutlineInbox,
} from 'react-icons/ai';
import { personalizacionAPI, carritoAPI, SolicitudPersonalizacion } from '../../services/api';
import Loader from '../../components/Loader';
import '../../styles/SitioSecciones.css';
import './MisPersonalizacionesScreen.css';
import '../../styles/GestionSitio.css';

const ESTADO_META: Record<string, { label: string; icon: React.ReactNode }> = {
    pendiente:  { label: 'En verificación', icon: <AiOutlineClockCircle size={13} /> },
    aprobada:   { label: 'Aprobada', icon: <AiOutlineCheckCircle size={13} /> },
    rechazada:  { label: 'Rechazada', icon: <AiOutlineCloseCircle size={13} /> },
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
            <header className="sx-head">
                <div className="sx-eyebrow">Personalización</div>
                <h1 className="sx-title">Mis piezas <span>personalizadas</span></h1>
                <p className="sx-subtitle">
                    Aquí ves el estado de cada pieza que pediste personalizar. Primero la verificamos
                    y te avisamos cuando esté lista para comprarse.
                </p>
            </header>

            {msg && <div className="mp-msg-error">{msg}</div>}

            {solicitudes.length === 0 ? (
                <div className="mp-vacio">
                    <AiOutlineInbox size={40} />
                    <p>Aún no has solicitado ninguna personalización.</p>
                    <button className="sx-btn" onClick={() => navigate('/catalogo')}>
                        Explorar catálogo
                    </button>
                </div>
            ) : (
                <div className="mp-lista">
                    {solicitudes.map(s => {
                        const meta = ESTADO_META[s.estado] || { label: s.estado, icon: null };
                        return (
                            <div key={s.id} className="mp-card">
                                <img
                                    src={s.producto_imagen || 'https://placehold.co/200x200/141414/c9956c?text=DL'}
                                    alt={s.producto_nombre}
                                    className="mp-card-img"
                                />
                                <div className="mp-card-info">
                                    <div className="mp-card-top">
                                        <h3>{s.producto_nombre}</h3>
                                        <span className={`mp-badge mp-badge--${s.estado}`}>
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
                                            className="sx-btn"
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
