import React from "react";
import { Link } from "react-router-dom";
import { AiOutlinePhone, AiOutlineMail, AiOutlineEnvironment, AiOutlineInstagram, AiOutlineFacebook, AiOutlineWhatsApp } from "react-icons/ai";
import { FaTiktok } from "react-icons/fa";
import { useInfoEmpresa } from "../utils/useInfoEmpresa";
import "../styles/FooterPrivado.css";

// Datos de contacto y redes desde Información Empresarial (admin); solo se
// muestra lo que esté registrado.
const FooterPrivado: React.FC = () => {
  const info = useInfoEmpresa();
  const wa = info?.whatsapp?.replace(/\D/g, "");
  const hayRedes = !!(info?.instagram_url || info?.facebook_url || info?.tiktok_url);

  return (
    <footer className="fp-footer">
      <div className="fp-container">
        <div className="fp-content">
          {/* Columna 1: Información de la marca */}
          <div className="fp-section">
            <h5 className="fp-title">Diana Laura</h5>
            <p className="fp-description">
              {info?.descripcion?.trim() ||
                "Joyería y bisutería premium con diseños elegantes y contemporáneos. Cada pieza está creada para destacar tu estilo único."}
            </p>
          </div>

          {/* Columna 2: Enlaces rápidos */}
          <div className="fp-section">
            <h5 className="fp-title">Enlaces Rápidos</h5>
            <ul className="fp-links">
              <li><Link to="/inicio">Inicio</Link></li>
              <li><Link to="/catalogo">Catálogo</Link></li>
              <li><Link to="/blog">Blog</Link></li>
              <li><Link to="/contacto">Contacto</Link></li>
            </ul>
          </div>

          {/* Columna 3: Información de contacto */}
          <div className="fp-section">
            <h5 className="fp-title">Contacto</h5>
            <ul className="fp-info">
              {info?.telefono && (
                <li><AiOutlinePhone size={15} /><a href={`tel:${info.telefono.replace(/\s/g, "")}`}>{info.telefono}</a></li>
              )}
              {wa && (
                <li><AiOutlineWhatsApp size={15} /><a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">WhatsApp</a></li>
              )}
              {info?.email && (
                <li><AiOutlineMail size={15} /><a href={`mailto:${info.email}`}>{info.email}</a></li>
              )}
              {info?.direccion && (
                <li><AiOutlineEnvironment size={15} /><Link to="/ubicacion">{info.direccion}</Link></li>
              )}
              {!info?.telefono && !wa && !info?.email && !info?.direccion && (
                <li><Link to="/contacto">Ver formas de contacto</Link></li>
              )}
            </ul>
          </div>

          {/* Columna 4: Redes sociales (solo las registradas) */}
          {hayRedes && (
            <div className="fp-section">
              <h5 className="fp-title">Síguenos</h5>
              <div className="fp-socials">
                {info?.instagram_url && (
                  <a href={info.instagram_url} className="fp-social-link" title="Instagram" aria-label="Instagram" target="_blank" rel="noopener noreferrer"><AiOutlineInstagram size={16} /></a>
                )}
                {info?.facebook_url && (
                  <a href={info.facebook_url} className="fp-social-link" title="Facebook" aria-label="Facebook" target="_blank" rel="noopener noreferrer"><AiOutlineFacebook size={16} /></a>
                )}
                {info?.tiktok_url && (
                  <a href={info.tiktok_url} className="fp-social-link" title="TikTok" aria-label="TikTok" target="_blank" rel="noopener noreferrer"><FaTiktok size={14} /></a>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="fp-divider"></div>

        <div className="fp-bottom">
          <p>&copy; {new Date().getFullYear()} Diana Laura Joyería. Todos los derechos reservados.</p>
          <div className="fp-policies">
            <Link to="/legal/privacidad">Política de Privacidad</Link>
            <span className="fp-separator">•</span>
            <Link to="/legal/terminos">Términos de Servicio</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterPrivado;
