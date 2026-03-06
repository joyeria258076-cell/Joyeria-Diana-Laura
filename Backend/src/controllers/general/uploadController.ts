// Backend/src/controllers/general/uploadController.ts
import { Request, Response } from 'express';
import cloudinaryService from '../../services/cloudinaryService';
import { AuthRequest } from '../../middleware/authMiddleware';
import pool from '../../config/database';

export const uploadController = {
  /**
   * Subir una imagen (general)
   */
  async uploadImage(req: AuthRequest, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No se ha proporcionado ningún archivo',
        });
      }

      const { folder } = req.body;
      const uploadFolder = folder || 'joyeria';

      // Subir a Cloudinary
      const result = await cloudinaryService.uploadFromBuffer(
        req.file.buffer,
        uploadFolder,
        {
          tags: [`usuario:${req.user?.userId}`],
        }
      );

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error || 'Error al subir la imagen',
        });
      }

      res.json({
        success: true,
        message: 'Imagen subida correctamente',
        data: {
          url: result.url,
          publicId: result.publicId,
          format: result.format,
          width: result.width,
          height: result.height,
          size: result.size,
        },
      });
    } catch (error: any) {
      console.error('Error en uploadImage:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error al procesar la subida',
      });
    }
  },

  /**
   * Subir imagen para un producto específico
   */
  async uploadProductImage(req: AuthRequest, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No se ha proporcionado ningún archivo',
        });
      }

      const { productoId } = req.params;
      const { esPrincipal } = req.body;

      // Subir a Cloudinary
      const result = await cloudinaryService.uploadFromBuffer(
        req.file.buffer,
        `joyeria/productos/${productoId || 'nuevo'}`,
        {
          tags: [`producto:${productoId || 'nuevo'}`, `usuario:${req.user?.userId}`],
        }
      );

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error || 'Error al subir la imagen',
        });
      }

      // Si hay productoId, guardar en la base de datos
      if (productoId) {
        const query = `
          INSERT INTO imagenes_producto (producto_id, url_imagen, es_principal, orden)
          VALUES ($1, $2, $3, COALESCE((SELECT MAX(orden) + 1 FROM imagenes_producto WHERE producto_id = $1), 0))
          RETURNING id, url_imagen, es_principal, orden
        `;

        const dbResult = await pool.query(query, [
          productoId,
          result.url,
          esPrincipal === 'true',
        ]);

        return res.json({
          success: true,
          message: 'Imagen subida y guardada correctamente',
          data: {
            ...result,
            dbId: dbResult.rows[0].id,
          },
        });
      }

      // Sin productoId, solo devolver la info de Cloudinary
      res.json({
        success: true,
        message: 'Imagen subida correctamente',
        data: result,
      });
    } catch (error: any) {
      console.error('Error en uploadProductImage:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error al procesar la subida',
      });
    }
  },

  /**
   * Subir imagen para categoría
   */
  async uploadCategoryImage(req: AuthRequest, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No se ha proporcionado ningún archivo',
        });
      }

      const { categoriaId } = req.params;

      // Subir a Cloudinary
      const result = await cloudinaryService.uploadFromBuffer(
        req.file.buffer,
        `joyeria/categorias/${categoriaId || 'nueva'}`,
        {
          tags: [`categoria:${categoriaId || 'nueva'}`, `usuario:${req.user?.userId}`],
        }
      );

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error || 'Error al subir la imagen',
        });
      }

      res.json({
        success: true,
        message: 'Imagen subida correctamente',
        data: result,
      });
    } catch (error: any) {
      console.error('Error en uploadCategoryImage:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error al procesar la subida',
      });
    }
  },

  /**
   * Eliminar una imagen de Cloudinary
   */
  async deleteImage(req: AuthRequest, res: Response) {
    try {
      const { publicId } = req.params;

      if (!publicId) {
        return res.status(400).json({
          success: false,
          message: 'publicId es requerido',
        });
      }

      const result = await cloudinaryService.deleteImage(publicId);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.message,
        });
      }

      res.json({
        success: true,
        message: 'Imagen eliminada correctamente',
      });
    } catch (error: any) {
      console.error('Error en deleteImage:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error al eliminar la imagen',
      });
    }
  },

  /**
   * Actualizar imagen (eliminar anterior y subir nueva)
   */
  async updateImage(req: AuthRequest, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No se ha proporcionado ningún archivo',
        });
      }

      const { oldPublicId, folder } = req.body;
      const uploadFolder = folder || 'joyeria';

      // Si hay imagen anterior, eliminarla
      if (oldPublicId) {
        await cloudinaryService.deleteImage(oldPublicId);
      }

      // Subir nueva imagen
      const result = await cloudinaryService.uploadFromBuffer(
        req.file.buffer,
        uploadFolder,
        {
          tags: [`usuario:${req.user?.userId}`],
        }
      );

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error || 'Error al subir la nueva imagen',
        });
      }

      res.json({
        success: true,
        message: 'Imagen actualizada correctamente',
        data: {
          url: result.url,
          publicId: result.publicId,
          format: result.format,
          width: result.width,
          height: result.height,
          size: result.size,
        },
      });
    } catch (error: any) {
      console.error('Error en updateImage:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error al actualizar la imagen',
      });
    }
  },

  /**
   * Obtener información de una imagen
   */
  async getImageInfo(req: AuthRequest, res: Response) {
    try {
      const { publicId } = req.params;

      if (!publicId) {
        return res.status(400).json({
          success: false,
          message: 'publicId es requerido',
        });
      }

      // Aquí podrías obtener información adicional de la BD si es necesario
      const result = await cloudinaryService.getOptimizedUrl(publicId, 300, 300);

      res.json({
        success: true,
        data: {
          url: result,
          publicId,
        },
      });
    } catch (error: any) {
      console.error('Error en getImageInfo:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error al obtener información de la imagen',
      });
    }
  },
};