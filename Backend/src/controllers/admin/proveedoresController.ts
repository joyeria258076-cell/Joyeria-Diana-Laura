// Backend/src/controllers/admin/proveedoresController.ts
import { Request, Response } from 'express';
import pool from '../../config/database';
import { AuthRequest } from '../../middleware/authMiddleware';

export const proveedoresController = {
  // Obtener todos los proveedores
  async getAll(req: AuthRequest, res: Response) {
    try {
      const result = await pool.query(
        'SELECT * FROM proveedores ORDER BY nombre ASC'
      );
      
      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Error getting proveedores:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener los proveedores'
      });
    }
  },

  // Obtener proveedor por ID
  async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const result = await pool.query(
        'SELECT * FROM proveedores WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Proveedor no encontrado'
        });
      }
      
      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error getting proveedor by id:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener el proveedor'
      });
    }
  },

  // Crear nuevo proveedor
  async create(req: AuthRequest, res: Response) {
    const client = await pool.connect();
    
    try {
      const {
        nombre,
        razon_social,
        rfc,
        direccion,
        telefono,
        email,
        sitio_web,
        persona_contacto,
        notas,
        activo
      } = req.body;

      const userId = req.user?.userId;

      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO proveedores (
          nombre, razon_social, rfc, direccion, telefono, email, 
          sitio_web, persona_contacto, notas, activo, creado_por
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          nombre,
          razon_social || null,
          rfc || null,
          direccion || null,
          telefono || null,
          email || null,
          sitio_web || null,
          persona_contacto || null,
          notas || null,
          activo !== undefined ? activo : true,
          userId
        ]
      );

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        message: 'Proveedor creado exitosamente',
        data: result.rows[0]
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating proveedor:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear el proveedor'
      });
    } finally {
      client.release();
    }
  },

  // Actualizar proveedor
  async update(req: AuthRequest, res: Response) {
    const client = await pool.connect();
    
    try {
      const { id } = req.params;
      const {
        nombre,
        razon_social,
        rfc,
        direccion,
        telefono,
        email,
        sitio_web,
        persona_contacto,
        notas,
        activo
      } = req.body;

      const userId = req.user?.userId;

      // Verificar que existe
      const checkResult = await client.query(
        'SELECT id FROM proveedores WHERE id = $1',
        [id]
      );

      if (checkResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Proveedor no encontrado'
        });
      }

      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE proveedores SET
          nombre = $1,
          razon_social = $2,
          rfc = $3,
          direccion = $4,
          telefono = $5,
          email = $6,
          sitio_web = $7,
          persona_contacto = $8,
          notas = $9,
          activo = $10,
          actualizado_por = $11,
          fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE id = $12
        RETURNING *`,
        [
          nombre,
          razon_social || null,
          rfc || null,
          direccion || null,
          telefono || null,
          email || null,
          sitio_web || null,
          persona_contacto || null,
          notas || null,
          activo,
          userId,
          id
        ]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Proveedor actualizado exitosamente',
        data: result.rows[0]
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating proveedor:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar el proveedor'
      });
    } finally {
      client.release();
    }
  },

  // Eliminar proveedor
  async delete(req: AuthRequest, res: Response) {
    const client = await pool.connect();
    
    try {
      const { id } = req.params;

      // Verificar si tiene productos asociados
      const productCheck = await client.query(
        'SELECT COUNT(*) as count FROM productos WHERE proveedor_id = $1',
        [id]
      );

      if (Number.parseInt(productCheck.rows[0].count) > 0) {
        return res.status(400).json({
          success: false,
          message: 'No se puede eliminar el proveedor porque tiene productos asociados'
        });
      }

      // Verificar si tiene compras asociadas
      const comprasCheck = await client.query(
        'SELECT COUNT(*) as count FROM compras WHERE proveedor_id = $1',
        [id]
      );

      if (Number.parseInt(comprasCheck.rows[0].count) > 0) {
        return res.status(400).json({
          success: false,
          message: 'No se puede eliminar el proveedor porque tiene compras asociadas'
        });
      }

      await client.query('BEGIN');

      const result = await client.query(
        'DELETE FROM proveedores WHERE id = $1 RETURNING id',
        [id]
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Proveedor no encontrado'
        });
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Proveedor eliminado exitosamente'
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error deleting proveedor:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar el proveedor'
      });
    } finally {
      client.release();
    }
  },

  // Cambiar estado (activar/desactivar)
  async toggleStatus(req: AuthRequest, res: Response) {
    const client = await pool.connect();
    
    try {
      const { id } = req.params;
      const { activo } = req.body;
      const userId = req.user?.userId;

      const result = await client.query(
        `UPDATE proveedores 
         SET activo = $1, actualizado_por = $2, fecha_actualizacion = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING id, nombre, activo`,
        [activo, userId, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Proveedor no encontrado'
        });
      }

      res.json({
        success: true,
        message: `Proveedor ${activo ? 'activado' : 'desactivado'} exitosamente`,
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error toggling proveedor status:', error);
      res.status(500).json({
        success: false,
        message: 'Error al cambiar el estado del proveedor'
      });
    } finally {
      client.release();
    }
  }
};