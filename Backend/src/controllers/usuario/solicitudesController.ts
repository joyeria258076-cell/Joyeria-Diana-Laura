import { Request, Response } from 'express';
import { pool } from '../../config/database';
import jwt from 'jsonwebtoken';
import { JWTConfig } from '../../config/jwtConfig';

// Trabajador crea una solicitud de cambio
export const crearSolicitud = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) { res.status(401).json({ success: false, message: 'No autenticado' }); return; }

    const { campo, valor_nuevo } = req.body;
    if (!campo || !valor_nuevo?.trim()) {
      res.status(400).json({ success: false, message: 'Campo y valor son obligatorios' }); return;
    }

    const camposPermitidos = ['nombre', 'recuperar_codigo'];
    if (!camposPermitidos.includes(campo)) {
      res.status(400).json({ success: false, message: 'Campo no permitido' }); return;
    }

    // Verificar que no tenga ya una solicitud pendiente del mismo campo
    const existe = await pool.query(
      `SELECT id FROM solicitudes_cambio WHERE usuario_id = $1 AND campo = $2 AND estado = 'pendiente'`,
      [userId, campo]
    );
    if (existe.rows.length > 0) {
      res.status(409).json({ success: false, message: 'Ya tienes una solicitud pendiente para este campo' }); return;
    }

    const result = await pool.query(
      `INSERT INTO solicitudes_cambio (usuario_id, campo, valor_nuevo) VALUES ($1, $2, $3) RETURNING *`,
      [userId, campo, valor_nuevo.trim()]
    );
    res.status(201).json({ success: true, data: result.rows[0], message: 'Solicitud enviada correctamente' });
  } catch (error) {
    console.error('Error en crearSolicitud:', error);
    res.status(500).json({ success: false, message: 'Error al crear solicitud' });
  }
};

// Trabajador consulta sus propias solicitudes
export const getMisSolicitudes = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) { res.status(401).json({ success: false, message: 'No autenticado' }); return; }

    const result = await pool.query(
      `SELECT * FROM solicitudes_cambio WHERE usuario_id = $1 ORDER BY creado_en DESC`,
      [userId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error en getMisSolicitudes:', error);
    res.status(500).json({ success: false, message: 'Error al obtener solicitudes' });
  }
};

