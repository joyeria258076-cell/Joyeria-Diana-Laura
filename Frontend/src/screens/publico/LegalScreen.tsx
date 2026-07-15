import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PublicHeader from '../../components/PublicHeader';
import PublicFooter from '../../components/PublicFooter';
import { contentAPI } from '../../services/api';
import './LegalScreen.css';

const TERMINOS_DEFAULT = `Términos y Condiciones de Uso
Diana Laura Joyería y Bisutería
Los presentes Términos y Condiciones regulan el uso de los servicios digitales de Diana Laura Joyería y Bisutería, a través de sus plataformas oficiales (sitio web, aplicación móvil, Facebook y WhatsApp). Al realizar una compra, el Cliente acepta expresamente estas condiciones, cuyo fin es garantizar transparencia, seguridad y confianza en la relación comercial.

1. Información General
• Razón social: Diana Laura Joyería y Bisutería.
• Domicilio de contacto: Calle Lázaro Cárdenas S/N, colonia El Zapote, 43000 Huejutla de Reyes, Hgo.
• Medios oficiales de atención: sitio web, app oficial, Facebook: Diana Laura Joyería y Bisutería, WhatsApp: 7713321421, Correo: dianalaura5861@gmail.com.
• Horario de atención: 9:00 a.m. – 11:00 p.m.

2. Ventas y Pedidos
• El Cliente podrá adquirir productos directamente desde el catálogo digital.
• Para pedidos personalizados se requiere anticipo obligatorio del 50%; el resto se liquida en la entrega.
• El tiempo estimado de elaboración de productos personalizados es de 7 a 10 días hábiles.
• En caso de piezas no disponibles en inventario, la reposición puede tardar hasta 30 días naturales.

3. Formas de Pago
• Métodos aceptados: efectivo, transferencias, depósitos, PayPal y Mercado Pago.
• Todos los pagos deben registrarse en el sistema y generar un comprobante digital.
• La Empresa no almacena información sensible de tarjetas.

4. Entregas
• Las entregas se realizan en puntos de encuentro dentro de Huejutla o mediante servicio a domicilio (con un costo adicional de $50 a $80 pesos, según zona).
• Para envíos fuera de la región de la Huasteca, se utilizarán servicios de mensajería; los costos correrán a cargo del Cliente.

5. Cambios y Devoluciones
• Se aceptan cambios únicamente por defectos de fabricación o daño en la entrega.
• El cliente deberá reportar cualquier problema dentro de los 7 días naturales posteriores a la entrega.
• No aplican devoluciones en productos usados, personalizados o con modificaciones especiales.

6. Promociones y Publicidad
• La Empresa podrá ofrecer promociones informadas a través de los canales oficiales.
• Todas las promociones estarán sujetas a disponibilidad y vigencia especificada.

7. Garantías y Responsabilidad
• Todos los productos cuentan con garantía contra defectos de fabricación por 30 días naturales.
• La Empresa no se hace responsable por daños ocasionados por mal uso o manipulación indebida.

8. Inventario y Disponibilidad
• En caso de producto no disponible, el Cliente podrá esperar reposición, aceptar producto similar o solicitar devolución (en 5 días hábiles).

9. Cancelaciones
• El Cliente podrá cancelar pedidos siempre que no se haya iniciado el proceso de personalización.
• En caso de cancelación de producto personalizado, el anticipo no será reembolsable.

10. Marco Legal
• Estos Términos se rigen por la Ley Federal de Protección al Consumidor (LFPC) en México.
• En caso de controversia, ambas partes se someten a los tribunales competentes en Hidalgo, México.

11. Modificaciones
La Empresa se reserva el derecho de actualizar estos Términos y Condiciones. Última actualización: Septiembre 2025.`;

