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
// Contenido dinámico del inicio y del blog: se guarda en la primera visita
// para mostrar lo último cargado cuando no hay conexión (regla
// 'contenido-inicio' en vite.config.ts).
const ENDPOINTS_INICIO = ['/products', '/content/noticias'];
const CACHE_INICIO = 'contenido-inicio';
const CACHE_IMAGENES = 'imagenes-cloudinary';

// Igual que el cacheKeyWillBeUsed del service worker: sin el tamaño de Cloudinary
const claveImagen = (url: string) => url.replace(/\/upload\/(?:[a-z]{1,3}_[^/]+\/)+/, '/upload/');

const guardar = async (cache: Cache, endpoints: string[]) => {
  const textos = await Promise.allSettled(endpoints.map(async e => {
    const res = await fetch(`${API}${e}`, { cache: 'no-store' });
    if (!res.ok) return '';
    await cache.put(`${API}${e}`, res.clone());
    return res.text();
  }));
  return textos.map(t => (t.status === 'fulfilled' ? t.value : '')).join(' ');
};

const precargar = async () => {
  if (!('caches' in window)) return;
  const [estaticas, inicio, imagenes] = await Promise.all([
    caches.open(CACHE_ESTATICAS), caches.open(CACHE_INICIO), caches.open(CACHE_IMAGENES),
  ]);
  const texto = (await guardar(estaticas, ENDPOINTS_ESTATICOS)) + (await guardar(inicio, ENDPOINTS_INICIO));

  // Imágenes que aparecen en esas respuestas (carrusel, productos, noticias,
  // colecciones), para que el inicio y el blog se vean completos sin conexión.
  const urls = [...new Set((texto.match(/https:\/\/res\.cloudinary\.com\/[^"\s\\]+/g) || []).map(claveImagen))].slice(0, 80);
  await Promise.allSettled(urls.map(async u => {
    // Las que guardó el <img> quedan "opacas" (sin vista previa en DevTools);
    // se reemplazan por la respuesta completa, que Cloudinary permite con CORS.
    // La copia opaca se borra antes: si no, el service worker (Cache First) la
    // devuelve a esta petición CORS y el navegador la rechaza (ERR_FAILED).
    const previa = await imagenes.match(u);
    if (previa && previa.type !== 'opaque') return;
    if (previa) await imagenes.delete(u);
    const res = await fetch(u, { mode: 'cors' });
    if (res.ok) await imagenes.put(u, res);
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
    // Se deja para después de cargar la página y de que el service worker
    // termine de instalarse: así no compite con el primer pintado (LCP) ni con
    // la descarga del precache, y la página queda lista sin conexión antes.
    let cancelado = false;
    const t = setTimeout(() => {
      const iniciar = () => { if (!cancelado && navigator.onLine) precargar().catch(() => {}); };
      if ('serviceWorker' in navigator) navigator.serviceWorker.ready.then(iniciar);
      else iniciar();
    }, 3000);

    const alVolver = async () => {
      await precargar();
      await notificar('Conexión restablecida', 'Joyería Diana Laura: el contenido se actualizó.');
      window.location.reload();
    };
    const alPerder = () => {
      notificar('Sin conexión', 'Puedes seguir viendo Inicio, Blog, Nosotros, Preguntas frecuentes y Políticas.');
    };
    window.addEventListener('online', alVolver);
    window.addEventListener('offline', alPerder);
    return () => {
      window.removeEventListener('online', alVolver);
      window.removeEventListener('offline', alPerder);
      cancelado = true;
      clearTimeout(t);
    };
  }, []);

  return null;
}

export default ConexionSync;
