// Notificaciones push de la app móvil (HU-15, app #54) con Firebase Cloud Messaging.
// Usa la misma cuenta de servicio de Firebase Admin que ya valida el inicio de sesión de la app.
import admin from '../config/firebase';
import { pool } from '../config/database';

export interface NotificacionPush {
    titulo: string;
    cuerpo: string;
    // Datos que la app lee al tocar la notificación (por ejemplo, qué pedido abrir).
    datos?: Record<string, string>;
}

// Errores con los que Firebase indica que el token ya no sirve (app desinstalada o token cambiado).
const TOKEN_INVALIDO = new Set([
    'messaging/registration-token-not-registered',
    'messaging/invalid-registration-token',
    'messaging/invalid-argument',
]);

export const PLATAFORMAS = ['android', 'ios'] as const;

// Guarda el token del teléfono para la cuenta. Si el token ya era de otra cuenta (otra persona
// inició sesión en ese teléfono), pasa a la cuenta actual.
export const registrarDispositivo = async (usuarioId: number, token: string, plataforma: string): Promise<void> => {
    await pool.query(
        `INSERT INTO dispositivos_push (usuario_id, token, plataforma)
         VALUES ($1, $2, $3)
         ON CONFLICT (token) DO UPDATE
           SET usuario_id = EXCLUDED.usuario_id, plataforma = EXCLUDED.plataforma, fecha_actualizacion = CURRENT_TIMESTAMP`,
        [usuarioId, token, plataforma],
    );
};

// Al cerrar sesión el teléfono deja de recibir avisos de esa cuenta.
export const quitarDispositivo = async (usuarioId: number, token: string): Promise<boolean> => {
    const r = await pool.query(`DELETE FROM dispositivos_push WHERE usuario_id = $1 AND token = $2`, [usuarioId, token]);
    return (r.rowCount ?? 0) > 0;
};

// Envía a todos los teléfonos de la cuenta. Nunca lanza error: un aviso que no llega no debe
// detener el cambio de estado del pedido. Devuelve cuántos teléfonos lo recibieron.
export const enviarAUsuario = async (usuarioId: number, notificacion: NotificacionPush): Promise<number> => {
    try {
        const { rows } = await pool.query(`SELECT token FROM dispositivos_push WHERE usuario_id = $1`, [usuarioId]);
        const tokens: string[] = rows.map((r: any) => r.token);
        if (tokens.length === 0) return 0;

        const respuesta = await admin.messaging().sendEachForMulticast({
            tokens,
            notification: { title: notificacion.titulo, body: notificacion.cuerpo },
            data: notificacion.datos,
            android: { priority: 'high', notification: { channelId: 'pedidos' } },
        });

        const vencidos = respuesta.responses
            .map((r, i) => (!r.success && TOKEN_INVALIDO.has(r.error?.code ?? '') ? tokens[i] : null))
            .filter((t): t is string => t !== null);
        if (vencidos.length > 0) await pool.query(`DELETE FROM dispositivos_push WHERE token = ANY($1)`, [vencidos]);

        return respuesta.successCount;
    } catch (err: any) {
        console.error('⚠️ Error enviando notificación push:', err.message);
        return 0;
    }
};

// Avisa al dueño del pedido. Los pedidos se ligan al cliente y el cliente a su cuenta (clientes.user_id).
export const enviarPorCliente = async (clienteId: number, notificacion: NotificacionPush): Promise<number> => {
    try {
        const { rows } = await pool.query(`SELECT user_id FROM clientes WHERE id = $1`, [clienteId]);
        const usuarioId = rows[0]?.user_id;
        return usuarioId ? await enviarAUsuario(Number(usuarioId), notificacion) : 0;
    } catch (err: any) {
        console.error('⚠️ Error buscando la cuenta del cliente para la notificación push:', err.message);
        return 0;
    }
};
