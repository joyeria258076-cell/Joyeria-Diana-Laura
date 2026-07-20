// Ruta: Backend/src/controllers/admin/promocionesSegmentoController.ts
import { Response } from 'express';
import axios from 'axios';
import pool from '../../config/database';
import { AuthRequest } from '../../middleware/authMiddleware';

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';
const REMITENTE_EMAIL = process.env.BREVO_SENDER_EMAIL || '';
const REMITENTE_NOMBRE = process.env.BREVO_SENDER_NOMBRE || 'Joyeria Diana Laura';

const SEGMENTO_META: Record<string, { color: string; colorClaro: string; icono: string; titulo: string }> = {
  'Cliente Frecuente de Alto Gasto': { color: '#d4607e', colorClaro: '#f4c2d1', icono: '👑', titulo: 'Cliente VIP' },
  'Cliente Ocasional': { color: '#ecb2c3', colorClaro: '#f9dde4', icono: '✨', titulo: 'Te extrañamos' },
  'Cliente Apartador': { color: '#c65a7a', colorClaro: '#ecb2c3', icono: '💎', titulo: 'Tu apartado' },
};

function construirHtmlPromocion(nombrePila: string, mensaje: string, segmento: string): string {
  const meta = SEGMENTO_META[segmento] || { color: '#d4607e', colorClaro: '#ecb2c3', icono: '💍', titulo: 'Oferta especial' };

  return `
  <div style="background:#050505; padding:40px 16px; font-family:Georgia,'Times New Roman',serif;">
    <table role="presentation" width="100%" style="max-width:540px; margin:0 auto; background:linear-gradient(160deg,#141014 0%,#0a0708 60%,#050405 100%); border-radius:20px; overflow:hidden; border:1px solid ${meta.color}35; box-shadow:0 20px 50px rgba(0,0,0,0.6);">

      <tr>
        <td style="height:5px; background:linear-gradient(90deg,#c9a84c,${meta.color},${meta.colorClaro},${meta.color},#c9a84c);"></td>
      </tr>

      <!-- Banner superior -->
      <tr>
        <td style="padding:44px 32px 26px; text-align:center; background:radial-gradient(circle at 50% 0%, ${meta.color}1a 0%, transparent 65%);">
          <p style="margin:0 0 8px; font-size:11px; letter-spacing:5px; text-transform:uppercase; color:${meta.colorClaro}; font-weight:400; font-family:Georgia,serif;">Joyería</p>
          <h1 style="margin:0 0 20px; font-family:'Playfair Display',Georgia,serif; font-weight:700; font-style:italic; font-size:34px; color:#ffffff; letter-spacing:0.5px;">Diana Laura</h1>
          <div style="display:inline-block; background:${meta.color}1f; border:1px solid ${meta.color}70; border-radius:50px; padding:9px 22px;">
            <span style="font-size:14px; vertical-align:middle;">${meta.icono}</span>
            <span style="font-size:11px; letter-spacing:2px; text-transform:uppercase; color:${meta.colorClaro}; font-weight:600; vertical-align:middle; margin-left:8px; font-family:'Segoe UI',Arial,sans-serif;">${meta.titulo}</span>
          </div>
        </td>
      </tr>

      <!-- Cuerpo -->
      <tr>
        <td style="padding:8px 36px 8px;">
          <p style="margin:0 0 6px; font-size:22px; color:#ffffff; font-family:'Playfair Display',Georgia,serif; font-style:italic;">Hola, ${nombrePila}</p>
          <p style="margin:0 0 24px; font-size:12px; letter-spacing:1px; color:rgba(255,255,255,0.4); font-family:'Segoe UI',Arial,sans-serif; text-transform:uppercase;">Tenemos algo especial para ti</p>

          <table role="presentation" width="100%" style="background:linear-gradient(135deg,${meta.color}14 0%, rgba(255,255,255,0.015) 100%); border:1px solid ${meta.color}45; border-radius:14px; margin:0 0 28px;">
            <tr>
              <td style="padding:26px 26px;">
                <p style="margin:0; font-size:16px; line-height:1.7; color:#f0dede; font-family:'Segoe UI',Arial,sans-serif;">${mensaje}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- CTA -->
      <tr>
        <td style="padding:0 36px 40px; text-align:center;">
          <a href="https://joyeria-diana-laura.vercel.app/catalogo" style="display:inline-block; background:linear-gradient(135deg,${meta.color} 0%,${meta.colorClaro} 100%); color:#1a0a10; text-decoration:none; font-weight:700; font-size:13px; letter-spacing:1.5px; padding:16px 42px; border-radius:50px; box-shadow:0 8px 24px ${meta.color}45; font-family:'Segoe UI',Arial,sans-serif; text-transform:uppercase;">Ver Catálogo</a>
          <p style="margin:18px 0 0; font-size:12px; color:rgba(255,255,255,0.3); font-family:'Segoe UI',Arial,sans-serif;">o contáctanos directamente por WhatsApp</p>
        </td>
      </tr>

      <!-- Divisor decorativo -->
      <tr>
        <td style="padding:0 36px;">
          <div style="height:1px; background:linear-gradient(90deg,transparent,${meta.color}45,transparent);"></div>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding:24px 36px 34px; text-align:center;">
          <p style="margin:0 0 5px; font-size:15px; color:${meta.colorClaro}; font-weight:700; font-style:italic; font-family:'Playfair Display',Georgia,serif;">Joyería Diana Laura</p>
          <p style="margin:0; font-size:11px; letter-spacing:0.5px; color:rgba(255,255,255,0.3); font-family:'Segoe UI',Arial,sans-serif;">Elegancia que brilla contigo</p>
        </td>
      </tr>
    </table>
  </div>`;
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

export const enviarPromocionSegmento = async (req: AuthRequest, res: Response) => {
  try {
    const { cliente_ids, segmento, asunto, mensaje } = req.body;

    if (!Array.isArray(cliente_ids) || cliente_ids.length === 0) {
      return res.status(400).json({ success: false, message: 'cliente_ids debe ser un arreglo no vacío' });
    }
    if (!asunto || !mensaje) {
      return res.status(400).json({ success: false, message: 'asunto y mensaje son obligatorios' });
    }

    const result = await pool.query(
      `SELECT id, nombre, email FROM clientes WHERE id = ANY($1) AND activo = true`,
      [cliente_ids]
    );
    const clientes = result.rows;

    if (clientes.length === 0) {
      return res.status(404).json({ success: false, message: 'No se encontraron clientes activos con esos IDs' });
    }

    let enviados = 0;
    let fallidos = 0;
    const detalle: { cliente_id: number; email: string; estado: string; error?: string }[] = [];

    for (const cliente of clientes) {
      const nombrePila = (cliente.nombre || '').split(' ')[0];
      const htmlPersonalizado = construirHtmlPromocion(nombrePila, mensaje, segmento || '');

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
    });

  } catch (error: any) {
    console.error('Error enviando promocion por segmento:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error interno al enviar promociones' });
  }
};
