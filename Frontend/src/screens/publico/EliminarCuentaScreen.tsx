import React from 'react';
import { Link } from 'react-router-dom';
import PublicHeader from '../../components/PublicHeader';
import PublicFooter from '../../components/PublicFooter';
import './LegalScreen.css';

// Página pública que pide Google Play a las apps que permiten crear cuentas: explica cómo eliminar
// la cuenta y qué datos se borran o se conservan. Coincide con lo que hace DELETE /auth/profile
// (eliminarCuentaController.ts).
const CORREO = 'joyeria258076@gmail.com';

const EliminarCuentaScreen: React.FC = () => (
  <div className="legal-page">
    <PublicHeader />
    <main className="legal-main">
      <div className="legal-hero">
        <div className="legal-hero-deco" />
        <div className="legal-hero-inner">
          <span className="legal-hero-eyebrow">Privacidad</span>
          <h1 className="legal-hero-title">Eliminar tu cuenta</h1>
          <p className="legal-hero-sub">App Joyería Diana Laura · Desarrollador: Joyería Diana Laura</p>
          <span className="legal-hero-fecha">Última actualización: 9 de noviembre de 2026</span>
        </div>
      </div>

      <div className="legal-content-wrap">
        <article className="legal-article">
          <p className="legal-parrafo">
            Puedes eliminar tu cuenta de Joyería Diana Laura y tus datos personales en cualquier momento, desde la
            app, por correo o por WhatsApp.
          </p>

          <h3 className="legal-seccion-titulo">1. Desde la app</h3>
          <ul className="legal-lista">
            <li>Abre la app Joyería Diana Laura e inicia sesión.</li>
            <li>Entra a Mi perfil.</li>
            <li>Toca Eliminar mi cuenta y confirma.</li>
          </ul>

          <h3 className="legal-seccion-titulo">2. Por correo o WhatsApp</h3>
          <p className="legal-parrafo">
            Escribe a <a href={`mailto:${CORREO}?subject=Eliminar%20mi%20cuenta`}>{CORREO}</a> desde el correo con el
            que te registraste, con el asunto "Eliminar mi cuenta", o por WhatsApp al{' '}
            <a href="https://wa.me/527712976220">7712976220</a>. Respondemos en un máximo de 5 días hábiles.
          </p>

          <h3 className="legal-seccion-titulo">3. Datos que se borran</h3>
          <ul className="legal-lista">
            <li>Tu acceso: la cuenta de inicio de sesión se borra y ya no podrás entrar con ella.</li>
            <li>Tu nombre, correo, teléfono, fecha de nacimiento y foto de perfil.</li>
            <li>Tu carrito, favoritos, direcciones de entrega y solicitudes de piezas personalizadas.</li>
            <li>El registro de tu teléfono para notificaciones, tus sesiones y tus datos de seguridad.</li>
          </ul>

          <h3 className="legal-seccion-titulo">4. Datos que se conservan</h3>
          <ul className="legal-lista">
            <li>
              Tus pedidos, apartados y pagos se conservan sin tu nombre ni tus datos de contacto durante 5 años,
              porque la ley fiscal obliga a guardar el registro de las ventas.
            </li>
            <li>Tus reseñas de productos se conservan con el nombre "Cliente".</li>
          </ul>

          <h3 className="legal-seccion-titulo">5. Antes de eliminarla</h3>
          <p className="legal-parrafo">
            Si tienes un pedido o un apartado en curso, primero debe entregarse, liquidarse o cancelarse; después
            podrás eliminar tu cuenta.
          </p>

          <p className="legal-parrafo">
            Más información en el <Link to="/legal/privacidad">Aviso de Privacidad</Link>.
          </p>
        </article>
      </div>
    </main>
    <PublicFooter />
  </div>
);

export default EliminarCuentaScreen;
