// Ruta: src/screens/cliente/SobreNosotros.tsx
// "Sobre nosotros" con el estilo de la app: portada con foto, cifras,
// misión/visión/valores (los que guarda el admin), galería de piezas reales
// y un bloque para visitarnos con WhatsApp y "Cómo llegar".
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { contentAPI, productsAPI } from "../../services/api";
import {
  AiFillFacebook, AiFillInstagram, AiOutlineTikTok, AiOutlineWhatsApp, AiOutlineHeart, AiOutlineEye,
  AiOutlineEnvironment, AiOutlinePhone, AiOutlineMail, AiOutlineClockCircle, AiOutlineArrowRight,
  AiOutlineStar, AiOutlineSafety, AiOutlineBulb, AiOutlineSmile, AiOutlineGift,
} from "react-icons/ai";
import "./SobreNosotros.css";
import "./SobreApp.css";

const JDL_HERO_FALLBACK = 'https://res.cloudinary.com/dltvkwwq4/image/upload/f_auto,q_auto/joyeria/imagenes/imagen_usar_7.jpg';

interface InfoEmpresa {
  nombre: string; descripcion: string; direccion: string; telefono: string; email: string; horario: string;
  mision: string; artesania: string; anios_tradicion: number; clientes_felices: number;
  facebook_url: string; instagram_url: string; whatsapp: string; tiktok_url: string; imagen_hero: string;
}
interface MVV { mision: string; vision: string; valores: string[] }

const ICONOS_VALOR = [AiOutlineStar, AiOutlineSafety, AiOutlineBulb, AiOutlineSmile, AiOutlineHeart, AiOutlineGift];

