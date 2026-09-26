// Backend/src/utils/plantillaCorreo.ts
// Diseño común de los correos de eventos (pedidos, apartados, personalización)
// con el estilo de la app móvil: fondo oscuro, tarjetas redondeadas, etiqueta de
// estado en píldora, línea de tiempo vertical y botón en degradado rosa.
// Todo va con tablas y estilos en línea, y cada degradado tiene un color sólido
// de respaldo, porque Gmail y Outlook ignoran buena parte del CSS moderno.

export const SITIO_URL = 'https://joyeria-diana-laura.vercel.app';
const LOGO_URL = `${SITIO_URL}/pwa-192.png`;

// Paleta Negro·Rosa de la app
export const C = {
    fondo: '#0D080C',
    tarjeta: '#191116',
    superficie: '#261C22',
    borde: '#3A2A33',
    rosa: '#E9AFC7',
    rosaFuerte: '#CF819F',
    lila: '#A792C2',
    texto: '#FFF4FA',
    suave: '#C7A7BB',
    exito: '#2EBD85',
    aviso: '#F6A723',
    error: '#EF4B5B',
    info: '#4C9BF5',
};

const FUENTE = "'Poppins','Segoe UI',Helvetica,Arial,sans-serif";
const ACENTO = "'Playfair Display',Georgia,'Times New Roman',serif";

export const dinero = (n: any) =>
    `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const escapar = (t: any) => String(t ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export { escapar };

/** Etiqueta de estado en píldora (color sólido con fondo tenue). */
export const pildora = (texto: string, color: string) =>
    `<span style="display:inline-block; padding:6px 14px; border-radius:999px; background:${color}26; color:${color}; font-family:${FUENTE}; font-size:12px; font-weight:700; letter-spacing:0.2px;">${escapar(texto)}</span>`;

/** Tarjeta interna redondeada. */
export const tarjeta = (html: string, opciones: { acento?: string } = {}) => `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.superficie}; border-radius:22px; margin:0 0 16px; ${opciones.acento ? `border-left:4px solid ${opciones.acento};` : ''}">
      <tr><td style="padding:20px 22px;">${html}</td></tr>
    </table>`;

/** Fila etiqueta / valor. */
export const fila = (etiqueta: string, valor: string, opciones: { fuerte?: boolean; color?: string } = {}) => `
    <tr>
      <td style="padding:7px 0; font-family:${FUENTE}; font-size:${opciones.fuerte ? 16 : 14}px; color:${opciones.fuerte ? C.texto : C.suave}; font-weight:${opciones.fuerte ? 700 : 400};">${etiqueta}</td>
      <td align="right" style="padding:7px 0; font-family:${FUENTE}; font-size:${opciones.fuerte ? 20 : 14}px; color:${opciones.color || C.texto}; font-weight:${opciones.fuerte ? 700 : 600}; white-space:nowrap;">${valor}</td>
    </tr>`;

export const tablaFilas = (filas: string) =>
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${filas}</table>`;

/** Barra de progreso (por ejemplo, abonos de un apartado). */
export const barraProgreso = (porcentaje: number, color = C.rosa) => {
    const pct = Math.max(0, Math.min(100, Math.round(porcentaje)));
    return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0 6px;">
      <tr><td style="background:${C.tarjeta}; border-radius:999px; height:12px; padding:0;">
        <table role="presentation" width="${Math.max(pct, 3)}%" cellpadding="0" cellspacing="0"><tr>
          <td style="height:12px; border-radius:999px; background:${color}; background-image:linear-gradient(90deg,${C.rosa},${C.lila});"></td>
        </tr></table>
      </td></tr>
    </table>
    <p style="margin:0; text-align:right; font-family:${FUENTE}; font-size:12px; color:${C.suave};">${pct}% pagado</p>`;
};

/** Línea de tiempo vertical como la de "Mis pedidos". */
export type PasoLinea = { titulo: string; detalle?: string; estado: 'hecho' | 'actual' | 'pendiente' };
export const lineaTiempo = (pasos: PasoLinea[]) => {
    const filas = pasos.map((p, i) => {
        const ultimo = i === pasos.length - 1;
        const circulo = p.estado === 'hecho'
            ? `<div style="width:26px; height:26px; line-height:26px; border-radius:50%; background:${C.exito}33; color:${C.exito}; text-align:center; font-family:${FUENTE}; font-size:13px; font-weight:700;">&#10003;</div>`
            : p.estado === 'actual'
                ? `<div style="width:26px; height:26px; border-radius:50%; background:${C.rosa}; background-image:linear-gradient(135deg,${C.rosa},${C.lila}); box-shadow:0 0 0 5px ${C.rosa}33;"></div>`
                : `<div style="width:26px; height:26px; border-radius:50%; background:${C.tarjeta}; border:2px solid ${C.borde}; box-sizing:border-box;"></div>`;
        const linea = ultimo ? '' : `<div style="width:2px; height:22px; margin:4px auto 4px; background:${p.estado === 'hecho' ? C.exito : C.borde};"></div>`;
        return `
        <tr>
          <td width="34" valign="top" style="padding:0;">${circulo}${linea}</td>
          <td valign="top" style="padding:2px 0 0 12px;">
            <p style="margin:0; font-family:${FUENTE}; font-size:14.5px; font-weight:${p.estado === 'actual' ? 700 : 600}; color:${p.estado === 'pendiente' ? C.suave : C.texto};">${escapar(p.titulo)}</p>
            ${p.detalle ? `<p style="margin:2px 0 0; font-family:${FUENTE}; font-size:12px; color:${C.suave};">${escapar(p.detalle)}</p>` : ''}
          </td>
        </tr>`;
    }).join('');
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 18px;">${filas}</table>`;
};

