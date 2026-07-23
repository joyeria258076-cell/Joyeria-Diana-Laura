import React, { useState, useEffect } from "react";
import { contentAPI } from "../../services/api";
import { AiOutlineQuestionCircle, AiOutlineDown, AiOutlineMessage } from "react-icons/ai";
import "./AyudaScreen.css";

interface FAQ {
  id: number;
  pregunta: string;
  respuesta: string;
  orden: number;
  activa: boolean;
}

const Ayuda: React.FC = () => {
  const [faqs, setFaqs]       = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen]       = useState<number | null>(null);

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await contentAPI.getFaqs();
        const arr: FAQ[] = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
        setFaqs(arr.filter(f => f.activa));
      } catch {
        /* silently fallback to empty */
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  const toggle = (id: number) => setOpen(prev => (prev === id ? null : id));

  return (
    <div className="page-container ayuda-page fade-in">
      <div className="section-header">
        <p className="ayuda-eyebrow"><AiOutlineQuestionCircle size={14} />Soporte</p>
        <h1>Centro de Ayuda</h1>
        <p>Resolvemos tus dudas para que tu única preocupación sea lucir nuestras joyas.</p>
      </div>

      <div className="faq-grid">
        <section className="faq-section">
          <h2>Preguntas Frecuentes</h2>

          {loading ? (
            <p className="faq-loading">Cargando preguntas...</p>
          ) : faqs.length === 0 ? (
            <p className="faq-empty">No hay preguntas frecuentes disponibles por el momento.</p>
          ) : (
            <div className="faq-list">
              {faqs.map(f => (
                <div key={f.id} className={`faq-item${open === f.id ? ' faq-item--open' : ''}`}>
                  <button className="faq-summary" onClick={() => toggle(f.id)}>
                    <span>{f.pregunta}</span>
                    <span className="faq-chevron"><AiOutlineDown size={14} /></span>
                  </button>
                  {open === f.id && (
                    <div className="faq-answer">
                      <p>{f.respuesta}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="support-card">
          <div className="support-card-icon"><AiOutlineMessage size={22} /></div>
          <h3>¿Aún tienes dudas?</h3>
          <p>Nuestro equipo de soporte está disponible para ti.</p>
          <button className="btn-contact">Chat en Vivo</button>
          <p className="email-link">soporte@dianalaura.com</p>
        </section>
      </div>
    </div>
  );
};

export default Ayuda;
