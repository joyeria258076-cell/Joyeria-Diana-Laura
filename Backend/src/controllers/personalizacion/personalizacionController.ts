// Ruta: Backend/src/controllers/personalizacion/personalizacionController.ts
import { Response } from 'express';
import axios from 'axios';
import { PersonalizacionModel } from '../../models/personalizacionModel';
import { VentaModel } from '../../models/carritoModel';
import pool from '../../config/database';
import { AuthRequest } from '../../middleware/authMiddleware';

const BREVO_API = 'https://api.brevo.com/v3/smtp/email';
const REMITENTE_EMAIL = process.env.BREVO_SENDER_EMAIL || '';
const REMITENTE_NOMBRE = process.env.BREVO_SENDER_NOMBRE || 'Joyeria Diana Laura';

function construirHtmlRespuesta(nombrePila: string, aprobada: boolean, productoNombre: string, motivo?: string): string {
  const color = aprobada ? '#4a8c7a' : '#c65a7a';
  const titulo = aprobada ? '¡Tu personalización fue aprobada!' : 'Sobre tu solicitud de personalización';
  const cuerpo = aprobada
    ? `Ya revisamos el detalle y la imagen de referencia que enviaste para <strong>${productoNombre}</strong>. Todo listo — ya puedes continuar con tu compra desde la sección "Mis solicitudes de personalización".`
    : `Revisamos tu solicitud para <strong>${productoNombre}</strong> y no pudimos aprobarla en esta ocasión.${motivo ? ` Motivo: ${motivo}` : ''} Puedes enviar una nueva solicitud con los ajustes necesarios.`;

  return `
  <div style="background:#050505; padding:40px 16px; font-family:Georgia,'Times New Roman',serif;">
    <table role="presentation" width="100%" style="max-width:540px; margin:0 auto; background:linear-gradient(160deg,#141014 0%,#0a0708 60%,#050405 100%); border-radius:20px; overflow:hidden; border:1px solid ${color}35;">
      <tr><td style="height:5px; background:${color};"></td></tr>
      <tr>
        <td style="padding:36px 32px 8px;">
          <p style="margin:0 0 6px; font-size:22px; color:#ffffff; font-family:'Playfair Display',Georgia,serif; font-style:italic;">Hola, ${nombrePila}</p>
          <h2 style="margin:0 0 18px; font-size:18px; color:${color};">${titulo}</h2>
          <p style="margin:0 0 24px; font-size:15px; line-height:1.7; color:#f0dede; font-family:'Segoe UI',Arial,sans-serif;">${cuerpo}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:0 32px 36px; text-align:center;">
          <a href="https://joyeria-diana-laura.vercel.app/mis-personalizaciones" style="display:inline-block; background:${color}; color:#050405; text-decoration:none; font-weight:700; font-size:12.5px; letter-spacing:1.5px; padding:15px 40px; border-radius:50px; font-family:'Segoe UI',Arial,sans-serif; text-transform:uppercase;">Ver mis solicitudes</a>
        </td>
      </tr>
    </table>
  </div>`;
}

async function enviarEmailRespuesta(email: string, nombre: string, aprobada: boolean, productoNombre: string, motivo?: string) {
  try {
    await axios.post(BREVO_API, {
      sender: { name: REMITENTE_NOMBRE, email: REMITENTE_EMAIL },
      to: [{ email, name: nombre }],
      subject: aprobada ? 'Tu personalización fue aprobada' : 'Sobre tu solicitud de personalización',
      htmlContent: construirHtmlRespuesta((nombre || '').split(' ')[0], aprobada, productoNombre, motivo),
    }, {
      headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json', 'Accept': 'application/json' },
    });
  } catch (err) {
    console.log('⚠️ Error enviando correo de personalización (no crítico):', err);
  }
}

export const crearSolicitud = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const email = req.user?.email;
    const nombre = req.user?.nombre || '';
    if (!userId) return res.status(401).json({ success: false, message: 'No autenticado' });

    const { producto_id, detalle, imagen_referencia_url } = req.body;
    if (!producto_id) return res.status(400).json({ success: false, message: 'producto_id requerido' });
    if (!detalle || !detalle.trim()) return res.status(400).json({ success: false, message: 'El detalle es obligatorio' });

    const prod = await pool.query(`SELECT id, permite_personalizacion, activo FROM productos WHERE id = $1`, [producto_id]);
    if (!prod.rows.length || !prod.rows[0].activo)
      return res.status(404).json({ success: false, message: 'Producto no disponible' });
    if (!prod.rows[0].permite_personalizacion)
      return res.status(400).json({ success: false, message: 'Este producto no admite personalización' });

    const cliente_id = await VentaModel.getOrCreateCliente(userId, email, nombre);

    const solicitud = await PersonalizacionModel.crear(cliente_id, producto_id, detalle.trim(), imagen_referencia_url || null);

    const config = await pool.query(`SELECT valor FROM configuracion WHERE clave = 'dias_verificacion_personalizacion'`);
    const dias = config.rows.length ? parseInt(config.rows[0].valor) : 3;

    res.status(201).json({ success: true, data: solicitud, dias_estimados: dias });
  } catch (error: any) {
    console.error('Error creando solicitud de personalizacion:', error);
    res.status(500).json({ success: false, message: error.message || 'Error interno' });
  }
};

export const getMisSolicitudes = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const email = req.user?.email;
    const nombre = req.user?.nombre || '';
    if (!userId) return res.status(401).json({ success: false, message: 'No autenticado' });

    const cliente_id = await VentaModel.getOrCreateCliente(userId, email, nombre);
    const solicitudes = await PersonalizacionModel.getMisSolicitudes(cliente_id);
    res.json({ success: true, data: solicitudes });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error interno' });
  }
};

export const getSolicitudes = async (req: AuthRequest, res: Response) => {
  try {
    const { estado } = req.query;
    const solicitudes = await PersonalizacionModel.getPendientes(estado as string | undefined);
    res.json({ success: true, data: solicitudes });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error interno' });
  }
};

export const aprobarSolicitud = async (req: AuthRequest, res: Response) => {
  try {
    const trabajadorId = req.user?.userId || req.user?.id;
    const { id } = req.params;

    const actual = await PersonalizacionModel.getById(Number.parseInt(id));
    if (!actual) return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
    if (actual.estado !== 'pendiente')
      return res.status(400).json({ success: false, message: 'Esta solicitud ya fue respondida' });

    const solicitud = await PersonalizacionModel.aprobar(Number.parseInt(id), trabajadorId);
    await enviarEmailRespuesta(actual.cliente_email, actual.cliente_nombre, true, actual.producto_nombre);

    res.json({ success: true, data: solicitud });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error interno' });
  }
};

export const rechazarSolicitud = async (req: AuthRequest, res: Response) => {
  try {
    const trabajadorId = req.user?.userId || req.user?.id;
    const { id } = req.params;
    const { motivo } = req.body;
    if (!motivo || !motivo.trim())
      return res.status(400).json({ success: false, message: 'El motivo de rechazo es obligatorio' });

    const actual = await PersonalizacionModel.getById(Number.parseInt(id));
    if (!actual) return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
    if (actual.estado !== 'pendiente')
      return res.status(400).json({ success: false, message: 'Esta solicitud ya fue respondida' });

    const solicitud = await PersonalizacionModel.rechazar(Number.parseInt(id), trabajadorId, motivo.trim());
    await enviarEmailRespuesta(actual.cliente_email, actual.cliente_nombre, false, actual.producto_nombre, motivo.trim());

    res.json({ success: true, data: solicitud });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error interno' });
  }
};
