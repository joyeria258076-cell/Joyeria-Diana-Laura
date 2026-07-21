// Ruta: src/screens/SobreNosotros.tsx
import React, { useEffect, useState } from "react";
import { contentAPI } from "../../services/api";
import "./SobreNosotros.css";

interface InfoEmpresa {
  nombre: string;
  descripcion: string;
  direccion: string;
  telefono: string;
  email: string;
  horario: string;
  mision: string;
  artesania: string;
  anios_tradicion: number;
  clientes_felices: number;
  facebook_url: string;
  instagram_url: string;
  whatsapp: string;
  tiktok_url: string;
  imagen_hero: string;
}

const SobreNosotros: React.FC = () => {
  const [info, setInfo] = useState<InfoEmpresa | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    contentAPI.getInfoEmpresa()
      .then(res => { if (res.success) setInfo(res.data); })
      .catch(() => setInfo(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="sn-container fade-in"><p className="sn-loading">Cargando...</p></div>;
  }

  const heroStyle = info?.imagen_hero
    ? { backgroundImage: `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url('${info.imagen_hero}')` }
    : undefined;

  const redes = [
    info?.facebook_url && { icon: '📘', label: 'Facebook', url: info.facebook_url },
    info?.instagram_url && { icon: '📷', label: 'Instagram', url: info.instagram_url },
    info?.tiktok_url && { icon: '🎵', label: 'TikTok', url: info.tiktok_url },
    info?.whatsapp && { icon: '💬', label: 'WhatsApp', url: `https://wa.me/${info.whatsapp.replace(/\D/g, '')}` },
  ].filter(Boolean) as { icon: string; label: string; url: string }[];

  return (
    <div className="sn-container fade-in">
      <section className="sn-hero" style={heroStyle}>
        <p className="sn-eyebrow">Bienvenido a</p>
        <h1>{info?.nombre || 'Diana Laura'}</h1>
        <p className="sn-hero-desc">
          {info?.descripcion || 'En Diana Laura, cada pieza cuenta una historia de elegancia y pasión artesanal.'}
        </p>
      </section>

      <div className="sn-grid">
        <div className="sn-card">
          <span className="sn-card-icon">💍</span>
          <h3>Misión</h3>
          <p>{info?.mision || 'Ofrecer joyería de alta calidad que realce la belleza natural y la confianza de cada mujer.'}</p>
        </div>
        <div className="sn-card">
          <span className="sn-card-icon">✨</span>
          <h3>Artesanía</h3>
          <p>{info?.artesania || 'Utilizamos materiales premium y procesos hechos a mano para garantizar piezas únicas y duraderas.'}</p>
        </div>
      </div>

      <div className="sn-stats-banner">
        <div className="stat"><span>{info?.anios_tradicion ?? 10}+</span><p>Años de Tradición</p></div>
        <div className="stat"><span>{(info?.clientes_felices ?? 5000).toLocaleString('es-MX')}+</span><p>Clientes Felices</p></div>
        <div className="stat"><span>100%</span><p>Oro Ético</p></div>
      </div>

      {(info?.direccion || info?.telefono || info?.email || info?.horario) && (
        <section className="sn-contacto">
          <h3 className="sn-contacto-titulo">📍 Visítanos</h3>
          <div className="sn-contacto-grid">
            {info?.direccion && (
              <div className="sn-contacto-item">
                <span className="sn-contacto-icon">🏠</span>
                <div><p className="sn-contacto-label">Dirección</p><p>{info.direccion}</p></div>
              </div>
            )}
            {info?.telefono && (
              <div className="sn-contacto-item">
                <span className="sn-contacto-icon">📞</span>
                <div><p className="sn-contacto-label">Teléfono</p><p>{info.telefono}</p></div>
              </div>
            )}
            {info?.email && (
              <div className="sn-contacto-item">
                <span className="sn-contacto-icon">✉️</span>
                <div><p className="sn-contacto-label">Email</p><p>{info.email}</p></div>
              </div>
            )}
            {info?.horario && (
              <div className="sn-contacto-item">
                <span className="sn-contacto-icon">🕐</span>
                <div><p className="sn-contacto-label">Horario</p><p style={{ whiteSpace: 'pre-line' }}>{info.horario}</p></div>
              </div>
            )}
          </div>

          {redes.length > 0 && (
            <div className="sn-redes">
              {redes.map(r => (
                <a key={r.label} href={r.url} target="_blank" rel="noreferrer" className="sn-red-link">
                  <span>{r.icon}</span> {r.label}
                </a>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default SobreNosotros;
