import React from "react";
import { Link } from "react-router-dom";
import "../styles/FooterPrivado.css";

const FooterPrivado: React.FC = () => {
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
                <Link to="/inicio">Inicio</Link>
              </li>
              <li>
                <Link to="/catalogo">Catálogo</Link>
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
                <i className="fas fa-phone"></i>
                <span>+1 (555) 123-4567</span>
              </li>
              <li>
                <i className="fas fa-envelope"></i>
                <span>info@dianaLaura.com</span>
              </li>
              <li>
                <i className="fas fa-map-marker-alt"></i>
                <span>Ciudad, País</span>
              </li>
            </ul>
          </div>

          {/* Columna 4: Redes sociales */}
          <div className="footer-section">
            <h5 className="footer-title">Síguenos</h5>
            <div className="footer-socials">
              <a href="#" className="social-link" title="Instagram">
                <i className="fab fa-instagram"></i>
              </a>
              <a href="#" className="social-link" title="Facebook">
                <i className="fab fa-facebook"></i>
              </a>
              <a href="#" className="social-link" title="Twitter">
                <i className="fab fa-twitter"></i>
              </a>
              <a href="#" className="social-link" title="Pinterest">
                <i className="fab fa-pinterest"></i>
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
            <Link to="#">Política de Privacidad</Link>
            <span className="separator">•</span>
            <Link to="#">Términos de Servicio</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterPrivado;
