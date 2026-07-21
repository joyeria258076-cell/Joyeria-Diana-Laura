import { Request, Response } from 'express';
import { pool } from '../../config/database'; // Tu conexión real a Supabase

const SQL_INJECTION_PATTERN = /('(\s)*(or|and)(\s)*')|(-{2})|(\bUNION\b.*\bSELECT\b)|(\bDROP\b.*\bTABLE\b)|(\bINSERT\b.*\bINTO\b)|(\bDELETE\b.*\bFROM\b)|(;(\s)*DROP)|(xp_)/i;
const XSS_PATTERN = /<\s*script|javascript:|on\w+\s*=|<\s*iframe|<\s*object|<\s*embed/i;

function hasInvalidInput(...fields: (string | undefined)[]): boolean {
  return fields.some(f => f && (SQL_INJECTION_PATTERN.test(f) || XSS_PATTERN.test(f)));
}

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

      if (hasInvalidInput(titulo, contenido)) {
        res.status(400).json({ message: 'Datos inválidos en la solicitud' }); return;
      }

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
  // 1.5. INFORMACIÓN EMPRESARIAL ("Sobre Nosotros")
  // ==========================================
  getInfoEmpresa: async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await pool.query('SELECT * FROM informacion_empresa WHERE id = 1');
      res.json({ success: true, data: result.rows[0] || null });
    } catch (error) {
      console.error('Error en getInfoEmpresa:', error);
      res.status(500).json({ success: false, message: 'Error al obtener información empresarial' });
    }
  },

  updateInfoEmpresa: async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        nombre, descripcion, direccion, telefono, email, horario,
        mision, artesania, anios_tradicion, clientes_felices,
        facebook_url, instagram_url, whatsapp, tiktok_url, imagen_hero
      } = req.body;

      if (hasInvalidInput(nombre, descripcion, direccion, mision, artesania)) {
        res.status(400).json({ success: false, message: 'Datos inválidos en la solicitud' }); return;
      }
      if (!nombre?.trim()) {
        res.status(400).json({ success: false, message: 'El nombre es obligatorio' }); return;
      }

      const userId = (req as any).user?.userId || (req as any).user?.id;

      const result = await pool.query(
        `UPDATE informacion_empresa SET
          nombre = $1, descripcion = $2, direccion = $3, telefono = $4, email = $5,
          horario = $6, mision = $7, artesania = $8, anios_tradicion = $9, clientes_felices = $10,
          facebook_url = $11, instagram_url = $12, whatsapp = $13, tiktok_url = $14, imagen_hero = $15,
          actualizado_por = $16, fecha_actualizacion = CURRENT_TIMESTAMP
         WHERE id = 1
         RETURNING *`,
        [
          nombre.trim(), descripcion || null, direccion || null, telefono || null, email || null,
          horario || null, mision || null, artesania || null,
          Number.parseInt(anios_tradicion) || 0, Number.parseInt(clientes_felices) || 0,
          facebook_url || null, instagram_url || null, whatsapp || null, tiktok_url || null,
          imagen_hero || null, userId || null
        ]
      );

      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error en updateInfoEmpresa:', error);
      res.status(500).json({ success: false, message: 'Error al actualizar información empresarial' });
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

      if (hasInvalidInput(titulo, contenido)) {
        res.status(400).json({ message: 'Datos inválidos en la solicitud' }); return;
      }

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
  // GESTIÓN DE FAQs (Preguntas Frecuentes)
  // ==========================================
  getFaqs: async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await pool.query('SELECT * FROM faqs ORDER BY orden ASC, id ASC');
      res.json(result.rows);
    } catch (error) {
      console.error('Error en getFaqs:', error);
      res.status(500).json({ message: 'Error al obtener FAQs' });
    }
  },

  createFaq: async (req: Request, res: Response): Promise<void> => {
    try {
      const { pregunta, respuesta, orden } = req.body;
      if (!pregunta || !respuesta) {
        res.status(400).json({ message: 'Pregunta y respuesta son obligatorias' }); return;
      }
      if (hasInvalidInput(pregunta, respuesta)) {
        res.status(400).json({ message: 'Datos inválidos en la solicitud' }); return;
      }
      const result = await pool.query(
        'INSERT INTO faqs (pregunta, respuesta, orden) VALUES ($1, $2, $3) RETURNING *',
        [pregunta, respuesta, orden ?? 0]
      );
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error en createFaq:', error);
      res.status(500).json({ message: 'Error al crear FAQ' });
    }
  },

  updateFaq: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { pregunta, respuesta, orden } = req.body;
      if (!pregunta || !respuesta) {
        res.status(400).json({ message: 'Pregunta y respuesta son obligatorias' }); return;
      }
      if (hasInvalidInput(pregunta, respuesta)) {
        res.status(400).json({ message: 'Datos inválidos en la solicitud' }); return;
      }
      const result = await pool.query(
        'UPDATE faqs SET pregunta = $1, respuesta = $2, orden = $3 WHERE id = $4 RETURNING *',
        [pregunta, respuesta, orden ?? 0, id]
      );
      if (result.rows.length === 0) {
        res.status(404).json({ message: 'FAQ no encontrada' }); return;
      }
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error en updateFaq:', error);
      res.status(500).json({ message: 'Error al actualizar FAQ' });
    }
  },

  toggleFaqStatus: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { activa } = req.body;
      await pool.query('UPDATE faqs SET activa = $1 WHERE id = $2', [activa, id]);
      res.json({ message: 'Estado actualizado' });
    } catch (error) {
      console.error('Error en toggleFaqStatus:', error);
      res.status(500).json({ message: 'Error al cambiar estado' });
    }
  },

  deleteFaq: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await pool.query('DELETE FROM faqs WHERE id = $1', [id]);
      res.json({ message: 'FAQ eliminada correctamente' });
    } catch (error) {
      console.error('Error en deleteFaq:', error);
      res.status(500).json({ message: 'Error al eliminar FAQ' });
    }
  },

  // ==========================================
  // MÉTODOS PARA PROMOCIONES
  // ==========================================
  getPromociones: async (req: Request, res: Response) => {
    try {
      const result = await pool.query(`
        SELECT p.*, u.nombre AS creado_por_nombre
        FROM promociones p
        LEFT JOIN usuarios u ON p.creado_por = u.id
        ORDER BY p.fecha_creacion DESC
      `);
      res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al obtener promociones' });
    }
  },

  createPromocion: async (req: Request, res: Response) => {
    const {
      nombre, descripcion, tipo, valor_descuento,
      fecha_inicio, fecha_fin,
      aplica_productos, aplica_categorias,
      monto_minimo_compra, limite_usos_total,
      codigo_cupon
    } = req.body;
    const userId = (req as any).user?.userId || (req as any).user?.userId || (req as any).user?.id;
    try {
      if (!nombre || !tipo || !fecha_inicio || !fecha_fin)
        return res.status(400).json({ success: false, message: 'Faltan campos requeridos' });
      if (!userId)
        return res.status(401).json({ success: false, message: 'No autenticado' });

      const result = await pool.query(`
        INSERT INTO promociones (
          nombre, descripcion, tipo, valor_descuento,
          fecha_inicio, fecha_fin,
          aplica_productos, aplica_categorias,
          monto_minimo_compra, limite_usos_total,
          codigo_cupon, activo, creado_por, actualizado_por
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true,$12,$12)
        RETURNING *
      `, [
        nombre, descripcion || null, tipo, valor_descuento || null,
        fecha_inicio, `${fecha_fin}T23:59:59`,
        aplica_productos?.length ? aplica_productos : null,
        aplica_categorias?.length ? aplica_categorias : null,
        monto_minimo_compra || null, limite_usos_total || null,
        codigo_cupon || null, userId
      ]);
      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  updatePromocion: async (req: Request, res: Response) => {
    const { id } = req.params;
    const {
      nombre, descripcion, tipo, valor_descuento,
      fecha_inicio, fecha_fin,
      aplica_productos, aplica_categorias,
      monto_minimo_compra, limite_usos_total,
      codigo_cupon, activo
    } = req.body;
    const userId = (req as any).user?.userId || (req as any).user?.userId || (req as any).user?.id;
    try {
      const result = await pool.query(`
        UPDATE promociones SET
          nombre=$1, descripcion=$2, tipo=$3, valor_descuento=$4,
          fecha_inicio=$5, fecha_fin=$6,
          aplica_productos=$7, aplica_categorias=$8,
          monto_minimo_compra=$9, limite_usos_total=$10,
          codigo_cupon=$11, activo=$12,
          actualizado_por=$13, fecha_actualizacion=CURRENT_TIMESTAMP
        WHERE id=$14 RETURNING *
      `, [
        nombre, descripcion || null, tipo, valor_descuento || null,
        fecha_inicio, `${fecha_fin.slice(0,10)}T23:59:59`,
        aplica_productos?.length ? aplica_productos : null,
        aplica_categorias?.length ? aplica_categorias : null,
        monto_minimo_compra || null, limite_usos_total || null,
        codigo_cupon || null, activo ?? true,
        userId, id
      ]);
      res.json({ success: true, data: result.rows[0] });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  togglePromocionStatus: async (req: Request, res: Response) => {
    const { id } = req.params;
    const { activo } = req.body;
    try {
      const result = await pool.query(
        'UPDATE promociones SET activo=$1, fecha_actualizacion=CURRENT_TIMESTAMP WHERE id=$2 RETURNING *',
        [activo, id]
      );
      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al actualizar estado' });
    }
  },

  deletePromocion: async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      await pool.query('DELETE FROM promociones WHERE id=$1', [id]);
      res.json({ success: true, message: 'Promoción eliminada' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al eliminar promoción' });
    }
  },

  getPromocionesActivas: async (req: Request, res: Response) => {
    try {
      const now = new Date().toISOString();
      const result = await pool.query(`
        SELECT * FROM promociones
        WHERE activo = true AND fecha_inicio <= $1 AND fecha_fin >= $1
        ORDER BY valor_descuento DESC
      `, [now]);
      res.json({ success: true, data: result.rows });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al obtener promociones activas' });
    }
  },

  // ==========================================
  // GESTIÓN DE COLECCIONES
  // ==========================================
  getColecciones: async (req: Request, res: Response) => {
    try {
      const result = await pool.query(`
        SELECT c.*, u.nombre AS creado_por_nombre,
          COUNT(cp.id)::int AS total_productos
        FROM colecciones c
        LEFT JOIN usuarios u ON u.id = c.creado_por
        LEFT JOIN coleccion_productos cp ON cp.coleccion_id = c.id
        GROUP BY c.id, u.nombre
        ORDER BY c.orden ASC, c.fecha_creacion DESC
      `);
      res.json({ success: true, data: result.rows });
    } catch {
      res.status(500).json({ success: false, message: 'Error al obtener colecciones' });
    }
  },

  getColeccionById: async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      const col = await pool.query('SELECT * FROM colecciones WHERE id = $1', [id]);
      if (col.rows.length === 0) { res.status(404).json({ success: false, message: 'No encontrada' }); return; }
      const prods = await pool.query(`
        SELECT p.id, p.nombre, p.codigo, p.imagen_principal, p.precio_venta, p.precio_oferta,
               p.stock_actual, p.activo, cp.orden
        FROM coleccion_productos cp
        JOIN productos p ON p.id = cp.producto_id
        WHERE cp.coleccion_id = $1
        ORDER BY cp.orden ASC
      `, [id]);
      res.json({ success: true, data: { ...col.rows[0], productos: prods.rows } });
    } catch {
      res.status(500).json({ success: false, message: 'Error al obtener colección' });
    }
  },

  createColeccion: async (req: Request, res: Response) => {
    const { nombre, descripcion, imagen_url, orden, productos } = req.body;
    const userId = (req as any).user?.userId || (req as any).user?.id;
    if (!nombre?.trim()) { res.status(400).json({ success: false, message: 'El nombre es obligatorio' }); return; }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `INSERT INTO colecciones (nombre, descripcion, imagen_url, orden, creado_por)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [nombre.trim(), descripcion || null, imagen_url || null, orden ?? 0, userId]
      );
      const colId = result.rows[0].id;
      if (Array.isArray(productos) && productos.length > 0) {
        for (let i = 0; i < productos.length; i++) {
          await client.query(
            'INSERT INTO coleccion_productos (coleccion_id, producto_id, orden) VALUES ($1, $2, $3)',
            [colId, productos[i], i]
          );
        }
      }
      await client.query('COMMIT');
      res.json({ success: true, data: result.rows[0] });
    } catch {
      await client.query('ROLLBACK');
      res.status(500).json({ success: false, message: 'Error al crear colección' });
    } finally { client.release(); }
  },

  updateColeccion: async (req: Request, res: Response) => {
    const { id } = req.params;
    const { nombre, descripcion, imagen_url, orden, productos } = req.body;
    if (!nombre?.trim()) { res.status(400).json({ success: false, message: 'El nombre es obligatorio' }); return; }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE colecciones SET nombre=$1, descripcion=$2, imagen_url=$3, orden=$4,
         fecha_actualizacion=NOW() WHERE id=$5`,
        [nombre.trim(), descripcion || null, imagen_url || null, orden ?? 0, id]
      );
      if (Array.isArray(productos)) {
        await client.query('DELETE FROM coleccion_productos WHERE coleccion_id = $1', [id]);
        for (let i = 0; i < productos.length; i++) {
          await client.query(
            'INSERT INTO coleccion_productos (coleccion_id, producto_id, orden) VALUES ($1, $2, $3)',
            [id, productos[i], i]
          );
        }
      }
      await client.query('COMMIT');
      res.json({ success: true, message: 'Colección actualizada' });
    } catch {
      await client.query('ROLLBACK');
      res.status(500).json({ success: false, message: 'Error al actualizar colección' });
    } finally { client.release(); }
  },

  toggleColeccionStatus: async (req: Request, res: Response) => {
    const { id } = req.params;
    const { activo } = req.body;
    try {
      await pool.query('UPDATE colecciones SET activo=$1, fecha_actualizacion=NOW() WHERE id=$2', [activo, id]);
      res.json({ success: true });
    } catch {
      res.status(500).json({ success: false, message: 'Error al cambiar estado' });
    }
  },

  deleteColeccion: async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      await pool.query('DELETE FROM colecciones WHERE id = $1', [id]);
      res.json({ success: true, message: 'Colección eliminada' });
    } catch {
      res.status(500).json({ success: false, message: 'Error al eliminar colección' });
    }
  },

  // Público: colecciones activas con sus productos
  getColeccionesPublicas: async (req: Request, res: Response) => {
    try {
      const cols = await pool.query(
        'SELECT id, nombre, descripcion, imagen_url, orden FROM colecciones WHERE activo = true ORDER BY orden ASC'
      );
      const result = await Promise.all(cols.rows.map(async (c) => {
        const prods = await pool.query(`
          SELECT p.id, p.nombre, p.imagen_principal, p.precio_venta, p.precio_oferta,
                 p.stock_actual, p.es_destacado
          FROM coleccion_productos cp
          JOIN productos p ON p.id = cp.producto_id
          WHERE cp.coleccion_id = $1 AND p.activo = true
          ORDER BY cp.orden ASC
        `, [c.id]);
        return { ...c, productos: prods.rows };
      }));
      res.json({ success: true, data: result });
    } catch {
      res.status(500).json({ success: false, message: 'Error al obtener colecciones' });
    }
  },

  // ==========================================
  // GESTIÓN DE PÁGINAS (CMS)
  // ==========================================
  getPaginas: async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await pool.query(
        'SELECT * FROM paginas WHERE activo = true ORDER BY orden ASC, nombre ASC'
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
      const result = await pool.query(
        'SELECT * FROM paginas WHERE id = $1',
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
      if (hasInvalidInput(nombre, descripcion)) {
        res.status(400).json({ message: 'Datos inválidos en la solicitud' }); return;
      }
      const userId = (req as any).user?.userId || (req as any).user?.id;
      
      // Validar que el slug sea único
      const slugExists = await pool.query(
        'SELECT id FROM paginas WHERE slug = $1',
        [slug]
      );
      
      if (slugExists.rows.length > 0) {
        res.status(400).json({ message: "El slug ya existe" });
        return;
      }

      const result = await pool.query(
        `INSERT INTO paginas 
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
      if (hasInvalidInput(nombre, descripcion)) {
        res.status(400).json({ message: 'Datos inválidos en la solicitud' }); return;
      }
      const userId = (req as any).user?.userId || (req as any).user?.id;

      // Validar que el slug sea único (si cambió)
      const slugExists = await pool.query(
        'SELECT id FROM paginas WHERE slug = $1 AND id != $2',
        [slug, id]
      );
      
      if (slugExists.rows.length > 0) {
        res.status(400).json({ message: "El slug ya existe" });
        return;
      }

      const result = await pool.query(
        `UPDATE paginas 
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
      
      // Verificar si tiene secciones
      const sectionCount = await pool.query(
        'SELECT COUNT(*) as count FROM secciones WHERE pagina_id = $1',
        [id]
      );

      if (Number.parseInt(sectionCount.rows[0].count) > 0) {
        res.status(400).json({ message: "No se puede eliminar una página que tiene secciones. Elimina las secciones primero." });
        return;
      }

      const result = await pool.query(
        'DELETE FROM paginas WHERE id = $1 RETURNING id',
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
      const result = await pool.query(
        'SELECT * FROM secciones WHERE pagina_id = $1 AND activo = true ORDER BY orden ASC',
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
      const result = await pool.query(
        'SELECT * FROM secciones WHERE id = $1',
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

      if (hasInvalidInput(nombre, descripcion)) {
        res.status(400).json({ message: 'Datos inválidos en la solicitud' }); return;
      }

      const userId = (req as any).user?.userId || (req as any).user?.id;

      const result = await pool.query(
        `INSERT INTO secciones
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
      
      if (hasInvalidInput(nombre, descripcion)) {
        res.status(400).json({ message: 'Datos inválidos en la solicitud' }); return;
      }

      const userId = (req as any).user?.userId || (req as any).user?.id;

      const result = await pool.query(
        `UPDATE secciones
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

      // Verificar si tiene contenidos
      const contentCount = await pool.query(
        'SELECT COUNT(*) as count FROM contenidos WHERE seccion_id = $1',
        [id]
      );

      if (Number.parseInt(contentCount.rows[0].count) > 0) {
        res.status(400).json({ message: "No se puede eliminar una sección que tiene contenidos. Elimina los contenidos primero." });
        return;
      }

      const result = await pool.query(
        'DELETE FROM secciones WHERE id = $1 RETURNING id',
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
      const result = await pool.query(
        'SELECT * FROM contenidos WHERE seccion_id = $1 AND activo = true ORDER BY orden ASC',
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
      const result = await pool.query(
        'SELECT * FROM contenidos WHERE id = $1',
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

      if (hasInvalidInput(titulo, descripcion)) {
        res.status(400).json({ message: 'Datos inválidos en la solicitud' }); return;
      }
      const userId = (req as any).user?.userId || (req as any).user?.id;

      const result = await pool.query(
        `INSERT INTO contenidos
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
      if (hasInvalidInput(titulo, descripcion)) {
        res.status(400).json({ message: 'Datos inválidos en la solicitud' }); return;
      }
      const userId = (req as any).user?.userId || (req as any).user?.id;

      const result = await pool.query(
        `UPDATE contenidos
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

      const result = await pool.query(
        'DELETE FROM contenidos WHERE id = $1 RETURNING id',
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

