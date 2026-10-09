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

// Misma caché que usa la regla Network First del service worker (vite.config.ts)
const CACHE_ESTATICAS = 'paginas-estaticas';

// Pide cada endpoint y guarda la respuesta directamente en la caché. Así no
// depende de que el service worker ya controle la página (en la primera
// visita todavía se está instalando y no alcanzaría a guardarla).
const precargar = async () => {
  if (!('caches' in window)) return;
  const cache = await caches.open(CACHE_ESTATICAS);
  await Promise.allSettled(ENDPOINTS_ESTATICOS.map(async e => {
    const res = await fetch(`${API}${e}`, { cache: 'no-store' });
    if (res.ok) await cache.put(`${API}${e}`, res.clone());
  }));
};

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
    // Se deja para después de cargar la página, para no competir con las
    // imágenes y datos del primer pintado (afectaba el LCP en Lighthouse).
    const t = setTimeout(() => { if (navigator.onLine) precargar().catch(() => {}); }, 5000);

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
      clearTimeout(t);
    };
  }, []);

  return null;
}

export default ConexionSync;
