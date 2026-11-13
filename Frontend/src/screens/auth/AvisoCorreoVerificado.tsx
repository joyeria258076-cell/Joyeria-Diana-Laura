// Aviso que aparece al abrir el enlace de verificación del correo.
// Quien se registró en la app móvil llega aquí desde su correo y antes se quedaba en la web
// sin saber que debía volver a la app; en Android se le da el botón para regresar.
import './AvisoCorreoVerificado.css';

const PAQUETE_APP = 'com.joyeriadianalaura.joyeria_diana_laura';
const PLAY_STORE = `https://play.google.com/store/apps/details?id=${PAQUETE_APP}`;

// joyeriadl:// es el esquema que la app ya registra (regreso de Mercado Pago): solo la trae al frente.
// Si la app no está instalada, Chrome abre Play Store.
export const ENLACE_APP =
  `intent://pago#Intent;scheme=joyeriadl;package=${PAQUETE_APP};` +
  `S.browser_fallback_url=${encodeURIComponent(PLAY_STORE)};end`;

export const esAndroid = (agente: string = typeof navigator !== 'undefined' ? navigator.userAgent : '') =>
  /android/i.test(agente);

export default function AvisoCorreoVerificado({ onCerrar }: { onCerrar: () => void }) {
  const android = esAndroid();
  return (
    <div className="aviso-verificado" role="status">
      <div className="aviso-verificado-icono" aria-hidden="true">✓</div>
      <div className="aviso-verificado-texto">
        <strong>Tu correo quedó verificado</strong>
        <p>
          {android
            ? 'Si creaste tu cuenta en la app, vuelve a ella e inicia sesión ahí. También puedes entrar aquí en la web.'
            : 'Ya puedes iniciar sesión con tu correo y tu contraseña.'}
        </p>
        {android && (
          <a className="aviso-verificado-boton" href={ENLACE_APP}>
            Volver a la app
            <span aria-hidden="true">↗</span>
          </a>
        )}
      </div>
      <button type="button" className="aviso-verificado-cerrar" onClick={onCerrar} aria-label="Cerrar aviso">×</button>
    </div>
  );
}
