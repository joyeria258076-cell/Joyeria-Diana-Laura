// Ruta: Frontend/src/screens/trabajador/GestionPersonalizacionScreen.tsx
import React, { useEffect, useState } from 'react';
import {
    AiOutlineClockCircle, AiOutlineCheckCircle, AiOutlineCloseCircle, AiOutlineUser, AiOutlineMail,
} from 'react-icons/ai';
import { personalizacionAPI, SolicitudPersonalizacion } from '../../services/api';
import Loader from '../../components/Loader';
import './GestionPersonalizacionScreen.css';

const FILTROS = [
    { key: 'pendiente', label: 'Pendientes' },
    { key: 'aprobada', label: 'Aprobadas' },
    { key: 'rechazada', label: 'Rechazadas' },
    { key: '', label: 'Todas' },
];

const GestionPersonalizacionScreen: React.FC = () => {
    const [solicitudes, setSolicitudes] = useState<SolicitudPersonalizacion[]>([]);
    const [cargando, setCargando] = useState(true);
    const [filtro, setFiltro] = useState('pendiente');
    const [procesandoId, setProcesandoId] = useState<number | null>(null);
    const [modalRechazo, setModalRechazo] = useState<SolicitudPersonalizacion | null>(null);
    const [motivo, setMotivo] = useState('');
    const [error, setError] = useState('');

    const cargar = async () => {
        setCargando(true);
        try {
            const res = await personalizacionAPI.getSolicitudes(filtro || undefined);
            if (res.success) setSolicitudes(res.data || []);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => { cargar(); }, [filtro]);

    const handleAprobar = async (id: number) => {
        setProcesandoId(id);
        try {
            const res = await personalizacionAPI.aprobar(id);
            if (res.success) cargar();
            else setError(res.message || 'No se pudo aprobar');
        } finally {
            setProcesandoId(null);
        }
    };

    const abrirRechazo = (s: SolicitudPersonalizacion) => {
        setModalRechazo(s);
        setMotivo('');
        setError('');
    };

    const confirmarRechazo = async () => {
        if (!modalRechazo) return;
        if (!motivo.trim()) { setError('Indica el motivo del rechazo.'); return; }
        setProcesandoId(modalRechazo.id);
        try {
            const res = await personalizacionAPI.rechazar(modalRechazo.id, motivo.trim());
            if (res.success) { setModalRechazo(null); cargar(); }
            else setError(res.message || 'No se pudo rechazar');
        } finally {
            setProcesandoId(null);
        }
    };

    return (
        <main className="gper-page">
            <div className="gper-header">
                <h1>Solicitudes de Personalización</h1>
                <p className="gper-sub">Revisa el detalle y la imagen de referencia antes de aprobar cada pieza.</p>
            </div>

            <div className="gper-filtros">
                {FILTROS.map(f => (
                    <button
                        key={f.key}
                        className={`gper-filtro-btn ${filtro === f.key ? 'activo' : ''}`}
                        onClick={() => setFiltro(f.key)}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {cargando ? (
                <Loader texto="Cargando solicitudes..." />
            ) : solicitudes.length === 0 ? (
                <div className="gper-vacio">No hay solicitudes {filtro ? `en estado "${filtro}"` : ''}.</div>
            ) : (
                <div className="gper-lista">
                    {solicitudes.map(s => (
                        <div key={s.id} className="gper-card">
                            <img
                                src={s.producto_imagen || 'https://placehold.co/100x100?text=Producto'}
                                alt={s.producto_nombre}
                                className="gper-producto-img"
                            />
                            <div className="gper-card-body">
                                <div className="gper-card-top">
                                    <h3>{s.producto_nombre}</h3>
                                    <span className={`gper-estado gper-estado-${s.estado}`}>
                                        {s.estado === 'pendiente' && <AiOutlineClockCircle size={13} />}
                                        {s.estado === 'aprobada' && <AiOutlineCheckCircle size={13} />}
                                        {s.estado === 'rechazada' && <AiOutlineCloseCircle size={13} />}
                                        {s.estado}
                                    </span>
                                </div>
                                <p className="gper-cliente">
                                    <AiOutlineUser size={13} /> {s.cliente_nombre}
                                    <AiOutlineMail size={13} style={{ marginLeft: 10 }} /> {s.cliente_email}
                                </p>
                                <p className="gper-detalle">{s.detalle}</p>
                                {s.imagen_referencia_url && (
                                    <a href={s.imagen_referencia_url} target="_blank" rel="noreferrer" className="gper-ver-imagen">
                                        <img src={s.imagen_referencia_url} alt="Referencia" className="gper-imagen-thumb" />
                                    </a>
                                )}
                                {s.estado === 'rechazada' && s.motivo_rechazo && (
                                    <p className="gper-motivo">Motivo de rechazo: {s.motivo_rechazo}</p>
                                )}
                                {s.estado === 'pendiente' && (
                                    <div className="gper-acciones">
                                        <button
                                            className="gper-btn-aprobar"
                                            onClick={() => handleAprobar(s.id)}
                                            disabled={procesandoId === s.id}
                                        >
                                            Habilitar
                                        </button>
                                        <button
                                            className="gper-btn-rechazar"
                                            onClick={() => abrirRechazo(s)}
                                            disabled={procesandoId === s.id}
                                        >
                                            Rechazar
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {modalRechazo && (
                <div className="gper-modal-overlay" onClick={() => setModalRechazo(null)}>
                    <div className="gper-modal" onClick={e => e.stopPropagation()}>
                        <h3>Rechazar solicitud</h3>
                        <p className="gper-modal-producto">{modalRechazo.producto_nombre} — {modalRechazo.cliente_nombre}</p>
                        <label className="gper-label">Motivo del rechazo</label>
                        <textarea
                            className="gper-textarea"
                            rows={4}
                            value={motivo}
                            onChange={e => { setMotivo(e.target.value); setError(''); }}
                            placeholder="Ej. La personalización solicitada no es viable con este material..."
                        />
                        {error && <p className="gper-error">{error}</p>}
                        <div className="gper-modal-acciones">
                            <button className="gper-btn-cancelar" onClick={() => setModalRechazo(null)}>Cancelar</button>
                            <button className="gper-btn-rechazar" onClick={confirmarRechazo} disabled={procesandoId === modalRechazo.id}>
                                Confirmar rechazo
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
};

export default GestionPersonalizacionScreen;
