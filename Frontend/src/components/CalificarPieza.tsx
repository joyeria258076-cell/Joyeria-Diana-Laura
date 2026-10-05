// Ruta: src/components/CalificarPieza.tsx
// Calificar una pieza ya entregada desde "Mis pedidos": estrellas de 1 a 5 y
// comentario opcional. Usa la misma API de reseñas del detalle de producto
// (el servidor solo acepta piezas que ya le fueron entregadas al cliente).
import React, { useEffect, useState } from 'react';
import { AiFillStar, AiOutlineStar } from 'react-icons/ai';
import { resenasAPI } from '../services/api';
import './CalificarPieza.css';

const TEXTO: Record<number, string> = { 1: 'No me gustó', 2: 'Regular', 3: 'Está bien', 4: 'Me gustó', 5: '¡Me encantó!' };

const CalificarPieza: React.FC<{ productoId: number }> = ({ productoId }) => {
    const [cargando, setCargando] = useState(true);
    const [puede, setPuede] = useState(false);
    const [guardada, setGuardada] = useState<number>(0);   // calificación ya enviada
    const [elegida, setElegida] = useState<number>(0);     // la que está eligiendo ahora
    const [sobre, setSobre] = useState<number>(0);         // estrella bajo el puntero
    const [comentario, setComentario] = useState('');
    const [editando, setEditando] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [aviso, setAviso] = useState('');

    useEffect(() => {
        let vivo = true;
        resenasAPI.getByProducto(productoId)
            .then((res: any) => {
                if (!vivo) return;
                const d = res?.data || {};
                setPuede(!!d.puedeResenar || !!d.miResena);
                if (d.miResena) {
                    setGuardada(Number(d.miResena.calificacion) || 0);
                    setComentario(d.miResena.comentario || '');
                }
            })
            .catch(() => { /* sin calificación disponible */ })
            .finally(() => vivo && setCargando(false));
        return () => { vivo = false; };
    }, [productoId]);

    if (cargando || !puede) return null;

    const enviar = async () => {
        if (!elegida) return;
        setEnviando(true); setAviso('');
        try {
            const res: any = await resenasAPI.crear(productoId, elegida, comentario.trim() || undefined);
            if (res?.success === false) throw new Error(res.message);
            setGuardada(elegida); setEditando(false); setAviso('¡Gracias por tu opinión!');
        } catch (e: any) {
            setAviso(e?.message || 'No se pudo guardar. Intenta de nuevo.');
        } finally { setEnviando(false); }
    };

    // Ya calificada y sin editar: muestra el resultado
    if (guardada && !editando) {
        return (
            <div className="cpz cpz--hecha">
                <span className="cpz-etq">Tu calificación</span>
                <span className="cpz-fijas" aria-label={`${guardada} de 5 estrellas`}>
                    {[1, 2, 3, 4, 5].map(n => n <= guardada ? <AiFillStar key={n} /> : <AiOutlineStar key={n} />)}
                </span>
                <button type="button" className="cpz-cambiar" onClick={() => { setElegida(guardada); setEditando(true); setAviso(''); }}>Cambiar</button>
                {aviso && <span className="cpz-aviso">{aviso}</span>}
            </div>
        );
    }

    const marcada = sobre || elegida;
    return (
        <div className="cpz">
            <span className="cpz-etq">¿Qué te pareció?</span>
            <div className="cpz-estrellas" role="radiogroup" aria-label="Calificación" onMouseLeave={() => setSobre(0)}>
                {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} type="button" role="radio" aria-checked={elegida === n} aria-label={`${n} estrella${n > 1 ? 's' : ''}`}
                        className={n <= marcada ? 'on' : ''} onMouseEnter={() => setSobre(n)} onClick={() => setElegida(n)}>
                        {n <= marcada ? <AiFillStar /> : <AiOutlineStar />}
                    </button>
                ))}
                {marcada > 0 && <span className="cpz-texto">{TEXTO[marcada]}</span>}
            </div>
            {elegida > 0 && (
                <div className="cpz-form">
                    <textarea value={comentario} maxLength={500} rows={2} onChange={e => setComentario(e.target.value)}
                        placeholder="Cuéntanos más (opcional): cómo te quedó, la calidad, el empaque…" />
                    <div className="cpz-acciones">
                        {editando && <button type="button" className="cpz-cancelar" onClick={() => { setEditando(false); setAviso(''); }}>Cancelar</button>}
                        <button type="button" className="cpz-enviar" onClick={enviar} disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar calificación'}</button>
                    </div>
                </div>
            )}
            {aviso && <span className="cpz-aviso">{aviso}</span>}
        </div>
    );
};

export default CalificarPieza;
