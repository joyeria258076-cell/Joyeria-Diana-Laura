import React, { useState } from "react";
import PublicHeader from "../components/PublicHeader";
import PublicFooter from "../components/PublicFooter";
import "../styles/ContactoScreen.css";

const ContactoScreen: React.FC = () => {
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    asunto: "",
    mensaje: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Formulario enviado:", formData);
    alert("¡Mensaje enviado exitosamente! Nos pondremos en contacto pronto.");
    setFormData({ nombre: "", email: "", asunto: "", mensaje: "" });
  };

  return (
    <div className="contacto-container">
      <PublicHeader />
      {/* HERO SECTION */}
      <section className="contacto-hero">
        <div className="container-lg">
          <h1 className="contacto-title">Contáctanos</h1>
          <p className="contacto-subtitle">
            Estamos aquí para ayudarte. Envíanos tu mensaje.
          </p>
        </div>
      </section>

      {/* SECCIÓN DE CONTACTO */}
      <section className="contacto-section">
        <div className="container-lg">
          <div className="contacto-grid">
            {/* Formulario */}
            <div className="contacto-form-wrapper">
              <h2 className="form-title">Envíanos un Mensaje</h2>
              <form className="contacto-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="nombre">Nombre Completo</label>
                  <input
                    type="text"
                    id="nombre"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Correo Electrónico</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="asunto">Asunto</label>
                  <input
                    type="text"
                    id="asunto"
                    name="asunto"
                    value={formData.asunto}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="mensaje">Mensaje</label>
                  <textarea
                    id="mensaje"
                    name="mensaje"
                    rows={5}
                    value={formData.mensaje}
                    onChange={handleChange}
                    required
                  ></textarea>
                </div>

                <button type="submit" className="btn btn-primary">
                  Enviar Mensaje
                </button>
              </form>
            </div>

            {/* Información de contacto */}
            <div className="contacto-info-wrapper">
              <h2 className="info-title">Información de Contacto</h2>

              <div className="info-item">
                <div className="info-icon">
                  <i className="fas fa-phone"></i>
                </div>
                <div className="info-content">
                  <h4>Teléfono</h4>
                  <p>+1 (555) 123-4567</p>
                </div>
              </div>

              <div className="info-item">
                <div className="info-icon">
                  <i className="fas fa-envelope"></i>
                </div>
                <div className="info-content">
                  <h4>Correo Electrónico</h4>
                  <p>info@dianaLaura.com</p>
                </div>
              </div>

              <div className="info-item">
                <div className="info-icon">
                  <i className="fas fa-map-marker-alt"></i>
                </div>
                <div className="info-content">
                  <h4>Ubicación</h4>
                  <p>Calle Principal 123, Ciudad, País</p>
                </div>
              </div>

              <div className="info-item">
                <div className="info-icon">
                  <i className="fas fa-clock"></i>
                </div>
                <div className="info-content">
                  <h4>Horario de Atención</h4>
                  <p>
                    Lunes a Viernes: 9:00 AM - 6:00 PM
                    <br />
                    Sábados: 10:00 AM - 4:00 PM
                    <br />
                    Domingos: Cerrado
                  </p>
                </div>
              </div>

              <div className="socials-section">
                <h4>Síguenos en Redes Sociales</h4>
                <div className="socials">
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
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
};

export default ContactoScreen;