const PRIVACIDAD_DEFAULT = `Aviso de Privacidad – Joyería Diana Laura
En cumplimiento con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP), Joyería Diana Laura, con domicilio en calle Lázaro Cárdenas S/N, colonia el Zapote 43000 Huejutla de Reyes Hgo, es responsable del tratamiento de los datos personales de sus clientes y se compromete a proteger su privacidad.

1. Datos personales que recabamos
• Nombre completo.
• Domicilio de contacto o punto de entrega.
• Número telefónico y correo electrónico.
• Datos de pago limitados (referencia de transferencia o comprobante; nunca almacenamos información completa de tarjetas).
• Historial de compras y gustos del cliente.
No recabamos datos personales sensibles.

2. Finalidades del tratamiento
La información recabada será utilizada para:
• Procesar compras y coordinar entregas.
• Confirmar y verificar pagos.
• Enviar notificaciones sobre el estado del pedido.
• Compartir promociones, nuevos productos o recordatorios relacionados con la joyería.
• Elaborar reportes internos de ventas y clientes.
• Garantizar la seguridad y credibilidad en cada transacción.

3. Medidas de seguridad
• Todos los pagos se realizan mediante plataformas seguras (PayPal, Mercado Pago o transferencias bancarias verificadas).
• El acceso a la información está limitado exclusivamente al responsable de la joyería.
• Los registros de pedidos y clientes se resguardan de forma interna con acceso restringido.

4. Derechos ARCO (Acceso, Rectificación, Cancelación y Oposición)
Usted tiene derecho a acceder, corregir, cancelar u oponerse al tratamiento de sus datos.
Para ejercer estos derechos: dianalaura@gmail.com o WhatsApp Business al 7712976220.

5. Transferencia de datos
Sus datos personales no serán compartidos con terceros, salvo para:
• Procesar pagos mediante plataformas seguras.
• Realizar entregas a través de servicios de mensajería, únicamente con la información necesaria.

6. Cambios al aviso de privacidad
Nos reservamos el derecho de actualizar este Aviso. Las modificaciones serán publicadas en nuestra página web y/o aplicación móvil.

7. Aceptación
Al utilizar nuestros servicios y proporcionar sus datos personales, usted acepta los términos del presente Aviso de Privacidad.
Última actualización: 11 de septiembre de 2025.`;