/** Botón principal en degradado (con color sólido de respaldo). */
export const boton = (texto: string, url: string) => `
    <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:8px auto 4px;">
      <tr><td align="center" style="border-radius:22px; background:${C.rosa}; background-image:linear-gradient(135deg,${C.rosa} 0%,${C.rosaFuerte} 55%,${C.lila} 100%);">
        <a href="${url}" style="display:inline-block; padding:16px 38px; font-family:${FUENTE}; font-size:15px; font-weight:700; color:#2A0F22; text-decoration:none; border-radius:22px;">${escapar(texto)}</a>
      </td></tr>
    </table>`;

type OpcionesLayout = {
    /** Texto corto que se ve en la bandeja de entrada junto al asunto. */
    preheader: string;
    etiqueta?: { texto: string; color: string };
    /** Título principal; lo que vaya entre *asteriscos* sale en cursiva rosa. */
    titulo: string;
    nombre?: string;
    mensaje: string;
    contenido?: string;
    botonTexto?: string;
    botonUrl?: string;
    notaPie?: string;
};

const tituloConAcento = (titulo: string) =>
    escapar(titulo).replace(/\*(.+?)\*/g, `<em style="font-family:${ACENTO}; font-style:italic; font-weight:600; color:${C.rosa};">$1</em>`);

/** Estructura completa del correo. */
export const layoutCorreo = (o: OpcionesLayout) => `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light"><meta name="supported-color-schemes" content="dark light">
<title>Joyería Diana Laura</title></head>
<body style="margin:0; padding:0; background:${C.fondo};">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">${escapar(o.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.fondo};">
    <tr><td align="center" style="padding:32px 14px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

        <!-- Marca -->
        <tr><td style="padding:0 6px 18px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="padding-right:12px;"><img src="${LOGO_URL}" width="46" height="46" alt="Joyería Diana Laura" style="display:block; border-radius:14px; background:#000;"></td>
            <td style="font-family:${FUENTE}; font-size:17px; font-weight:700; color:${C.texto}; letter-spacing:-0.3px;">
              <span style="font-family:${ACENTO}; font-style:italic; font-weight:600; color:${C.rosa};">Joyería</span> Diana Laura
            </td>
          </tr></table>
        </td></tr>

        <!-- Tarjeta principal -->
        <tr><td style="background:${C.tarjeta}; border-radius:32px; border:1px solid ${C.borde};">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="height:6px; border-radius:32px 32px 0 0; background:${C.rosa}; background-image:linear-gradient(90deg,${C.rosa},${C.rosaFuerte},${C.lila});"></td></tr>
            <tr><td style="padding:30px 28px 10px;">
              ${o.etiqueta ? `<div style="margin:0 0 16px;">${pildora(o.etiqueta.texto, o.etiqueta.color)}</div>` : ''}
              <h1 style="margin:0 0 10px; font-family:${FUENTE}; font-size:28px; line-height:1.15; font-weight:700; letter-spacing:-0.8px; color:${C.texto};">${tituloConAcento(o.titulo)}</h1>
              <p style="margin:0 0 22px; font-family:${FUENTE}; font-size:15px; line-height:1.6; color:${C.suave};">
                ${o.nombre ? `Hola, <strong style="color:${C.texto};">${escapar(o.nombre)}</strong>. ` : ''}${o.mensaje}
              </p>
              ${o.contenido || ''}
              ${o.botonTexto && o.botonUrl ? boton(o.botonTexto, o.botonUrl) : ''}
            </td></tr>
            <tr><td style="padding:14px 28px 26px;">
              <p style="margin:0; font-family:${FUENTE}; font-size:12px; line-height:1.6; color:${C.suave}; text-align:center;">
                ${o.notaPie || 'Te avisaremos por este medio cada vez que haya una novedad.'}
              </p>
            </td></tr>
          </table>
        </td></tr>

        <!-- Pie con datos de contacto -->
        <tr><td style="padding:22px 10px 0; text-align:center; font-family:${FUENTE}; font-size:12px; line-height:1.7; color:${C.suave};">
          <a href="https://wa.me/527713321421" style="color:${C.rosa}; text-decoration:none; font-weight:600;">WhatsApp 771 332 1421</a>
          &nbsp;·&nbsp;
          <a href="${SITIO_URL}" style="color:${C.rosa}; text-decoration:none; font-weight:600;">Visitar la tienda</a><br>
          Calle Lázaro Cárdenas S/N, Col. El Zapote, Huejutla de Reyes, Hidalgo<br>
          <span style="color:${C.borde};">Joyería Diana Laura · Tu brillo, en tu bolsillo.</span>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`;
