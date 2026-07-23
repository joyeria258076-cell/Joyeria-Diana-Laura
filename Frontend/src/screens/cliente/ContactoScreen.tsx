import React, { useState } from "react";
import { AiOutlineMail, AiOutlinePhone, AiOutlineEnvironment, AiOutlineClockCircle, AiOutlineInstagram, AiOutlineFacebook, AiOutlineTwitter } from "react-icons/ai";
import "./ContactoScreen.css";

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
      <p className="contacto-eyebrow"><AiOutlineMail size={14} />Contacto</p>
      <h1 className="contacto-title">Contáctanos</h1>
      <p className="contacto-subtitle">
        Estamos aquí para ayudarte. Envíanos tu mensaje.
      </p>

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
                <div className="info-icon"><AiOutlinePhone size={18} /></div>
                <div className="info-content">
                  <h4>Teléfono</h4>
                  <p>+1 (555) 123-4567</p>
                </div>
              </div>

              <div className="info-item">
                <div className="info-icon"><AiOutlineMail size={18} /></div>
                <div className="info-content">
                  <h4>Correo Electrónico</h4>
                  <p>info@dianaLaura.com</p>
                </div>
              </div>

              <div className="info-item">
                <div className="info-icon"><AiOutlineEnvironment size={18} /></div>
                <div className="info-content">
                  <h4>Ubicación</h4>
                  <p>Calle Principal 123, Ciudad, País</p>
                </div>
              </div>

              <div className="info-item">
                <div className="info-icon"><AiOutlineClockCircle size={18} /></div>
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
                  <a href="#" className="social-link" title="Instagram"><AiOutlineInstagram size={18} /></a>
                  <a href="#" className="social-link" title="Facebook"><AiOutlineFacebook size={18} /></a>
                  <a href="#" className="social-link" title="Twitter"><AiOutlineTwitter size={18} /></a>
                </div>
              </div>
            </div>
          </div>
    </div>
  );
};

export default ContactoScreen;
