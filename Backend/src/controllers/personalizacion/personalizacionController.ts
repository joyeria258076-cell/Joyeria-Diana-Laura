// Ruta: Backend/src/controllers/personalizacion/personalizacionController.ts
import { Response } from 'express';
import axios from 'axios';
import { C, SITIO_URL, escapar, tarjeta, layoutCorreo } from '../../utils/plantillaCorreo';
import { PersonalizacionModel } from '../../models/personalizacionModel';
import { VentaModel } from '../../models/carritoModel';
import pool from '../../config/database';
import { AuthRequest } from '../../middleware/authMiddleware';

const BREVO_API = 'https://api.brevo.com/v3/smtp/email';
const REMITENTE_EMAIL = process.env.BREVO_SENDER_EMAIL || '';
const REMITENTE_NOMBRE = process.env.BREVO_SENDER_NOMBRE || 'Joyeria Diana Laura';

function construirHtmlRespuesta(nombrePila: string, aprobada: boolean, productoNombre: string, motivo?: string): string {
  const color = aprobada ? C.exito : C.error;
  const contenido = tarjeta(`
      <p style="margin:0 0 4px; font-family:'Poppins','Segoe UI',Arial,sans-serif; font-size:12px; font-weight:600; color:${C.suave};">Pieza</p>
      <p style="margin:0; font-family:'Poppins','Segoe UI',Arial,sans-serif; font-size:16px; font-weight:700; color:${C.texto};">${escapar(productoNombre)}</p>
      ${!aprobada && motivo ? `
      <p style="margin:14px 0 4px; font-family:'Poppins','Segoe UI',Arial,sans-serif; font-size:12px; font-weight:600; color:${C.suave};">Motivo</p>
      <p style="margin:0; font-family:'Poppins','Segoe UI',Arial,sans-serif; font-size:14px; line-height:1.55; color:${C.texto};">${escapar(motivo)}</p>` : ''}`,
    { acento: color });

  return layoutCorreo({
    preheader: aprobada ? `Aprobamos tu personalización de ${productoNombre}.` : `Revisamos tu solicitud de personalización de ${productoNombre}.`,
    etiqueta: { texto: aprobada ? 'Aprobada' : 'No aprobada', color },
    titulo: aprobada ? 'Tu personalización fue *aprobada*' : 'Sobre tu *personalización*',
    nombre: nombrePila,
    mensaje: aprobada
      ? 'Revisamos el detalle y la imagen de referencia que enviaste. Todo está listo: ya puedes continuar con tu compra.'
      : 'Revisamos tu solicitud y esta vez no pudimos aprobarla. Puedes enviar una nueva con los ajustes necesarios.',
    contenido,
    botonTexto: aprobada ? 'Continuar con mi compra' : 'Ver mis solicitudes',
    botonUrl: `${SITIO_URL}/mis-personalizaciones`,
  });
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
    if (!detalle || typeof detalle !== 'string' || detalle.trim().length < 10)
      return res.status(400).json({ success: false, message: 'Describe la personalización con al menos 10 caracteres' });
    if (detalle.trim().length > 1000)
      return res.status(400).json({ success: false, message: 'El detalle no puede pasar de 1000 caracteres' });

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
