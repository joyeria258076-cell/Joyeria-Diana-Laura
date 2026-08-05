// Ruta: Frontend/src/screens/admin/AdminPersonalizacionVisualScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
import { AiOutlineCloudUpload, AiOutlineCheckCircle, AiOutlinePicture } from 'react-icons/ai';
import { productsAPI, carritoAPI, uploadAPI } from '../../services/api';
import { PALETAS, aplicarTema } from '../../components/ThemeConfigLoader';
import Loader from '../../components/Loader';
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
            } finally {
                setCargando(false);
            }
        })();
    }, []);

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

    return (
        <main className="apv-page">
            <div className="apv-header">
                <h1>Personalización Visual</h1>
                <p className="apv-sub">Cambia el fondo y los colores de todo el sistema — se aplica en todas las pantallas, públicas y privadas.</p>
            </div>

            <div className="apv-card">
                <h3>Fondo del sistema</h3>
                <div
                    className={`apv-dropzone ${arrastrando ? 'arrastrando' : ''}`}
                    onDragOver={e => { e.preventDefault(); setArrastrando(true); }}
                    onDragLeave={() => setArrastrando(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    {fondoPreview ? (
                        <img src={fondoPreview} alt="Fondo actual" className="apv-preview" />
                    ) : (
                        <div className="apv-dropzone-vacio">
                            <AiOutlinePicture size={32} />
                        </div>
                    )}
                    <div className="apv-dropzone-overlay">
                        <AiOutlineCloudUpload size={26} />
                        <span>Arrastra una imagen aquí o haz clic para seleccionarla</span>
                    </div>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileInput} hidden />
                {fondoFile && <p className="apv-archivo-nombre">Nueva imagen lista: {fondoFile.name}</p>}
            </div>

            <div className="apv-card">
                <h3>Paleta de colores</h3>
                <div className="apv-paletas">
                    {Object.keys(PALETAS).map(clave => (
                        <button
                            key={clave}
                            type="button"
                            className={`apv-paleta-opcion ${paletaSeleccionada === clave ? 'activa' : ''}`}
                            onClick={() => setPaletaSeleccionada(clave)}
                        >
                            <div className="apv-paleta-swatches">
                                <span style={{ background: PALETAS[clave]['--color-bg'] }} />
                                <span style={{ background: PALETAS[clave]['--color-rose-gold'] }} />
                                <span style={{ background: PALETAS[clave]['--color-champagne'] }} />
                            </div>
                            <span className="apv-paleta-nombre">{NOMBRES_PALETA[clave] || clave}</span>
                            {paletaSeleccionada === clave && <AiOutlineCheckCircle size={16} className="apv-paleta-check" />}
                        </button>
                    ))}
                </div>
            </div>

            {msg && <div className={`apv-msg apv-msg-${msg.tipo}`}>{msg.texto}</div>}

            <button className="apv-btn-guardar" onClick={handleGuardar} disabled={guardando}>
                {subiendo ? 'Subiendo imagen...' : guardando ? 'Guardando...' : 'Guardar y aplicar en todo el sitio'}
            </button>
        </main>
    );
};

export default AdminPersonalizacionVisualScreen;
