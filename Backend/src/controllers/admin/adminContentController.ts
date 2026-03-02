import { Request, Response } from 'express';
import { pool } from '../../config/database'; // Tu conexión real a Supabase

export const adminContentController = {
  // ==========================================
  // 1. CONFIGURACIÓN DE PÁGINAS (Hero/Banner)
  // ==========================================
  getPageConfig: async (req: Request, res: Response): Promise<void> => {
    try {
      const { pageName } = req.params;
      const result = await pool.query('SELECT * FROM page_content WHERE page_name = $1', [pageName]);

      if (result.rows.length === 0) {
        res.status(404).json({ message: "Página no encontrada" });
        return;
      }

      // Extraemos la fecha en formato YYYY-MM-DD
      const data = result.rows[0];
      data.fecha = new Date(data.fecha).toISOString().split('T')[0];
      
      res.json(data);
    } catch (error) {
      console.error('Error en getPageConfig:', error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  },

  updatePageConfig: async (req: Request, res: Response): Promise<void> => {
    try {
      const { pageName } = req.params;
      const { titulo, contenido, imagen } = req.body;

      const result = await pool.query(
        'UPDATE page_content SET titulo = $1, contenido = $2, imagen = $3, fecha = CURRENT_TIMESTAMP WHERE page_name = $4 RETURNING *',
        [titulo, contenido, imagen, pageName]
      );

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error en updatePageConfig:', error);
      res.status(500).json({ message: "Error al actualizar la página" });
    }
  },

  // ==========================================
  // 2. GESTIÓN DE NOTICIAS (Artículos)
  // ==========================================
  getNoticias: async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await pool.query('SELECT * FROM noticias ORDER BY fecha DESC');
      
      // Formatear la fecha para enviarla bonita al frontend
      const noticias = result.rows.map(n => ({
        ...n,
        fecha: new Date(n.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
      }));

      res.json(noticias);
    } catch (error) {
      console.error('Error en getNoticias:', error);
      res.status(500).json({ message: "Error al obtener noticias" });
    }
  },

  createNoticia: async (req: Request, res: Response): Promise<void> => {
    try {
      const { titulo, contenido, imagen } = req.body;

      const result = await pool.query(
        'INSERT INTO noticias (titulo, contenido, imagen) VALUES ($1, $2, $3) RETURNING *',
        [titulo, contenido, imagen]
      );

      const nuevaNoticia = result.rows[0];
      nuevaNoticia.fecha = new Date(nuevaNoticia.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

      res.status(201).json(nuevaNoticia);
    } catch (error) {
      console.error('Error en createNoticia:', error);
      res.status(500).json({ message: "Error al crear la noticia" });
    }
  },

  toggleNoticiaStatus: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { activa } = req.body;

      await pool.query('UPDATE noticias SET activa = $1 WHERE id = $2', [activa, id]);
      res.json({ message: "Estado actualizado exitosamente" });
    } catch (error) {
      console.error('Error en toggleNoticiaStatus:', error);
      res.status(500).json({ message: "Error al cambiar estado" });
    }
  },

  deleteNoticia: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await pool.query('DELETE FROM noticias WHERE id = $1', [id]);
      res.json({ message: "Noticia eliminada correctamente" });
    } catch (error) {
      console.error('Error en deleteNoticia:', error);
      res.status(500).json({ message: "Error al eliminar noticia" });
    }
  },

  // ==========================================
  // MÉTODOS PARA EL CARRUSEL
  // ==========================================
  getCarrusel: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT * FROM carrusel ORDER BY id ASC');
      res.status(200).json(result.rows);
    } catch (error) {
      console.error('Error obteniendo carrusel:', error);
      res.status(500).json({ message: 'Error al obtener el carrusel' });
    }
  },

  createCarruselItem: async (req: Request, res: Response) => {
    const { titulo, descripcion, imagen, enlace } = req.body;
    try {
      const result = await pool.query(
        'INSERT INTO carrusel (titulo, descripcion, imagen, enlace) VALUES ($1, $2, $3, $4) RETURNING *',
        [titulo, descripcion, imagen, enlace || '']
      );
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creando item de carrusel:', error);
      res.status(500).json({ message: 'Error al crear item de carrusel' });
    }
  },

  deleteCarruselItem: async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      await pool.query('DELETE FROM carrusel WHERE id = $1', [id]);
      res.status(200).json({ message: 'Item eliminado correctamente' });
    } catch (error) {
      console.error('Error eliminando item de carrusel:', error);
      res.status(500).json({ message: 'Error al eliminar item' });
    }
  },

  // ==========================================
  // MÉTODOS PARA PROMOCIONES
  // ==========================================
  getPromociones: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT * FROM promociones ORDER BY id DESC');
      res.status(200).json(result.rows);
    } catch (error) {
      console.error('Error obteniendo promociones:', error);
      res.status(500).json({ message: 'Error al obtener promociones' });
    }
  },

  createPromocion: async (req: Request, res: Response) => {
    const { titulo, descripcion, descuento, activa } = req.body;
    try {
      const result = await pool.query(
        'INSERT INTO promociones (titulo, descripcion, descuento, activa) VALUES ($1, $2, $3, $4) RETURNING *',
        [titulo, descripcion, descuento, activa ?? true]
      );
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creando promocion:', error);
      res.status(500).json({ message: 'Error al crear promoción' });
    }
  },

  togglePromocionStatus: async (req: Request, res: Response) => {
    const { id } = req.params;
    const { activa } = req.body;
    try {
      const result = await pool.query(
        'UPDATE promociones SET activa = $1 WHERE id = $2 RETURNING *',
        [activa, id]
      );
      res.status(200).json(result.rows[0]);
    } catch (error) {
      console.error('Error actualizando estado de promocion:', error);
      res.status(500).json({ message: 'Error al actualizar estado' });
    }
  },

  deletePromocion: async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      await pool.query('DELETE FROM promociones WHERE id = $1', [id]);
      res.status(200).json({ message: 'Promoción eliminada correctamente' });
    } catch (error) {
      console.error('Error eliminando promocion:', error);
      res.status(500).json({ message: 'Error al eliminar promoción' });
    }
  }
};

