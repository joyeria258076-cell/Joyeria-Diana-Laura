# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary:** mujer joven (18–35 años) de Huejutla de Reyes, Hidalgo, y alrededores. Visita la tienda desde el celular, busca piezas para ella o para regalar, y compara precio y estilo antes de decidir.
- **Secondary (operación):** la dueña y el personal (roles admin y trabajador) que gestionan catálogo, pedidos, apartados y personalizaciones desde el panel privado.

## Product Purpose

Tienda en línea de Joyería y Bisutería Diana Laura: catálogo público, compra con carrito, apartados en abonos, piezas personalizables y seguimiento de pedidos. Éxito = que la visitante encuentre una pieza que le guste, confíe y compre o aparte.

## Positioning

Lo que otra joyería no puede copiar tal cual:
- **Piezas personalizables** (grabados, nombres, tallas, largos) elegidas con botones al comprar.
- **Trato cercano y local:** tienda física en Huejutla, entrega en la zona (Huejutla, San Felipe, Jaltocan, Tampico, Tehuetlán), atención directa por WhatsApp.
- **Precio accesible:** joyería y bisutería bonita sin precios de lujo.
- **Apartados en pagos:** anticipo del 50% y abonos semanales, quincenales o mensuales.

## Operating Context

- Compra mayormente desde celular; también escritorio.
- Pagos: PayPal, MercadoPago, transferencia (con comprobante) y efectivo en tienda.
- Entrega a domicilio en zonas dadas de alta o recoger en tienda; fuera de zona se cotiza paquetería.
- Existe app móvil (Flutter, en desarrollo) y skill de Alexa que comparten backend.

## Capabilities and Constraints

- Stack existente: React + Vite + TypeScript (Frontend en Vercel), Node/Express (Backend en Render), PostgreSQL en Supabase, imágenes en Cloudinary.
- Sistema de temas por `[data-theme]` en `Frontend/src/styles/temas.css` (claro `blanco_rosa`, oscuros `negro_rosa`, `negro_dorado`, más temáticas de temporada). Todo diseño debe funcionar en todos.
- Secciones del inicio público administrables desde el panel (carrusel, promociones, colecciones, mostrar/ocultar/ordenar bloques); el rediseño debe respetar esos `Seccion id` existentes.
- PWA con service worker.

## Brand Commitments

- Nombre: **Joyería Diana Laura** ("Joyería y Bisutería con esencia femenina").
- **Logo DL** (monograma) se mantiene.
- Lema **"Tu brillo, en tu bolsillo."** se mantiene.
- **Temas de color actuales** se mantienen como opciones del usuario.
- Fuera de lo anterior, la dueña da libertad total para proponer la identidad visual del sitio.

## Evidence on Hand

- Fotos reales de productos en Cloudinary (campo `imagen_principal`), ~96 productos en 6 categorías (Cadenas, Anillos, Collares, Pulseras, Aretes, Esclavas). Algunas piezas tienen prefijo `[DEMO]` y no deben destacarse.
- Carrusel administrable con fotos propias.
- No hay testimonios, reseñas verificadas ni prensa: no inventarlos.

## Product Principles

1. La pieza es la protagonista: fotos reales grandes antes que adornos.
2. Cercanía antes que pose: lujo accesible, nunca frío ni inalcanzable.
3. Celular primero: todo se decide pensando en el pulgar.
4. Confianza visible: entrega local, apartados y personalización explicados sin letra chica.
5. Lo administrable sigue administrable: la dueña controla contenido sin tocar código.