// Admin obtiene todas las solicitudes pendientes
export const getSolicitudesPendientes = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(`
      SELECT sc.*, u.nombre AS nombre_actual, u.email
      FROM solicitudes_cambio sc
      JOIN usuarios u ON u.id = sc.usuario_id
      ORDER BY sc.creado_en DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error en getSolicitudesPendientes:', error);
    res.status(500).json({ success: false, message: 'Error al obtener solicitudes' });
  }
};

// Admin aprueba una solicitud
export const aprobarSolicitud = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = (req as any).user?.userId;
    const { id } = req.params;

    const sol = await pool.query(`SELECT * FROM solicitudes_cambio WHERE id = $1`, [id]);
    if (sol.rows.length === 0) { res.status(404).json({ success: false, message: 'Solicitud no encontrada' }); return; }

    const s = sol.rows[0];
    if (s.estado !== 'pendiente') { res.status(409).json({ success: false, message: 'La solicitud ya fue procesada' }); return; }

    // Aplicar el cambio según el tipo de campo
    if (s.campo === 'recuperar_codigo') {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let nuevoCodigo = '';
      for (let i = 0; i < 6; i++) nuevoCodigo += chars[Math.floor(Math.random() * chars.length)];
      await pool.query(`UPDATE usuarios SET codigo_trabajador = $1 WHERE id = $2`, [nuevoCodigo, s.usuario_id]);
      await pool.query(
        `UPDATE solicitudes_cambio SET estado = 'aprobada', revisado_en = NOW(), revisado_por = $1, valor_nuevo = $2 WHERE id = $3`,
        [adminId, nuevoCodigo, id]
      );
      res.json({ success: true, message: 'Código regenerado y solicitud aprobada', data: { codigoNuevo: nuevoCodigo } });
    } else {
      await pool.query(`UPDATE usuarios SET ${s.campo} = $1 WHERE id = $2`, [s.valor_nuevo, s.usuario_id]);
      await pool.query(
        `UPDATE solicitudes_cambio SET estado = 'aprobada', revisado_en = NOW(), revisado_por = $1 WHERE id = $2`,
        [adminId, id]
      );
      res.json({ success: true, message: 'Solicitud aprobada y cambio aplicado' });
    }
  } catch (error) {
    console.error('Error en aprobarSolicitud:', error);
    res.status(500).json({ success: false, message: 'Error al aprobar solicitud' });
  }
};

// Eliminar solicitud (trabajador solo las suyas procesadas; admin cualquiera)
export const eliminarSolicitud = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const userRol = (req as any).user?.rol || '';
    const { id } = req.params;

    const sol = await pool.query(`SELECT * FROM solicitudes_cambio WHERE id = $1`, [id]);
    if (sol.rows.length === 0) { res.status(404).json({ success: false, message: 'Solicitud no encontrada' }); return; }

    const s = sol.rows[0];

    // Trabajador solo puede eliminar sus propias solicitudes ya procesadas
    if (userRol !== 'admin') {
      if (String(s.usuario_id) !== String(userId)) {
        res.status(403).json({ success: false, message: 'Sin permiso' }); return;
      }
      if (s.estado === 'pendiente') {
        res.status(400).json({ success: false, message: 'No puedes eliminar una solicitud pendiente' }); return;
      }
    }

    await pool.query(`DELETE FROM solicitudes_cambio WHERE id = $1`, [id]);
    res.json({ success: true, message: 'Solicitud eliminada' });
  } catch (error) {
    console.error('Error en eliminarSolicitud:', error);
    res.status(500).json({ success: false, message: 'Error al eliminar solicitud' });
  }
};

// Admin rechaza una solicitud
export const rechazarSolicitud = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = (req as any).user?.userId;
    const { id } = req.params;

    const sol = await pool.query(`SELECT * FROM solicitudes_cambio WHERE id = $1`, [id]);
    if (sol.rows.length === 0) { res.status(404).json({ success: false, message: 'Solicitud no encontrada' }); return; }
    if (sol.rows[0].estado !== 'pendiente') { res.status(409).json({ success: false, message: 'La solicitud ya fue procesada' }); return; }

    await pool.query(
      `UPDATE solicitudes_cambio SET estado = 'rechazada', revisado_en = NOW(), revisado_por = $1 WHERE id = $2`,
      [adminId, id]
    );

    res.json({ success: true, message: 'Solicitud rechazada' });
  } catch (error) {
    console.error('Error en rechazarSolicitud:', error);
    res.status(500).json({ success: false, message: 'Error al rechazar solicitud' });
  }
};

// Solicitud de recuperación de código SIN sesión completa (usa preAuthToken)
export const solicitarRecuperacionSinSesion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { preAuthToken } = req.body;
    if (!preAuthToken) { res.status(400).json({ success: false, message: 'Token requerido' }); return; }

    let payload: any;
    try {
      payload = jwt.verify(preAuthToken, JWTConfig.getSecret(), {
        issuer: 'joyeria-diana-laura-backend',
        audience: 'joyeria-diana-laura-frontend',
      });
    } catch {
      res.status(401).json({ success: false, message: 'Token expirado. Inicia sesión de nuevo.' }); return;
    }

    if (payload.tipo !== 'pre_auth' || payload.etapa !== 'codigo') {
      res.status(400).json({ success: false, message: 'Token inválido para esta operación' }); return;
    }

    const userId = payload.userId;

    // Verificar que no tenga ya una solicitud pendiente
    const existe = await pool.query(
      `SELECT id FROM solicitudes_cambio WHERE usuario_id = $1 AND campo = 'recuperar_codigo' AND estado = 'pendiente'`,
      [userId]
    );
    if (existe.rows.length > 0) {
      res.status(409).json({ success: false, message: 'Ya tienes una solicitud de recuperación pendiente. Espera a que el administrador la procese.' }); return;
    }

    await pool.query(
      `INSERT INTO solicitudes_cambio (usuario_id, campo, valor_nuevo) VALUES ($1, 'recuperar_codigo', 'solicitud_recuperacion')`,
      [userId]
    );

    res.json({ success: true, message: 'Solicitud enviada al administrador. Contacta a tu administrador para que apruebe la recuperación.' });
  } catch (error) {
    console.error('Error en solicitarRecuperacionSinSesion:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};
