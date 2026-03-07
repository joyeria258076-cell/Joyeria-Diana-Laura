// Backend/src/controllers/admin/configuracionController.ts
import { Request, Response } from 'express';
import pool from '../../config/database';
import { AuthRequest } from '../../middleware/authMiddleware';

export const configuracionController = {
  // Obtener todas las configuraciones
  async getAll(req: AuthRequest, res: Response) {
    try {
      const result = await pool.query(
        'SELECT * FROM configuracion ORDER BY categoria, clave'
      );
      
      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Error getting config:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener la configuración'
      });
    }
  },

  // Obtener configuración por categoría
  async getByCategoria(req: AuthRequest, res: Response) {
    try {
      const { categoria } = req.params;
      const result = await pool.query(
        'SELECT * FROM configuracion WHERE categoria = $1 ORDER BY clave',
        [categoria]
      );
      
      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Error getting config by categoria:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener la configuración'
      });
    }
  },

  // Obtener configuración por clave
  async getByClave(req: AuthRequest, res: Response) {
    try {
      const { clave } = req.params;
      const result = await pool.query(
        'SELECT * FROM configuracion WHERE clave = $1',
        [clave]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Configuración no encontrada'
        });
      }
      
      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error getting config by clave:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener la configuración'
      });
    }
  },

  // Actualizar configuración
  async update(req: AuthRequest, res: Response) {
    try {
      const { clave } = req.params;
      const { valor } = req.body;
      const userId = req.user?.userId;

      const result = await pool.query(
        `UPDATE configuracion 
         SET valor = $1, actualizado_por = $2, fecha_actualizacion = CURRENT_TIMESTAMP
         WHERE clave = $3
         RETURNING *`,
        [valor, userId, clave]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Configuración no encontrada'
        });
      }
      
      res.json({
        success: true,
        message: 'Configuración actualizada correctamente',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error updating config:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar la configuración'
      });
    }
  },

  // Actualizar múltiples configuraciones
  async updateMultiple(req: AuthRequest, res: Response) {
    const client = await pool.connect();
    
    try {
      const { configuraciones } = req.body;
      const userId = req.user?.userId;

      await client.query('BEGIN');

      const resultados = [];
      for (const config of configuraciones) {
        const result = await client.query(
          `UPDATE configuracion 
           SET valor = $1, actualizado_por = $2, fecha_actualizacion = CURRENT_TIMESTAMP
           WHERE clave = $3
           RETURNING clave, valor`,
          [config.valor, userId, config.clave]
        );
        
        if (result.rows.length > 0) {
          resultados.push(result.rows[0]);
        }
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        message: `${resultados.length} configuración(es) actualizada(s) correctamente`,
        data: resultados
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating multiple config:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar las configuraciones'
      });
    } finally {
      client.release();
    }
  }
};