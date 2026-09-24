// Ruta: Frontend/src/screens/admin/AdminPersonalizacionVisualScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
import { AiOutlineCloudUpload, AiOutlineCheckCircle, AiOutlinePicture } from 'react-icons/ai';
import { productsAPI, carritoAPI, uploadAPI } from '../../services/api';
import { PALETAS, aplicarTema } from '../../components/ThemeConfigLoader';
import Loader from '../../components/Loader';
import '../../styles/SitioSecciones.css';
import './AdminPersonalizacionVisualScreen.css';

const NOMBRES_PALETA: Record<string, string> = {
    clasico: 'Clásico (negro y rose gold)',
    blanco_rosa: 'Blanco y rosa',
    naranja_blanco: 'Naranja y blanco',
};

const AdminPersonalizacionVisualScreen: React.FC = () => {
    const [cargando, setCargando] = useState(true);
    const [fondoUrl, setFondoUrl] = useState('');
    const [fondoPreview, setFondoPreview] = useState('');
    const [fondoFile, setFondoFile] = useState<File | null>(null);
    const [paletaSeleccionada, setPaletaSeleccionada] = useState('clasico');
    // Lo último guardado: si el admin sale sin guardar, se restaura esto
    const guardadoRef = useRef<{ fondo: string | null; paleta: string }>({ fondo: null, paleta: 'clasico' });
    const [arrastrando, setArrastrando] = useState(false);
    const [subiendo, setSubiendo] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        (async () => {
            try {
                const [fondoRes, paletaRes] = await Promise.all([
                    productsAPI.getConfiguracionByClave('sitio_fondo_url').catch(() => null),
                    productsAPI.getConfiguracionByClave('sitio_paleta').catch(() => null),
                ]);
                if (fondoRes?.success && fondoRes.data?.valor) {
                    setFondoUrl(fondoRes.data.valor);
                    setFondoPreview(fondoRes.data.valor);
                }
                if (paletaRes?.success && paletaRes.data?.valor) setPaletaSeleccionada(paletaRes.data.valor);
                guardadoRef.current = {
                    fondo: fondoRes?.data?.valor || null,
                    paleta: paletaRes?.data?.valor || 'clasico',
                };
            } finally {
                setCargando(false);
            }
        })();
    }, []);

    // Al salir de la pantalla sin guardar se vuelve a la paleta guardada
    useEffect(() => () => aplicarTema(guardadoRef.current.fondo, guardadoRef.current.paleta), []);

    // Vista previa en vivo: al elegir una paleta se aplica de inmediato a todo el sistema
    const elegirPaleta = (clave: string) => {
        setPaletaSeleccionada(clave);
        aplicarTema(null, clave);
        setMsg(null);
    };

    const procesarArchivo = (file: File) => {
        setFondoFile(file);
        setFondoPreview(URL.createObjectURL(file));
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setArrastrando(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) procesarArchivo(file);
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) procesarArchivo(file);
    };

    const handleGuardar = async () => {
        setGuardando(true);
        setMsg(null);
        try {
            let urlFinal = fondoUrl;

            if (fondoFile) {
                setSubiendo(true);
                const uploadRes = await uploadAPI.uploadImage(fondoFile, 'joyeria/imagenes');
                setSubiendo(false);
                if (!uploadRes.success) {
                    setMsg({ tipo: 'error', texto: uploadRes.message || 'No se pudo subir la imagen' });
                    setGuardando(false);
                    return;
                }
                urlFinal = uploadRes.data.url;
            }

            await Promise.all([
                carritoAPI.setConfiguracion('sitio_fondo_url', urlFinal),
                carritoAPI.setConfiguracion('sitio_paleta', paletaSeleccionada),
            ]);

            aplicarTema(urlFinal, paletaSeleccionada);
            guardadoRef.current = { fondo: urlFinal, paleta: paletaSeleccionada };
            setFondoUrl(urlFinal);
            setFondoFile(null);
            setMsg({ tipo: 'ok', texto: 'Personalización guardada — ya se aplicó en todo el sitio.' });
        } catch (err: any) {
            setMsg({ tipo: 'error', texto: err?.message || 'No se pudo guardar la personalización' });
        } finally {
            setGuardando(false);
        }
    };

    if (cargando) return <Loader texto="Cargando personalización..." />;

    const hayCambios = !!fondoFile || paletaSeleccionada !== guardadoRef.current.paleta;

    return (
        <main className="apv-page">
            <header className="sx-head">
                <div className="sx-eyebrow">Apariencia</div>
                <h1 className="sx-title">Personalización <span>visual</span></h1>
                <p className="sx-subtitle">
                    Cambia el fondo y los colores de todo el sistema. Al elegir una paleta la ves aplicada
                    al instante; se guarda para todos hasta que presiones "Guardar".
                </p>
            </header>

            <section className="sx-card sx-card--static apv-card">
                <h2 className="apv-card-title">Fondo del sistema</h2>
                <p className="apv-card-sub">Imagen que aparece detrás de todas las pantallas. Se sube a Cloudinary al guardar.</p>
                <div
                    className={`apv-dropzone ${arrastrando ? 'arrastrando' : ''}`}
                    onDragOver={e => { e.preventDefault(); setArrastrando(true); }}
                    onDragLeave={() => setArrastrando(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter') fileInputRef.current?.click(); }}
                >
                    {fondoPreview ? (
                        <img src={fondoPreview} alt="Fondo actual" className="apv-preview" />
                    ) : (
                        <div className="apv-dropzone-vacio"><AiOutlinePicture size={32} /></div>
                    )}
                    <div className="apv-dropzone-overlay">
                        <AiOutlineCloudUpload size={26} />
                        <span>Arrastra una imagen aquí o haz clic para seleccionarla</span>
                    </div>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileInput} hidden />
                {fondoFile && <p className="apv-archivo-nombre">Nueva imagen lista: {fondoFile.name}</p>}
            </section>

            <section className="sx-card sx-card--static apv-card">
                <h2 className="apv-card-title">Paleta de colores</h2>
                <p className="apv-card-sub">Haz clic en una opción para verla aplicada en este momento.</p>
                <div className="apv-paletas">
                    {Object.keys(PALETAS).map(clave => {
                        const c = PALETAS[clave];
                        const activa = paletaSeleccionada === clave;
                        return (
                            <button
                                key={clave}
                                type="button"
                                className={`apv-paleta-opcion ${activa ? 'activa' : ''}`}
                                onClick={() => elegirPaleta(clave)}
                                aria-pressed={activa}
                            >
                                {/* Miniatura de cómo se ve el sitio con esta paleta */}
                                <div className="apv-mini" style={{ background: c['--color-bg'], borderColor: c['--color-border'] }}>
                                    <div className="apv-mini-side" style={{ background: c['--color-surface'], borderColor: c['--color-border'] }}>
                                        <i style={{ background: c['--color-rose-gold'] }} />
                                        <i style={{ background: c['--color-text-muted'] }} />
                                        <i style={{ background: c['--color-text-muted'] }} />
                                    </div>
                                    <div className="apv-mini-main">
                                        <b style={{ color: c['--color-text'] }}>Diana <span style={{ color: c['--color-rose-gold'] }}>Laura</span></b>
                                        <div className="apv-mini-card" style={{ background: c['--color-surface'], borderColor: c['--color-border'] }}>
                                            <i style={{ background: c['--color-text'] }} />
                                            <i style={{ background: c['--color-text-muted'] }} />
                                        </div>
                                        <span className="apv-mini-btn" style={{ background: `linear-gradient(135deg, ${c['--color-rose-gold']}, ${c['--color-champagne']})` }} />
                                    </div>
                                </div>
                                <span className="apv-paleta-nombre">
                                    {NOMBRES_PALETA[clave] || clave}
                                    {activa && <AiOutlineCheckCircle size={16} className="apv-paleta-check" />}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </section>

            {msg && <div className={`apv-msg apv-msg-${msg.tipo}`}>{msg.texto}</div>}

            <div className="apv-acciones">
                {hayCambios && !guardando && (
                    <button className="sx-btn sx-btn--ghost" onClick={() => {
                        setFondoFile(null);
                        setFondoPreview(guardadoRef.current.fondo || '');
                        elegirPaleta(guardadoRef.current.paleta);
                    }}>
                        Descartar cambios
                    </button>
                )}
                <button className="sx-btn" onClick={handleGuardar} disabled={guardando || !hayCambios}>
                    {subiendo ? 'Subiendo imagen...' : guardando ? 'Guardando...' : 'Guardar y aplicar en todo el sitio'}
                </button>
            </div>
        </main>
    );
};

export default AdminPersonalizacionVisualScreen;
