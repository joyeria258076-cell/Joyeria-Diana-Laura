// Backend/src/controllers/admin/adminContentController.ts
import { Request, Response } from 'express';
import { pool } from '../../config/database';

export const adminContentController = {
  // ==========================================
  // 1. CONFIGURACIÓN DE PÁGINAS (Hero/Banner)
  // ==========================================
  getPageConfig: async (req: Request, res: Response): Promise<void> => {
    try {
      const { pageName } = req.params;
      // ✅ CORREGIDO: agregar esquema contenido
      const result = await pool.query('SELECT * FROM contenido.page_content WHERE page_name = $1', [pageName]);

      if (result.rows.length === 0) {
        res.status(404).json({ message: "Página no encontrada" });
        return;
      }

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

      // ✅ CORREGIDO: agregar esquema contenido
      const result = await pool.query(
        'UPDATE contenido.page_content SET titulo = $1, contenido = $2, imagen = $3, fecha = CURRENT_TIMESTAMP WHERE page_name = $4 RETURNING *',
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
      // ✅ CORREGIDO: agregar esquema contenido
      const result = await pool.query('SELECT * FROM contenido.noticias ORDER BY fecha DESC');
      
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

      // ✅ CORREGIDO: agregar esquema contenido
      const result = await pool.query(
        'INSERT INTO contenido.noticias (titulo, contenido, imagen) VALUES ($1, $2, $3) RETURNING *',
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

      // ✅ CORREGIDO: agregar esquema contenido
      await pool.query('UPDATE contenido.noticias SET activa = $1 WHERE id = $2', [activa, id]);
      res.json({ message: "Estado actualizado exitosamente" });
    } catch (error) {
      console.error('Error en toggleNoticiaStatus:', error);
      res.status(500).json({ message: "Error al cambiar estado" });
    }
  },

  deleteNoticia: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      // ✅ CORREGIDO: agregar esquema contenido
      await pool.query('DELETE FROM contenido.noticias WHERE id = $1', [id]);
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
      // ✅ CORREGIDO: agregar esquema contenido
      const result = await pool.query('SELECT * FROM contenido.carrusel ORDER BY id ASC');
      res.status(200).json(result.rows);
    } catch (error) {
      console.error('Error obteniendo carrusel:', error);
      res.status(500).json({ message: 'Error al obtener el carrusel' });
    }
  },

  createCarruselItem: async (req: Request, res: Response) => {
    const { titulo, descripcion, imagen, enlace } = req.body;
    try {
      // ✅ CORREGIDO: agregar esquema contenido
      const result = await pool.query(
        'INSERT INTO contenido.carrusel (titulo, descripcion, imagen, enlace) VALUES ($1, $2, $3, $4) RETURNING *',
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
      // ✅ CORREGIDO: agregar esquema contenido
      await pool.query('DELETE FROM contenido.carrusel WHERE id = $1', [id]);
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
      // ✅ CORREGIDO: agregar esquema ventas
      const result = await pool.query('SELECT * FROM ventas.promociones ORDER BY id DESC');
      res.status(200).json(result.rows);
    } catch (error) {
      console.error('Error obteniendo promociones:', error);
      res.status(500).json({ message: 'Error al obtener promociones' });
    }
  },

  createPromocion: async (req: Request, res: Response) => {
    const { titulo, descripcion, descuento, activa } = req.body;
    try {
      // ✅ CORREGIDO: agregar esquema ventas
      const result = await pool.query(
        'INSERT INTO ventas.promociones (titulo, descripcion, descuento, activa) VALUES ($1, $2, $3, $4) RETURNING *',
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
      // ✅ CORREGIDO: agregar esquema ventas
      const result = await pool.query(
        'UPDATE ventas.promociones SET activa = $1 WHERE id = $2 RETURNING *',
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
      // ✅ CORREGIDO: agregar esquema ventas
      await pool.query('DELETE FROM ventas.promociones WHERE id = $1', [id]);
      res.status(200).json({ message: 'Promoción eliminada correctamente' });
    } catch (error) {
      console.error('Error eliminando promocion:', error);
      res.status(500).json({ message: 'Error al eliminar promoción' });
    }
  },

  // ==========================================
  // GESTIÓN DE PÁGINAS (CMS)
  // ==========================================
  getPaginas: async (req: Request, res: Response): Promise<void> => {
    try {
      // ✅ CORREGIDO: agregar esquema contenido
      const result = await pool.query(
        'SELECT * FROM contenido.paginas WHERE activo = true ORDER BY orden ASC, nombre ASC'
      );
      res.json(result.rows);
    } catch (error) {
      console.error('Error en getPaginas:', error);
      res.status(500).json({ message: "Error al obtener páginas" });
    }
  },

  getPaginaById: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      // ✅ CORREGIDO: agregar esquema contenido
      const result = await pool.query(
        'SELECT * FROM contenido.paginas WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        res.status(404).json({ message: "Página no encontrada" });
        return;
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error en getPaginaById:', error);
      res.status(500).json({ message: "Error al obtener página" });
    }
  },

  createPagina: async (req: Request, res: Response): Promise<void> => {
    try {
      const { nombre, slug, descripcion, icono, orden, mostrar_en_menu, mostrar_en_footer, requiere_autenticacion } = req.body;
      const userId = (req as any).user?.id;
      
      // ✅ CORREGIDO: agregar esquema contenido
      const slugExists = await pool.query(
        'SELECT id FROM contenido.paginas WHERE slug = $1',
        [slug]
      );
      
      if (slugExists.rows.length > 0) {
        res.status(400).json({ message: "El slug ya existe" });
        return;
      }

      const result = await pool.query(
        `INSERT INTO contenido.paginas 
         (nombre, slug, descripcion, icono, orden, mostrar_en_menu, mostrar_en_footer, requiere_autenticacion, creado_por, activo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
         RETURNING *`,
        [nombre, slug, descripcion || '', icono || '', orden || 0, mostrar_en_menu ?? true, mostrar_en_footer ?? false, requiere_autenticacion ?? false, userId]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error en createPagina:', error);
      res.status(500).json({ message: "Error al crear página" });
    }
  },

  updatePagina: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { nombre, slug, descripcion, icono, orden, mostrar_en_menu, mostrar_en_footer, requiere_autenticacion } = req.body;
      const userId = (req as any).user?.id;

      // ✅ CORREGIDO: agregar esquema contenido
      const slugExists = await pool.query(
        'SELECT id FROM contenido.paginas WHERE slug = $1 AND id != $2',
        [slug, id]
      );
      
      if (slugExists.rows.length > 0) {
        res.status(400).json({ message: "El slug ya existe" });
        return;
      }

      const result = await pool.query(
        `UPDATE contenido.paginas 
         SET nombre = $1, slug = $2, descripcion = $3, icono = $4, orden = $5, 
             mostrar_en_menu = $6, mostrar_en_footer = $7, requiere_autenticacion = $8, 
             actualizado_por = $9, fecha_actualizacion = CURRENT_TIMESTAMP
         WHERE id = $10
         RETURNING *`,
        [nombre, slug, descripcion || '', icono || '', orden || 0, mostrar_en_menu, mostrar_en_footer, requiere_autenticacion, userId, id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ message: "Página no encontrada" });
        return;
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error en updatePagina:', error);
      res.status(500).json({ message: "Error al actualizar página" });
    }
  },

  deletePagina: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      // ✅ CORREGIDO: agregar esquema contenido
      const sectionCount = await pool.query(
        'SELECT COUNT(*) as count FROM contenido.secciones WHERE pagina_id = $1',
        [id]
      );

      if (parseInt(sectionCount.rows[0].count) > 0) {
        res.status(400).json({ message: "No se puede eliminar una página que tiene secciones. Elimina las secciones primero." });
        return;
      }

      const result = await pool.query(
        'DELETE FROM contenido.paginas WHERE id = $1 RETURNING id',
        [id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ message: "Página no encontrada" });
        return;
      }

      res.json({ message: "Página eliminada correctamente" });
    } catch (error) {
      console.error('Error en deletePagina:', error);
      res.status(500).json({ message: "Error al eliminar página" });
    }
  },

  // ==========================================
  // GESTIÓN DE SECCIONES (CMS)
  // ==========================================
  getSeccionesByPagina: async (req: Request, res: Response): Promise<void> => {
    try {
      const { paginaId } = req.params;
      // ✅ CORREGIDO: agregar esquema contenido
      const result = await pool.query(
        'SELECT * FROM contenido.secciones WHERE pagina_id = $1 AND activo = true ORDER BY orden ASC',
        [paginaId]
      );
      res.json(result.rows);
    } catch (error) {
      console.error('Error en getSeccionesByPagina:', error);
      res.status(500).json({ message: "Error al obtener secciones" });
    }
  },

  getSeccionById: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      // ✅ CORREGIDO: agregar esquema contenido
      const result = await pool.query(
        'SELECT * FROM contenido.secciones WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        res.status(404).json({ message: "Sección no encontrada" });
        return;
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error en getSeccionById:', error);
      res.status(500).json({ message: "Error al obtener sección" });
    }
  },

  createSeccion: async (req: Request, res: Response): Promise<void> => {
    try {
      const { pagina_id, nombre, descripcion, imagen_url, color_fondo, orden } = req.body;
      const userId = (req as any).user?.id;

      // ✅ CORREGIDO: agregar esquema contenido
      const result = await pool.query(
        `INSERT INTO contenido.secciones
         (pagina_id, nombre, descripcion, imagen_url, color_fondo, orden, creado_por, activo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true)
         RETURNING *`,
        [pagina_id, nombre, descripcion || '', imagen_url || '', color_fondo || '#ffffff', orden || 0, userId]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error en createSeccion:', error);
      res.status(500).json({ message: "Error al crear sección" });
    }
  },

  updateSeccion: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { nombre, descripcion, imagen_url, color_fondo, orden } = req.body;
      const userId = (req as any).user?.id;

      // ✅ CORREGIDO: agregar esquema contenido
      const result = await pool.query(
        `UPDATE contenido.secciones
         SET nombre = $1, descripcion = $2, imagen_url = $3, color_fondo = $4, orden = $5, fecha_actualizacion = CURRENT_TIMESTAMP
         WHERE id = $6
         RETURNING *`,
        [nombre, descripcion || '', imagen_url || '', color_fondo || '#ffffff', orden || 0, id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ message: "Sección no encontrada" });
        return;
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error en updateSeccion:', error);
      res.status(500).json({ message: "Error al actualizar sección" });
    }
  },

  deleteSeccion: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      // ✅ CORREGIDO: agregar esquema contenido
      const contentCount = await pool.query(
        'SELECT COUNT(*) as count FROM contenido.contenidos WHERE seccion_id = $1',
        [id]
      );

      if (parseInt(contentCount.rows[0].count) > 0) {
        res.status(400).json({ message: "No se puede eliminar una sección que tiene contenidos. Elimina los contenidos primero." });
        return;
      }

      const result = await pool.query(
        'DELETE FROM contenido.secciones WHERE id = $1 RETURNING id',
        [id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ message: "Sección no encontrada" });
        return;
      }

      res.json({ message: "Sección eliminada correctamente" });
    } catch (error) {
      console.error('Error en deleteSeccion:', error);
      res.status(500).json({ message: "Error al eliminar sección" });
    }
  },

  // ==========================================
  // GESTIÓN DE CONTENIDOS (CMS)
  // ==========================================
  getContenidosBySeccion: async (req: Request, res: Response): Promise<void> => {
    try {
      const { seccionId } = req.params;
      // ✅ CORREGIDO: agregar esquema contenido
      const result = await pool.query(
        'SELECT * FROM contenido.contenidos WHERE seccion_id = $1 AND activo = true ORDER BY orden ASC',
        [seccionId]
      );
      res.json(result.rows);
    } catch (error) {
      console.error('Error en getContenidosBySeccion:', error);
      res.status(500).json({ message: "Error al obtener contenidos" });
    }
  },

  getContenidoById: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      // ✅ CORREGIDO: agregar esquema contenido
      const result = await pool.query(
        'SELECT * FROM contenido.contenidos WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        res.status(404).json({ message: "Contenido no encontrado" });
        return;
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error en getContenidoById:', error);
      res.status(500).json({ message: "Error al obtener contenido" });
    }
  },

  createContenido: async (req: Request, res: Response): Promise<void> => {
    try {
      const { seccion_id, titulo, descripcion, imagen_url, enlace_url, enlace_nueva_ventana, orden } = req.body;
      const userId = (req as any).user?.id;

      // ✅ CORREGIDO: agregar esquema contenido
      const result = await pool.query(
        `INSERT INTO contenido.contenidos
         (seccion_id, titulo, descripcion, imagen_url, enlace_url, enlace_nueva_ventana, orden, creado_por, activo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
         RETURNING *`,
        [seccion_id, titulo, descripcion || '', imagen_url || '', enlace_url || '', enlace_nueva_ventana ?? false, orden || 0, userId]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error en createContenido:', error);
      res.status(500).json({ message: "Error al crear contenido" });
    }
  },

  updateContenido: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { titulo, descripcion, imagen_url, enlace_url, enlace_nueva_ventana, orden } = req.body;
      const userId = (req as any).user?.id;

      // ✅ CORREGIDO: agregar esquema contenido
      const result = await pool.query(
        `UPDATE contenido.contenidos
         SET titulo = $1, descripcion = $2, imagen_url = $3, enlace_url = $4, enlace_nueva_ventana = $5, orden = $6, fecha_actualizacion = CURRENT_TIMESTAMP
         WHERE id = $7
         RETURNING *`,
        [titulo, descripcion || '', imagen_url || '', enlace_url || '', enlace_nueva_ventana ?? false, orden || 0, id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ message: "Contenido no encontrado" });
        return;
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error en updateContenido:', error);
      res.status(500).json({ message: "Error al actualizar contenido" });
    }
  },

  deleteContenido: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      // ✅ CORREGIDO: agregar esquema contenido
      const result = await pool.query(
        'DELETE FROM contenido.contenidos WHERE id = $1 RETURNING id',
        [id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ message: "Contenido no encontrado" });
        return;
      }

      res.json({ message: "Contenido eliminado correctamente" });
    } catch (error) {
      console.error('Error en deleteContenido:', error);
      res.status(500).json({ message: "Error al eliminar contenido" });
    }
  }
};