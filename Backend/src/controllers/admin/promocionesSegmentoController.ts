// Ruta: Backend/src/controllers/admin/promocionesSegmentoController.ts
import { Response } from 'express';
import axios from 'axios';
import pool from '../../config/database';
import { AuthRequest } from '../../middleware/authMiddleware';

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';
const REMITENTE_EMAIL = process.env.BREVO_SENDER_EMAIL || '';
const REMITENTE_NOMBRE = process.env.BREVO_SENDER_NOMBRE || 'Joyeria Diana Laura';

const SITIO = 'https://joyeria-diana-laura.vercel.app';

// Paleta del sitio (clásica): negro cálido + rose gold / champagne
const C = {
  fondo: '#0a0a0a', superficie: '#141414', superficie2: '#1e1e1e',
  oro: '#c9956c', champagne: '#e8d5b7', texto: '#f5f0eb', tenue: '#9e9087',
  borde: 'rgba(201,149,108,0.25)',
};
const SERIF = "'Cormorant Garamond',Georgia,'Times New Roman',serif";
const SANS = "'Jost','Segoe UI',Arial,sans-serif";

// Texto de apertura según el segmento de K-Means
const SEGMENTO_META: Record<string, { icono: string; titulo: string; intro: string }> = {
  'Cliente Frecuente de Alto Gasto': {
    icono: '👑', titulo: 'Cliente VIP',
    intro: 'Eres de nuestras clientas más especiales y queremos agradecerte con algo pensado solo para ti.',
  },
  'Cliente Ocasional': {
    icono: '✨', titulo: 'Te extrañamos',
    intro: 'Hace tiempo que no nos visitas y tenemos piezas nuevas que creemos que te van a encantar.',
  },
  'Cliente Apartador': {
    icono: '💎', titulo: 'Para tu próxima pieza',
    intro: 'Sabemos que te gusta planear tus compras; aquí tienes una ayuda para tu próxima pieza.',
  },
};

interface ProductoCorreo { id: number; nombre: string; precio_venta: number; precio_oferta: number | null; imagen_principal: string; }
interface DescuentoCorreo { tipo: string; valor: number; codigo: string; vence: Date }