const LegalScreen: React.FC = () => {
  const { tipo } = useParams<{ tipo: string }>();
  const navigate = useNavigate();
  const [contenido, setContenido] = useState('');
  const [titulo, setTitulo] = useState('');
  const [ultimaActualizacion, setUltimaActualizacion] = useState('');
  const [loading, setLoading] = useState(true);
  const [sinContenido, setSinContenido] = useState(false);

  const pageName = tipo === 'privacidad' ? 'privacidad' : 'terminos';

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await contentAPI.getPageConfig(pageName);
        const texto = res?.contenido?.trim();
        const esPlaceholder = !texto || texto.toLowerCase() === 'contenido inicial';
        if (res && texto && !esPlaceholder) {
          setTitulo(res.titulo || (pageName === 'terminos' ? 'Términos y Condiciones' : 'Aviso de Privacidad'));
          setContenido(texto);
          setUltimaActualizacion(res.fecha ? new Date(res.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }) : '');
        } else {
          setTitulo(pageName === 'terminos' ? 'Términos y Condiciones' : 'Aviso de Privacidad');
          setSinContenido(true);
        }
      } catch {
        setTitulo(pageName === 'terminos' ? 'Términos y Condiciones' : 'Aviso de Privacidad');
        setSinContenido(true);
      } finally { setLoading(false); }
    };
    cargar();
  }, [pageName]);

  const renderContenido = (texto: string) => {
    const lineas = texto.split('\n');
    const elementos: React.ReactNode[] = [];
    let i = 0;

    while (i < lineas.length) {
      const linea = lineas[i].trim();
      if (!linea) { i++; continue; }

      // Título principal (primera línea o sin número)
      if (i === 0 || (linea.match(/^\d+\./) && linea.length < 60)) {
        if (linea.match(/^\d+\./)) {
          elementos.push(<h3 key={i} className="legal-seccion-titulo">{linea}</h3>);
        } else {
          elementos.push(<p key={i} className="legal-intro-titulo">{linea}</p>);
        }
      } else if (linea.startsWith('•') || linea.startsWith('-')) {
        const items: string[] = [];
        while (i < lineas.length && (lineas[i].trim().startsWith('•') || lineas[i].trim().startsWith('-'))) {
          items.push(lineas[i].trim().replace(/^[•\-]\s*/, ''));
          i++;
        }
        elementos.push(
          <ul key={`ul-${i}`} className="legal-lista">
            {items.map((item, j) => <li key={j}>{item}</li>)}
          </ul>
        );
        continue;
      } else {
        elementos.push(<p key={i} className="legal-parrafo">{linea}</p>);
      }
      i++;
    }
    return elementos;
  };

  return (
    <div className="legal-page">
      <PublicHeader />
      <main className="legal-main">
        {/* Hero */}
        <div className="legal-hero">
          <div className="legal-hero-deco" />
          <div className="legal-hero-inner">
            <span className="legal-hero-eyebrow">
              {pageName === 'terminos' ? '📋 Marco Legal' : '🔒 Privacidad'}
            </span>
            <h1 className="legal-hero-title">{titulo}</h1>
            <p className="legal-hero-sub">Joyería Diana Laura · Joyería y Bisutería</p>
            {ultimaActualizacion && (
              <span className="legal-hero-fecha">Última actualización: {ultimaActualizacion}</span>
            )}
          </div>
          {/* Tab switch */}
          <div className="legal-tabs">
            <button
              className={`legal-tab ${pageName === 'terminos' ? 'active' : ''}`}
              onClick={() => navigate('/legal/terminos')}
            >📋 Términos y Condiciones</button>
            <button
              className={`legal-tab ${pageName === 'privacidad' ? 'active' : ''}`}
              onClick={() => navigate('/legal/privacidad')}
            >🔒 Aviso de Privacidad</button>
          </div>
        </div>

        {/* Contenido */}
        <div className="legal-content-wrap">
          {loading ? (
            <div className="legal-loading">
              <div className="legal-spinner" />
              <p>Cargando documento...</p>
            </div>
          ) : sinContenido ? (
            <article className="legal-article legal-article--empty">
              <div className="legal-empty">
                <span className="legal-empty-icon">📄</span>
                <h3 className="legal-empty-title">Sin información disponible</h3>
                <p className="legal-empty-sub">Este documento aún no ha sido publicado. Vuelve pronto.</p>
              </div>
            </article>
          ) : (
            <article className="legal-article">
              {renderContenido(contenido)}
            </article>
          )}

          {/* Info de contacto */}
          <aside className="legal-aside">
            <div className="legal-aside-card">
              <div className="legal-aside-icon">💬</div>
              <h4>¿Tienes preguntas?</h4>
              <p>Contáctanos por cualquiera de nuestros canales oficiales.</p>
              <div className="legal-aside-links">
                <a href="https://wa.me/527713321421" className="legal-aside-link">
                  📱 WhatsApp: 7713321421
                </a>
                <a href="mailto:dianalaura5861@gmail.com" className="legal-aside-link">
                  ✉️ dianalaura5861@gmail.com
                </a>
              </div>
            </div>
            <div className="legal-aside-card legal-aside-card--nav">
              <h4>Documentos legales</h4>
              <button className={`legal-aside-nav ${pageName === 'terminos' ? 'active' : ''}`} onClick={() => navigate('/legal/terminos')}>
                📋 Términos y Condiciones
              </button>
              <button className={`legal-aside-nav ${pageName === 'privacidad' ? 'active' : ''}`} onClick={() => navigate('/legal/privacidad')}>
                🔒 Aviso de Privacidad
              </button>
            </div>
          </aside>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
};

export default LegalScreen;
