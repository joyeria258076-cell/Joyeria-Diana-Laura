import React from "react";
import { Link } from "react-router-dom";
import { AiOutlinePhone, AiOutlineMail, AiOutlineEnvironment, AiOutlineInstagram, AiOutlineFacebook, AiOutlineTwitter } from "react-icons/ai";
import "../styles/FooterPrivado.css";

const FooterPrivado: React.FC = () => {
  return (
    <footer className="fp-footer">
      <div className="fp-container">
        <div className="fp-content">
          {/* Columna 1: Información de la marca */}
          <div className="fp-section">
            <h5 className="fp-title">Diana Laura</h5>
            <p className="fp-description">
              Joyería y bisutería premium con diseños elegantes y contemporáneos.
              Cada pieza está creada para destacar tu estilo único.
            </p>
          </div>

          {/* Columna 2: Enlaces rápidos */}
          <div className="fp-section">
            <h5 className="fp-title">Enlaces Rápidos</h5>
            <ul className="fp-links">
              <li><Link to="/inicio">Inicio</Link></li>
              <li><Link to="/catalogo">Catálogo</Link></li>
              <li><Link to="/contacto">Contacto</Link></li>
            </ul>
          </div>

          {/* Columna 3: Información de contacto */}
          <div className="fp-section">
            <h5 className="fp-title">Contacto</h5>
            <ul className="fp-info">
              <li><AiOutlinePhone size={15} /><span>+1 (555) 123-4567</span></li>
              <li><AiOutlineMail size={15} /><span>info@dianaLaura.com</span></li>
              <li><AiOutlineEnvironment size={15} /><span>Ciudad, País</span></li>
            </ul>
          </div>

          {/* Columna 4: Redes sociales */}
          <div className="fp-section">
            <h5 className="fp-title">Síguenos</h5>
            <div className="fp-socials">
              <a href="#" className="fp-social-link" title="Instagram"><AiOutlineInstagram size={16} /></a>
              <a href="#" className="fp-social-link" title="Facebook"><AiOutlineFacebook size={16} /></a>
              <a href="#" className="fp-social-link" title="Twitter"><AiOutlineTwitter size={16} /></a>
            </div>
          </div>
        </div>

        <div className="fp-divider"></div>

        <div className="fp-bottom">
          <p>&copy; 2026 Diana Laura Joyería. Todos los derechos reservados.</p>
          <div className="fp-policies">
            <Link to="#">Política de Privacidad</Link>
            <span className="fp-separator">•</span>
            <Link to="#">Términos de Servicio</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterPrivado;