const SobreNosotros: React.FC = () => {
  const navigate = useNavigate();
  const [info, setInfo] = useState<InfoEmpresa | null>(null);
  const [mvv, setMvv] = useState<MVV | null>(null);
  const [piezas, setPiezas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      contentAPI.getInfoEmpresa(),
      productsAPI.getConfiguracionByClave('sitio_mision_vision_valores'),
      productsAPI.getAll(),
    ]).then(([i, m, p]) => {
      if (i.status === 'fulfilled' && (i.value as any)?.success) setInfo((i.value as any).data);
      if (m.status === 'fulfilled') { try { setMvv(JSON.parse((m.value as any)?.data?.valor || 'null')); } catch { /* */ } }
      if (p.status === 'fulfilled') {
        const lista = Array.isArray((p.value as any)?.data) ? (p.value as any).data : [];
        setPiezas(lista.filter((x: any) => x.imagen_principal && x.stock_actual > 0 && !String(x.nombre).startsWith('[DEMO]')).slice(0, 5));
      }
    }).finally(() => setLoading(false));
  }, []);

  const wa = info?.whatsapp ? `https://wa.me/${info.whatsapp.replace(/\D/g, '')}` : null;
  const mapa = info?.direccion ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(info.direccion)}` : null;
  const redes = [
    info?.facebook_url && { icon: <AiFillFacebook size={18} />, label: 'Facebook', url: info.facebook_url },
    info?.instagram_url && { icon: <AiFillInstagram size={18} />, label: 'Instagram', url: info.instagram_url },
    info?.tiktok_url && { icon: <AiOutlineTikTok size={18} />, label: 'TikTok', url: info.tiktok_url },
  ].filter(Boolean) as { icon: React.ReactNode; label: string; url: string }[];

  const valores = (mvv?.valores || []).map(v => {
    const i = v.indexOf(':');
    return i > 0 ? { titulo: v.slice(0, i).trim(), texto: v.slice(i + 1).trim() } : { titulo: v.trim(), texto: '' };
  });

  if (loading) {
    return (
      <div className="sa-page">
        <div className="sa-hero sa-esqueleto" />
        <div className="sa-cifras">{[0, 1, 2].map(i => <div key={i} className="sa-cifra sa-esqueleto" />)}</div>
      </div>
    );
  }

  return (
    <div className="sa-page">
      {/* Portada */}
      <section className="sa-hero" style={{ backgroundImage: `url('${info?.imagen_hero || JDL_HERO_FALLBACK}')` }}>
        <div className="sa-hero-velo" />
        <div className="sa-hero-contenido">
          <span className="sa-eyebrow sa-eyebrow--claro">Nuestra historia</span>
          <h1 className="sa-hero-titulo">Joyería <em>Diana Laura</em></h1>
          <p className="sa-hero-texto">{info?.descripcion || 'Joyería y bisutería con esencia femenina. Diseños exclusivos y de calidad.'}</p>
          <div className="sa-hero-acciones">
            <button className="sa-btn" onClick={() => navigate('/catalogo')}>Ver catálogo <AiOutlineArrowRight size={16} /></button>
            {wa && <a className="sa-btn sa-btn--vidrio" href={wa} target="_blank" rel="noreferrer"><AiOutlineWhatsApp size={18} /> Escríbenos</a>}
          </div>
        </div>
      </section>

      {/* Cifras */}
      <section className="sa-cifras">
        <div className="sa-cifra"><strong>{info?.anios_tradicion ?? 10}+</strong><span>Años de tradición</span></div>
        <div className="sa-cifra"><strong>{(info?.clientes_felices ?? 5000).toLocaleString('es-MX')}+</strong><span>Clientas felices</span></div>
        <div className="sa-cifra"><strong>100%</strong><span>Hecho con cariño</span></div>
      </section>

      {/* Misión y visión */}
      <section className="sa-seccion">
        <span className="sa-eyebrow">Lo que nos mueve</span>
        <h2 className="sa-titulo">Nuestro <em>propósito</em></h2>
        <div className="sa-mv">
          <article className="sa-mv-card">
            <span className="sa-mv-icono"><AiOutlineHeart size={24} /></span>
            <h3>Misión</h3>
            <p>{mvv?.mision || info?.mision || 'Ofrecer joyería de alta calidad que realce la belleza natural y la confianza de cada mujer.'}</p>
          </article>
          <article className="sa-mv-card sa-mv-card--acento">
            <span className="sa-mv-icono"><AiOutlineEye size={24} /></span>
            <h3>Visión</h3>
            <p>{mvv?.vision || 'Ser la joyería de referencia en la región, reconocida por su excelencia y cercanía.'}</p>
          </article>
        </div>
      </section>

      {/* Valores */}
      {valores.length > 0 && (
        <section className="sa-seccion">
          <span className="sa-eyebrow">En qué creemos</span>
          <h2 className="sa-titulo">Nuestros <em>valores</em></h2>
          <div className="sa-valores">
            {valores.map((v, i) => {
              const Icono = ICONOS_VALOR[i % ICONOS_VALOR.length];
              return (
                <article key={i} className="sa-valor">
                  <span className="sa-valor-icono"><Icono size={20} /></span>
                  <h4>{v.titulo}</h4>
                  {v.texto && <p>{v.texto}</p>}
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Artesanía + galería */}
      <section className="sa-arte">
        <div className="sa-arte-texto">
          <span className="sa-eyebrow">Artesanía</span>
          <h2 className="sa-titulo">Cada pieza, <em>con detalle</em></h2>
          <p>{info?.artesania || 'Utilizamos materiales de calidad y procesos cuidados para que cada pieza sea única y duradera.'}</p>
          <button className="sa-btn sa-btn--borde" onClick={() => navigate('/catalogo')}>Descubre la colección <AiOutlineArrowRight size={16} /></button>
        </div>
        {piezas.length > 0 && (
          <div className={`sa-galeria sa-galeria--${Math.min(piezas.length, 5)}`}>
            {piezas.map((p, i) => (
              <button key={p.id} className={`sa-foto sa-foto--${i}`} onClick={() => navigate(`/producto/${p.id}`)} aria-label={p.nombre}>
                <img src={p.imagen_principal} alt={p.nombre} loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Visítanos */}
      {(info?.direccion || info?.telefono || info?.email || info?.horario) && (
        <section className="sa-visita">
          <div className="sa-visita-cabeza">
            <div>
              <span className="sa-eyebrow sa-eyebrow--claro">Te esperamos</span>
              <h2 className="sa-titulo sa-titulo--claro">Visítanos en <em>Huejutla</em></h2>
            </div>
            <div className="sa-visita-acciones">
              {mapa && <a className="sa-btn sa-btn--blanco" href={mapa} target="_blank" rel="noreferrer"><AiOutlineEnvironment size={18} /> Cómo llegar</a>}
              {wa && <a className="sa-btn sa-btn--vidrio" href={wa} target="_blank" rel="noreferrer"><AiOutlineWhatsApp size={18} /> WhatsApp</a>}
            </div>
          </div>
          <div className="sa-visita-grid">
            {info?.direccion && <div className="sa-dato"><AiOutlineEnvironment size={20} /><div><span>Dirección</span><p>{info.direccion}</p></div></div>}
            {info?.horario && <div className="sa-dato"><AiOutlineClockCircle size={20} /><div><span>Horario</span><p style={{ whiteSpace: 'pre-line' }}>{info.horario}</p></div></div>}
            {info?.telefono && <div className="sa-dato"><AiOutlinePhone size={20} /><div><span>Teléfono</span><p><a href={`tel:${info.telefono.replace(/\s/g, '')}`}>{info.telefono}</a></p></div></div>}
            {info?.email && <div className="sa-dato"><AiOutlineMail size={20} /><div><span>Correo</span><p><a href={`mailto:${info.email}`}>{info.email}</a></p></div></div>}
          </div>
          {redes.length > 0 && (
            <div className="sa-redes">
              {redes.map(r => <a key={r.label} href={r.url} target="_blank" rel="noreferrer" aria-label={r.label}>{r.icon}</a>)}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default SobreNosotros;