const escapar = (t: string) => String(t || '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const dinero = (n: number) => `$${Number(n).toLocaleString('es-MX', { maximumFractionDigits: 2 })}`;
const precioConDescuento = (precio: number, d: DescuentoCorreo | null) => {
  if (!d) return null;
  const final = d.tipo === 'porcentaje' ? precio * (1 - d.valor / 100) : precio - d.valor;
  return final > 0 && final < precio ? final : null;
};

function bloqueCupon(d: DescuentoCorreo | null): string {
  if (!d) return '';
  const texto = d.tipo === 'porcentaje' ? `${d.valor}% de descuento` : `${dinero(d.valor)} de descuento`;
  const vence = d.vence.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
  return `
  <tr><td style="padding:0 36px 28px;">
    <table role="presentation" width="100%" style="border:1px dashed ${C.oro}; border-radius:14px; background:${C.superficie2};">
      <tr><td style="padding:22px; text-align:center;">
        <p style="margin:0 0 6px; font-family:${SANS}; font-size:11px; letter-spacing:3px; text-transform:uppercase; color:${C.oro};">Tu regalo</p>
        <p style="margin:0 0 12px; font-family:${SERIF}; font-size:30px; color:${C.texto};">${texto}</p>
        <p style="margin:0 0 14px; font-family:${SANS}; font-size:13px; color:${C.tenue};">Se aplica solo en tu carrito, no necesitas escribir nada.</p>
        <span style="display:inline-block; font-family:'Courier New',monospace; font-size:15px; letter-spacing:2px; color:${C.champagne}; border:1px solid ${C.borde}; border-radius:8px; padding:8px 16px;">${escapar(d.codigo)}</span>
        <p style="margin:14px 0 0; font-family:${SANS}; font-size:12px; color:${C.tenue};">Válido hasta el ${vence}</p>
      </td></tr>
    </table>
  </td></tr>`;
}

function bloqueProductos(productos: ProductoCorreo[], d: DescuentoCorreo | null): string {
  if (!productos.length) return '';
  const celdas = productos.map(p => {
    const base = Number(p.precio_oferta || p.precio_venta);
    const conDesc = precioConDescuento(base, d);
    const precio = conDesc
      ? `<span style="color:${C.tenue}; text-decoration:line-through; font-size:12px;">${dinero(base)}</span><br><span style="color:${C.champagne}; font-size:15px;">${dinero(conDesc)}</span>`
      : `<span style="color:${C.champagne}; font-size:15px;">${dinero(base)}</span>`;
    return `
      <td width="${Math.floor(100 / productos.length)}%" style="padding:0 6px; vertical-align:top;">
        <a href="${SITIO}/producto/${p.id}" style="text-decoration:none; display:block; background:${C.superficie}; border:1px solid ${C.borde}; border-radius:12px; overflow:hidden;">
          <img src="${escapar(p.imagen_principal)}" alt="${escapar(p.nombre)}" width="100%" style="display:block; width:100%; height:150px; object-fit:cover; border:0;">
          <div style="padding:12px 10px 14px; text-align:center;">
            <p style="margin:0 0 6px; font-family:${SERIF}; font-size:16px; line-height:1.25; color:${C.texto};">${escapar(p.nombre)}</p>
            <p style="margin:0; font-family:${SANS}; line-height:1.4;">${precio}</p>
          </div>
        </a>
      </td>`;
  }).join('');
  return `
  <tr><td style="padding:0 30px 30px;">
    <p style="margin:0 0 14px; text-align:center; font-family:${SANS}; font-size:11px; letter-spacing:3px; text-transform:uppercase; color:${C.oro};">Elegidas para ti</p>
    <table role="presentation" width="100%"><tr>${celdas}</tr></table>
  </td></tr>`;
}

export function construirHtmlPromocion(
  nombrePila: string, mensaje: string, segmento: string,
  descuento: DescuentoCorreo | null, productos: ProductoCorreo[], whatsapp: string | null,
): string {
  const meta = SEGMENTO_META[segmento] || { icono: '💍', titulo: 'Especial para ti', intro: 'Preparamos algo especial para ti.' };
  const mensajeHtml = escapar(mensaje).replace(/\n/g, '<br>');
  const wa = whatsapp ? whatsapp.replace(/\D/g, '') : '';

  return `
  <div style="background:${C.fondo}; padding:36px 12px;">
    <table role="presentation" width="100%" style="max-width:580px; margin:0 auto; background:${C.fondo}; border:1px solid ${C.borde}; border-radius:18px; overflow:hidden;">
      <tr><td style="height:3px; background:linear-gradient(90deg,${C.oro},${C.champagne},${C.oro});"></td></tr>

      <tr><td style="padding:40px 36px 10px; text-align:center;">
        <p style="margin:0 0 4px; font-family:${SERIF}; font-size:30px; color:${C.texto}; letter-spacing:1px;"><span style="color:${C.oro};">DL</span> Diana Laura</p>
        <p style="margin:0 0 24px; font-family:${SANS}; font-size:10px; letter-spacing:4px; text-transform:uppercase; color:${C.tenue};">Joyería y bisutería</p>
        <span style="display:inline-block; font-family:${SANS}; font-size:11px; letter-spacing:2px; text-transform:uppercase; color:${C.champagne}; border:1px solid ${C.borde}; border-radius:50px; padding:8px 18px;">${meta.icono}&nbsp; ${meta.titulo}</span>
      </td></tr>

      <tr><td style="padding:26px 36px 8px;">
        <p style="margin:0 0 10px; font-family:${SERIF}; font-size:28px; color:${C.texto};">Hola, <span style="color:${C.oro};">${escapar(nombrePila) || 'cliente'}</span></p>
        <p style="margin:0 0 18px; font-family:${SANS}; font-size:15px; line-height:1.7; color:${C.tenue};">${meta.intro}</p>
        <p style="margin:0 0 28px; font-family:${SANS}; font-size:15px; line-height:1.75; color:${C.texto};">${mensajeHtml}</p>
      </td></tr>

      ${bloqueCupon(descuento)}
      ${bloqueProductos(productos, descuento)}

      <tr><td style="padding:0 36px 36px; text-align:center;">
        <a href="${SITIO}/catalogo" style="display:inline-block; background:linear-gradient(135deg,${C.oro},${C.champagne}); color:#0a0a0a; text-decoration:none; font-family:${SANS}; font-size:12px; font-weight:600; letter-spacing:2px; text-transform:uppercase; padding:15px 40px; border-radius:8px;">Ver catálogo</a>
        ${wa ? `<p style="margin:16px 0 0; font-family:${SANS}; font-size:13px;"><a href="https://wa.me/${wa}" style="color:${C.champagne};">¿Dudas? Escríbenos por WhatsApp</a></p>` : ''}
      </td></tr>

      <tr><td style="padding:22px 36px 30px; border-top:1px solid ${C.borde}; text-align:center;">
        <p style="margin:0 0 4px; font-family:${SERIF}; font-size:17px; color:${C.champagne};">Joyería Diana Laura</p>
        <p style="margin:0; font-family:${SANS}; font-size:11px; color:${C.tenue};">Recibes este correo porque eres cliente de Joyería Diana Laura.</p>
      </td></tr>
    </table>
  </div>`;
}

// 3 piezas para cada cliente: de su categoría más comprada; si no tiene
// historial, las destacadas/recientes. Solo con existencia e imagen.
async function productosParaCliente(clienteId: number): Promise<ProductoCorreo[]> {
  const r = await pool.query(
    `WITH fav AS (
       SELECT p.categoria_id, COUNT(*) n
       FROM ventas v JOIN detalle_ventas dv ON dv.venta_id = v.id
       JOIN productos p ON p.id = dv.producto_id
       WHERE v.cliente_id = $1 GROUP BY p.categoria_id ORDER BY n DESC LIMIT 1
     ),
     comprados AS (
       SELECT dv.producto_id FROM ventas v JOIN detalle_ventas dv ON dv.venta_id = v.id WHERE v.cliente_id = $1
     )
     SELECT p.id, p.nombre, p.precio_venta, p.precio_oferta, p.imagen_principal
     FROM productos p
     WHERE p.activo = true AND p.stock_actual > 0
       AND p.imagen_principal IS NOT NULL AND p.imagen_principal <> ''
       AND p.id NOT IN (SELECT producto_id FROM comprados WHERE producto_id IS NOT NULL)
     ORDER BY (p.categoria_id = (SELECT categoria_id FROM fav)) DESC NULLS LAST,
              p.es_destacado DESC, p.es_nuevo DESC, p.fecha_creacion DESC
     LIMIT 3`,
    [clienteId]
  );
  return r.rows;
}

async function enviarEmailBrevo(destinatarioEmail: string, destinatarioNombre: string, asunto: string, html: string) {
  await axios.post(
    BREVO_ENDPOINT,
    {
      sender: { name: REMITENTE_NOMBRE, email: REMITENTE_EMAIL },
      to: [{ email: destinatarioEmail, name: destinatarioNombre }],
      subject: asunto,
      htmlContent: html,
    },
    {
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    }
  );
}

function generarCodigoCupon(segmento: string): string {
  const prefijo = (segmento || 'SEG').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase() || 'SEG';
  const sufijo = Math.random().toString(36).replace(/[^a-z0-9]/g, '').slice(0, 5).toUpperCase();
  return `${prefijo}-${sufijo}`;
}

export const enviarPromocionSegmento = async (req: AuthRequest, res: Response) => {
  try {
    const {
      cliente_ids, segmento, asunto, mensaje,
      aplicar_descuento, tipo_descuento, valor_descuento, dias_vigencia,
    } = req.body;

    if (!Array.isArray(cliente_ids) || cliente_ids.length === 0) {
      return res.status(400).json({ success: false, message: 'cliente_ids debe ser un arreglo no vacío' });
    }
    if (!asunto || !mensaje) {
      return res.status(400).json({ success: false, message: 'asunto y mensaje son obligatorios' });
    }
    if (aplicar_descuento) {
      if (!['porcentaje', 'monto_fijo'].includes(tipo_descuento)) {
        return res.status(400).json({ success: false, message: 'tipo_descuento debe ser "porcentaje" o "monto_fijo"' });
      }
      if (!valor_descuento || Number(valor_descuento) <= 0) {
        return res.status(400).json({ success: false, message: 'valor_descuento debe ser mayor a 0' });
      }
      if (tipo_descuento === 'porcentaje' && Number(valor_descuento) > 90) {
        return res.status(400).json({ success: false, message: 'El descuento en porcentaje no puede ser mayor a 90%' });
      }
    }

    const result = await pool.query(
      `SELECT id, nombre, email FROM clientes WHERE id = ANY($1) AND activo = true`,
      [cliente_ids]
    );
    const clientes = result.rows;

    if (clientes.length === 0) {
      return res.status(404).json({ success: false, message: 'No se encontraron clientes activos con esos IDs' });
    }

    // Si se pidio descuento, se crea UNA promocion restringida a estos clientes
    // (via cupones_clientes) — se aplica automaticamente en su carrito, sin
    // necesidad de que capturen ningun codigo.
    let descuentoInfo: DescuentoCorreo | null = null;
    if (aplicar_descuento) {
      const userId = req.user?.userId || req.user?.id;
      const vigenciaDias = Number(dias_vigencia) > 0 ? Number(dias_vigencia) : 15;
      const codigoCupon = generarCodigoCupon(segmento);

      const promo = await pool.query(
        `INSERT INTO promociones (
           nombre, descripcion, tipo, valor_descuento,
           fecha_inicio, fecha_fin, codigo_cupon, activo, creado_por, actualizado_por
         ) VALUES ($1,$2,$3,$4, NOW(), NOW() + ($5 || ' days')::interval, $6, true, $7, $7)
         RETURNING id`,
        [
          `Campaña segmento: ${segmento || 'general'}`,
          `Descuento automatico generado desde el panel de Segmentos para el segmento "${segmento}".`,
          tipo_descuento,
          Number(valor_descuento),
          vigenciaDias,
          codigoCupon,
          userId || null,
        ]
      );
      const promocionId = promo.rows[0].id;

      for (const cliente of clientes) {
        await pool.query(
          `INSERT INTO cupones_clientes (promocion_id, cliente_id)
           VALUES ($1, $2) ON CONFLICT (promocion_id, cliente_id) DO NOTHING`,
          [promocionId, cliente.id]
        );
      }

      descuentoInfo = { tipo: tipo_descuento, valor: Number(valor_descuento), codigo: codigoCupon, vence: new Date(Date.now() + vigenciaDias * 86400000) };
    }

    const infoWa = await pool.query('SELECT whatsapp FROM informacion_empresa WHERE id = 1').catch(() => ({ rows: [] as any[] }));
    const whatsapp: string | null = infoWa.rows[0]?.whatsapp || null;

    let enviados = 0;
    let fallidos = 0;
    const detalle: { cliente_id: number; email: string; estado: string; error?: string }[] = [];

    for (const cliente of clientes) {
      const nombrePila = (cliente.nombre || '').split(' ')[0];
      const productos = await productosParaCliente(cliente.id).catch(() => []);
      const htmlPersonalizado = construirHtmlPromocion(
        nombrePila, mensaje, segmento || '', descuentoInfo, productos, whatsapp
      );

      let estado = 'enviado';
      let errorMsg: string | undefined;

      try {
        await enviarEmailBrevo(cliente.email, cliente.nombre, asunto, htmlPersonalizado);
        enviados++;
      } catch (err: any) {
        estado = 'fallido';
        errorMsg = err.response?.data?.message || err.message || 'Error desconocido al enviar';
        fallidos++;
      }

      detalle.push({ cliente_id: cliente.id, email: cliente.email, estado, error: errorMsg });

      await pool.query(
        `INSERT INTO notificaciones (cliente_id, destinatario_email, tipo, asunto, mensaje, canal, estado, fecha_envio, mensaje_error)
         VALUES ($1, $2, $3, $4, $5, 'email', $6, NOW(), $7)`,
        [cliente.id, cliente.email, `promocion_segmento_${segmento || 'general'}`, asunto, mensaje, estado, errorMsg || null]
      );
    }

    return res.json({
      success: true,
      total: clientes.length,
      enviados,
      fallidos,
      detalle,
      descuento: descuentoInfo,
    });

  } catch (error: any) {
    console.error('Error enviando promocion por segmento:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error interno al enviar promociones' });
  }
};
