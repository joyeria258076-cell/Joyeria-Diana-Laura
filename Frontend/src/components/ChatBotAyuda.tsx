// Ruta: Joyeria-Diana-Laura/Frontend/src/components/ChatBotAyuda.tsx

import React, { useEffect, useRef, useState } from 'react';
import { AiOutlineSend, AiOutlineWhatsApp } from 'react-icons/ai';
import '../styles/ChatBotAyuda.css';

interface FAQItem { pregunta: string; respuesta: string; }
interface InfoEmpresa { horario?: string | null; direccion?: string | null; }

interface Props {
  faqs: FAQItem[];
  whatsapp: string | null;
  info: InfoEmpresa | null;
}

interface Mensaje {
  from: 'bot' | 'user';
  text: string;
  whatsapp?: boolean;
}

const normalizar = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const CHIPS = ['Horarios', 'Ubicación', 'Envíos', 'Formas de pago', 'Apartados', 'Personalización', 'Mi pedido', 'Hablar con una persona'];

const ChatBotAyuda: React.FC<Props> = ({ faqs, whatsapp, info }) => {
  const [mensajes, setMensajes] = useState<Mensaje[]>([
    { from: 'bot', text: '¡Hola! Soy el asistente virtual de Joyería Diana Laura 💎 ¿En qué te puedo ayudar? Elige una opción o escribe tu pregunta.' },
  ]);
  const [texto, setTexto] = useState('');
  const [escribiendo, setEscribiendo] = useState(false);
  const finRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = finRef.current?.parentElement;
    if (el) el.scrollTop = el.scrollHeight;
  }, [mensajes, escribiendo]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const responder = (consulta: string): Mensaje => {
    const q = normalizar(consulta);
    const tiene = (...palabras: string[]) => palabras.some(p => q.includes(p));

    if (tiene('persona', 'humano', 'asesor', 'agente', 'whatsapp', 'wpp', 'hablar')) {
      return whatsapp
        ? { from: 'bot', text: 'Con gusto te comunico con una persona de nuestro equipo por WhatsApp.', whatsapp: true }
        : { from: 'bot', text: 'Por ahora el WhatsApp de atención no está disponible. Puedes escribirnos desde la sección Contacto.' };
    }
    if (tiene('horario', 'hora', 'abren', 'cierran', 'abierto')) {
      return { from: 'bot', text: info?.horario ? `Nuestro horario de atención es:\n${info.horario}` : 'Consulta nuestro horario en la sección Contacto.' };
    }
    if (tiene('ubicacion', 'direccion', 'donde', 'sucursal', 'tienda', 'mapa')) {
      return { from: 'bot', text: `${info?.direccion ? `Estamos en: ${info.direccion}.\n` : ''}Puedes ver el mapa completo en la sección Ubicación.` };
    }
    if (tiene('envio', 'domicilio', 'entrega', 'paqueteria', 'combi', 'transporte', 'flete')) {
      return { from: 'bot', text: 'Puedes recoger tu pedido en sucursal o recibirlo a domicilio. La entrega a domicilio se realiza a través de terceros (transportistas locales, combis y similares). Las zonas de entrega disponibles aparecen al final de la página.' };
    }
    if (tiene('pago', 'pagar', 'tarjeta', 'efectivo', 'transferencia', 'paypal', 'mercado', 'metodo')) {
      return { from: 'bot', text: 'Al finalizar tu compra eliges primero si quieres entrega a domicilio o recoger en sucursal, y después verás los métodos de pago disponibles. El pago en efectivo solo aplica al recoger en tienda.' };
    }
    if (tiene('apart')) {
      return { from: 'bot', text: 'Puedes apartar una pieza y seguir su estado en "Mis apartados" (necesitas iniciar sesión). Ahí también subes tu comprobante de pago.' };
    }
    if (tiene('personaliz', 'grabado', 'diseno', 'a medida', 'medida')) {
      return { from: 'bot', text: 'Los productos con la etiqueta "✦ Personalizable" se pueden personalizar. Desde su ficha eliges "Solicitar personalización", nos das los detalles y una imagen de referencia, y verificamos tu solicitud. Te avisamos por notificación cuando esté lista para comprarse; el costo de personalización se suma al precio.' };
    }
    if (tiene('pedido', 'compra', 'rastre', 'estado', 'seguimiento', 'donde esta')) {
      return { from: 'bot', text: 'Inicia sesión y entra a "Mis pedidos": ahí ves el estado de cada compra y quién la atiende. También te avisamos con una notificación (la campanita) cada vez que cambia.' };
    }

    // Coincidencia con las preguntas frecuentes que administra el negocio
    const tokens = q.split(/[^a-z0-9]+/).filter(t => t.length > 3);
    if (tokens.length > 0) {
      let mejor: FAQItem | null = null;
      let mejorPuntos = 0;
      for (const f of faqs) {
        const base = normalizar(`${f.pregunta} ${f.respuesta}`);
        const puntos = tokens.filter(t => base.includes(t)).length;
        if (puntos > mejorPuntos) { mejorPuntos = puntos; mejor = f; }
      }
      if (mejor && mejorPuntos >= 1) return { from: 'bot', text: mejor.respuesta };
    }

    return whatsapp
      ? { from: 'bot', text: 'No estoy seguro de haber entendido tu duda. ¿Quieres que una persona de nuestro equipo te ayude por WhatsApp?', whatsapp: true }
      : { from: 'bot', text: 'No estoy seguro de haber entendido tu duda. Prueba con las opciones de arriba o escríbenos desde la sección Contacto.' };
  };

  const enviar = (consulta: string) => {
    const limpio = consulta.trim();
    if (!limpio || escribiendo) return;
    setMensajes(prev => [...prev, { from: 'user', text: limpio }]);
    setTexto('');
    setEscribiendo(true);
    timerRef.current = setTimeout(() => {
      setMensajes(prev => [...prev, responder(limpio)]);
      setEscribiendo(false);
    }, 600);
  };

  const ultimaPregunta = [...mensajes].reverse().find(m => m.from === 'user')?.text;
  const waHref = whatsapp
    ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(
        ultimaPregunta
          ? `Hola, vengo del chat del sitio de Joyería Diana Laura. Mi duda: ${ultimaPregunta}`
          : 'Hola, soy un cliente de Joyería Diana Laura y necesito ayuda 💎'
      )}`
    : '#';

  return (
    <div className="dlchat">
      <div className="dlchat-header">
        <span className="dlchat-avatar">DL</span>
        <div>
          <strong>Asistente Diana Laura</strong>
          <span className="dlchat-status"><i /> En línea</span>
        </div>
      </div>

      <div className="dlchat-body" role="log" aria-live="polite">
        {mensajes.map((m, i) => (
          <div key={i} className={`dlchat-msg dlchat-msg--${m.from}`}>
            <p>{m.text}</p>
            {m.whatsapp && (
              <a className="dlchat-wa" href={waHref} target="_blank" rel="noopener noreferrer">
                <AiOutlineWhatsApp size={16} /> Continuar en WhatsApp
              </a>
            )}
          </div>
        ))}
        {escribiendo && (
          <div className="dlchat-msg dlchat-msg--bot dlchat-typing" aria-label="El asistente está escribiendo">
            <span /><span /><span />
          </div>
        )}
        <div ref={finRef} />
      </div>

      <div className="dlchat-chips">
        {CHIPS.map(c => (
          <button key={c} type="button" onClick={() => enviar(c)} disabled={escribiendo}>{c}</button>
        ))}
      </div>

      <form className="dlchat-form" onSubmit={e => { e.preventDefault(); enviar(texto); }}>
        <input
          type="text"
          value={texto}
          onChange={e => setTexto(e.target.value)}
          placeholder="Escribe tu pregunta..."
          aria-label="Escribe tu pregunta al asistente"
          maxLength={200}
        />
        <button type="submit" disabled={!texto.trim() || escribiendo} aria-label="Enviar mensaje">
          <AiOutlineSend size={16} />
        </button>
      </form>
    </div>
  );
};

export default ChatBotAyuda;
