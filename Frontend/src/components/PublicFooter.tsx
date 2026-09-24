import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AiOutlinePhone, AiOutlineMail, AiOutlineEnvironment, AiOutlineInstagram, AiOutlineFacebook, AiOutlineWhatsApp } from "react-icons/ai";
import { FaTiktok } from "react-icons/fa";
import { useInfoEmpresa } from "../utils/useInfoEmpresa";
import { zonaEntregaAPI } from "../services/api";
import "../styles/PublicFooter.css";

const PublicFooter: React.FC = () => {
  const [zonas, setZonas] = useState<string[]>([]);
  const info = useInfoEmpresa();
  const wa = info?.whatsapp?.replace(/\D/g, "");

  useEffect(() => {
    zonaEntregaAPI.getAll()
      .then((res: any) => {
        const arr = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
        setZonas(arr.map((z: any) => z.nombre));
      })
      .catch(() => { /* silently fallback */ });
  }, []);

  return (
    <footer className="public-footer">
      <div className="container-lg">
        <div className="footer-content">
          {/* Columna 1: Información de la marca */}
          <div className="footer-section">
            <h3 className="footer-title">Diana Laura</h3>
            <p className="footer-description">
              {info?.descripcion?.trim() ||
                "Joyería y bisutería premium con diseños elegantes y contemporáneos. Cada pieza está creada para destacar tu estilo único."}
            </p>
          </div>

          {/* Columna 2: Enlaces rápidos */}
          <div className="footer-section">
            <h3 className="footer-title">Enlaces Rápidos</h3>
            <ul className="footer-links">
              <li>
                <Link to="/">Inicio</Link>
              </li>
              <li>
                <Link to="/catalogo-publico">Catálogo</Link>
              </li>
              <li>
                <Link to="/noticias">Blog</Link>
              </li>
              <li>
                <Link to="/contacto-publico">Contacto</Link>
              </li>
            </ul>
          </div>

          {/* Columna 3: Información de contacto */}
          <div className="footer-section">
            <h3 className="footer-title">Contacto</h3>
            <ul className="footer-info">
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
                <li><AiOutlineEnvironment size={15} /><Link to="/ubicacion-publica">{info.direccion}</Link></li>
              )}
              {!info?.telefono && !wa && !info?.email && !info?.direccion && (
                <li><Link to="/contacto-publico">Ver formas de contacto</Link></li>
              )}
            </ul>
          </div>

          {/* Columna 3.5: Zonas de entrega */}
          {zonas.length > 0 && (
            <div className="footer-section">
              <h3 className="footer-title">Zonas de Entrega</h3>
              <ul className="footer-info">
                {zonas.map(z => (
                  <li key={z}>
                    <AiOutlineEnvironment size={15} />
                    <span>{z}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Columna 4: Redes sociales */}
          {(info?.instagram_url || info?.facebook_url || info?.tiktok_url) && (
            <div className="footer-section">
              <h3 className="footer-title">Síguenos</h3>
              <div className="footer-socials">
                {info?.instagram_url && (
                  <a href={info.instagram_url} className="social-link" title="Instagram" aria-label="Instagram" target="_blank" rel="noopener noreferrer">
                    <AiOutlineInstagram size={16} />
                  </a>
                )}
                {info?.facebook_url && (
                  <a href={info.facebook_url} className="social-link" title="Facebook" aria-label="Facebook" target="_blank" rel="noopener noreferrer">
                    <AiOutlineFacebook size={16} />
                  </a>
                )}
                {info?.tiktok_url && (
                  <a href={info.tiktok_url} className="social-link" title="TikTok" aria-label="TikTok" target="_blank" rel="noopener noreferrer">
                    <FaTiktok size={14} />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Separador */}
        <div className="footer-divider"></div>

        {/* Copyright */}
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Diana Laura Joyería. Todos los derechos reservados.</p>
          <div className="footer-policies">
            <Link to="/legal/privacidad">Política de Privacidad</Link>
            <span className="separator">•</span>
            <Link to="/legal/terminos">Términos de Servicio</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default PublicFooter;
