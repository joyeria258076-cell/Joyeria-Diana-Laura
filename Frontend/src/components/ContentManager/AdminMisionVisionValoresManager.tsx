import React, { useEffect, useState } from 'react';
import { carritoAPI, productsAPI } from '../../services/api';

const CLAVE_MVV = 'sitio_mision_vision_valores';

import '../../styles/SitioSecciones.css';
import '../../styles/AdminContenido.css';
import './AdminMVV.css';
import AdminHero from '../AdminHero';
import { AiOutlineFlag, AiOutlineAim, AiOutlineEye, AiOutlineHeart, AiOutlinePlus, AiOutlineClose, AiOutlineArrowUp, AiOutlineSave } from 'react-icons/ai';
interface MisionVisionValores {
    mision: string;
    vision: string;
    valores: string[];
}

const AdminMisionVisionValoresManager: React.FC = () => {
    const [content, setContent] = useState<MisionVisionValores>({
        mision: 'Proporcionar joyas de alta calidad con diseños exclusivos que reflejen la elegancia y personalidad de nuestros clientes.',
        vision: 'Ser la joyería de referencia en la región, reconocida por nuestra excelencia, innovación y compromiso con nuestros clientes.',
        valores: [
            'Calidad: Comprometidos con la excelencia en cada pieza',
            'Integridad: Transparencia total en nuestros procesos',
            'Innovación: Diseños únicos y exclusivos',
            'Servicio: Atención excepcional a nuestros clientes'
        ]
    });

    const [newValor, setNewValor] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

    // Carga lo guardado (antes esta pantalla no leía ni guardaba nada)
    useEffect(() => {
        productsAPI.getConfiguracionByClave(CLAVE_MVV).then((r: any) => {
            try {
                const v = JSON.parse(r?.data?.valor || 'null');
                if (v && typeof v === 'object') setContent({ mision: v.mision || '', vision: v.vision || '', valores: Array.isArray(v.valores) ? v.valores : [] });
            } catch { /* se queda con los textos por defecto */ }
        }).catch(() => {});
    }, []);

    const handleMisionChange = (value: string) => {
        setContent({ ...content, mision: value });
    };

    const handleVisionChange = (value: string) => {
        setContent({ ...content, vision: value });
    };

    const addValor = () => {
        if (newValor.trim()) {
            setContent({
                ...content,
                valores: [...content.valores, newValor.trim()]
            });
            setNewValor('');
        }
    };

    const removeValor = (index: number) => {
        setContent({
            ...content,
            valores: content.valores.filter((_, i) => i !== index)
        });
    };

    const moverValor = (i: number) => {
        if (i === 0) return;
        const v = [...content.valores];
        [v[i - 1], v[i]] = [v[i], v[i - 1]];
        setContent({ ...content, valores: v });
    };

    const saveChanges = async () => {
        setGuardando(true); setAviso(null);
        try {
            const r: any = await carritoAPI.setConfiguracion(CLAVE_MVV, JSON.stringify(content));
            if (r?.success === false) throw new Error(r.message);
            setAviso({ tipo: 'ok', texto: 'Cambios guardados. Ya se ven en "Sobre nosotros".' });
        } catch (e: any) {
            setAviso({ tipo: 'error', texto: e?.message || 'No se pudieron guardar los cambios' });
        } finally { setGuardando(false); }
    };

    const partes = (v: string) => { const i = v.indexOf(':'); return i > 0 && i < 40 ? [v.slice(0, i).trim(), v.slice(i + 1).trim()] : [v, '']; };

    return (
        <div className="av-page mvv3">
            <AdminHero icono={<AiOutlineFlag size={26} />} seccion="Contenido" titulo="Misión, visión y" resaltado="valores"
                descripcion='La identidad de la joyería. Se muestra en la página "Sobre nosotros" tal como la ves a la derecha.'>
                <button className="av-btn" onClick={saveChanges} disabled={guardando}><AiOutlineSave size={17} /> {guardando ? 'Guardando…' : 'Guardar cambios'}</button>
            </AdminHero>

            {aviso && <div className={`mvv3-aviso mvv3-aviso--${aviso.tipo}`} role="status">{aviso.texto}</div>}

            <div className="mvv3-layout">
                <div className="mvv3-editor">
                    <section className="av-panel">
                        <h2 className="av-panel-titulo"><AiOutlineAim size={20} /> Misión <small>¿Para qué existe la joyería?</small></h2>
                        <textarea className="mvv3-texto" rows={4} value={content.mision} onChange={e => handleMisionChange(e.target.value)} placeholder="Escribe la misión..." maxLength={500} />
                        <span className="mvv3-contador">{content.mision.length}/500</span>
                    </section>

                    <section className="av-panel">
                        <h2 className="av-panel-titulo"><AiOutlineEye size={20} /> Visión <small>¿A dónde quiere llegar?</small></h2>
                        <textarea className="mvv3-texto" rows={4} value={content.vision} onChange={e => handleVisionChange(e.target.value)} placeholder="Escribe la visión..." maxLength={500} />
                        <span className="mvv3-contador">{content.vision.length}/500</span>
                    </section>

                    <section className="av-panel">
                        <h2 className="av-panel-titulo"><AiOutlineHeart size={20} /> Valores <small>Escribe "Nombre: descripción"</small></h2>
                        <div className="mvv3-agregar">
                            <input value={newValor} onChange={e => setNewValor(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addValor(); }}
                                placeholder="Ej: Calidad: cuidamos cada detalle de la pieza" />
                            <button className="av-btn" onClick={addValor} disabled={!newValor.trim()}><AiOutlinePlus size={16} /> Agregar</button>
                        </div>
                        {content.valores.length === 0 ? (
                            <p className="mvv3-vacio">Aún no hay valores. Agrega el primero.</p>
                        ) : (
                            <ul className="mvv3-valores">
                                {content.valores.map((v, i) => {
                                    const [t, desc] = partes(v);
                                    return (
                                        <li key={i}>
                                            <span className="mvv3-num">{i + 1}</span>
                                            <span className="mvv3-valor"><b>{t}</b>{desc && <small>{desc}</small>}</span>
                                            <button className="av-accion" onClick={() => moverValor(i)} disabled={i === 0} title="Subir"><AiOutlineArrowUp size={15} /></button>
                                            <button className="av-accion av-accion--peligro" onClick={() => removeValor(i)} title="Quitar"><AiOutlineClose size={15} /></button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </section>
                </div>

                <aside className="mvv3-preview" aria-label="Vista previa">
                    <span className="av-eyebrow">Así se verá</span>
                    <div className="mvv3-tarjeta mvv3-tarjeta--mision"><span><AiOutlineAim size={18} /> Misión</span><p>{content.mision || '—'}</p></div>
                    <div className="mvv3-tarjeta"><span><AiOutlineEye size={18} /> Visión</span><p>{content.vision || '—'}</p></div>
                    <div className="mvv3-chips">
                        {content.valores.map((v, i) => <span key={i}>{partes(v)[0]}</span>)}
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default AdminMisionVisionValoresManager;
