// Ruta: Joyeria-Diana-Laura/Frontend/src/components/ChatBotAyuda.tsx

import React, { useEffect, useRef, useState } from 'react';
import { AiOutlineSend, AiOutlineWhatsApp } from 'react-icons/ai';
import { useNavigate } from 'react-router-dom';
import { asistenteAPI } from '../services/api';
import '../styles/ChatBotAyuda.css';

interface FAQItem { pregunta: string; respuesta: string; }
interface InfoEmpresa { horario?: string | null; direccion?: string | null; }

interface Props {
  faqs: FAQItem[];
  whatsapp: string | null;
  info: InfoEmpresa | null;
  /** true cuando el cliente ya inició sesión: no se le pide "inicia sesión". */
  logeado?: boolean;
}

interface ProductoCard { id: number; nombre: string; precio: number; precio_oferta: number | null; stock: number; imagen: string | null; personalizable: boolean; }
interface Contexto { tema?: string; productoIds?: number[]; }

interface Mensaje {
  from: 'bot' | 'user';
  text: string;
  whatsapp?: boolean;
  productos?: ProductoCard[];
  acciones?: { label: string; ruta: string }[];
  sugerencias?: string[];
}

const money = (n: number) => `$${Number(n).toLocaleString('es-MX', { maximumFractionDigits: 2 })}`;

const normalizar = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const CHIPS = ['¿Cómo va mi pedido?', 'Anillos de menos de $500', 'Promociones vigentes', 'Zonas de entrega', 'Formas de pago', 'Personalización', 'Horarios', 'Hablar con una persona'];

const ChatBotAyuda: React.FC<Props> = ({ faqs, whatsapp, info, logeado = false }) => {
  const [mensajes, setMensajes] = useState<Mensaje[]>([
    { from: 'bot', text: '¡Hola! Soy el asistente virtual de Joyería Diana Laura 💎 Puedo buscar piezas por tipo o precio, decirte promociones, zonas de entrega' + (logeado ? ' y cómo van tus pedidos, apartados o personalizaciones.' : '. Si inicias sesión, también te digo cómo van tus pedidos.') + ' Escribe tu pregunta.' },
  ]);
  const navigate = useNavigate();
  const contextoRef = useRef<Contexto>({});
  const [texto, setTexto] = useState('');
  const [escribiendo, setEscribiendo] = useState(false);
  const finRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = finRef.current?.parentElement;
    if (el) el.scrollTop = el.scrollHeight;
  }, [mensajes, escribiendo]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  // Respaldo sin conexión: respuestas locales si el servidor no contesta
  const responderLocal = (consulta: string): Mensaje => {
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
      return { from: 'bot', text: logeado
        ? 'Desde la ficha de un producto eliges "Apartar". Después sigues su estado y subes tu comprobante en "Mis apartados", en el menú lateral.'
        : 'Puedes apartar una pieza y seguir su estado en "Mis apartados" (necesitas iniciar sesión). Ahí también subes tu comprobante de pago.' };
    }
    if (tiene('personaliz', 'grabado', 'diseno', 'a medida', 'medida')) {
      return { from: 'bot', text: 'Los productos con la etiqueta "✦ Personalizable" se pueden personalizar. Desde su ficha eliges "Solicitar personalización", nos das los detalles y una imagen de referencia, y verificamos tu solicitud. Te avisamos por notificación cuando esté lista para comprarse; el costo de personalización se suma al precio.' + (logeado ? ' Tus solicitudes las ves en "Mis personalizaciones".' : ' Necesitas iniciar sesión para solicitarla.') };
    }
    if (tiene('pedido', 'compra', 'rastre', 'estado', 'seguimiento', 'donde esta')) {
      return { from: 'bot', text: logeado
        ? 'Entra a "Mis pedidos" en el menú lateral: ahí ves el estado de cada compra y quién la atiende. Cada cambio también te llega como notificación en la campanita.'
        : 'Inicia sesión y entra a "Mis pedidos": ahí ves el estado de cada compra y quién la atiende. También te avisamos con una notificación (la campanita) cada vez que cambia.' };
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
    const inicio = Date.now();
    asistenteAPI.preguntar(limpio, contextoRef.current)
      .then((res: any) => {
        const d = res?.data;
        if (!res?.success || !d?.texto) throw new Error('sin respuesta');
        if (d.contexto) contextoRef.current = d.contexto;
        return { from: 'bot', text: d.texto, whatsapp: !!d.whatsapp && !!whatsapp, productos: d.productos,
                 acciones: d.acciones, sugerencias: d.sugerencias } as Mensaje;
      })
      .catch(() => responderLocal(limpio))
      .then(m => {
        // pequeña pausa mínima para que se note el "escribiendo..."
        const espera = Math.max(0, 450 - (Date.now() - inicio));
        timerRef.current = setTimeout(() => {
          setMensajes(prev => [...prev, m]);
          setEscribiendo(false);
        }, espera);
      });
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
            {!!m.productos?.length && (
              <div className="dlchat-prods">
                {m.productos.map(p => (
                  <button key={p.id} type="button" className="dlchat-prod" onClick={() => navigate(logeado ? `/producto/${p.id}` : `/producto-publico/${p.id}`)}>
                    {p.imagen ? <img src={p.imagen} alt="" loading="lazy" /> : <span className="dlchat-prod-ph">DL</span>}
                    <span className="dlchat-prod-info">
                      <strong>{p.nombre}</strong>
                      <span>
                        {p.precio_oferta ? <><b>{money(p.precio_oferta)}</b> <s>{money(p.precio)}</s></> : <b>{money(p.precio)}</b>}
                        {p.stock <= 0 && <em> · agotado</em>}
                        {p.personalizable && <em> · ✦ personalizable</em>}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
            {!!m.acciones?.length && (
              <div className="dlchat-acciones">
                {m.acciones.map(a => (
                  <button key={a.ruta} type="button" onClick={() => navigate(a.ruta)}>{a.label} →</button>
                ))}
              </div>
            )}
            {!!m.sugerencias?.length && i === mensajes.length - 1 && (
              <div className="dlchat-acciones">
                {m.sugerencias.map(sg => (
                  <button key={sg} type="button" className="dlchat-sug" onClick={() => enviar(sg)} disabled={escribiendo}>{sg}</button>
                ))}
              </div>
            )}
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
