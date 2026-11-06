import { Request, Response } from 'express';
import admin from '../../config/firebase';
import { pool } from '../../config/database';

// DELETE /auth/profile: la clienta elimina su cuenta (derecho ARCO de cancelación; app móvil #273,
// también lo pide Google Play).
//
// No se borra la fila de usuarios ni la de clientes: las ventas, los apartados y la auditoría
// apuntan a ellas y la ley obliga a conservar las ventas. En su lugar se anonimizan (nombre,
// correo, teléfono y foto) y se borra lo que solo sirve a la persona: carrito, favoritos,
// direcciones, teléfonos para avisos, sesiones, preguntas secretas, códigos MFA y solicitudes.
// Al final se borra su cuenta de Firebase, así que ya no puede iniciar sesión.
//
// Si tiene pedidos o apartados en curso no se elimina: primero deben terminar o cancelarse,
// porque la tienda todavía tiene que entregar o cobrar.

const PEDIDOS_EN_CURSO = ['pendiente', 'confirmado', 'en_preparacion', 'enviado'];
const APARTADOS_TERMINADOS = ['cancelado', 'liquidado'];

export const deleteOwnAccount = async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  if (!userId) return res.status(401).json({ success: false, message: 'No autenticado' });

  const client = await pool.connect();
  try {
    const usuario = (await client.query('SELECT id, firebase_uid, rol FROM usuarios WHERE id = $1 AND activo IS NOT FALSE', [userId])).rows[0];
    if (!usuario) return res.status(404).json({ success: false, message: 'La cuenta no existe' });
    if (usuario.rol !== 'cliente') {
      return res.status(403).json({ success: false, message: 'Solo las cuentas de cliente se eliminan desde aquí' });
    }

    const clientes: number[] = (await client.query('SELECT id FROM clientes WHERE user_id = $1', [userId])).rows.map((r: any) => r.id);

    const pendientes = (
      await client.query(
        `SELECT
           (SELECT count(*) FROM ventas WHERE cliente_id = ANY($1) AND estado::text = ANY($2))::int AS pedidos,
           (SELECT count(*) FROM apartados WHERE cliente_id = ANY($1) AND NOT (estado = ANY($3)))::int AS apartados`,
        [clientes, PEDIDOS_EN_CURSO, APARTADOS_TERMINADOS],
      )
    ).rows[0];
    if (pendientes.pedidos > 0 || pendientes.apartados > 0) {
      return res.status(409).json({
        success: false,
        message: 'Tienes pedidos o apartados en curso. Cuando terminen o se cancelen podrás eliminar tu cuenta.',
        pedidos: pendientes.pedidos,
        apartados: pendientes.apartados,
      });
    }

    await client.query('BEGIN');

    // Lo que solo sirve a la persona.
    for (const tabla of [
      'carrito',
      'favoritos',
      'dispositivos_push',
      'comentarios_noticias',
      'oauth_codes',
      'oauth_tokens',
    ]) {
      await client.query(`DELETE FROM ${tabla} WHERE usuario_id = $1`, [userId]);
    }
    for (const tabla of ['security_questions', 'user_sessions', 'login_security', 'mfa_backup_codes']) {
      await client.query(`DELETE FROM ${tabla} WHERE user_id = $1`, [userId]);
    }
    await client.query('DELETE FROM solicitudes_cambio WHERE usuario_id = $1', [userId]);
    for (const tabla of ['direcciones_cliente', 'cupones_clientes', 'historial_promociones', 'solicitudes_personalizacion']) {
      await client.query(`DELETE FROM ${tabla} WHERE cliente_id = ANY($1)`, [clientes]);
    }

    // Lo que se conserva sin datos personales.
    await client.query(`UPDATE resenas_producto SET cliente_nombre = 'Cliente' WHERE usuario_id = $1`, [userId]);
    await client.query('UPDATE notificaciones SET destinatario_email = NULL, destinatario_telefono = NULL WHERE cliente_id = ANY($1)', [clientes]);
    await client.query(
      `UPDATE clientes SET nombre = 'Cliente eliminado', apellido = NULL,
         email = 'eliminado-' || id || '@cuenta-eliminada.invalid', telefono = NULL, celular = NULL,
         fecha_nacimiento = NULL, imagen_perfil = NULL, activo = false, user_id = NULL, fecha_actualizacion = NOW()
       WHERE id = ANY($1)`,
      [clientes],
    );
    await client.query(
      `UPDATE usuarios SET nombre = 'Cuenta eliminada', email = 'eliminado-' || id || '@cuenta-eliminada.invalid',
         firebase_uid = 'eliminado_' || id, password_hash = '!', telefono = NULL, foto_perfil_url = NULL, activo = false,
         mfa_enabled = false, mfa_secret = NULL, mfa_backup_codes = NULL, mfa_setup_token = NULL,
         reset_password_token = NULL, reset_password_expires = NULL, fecha_actualizacion = NOW()
       WHERE id = $1`,
      [userId],
    );

    // Firebase va antes del COMMIT: si no se puede borrar la cuenta de acceso, no se toca la base.
    try {
      await admin.auth().deleteUser(usuario.firebase_uid);
    } catch (e: any) {
      if (e?.code !== 'auth/user-not-found') throw e;
    }

    await client.query('COMMIT');
    console.log(`🗑️ Cuenta eliminada a petición de la clienta (usuario ${userId})`);
    return res.json({ success: true, message: 'Tu cuenta y tus datos personales se eliminaron' });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error al eliminar la cuenta:', error);
    return res.status(500).json({ success: false, message: 'No se pudo eliminar la cuenta. Intenta de nuevo.' });
  } finally {
    client.release();
  }
};
