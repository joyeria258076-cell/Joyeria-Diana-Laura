// Ruta: Frontend/src/screens/cliente/SolicitarPersonalizacionScreen.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AiOutlineUpload, AiOutlineClockCircle, AiOutlineCheckCircle, AiOutlinePicture } from 'react-icons/ai';
import { productsAPI, personalizacionAPI, uploadAPI } from '../../services/api';
import Loader from '../../components/Loader';
import './SolicitarPersonalizacionScreen.css';

interface Producto {
    id: number;
    nombre: string;
    imagen_principal?: string;
    precio_venta: number;
    precio_personalizacion?: number;
    permite_personalizacion?: boolean;
}

const SolicitarPersonalizacionScreen: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [producto, setProducto] = useState<Producto | null>(null);
    const [cargando, setCargando] = useState(true);
    const [detalle, setDetalle] = useState('');
    const [imagenFile, setImagenFile] = useState<File | null>(null);
    const [imagenPreview, setImagenPreview] = useState<string | null>(null);
    const [subiendo, setSubiendo] = useState(false);
    const [error, setError] = useState('');
    const [enviado, setEnviado] = useState<{ dias: number } | null>(null);
    const [diasEstimados, setDiasEstimados] = useState<number>(3);

    useEffect(() => {
        (async () => {
            try {
                const [prodRes, cfgRes]: any[] = await Promise.all([
                    productsAPI.getById(Number.parseInt(id!)),
                    productsAPI.getConfiguracionByClave('dias_verificacion_personalizacion').catch(() => null),
                ]);
                if (!prodRes.success || !prodRes.data) { navigate('/catalogo'); return; }
                if (!prodRes.data.permite_personalizacion) { navigate(`/producto/${id}`); return; }
                setProducto(prodRes.data);
                if (cfgRes?.success && cfgRes?.data?.valor) setDiasEstimados(Number.parseInt(cfgRes.data.valor));
            } catch {
                navigate('/catalogo');
            } finally {
                setCargando(false);
            }
        })();
    }, [id, navigate]);

    const handleImagenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImagenFile(file);
        setImagenPreview(URL.createObjectURL(file));
    };

    const handleEnviar = async () => {
        if (!producto) return;
        if (!detalle.trim() || detalle.trim().length < 10) {
            setError('Describe con más detalle qué personalización quieres (mínimo 10 caracteres).');
            return;
        }
        setError('');
        setSubiendo(true);
        try {
            let imagenUrl: string | null = null;
            if (imagenFile) {
                const uploadRes = await uploadAPI.uploadImage(imagenFile, 'joyeria/personalizaciones');
                if (uploadRes.success) imagenUrl = uploadRes.data.url;
            }
            const res = await personalizacionAPI.crear(producto.id, detalle.trim(), imagenUrl);
            if (res.success) {
                setEnviado({ dias: res.dias_estimados || diasEstimados });
            } else {
                setError(res.message || 'No se pudo enviar tu solicitud. Intenta de nuevo.');
            }
        } catch (err: any) {
            setError(err?.message || 'No se pudo enviar tu solicitud. Intenta de nuevo.');
        } finally {
            setSubiendo(false);
        }
    };

    if (cargando) return <Loader texto="Cargando producto..." />;
    if (!producto) return null;

    if (enviado) {
        return (
            <main className="sp-page">
                <div className="sp-exito">
                    <AiOutlineCheckCircle size={48} className="sp-exito-icon" />
                    <h2>¡Solicitud enviada!</h2>
                    <p>
                        Recibimos tu solicitud de personalización para <strong>{producto.nombre}</strong>.
                        Un trabajador la verificará; el tiempo estimado es de <strong>{enviado.dias} día{enviado.dias === 1 ? '' : 's'} hábil{enviado.dias === 1 ? '' : 'es'}</strong>.
                        Te notificaremos por correo y en tu campanita en cuanto esté lista.
                    </p>
                    <div className="sp-exito-acciones">
                        <button className="sp-btn-primario" onClick={() => navigate('/mis-personalizaciones')}>
                            Ver mis solicitudes
                        </button>
                        <button className="sp-btn-secundario" onClick={() => navigate('/catalogo')}>
                            Seguir explorando
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="sp-page">
            <div className="sp-header">
                <p className="sp-eyebrow">Personalización</p>
                <h1>Solicitar personalización</h1>
                <p className="sp-sub">Cuéntanos con detalle qué quieres para tu pieza — un trabajador verificará tu solicitud antes de poder comprarla.</p>
            </div>

            <div className="sp-layout">
                <div className="sp-producto-card">
                    <img
                        src={producto.imagen_principal || 'https://placehold.co/300x300?text=Sin+imagen'}
                        alt={producto.nombre}
                        className="sp-producto-img"
                    />
                    <div>
                        <h3>{producto.nombre}</h3>
                        <p className="sp-producto-precio">
                            ${Number(producto.precio_venta).toLocaleString('es-MX')}
                            {!!producto.precio_personalizacion && (
                                <span className="sp-cargo"> + ${Number(producto.precio_personalizacion).toLocaleString('es-MX')} por personalización</span>
                            )}
                        </p>
                    </div>
                </div>

                <div className="sp-form">
                    <label className="sp-label">Describe a fondo tu personalización *</label>
                    <textarea
                        className="sp-textarea"
                        rows={6}
                        maxLength={600}
                        placeholder="Ej. Anillo talla 7, grabado interior con el texto 'Siempre juntos', acabado en oro rosa, piedra azul en vez de la transparente..."
                        value={detalle}
                        onChange={e => { setDetalle(e.target.value); setError(''); }}
                    />
                    <span className="sp-contador">{detalle.length}/600</span>

                    <label className="sp-label">Imagen de referencia (opcional)</label>
                    <div className="sp-imagen-upload" onClick={() => fileInputRef.current?.click()}>
                        {imagenPreview ? (
                            <img src={imagenPreview} alt="Referencia" className="sp-imagen-preview" />
                        ) : (
                            <div className="sp-imagen-placeholder">
                                <AiOutlinePicture size={28} />
                                <span>Arrastra o selecciona una imagen de referencia</span>
                            </div>
                        )}
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImagenChange}
                        style={{ display: 'none' }}
                    />

                    <div className="sp-aviso">
                        <AiOutlineClockCircle size={16} />
                        <span>Tu solicitud será verificada antes de poder comprar. Tiempo estimado: <strong>{diasEstimados} día{diasEstimados === 1 ? '' : 's'} hábil{diasEstimados === 1 ? '' : 'es'}</strong>. Te avisaremos por correo y notificación cuando esté lista.</span>
                    </div>

                    {error && <p className="sp-error">{error}</p>}

                    <button className="sp-btn-enviar" onClick={handleEnviar} disabled={subiendo}>
                        <AiOutlineUpload size={18} />
                        {subiendo ? 'Enviando...' : 'Enviar solicitud'}
                    </button>
                </div>
            </div>
        </main>
    );
};

export default SolicitarPersonalizacionScreen;
