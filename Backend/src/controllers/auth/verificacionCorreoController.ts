// Ruta: Backend/src/controllers/auth/verificacionCorreoController.ts
// Correo de bienvenida + verificación con el diseño de la tienda.
// Firebase genera el enlace de verificación (Admin SDK) y nosotros lo enviamos
// por Brevo con la plantilla común, en lugar del correo simple de Firebase.
import { Request, Response } from 'express';
import axios from 'axios';
import admin from '../../config/firebase';
import { C, SITIO_URL, escapar, layoutCorreo, tarjeta } from '../../utils/plantillaCorreo';

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';
const FUENTE = "'Poppins','Segoe UI',Helvetica,Arial,sans-serif";

const htmlBienvenida = (nombre: string, enlace: string) => {
    const paso = (n: number, titulo: string, texto: string) => `
        <tr>
          <td valign="top" style="padding:8px 14px 8px 0; font-family:${FUENTE}; font-size:22px; font-weight:700; color:${C.rosa}; width:28px;">${n}</td>
          <td style="padding:8px 0; font-family:${FUENTE};">
            <div style="font-size:14.5px; font-weight:700; color:${C.texto};">${titulo}</div>
            <div style="font-size:13.5px; line-height:1.5; color:${C.suave};">${texto}</div>
          </td>
        </tr>`;
    return layoutCorreo({
        preheader: 'Confirma tu correo para empezar a guardar favoritos, apartar y pedir.',
        etiqueta: { texto: 'Cuenta creada', color: C.exito },
        titulo: 'Bienvenida a tu *joyero*',
        nombre,
        mensaje: 'Tu cuenta en Joyería Diana Laura ya existe. Solo falta un paso: confirma que este correo es tuyo para poder iniciar sesión.',
        contenido: tarjeta(`
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              ${paso(1, 'Confirma tu correo', 'Toca el botón de abajo. El enlace es personal y vence en unas horas.')}
              ${paso(2, 'Inicia sesión', 'Entra con tu correo y la contraseña que elegiste.')}
              ${paso(3, 'Elige tu pieza', 'Guarda favoritos, apártala en abonos o pídela a domicilio.')}
            </table>`),
        botonTexto: 'Confirmar mi correo',
        botonUrl: enlace,
        notaPie: `Si el botón no funciona, copia este enlace en tu navegador:<br><a href="${enlace}" style="color:${C.rosa}; word-break:break-all;">${escapar(enlace)}</a><br><br>Si no creaste esta cuenta, ignora este mensaje.`,
    });
};

/**
 * POST /api/auth/enviar-verificacion  { idToken }
 * Solo se envía al correo del propio token y si aún no está verificado.
 */
export const enviarVerificacionCorreo = async (req: Request, res: Response) => {
    try {
        const { idToken } = req.body || {};
        if (!idToken) return res.status(400).json({ success: false, message: 'Falta el token' });

        const decoded = await admin.auth().verifyIdToken(idToken);
        const usuario = await admin.auth().getUser(decoded.uid);
        if (!usuario.email) return res.status(400).json({ success: false, message: 'La cuenta no tiene correo' });
        if (usuario.emailVerified) return res.json({ success: true, yaVerificado: true });

        if (!process.env.BREVO_API_KEY || !process.env.BREVO_SENDER_EMAIL) {
            return res.status(503).json({ success: false, message: 'Correo no configurado' });
        }

        const enlace = await admin.auth().generateEmailVerificationLink(usuario.email, {
            url: `${SITIO_URL}/login?verified=true&email=${encodeURIComponent(usuario.email)}`,
            handleCodeInApp: false,
        });

        const nombre = (usuario.displayName || '').split(' ')[0] || '';
        await axios.post(BREVO_ENDPOINT, {
            sender: { name: process.env.BREVO_SENDER_NOMBRE || 'Joyeria Diana Laura', email: process.env.BREVO_SENDER_EMAIL },
            to: [{ email: usuario.email, name: usuario.displayName || '' }],
            subject: 'Confirma tu correo · Joyería Diana Laura',
            htmlContent: htmlBienvenida(nombre, enlace),
        }, {
            headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
        });

        return res.json({ success: true });
    } catch (err: any) {
        console.error('⚠️ Error enviando verificación personalizada:', err.response?.data || err.message);
        return res.status(500).json({ success: false, message: 'No se pudo enviar el correo' });
    }
};
