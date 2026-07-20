// Ruta: Backend/src/controllers/admin/promocionesSegmentoController.ts
import { Response } from 'express';
import axios from 'axios';
import pool from '../../config/database';
import { AuthRequest } from '../../middleware/authMiddleware';

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';
const REMITENTE_EMAIL = process.env.BREVO_SENDER_EMAIL || '';
const REMITENTE_NOMBRE = process.env.BREVO_SENDER_NOMBRE || 'Joyeria Diana Laura';

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
      const htmlPersonalizado = `<p>Hola ${nombrePila},</p><p>${mensaje}</p><p>— Joyería Diana Laura</p>`;

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
