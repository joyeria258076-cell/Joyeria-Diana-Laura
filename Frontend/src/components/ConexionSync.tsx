// Ruta: Joyeria-Diana-Laura/Frontend/src/components/ConexionSync.tsx
//
// 1) Precarga el contenido de las páginas estáticas (inicio, nosotros,
//    preguntas frecuentes, políticas, contacto, ubicación) para que el
//    service worker lo guarde y se pueda ver sin conexión aunque el usuario
//    no las haya abierto. Si se borra el storage, al recargar se vuelve a llenar.
// 2) Cuando regresa el internet: vuelve a pedir ese contenido, avisa con una
//    notificación y recarga la página para mostrar los datos actualizados.
// El catálogo de productos NO se precarga: es dinámico.

import { useEffect } from 'react';

const API = import.meta.env.VITE_API_URL || 'https://joyeria-diana-laura-nqnq.onrender.com/api';

const ENDPOINTS_ESTATICOS = [
  '/content/info-empresa',
  '/content/faqs',
  '/content/pages/terminos',
  '/content/pages/privacidad',
  '/content/carrusel-inicio',
  '/content/promociones/activas',
  '/content/colecciones/publicas',
  '/products/configuracion/clave/sitio_mision_vision_valores',
  '/zonas-entrega',
];

const precargar = () =>
  Promise.allSettled(ENDPOINTS_ESTATICOS.map(e => fetch(`${API}${e}`)));

const notificar = async (titulo: string, cuerpo: string) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    const opciones = { body: cuerpo, icon: '/pwa-192.png', badge: '/pwa-192.png', tag: 'conexion' };
    if (reg) await reg.showNotification(titulo, opciones);
    else new Notification(titulo, opciones);
  } catch { /* sin notificación */ }
};

function ConexionSync(): null {
  useEffect(() => {
    // Esperar a que el service worker controle la página para que lo guarde
    const iniciar = () => { if (navigator.onLine) precargar(); };
    if (navigator.serviceWorker?.controller) iniciar();
    else navigator.serviceWorker?.addEventListener('controllerchange', iniciar, { once: true });

    const alVolver = async () => {
      await precargar();
      await notificar('Conexión restablecida', 'Joyería Diana Laura: el contenido se actualizó.');
      window.location.reload();
    };
    const alPerder = () => {
      notificar('Sin conexión', 'Puedes seguir viendo Inicio, Nosotros, Preguntas frecuentes y Políticas.');
    };
    window.addEventListener('online', alVolver);
    window.addEventListener('offline', alPerder);
    return () => {
      window.removeEventListener('online', alVolver);
      window.removeEventListener('offline', alPerder);
    };
  }, []);

  return null;
}

export default ConexionSync;
