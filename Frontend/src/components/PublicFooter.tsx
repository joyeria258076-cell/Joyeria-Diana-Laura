import React from "react";
import { Link } from "react-router-dom";
import { AiOutlinePhone, AiOutlineMail, AiOutlineEnvironment, AiOutlineInstagram, AiOutlineFacebook, AiOutlineTwitter } from "react-icons/ai";
import "../styles/PublicFooter.css";

const PublicFooter: React.FC = () => {
  return (
    <footer className="public-footer">
      <div className="container-lg">
        <div className="footer-content">
          {/* Columna 1: Información de la marca */}
          <div className="footer-section">
            <h5 className="footer-title">Diana Laura</h5>
            <p className="footer-description">
              Joyería y bisutería premium con diseños elegantes y contemporáneos.
              Cada pieza está creada para destacar tu estilo único.
            </p>
          </div>

          {/* Columna 2: Enlaces rápidos */}
          <div className="footer-section">
            <h5 className="footer-title">Enlaces Rápidos</h5>
            <ul className="footer-links">
              <li>
                <Link to="/">Inicio</Link>
              </li>
              <li>
                <Link to="/catalogo-publico">Catálogo</Link>
              </li>
              <li>
                <Link to="/noticias">Noticias</Link>
              </li>
              <li>
                <Link to="/contacto">Contacto</Link>
              </li>
            </ul>
          </div>

          {/* Columna 3: Información de contacto */}
          <div className="footer-section">
            <h5 className="footer-title">Contacto</h5>
            <ul className="footer-info">
              <li>
                <AiOutlinePhone size={15} />
                <span>+1 (555) 123-4567</span>
              </li>
              <li>
                <AiOutlineMail size={15} />
                <span>info@dianaLaura.com</span>
              </li>
              <li>
                <AiOutlineEnvironment size={15} />
                <span>Ciudad, País</span>
              </li>
            </ul>
          </div>

          {/* Columna 4: Redes sociales */}
          <div className="footer-section">
            <h5 className="footer-title">Síguenos</h5>
            <div className="footer-socials">
              <a href="#" className="social-link" title="Instagram">
                <AiOutlineInstagram size={16} />
              </a>
              <a href="#" className="social-link" title="Facebook">
                <AiOutlineFacebook size={16} />
              </a>
              <a href="#" className="social-link" title="Twitter">
                <AiOutlineTwitter size={16} />
              </a>
            </div>
          </div>
        </div>

        {/* Separador */}
        <div className="footer-divider"></div>

        {/* Copyright */}
        <div className="footer-bottom">
          <p>&copy; 2026 Diana Laura Joyería. Todos los derechos reservados.</p>
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
