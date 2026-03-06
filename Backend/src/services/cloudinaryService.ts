// Backend/src/services/cloudinaryService.ts
import { v2 as cloudinary } from 'cloudinary';
import { UploadApiResponse, UploadApiOptions } from 'cloudinary';
import streamifier from 'streamifier';

export interface UploadResult {
  success: boolean;
  url?: string;
  publicId?: string;
  format?: string;
  width?: number;
  height?: number;
  size?: number;
  error?: string;
}

export interface DeleteResult {
  success: boolean;
  message: string;
}

class CloudinaryService {
  /**
   * Subir una imagen desde un buffer (desde multer)
   */
  async uploadFromBuffer(
    fileBuffer: Buffer,
    folder: string = 'joyeria',
    options?: UploadApiOptions
  ): Promise<UploadResult> {
    try {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: 'auto',
            ...options,
          },
          (error, result) => {
            if (error) {
              console.error('❌ Error subiendo a Cloudinary:', error);
              resolve({
                success: false,
                error: error.message,
              });
            } else if (result) {
              console.log('✅ Imagen subida a Cloudinary:', result.public_id);
              resolve({
                success: true,
                url: result.secure_url,
                publicId: result.public_id,
                format: result.format,
                width: result.width,
                height: result.height,
                size: result.bytes,
              });
            }
          }
        );

        streamifier.createReadStream(fileBuffer).pipe(uploadStream);
      });
    } catch (error: any) {
      console.error('❌ Error en uploadFromBuffer:', error);
      return {
        success: false,
        error: error.message || 'Error al subir la imagen',
      };
    }
  }

  /**
   * Subir una imagen desde una URL
   */
  async uploadFromUrl(
    imageUrl: string,
    folder: string = 'joyeria',
    options?: UploadApiOptions
  ): Promise<UploadResult> {
    try {
      const result = await cloudinary.uploader.upload(imageUrl, {
        folder,
        ...options,
      });

      console.log('✅ Imagen subida desde URL:', result.public_id);
      return {
        success: true,
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
        size: result.bytes,
      };
    } catch (error: any) {
      console.error('❌ Error subiendo desde URL:', error);
      return {
        success: false,
        error: error.message || 'Error al subir la imagen desde URL',
      };
    }
  }

  /**
   * Eliminar una imagen por su publicId
   */
  async deleteImage(publicId: string): Promise<DeleteResult> {
    try {
      if (!publicId) {
        return {
          success: false,
          message: 'publicId no proporcionado',
        };
      }

      const result = await cloudinary.uploader.destroy(publicId);
      
      if (result.result === 'ok') {
        console.log('✅ Imagen eliminada de Cloudinary:', publicId);
        return {
          success: true,
          message: 'Imagen eliminada correctamente',
        };
      } else {
        console.warn('⚠️ No se pudo eliminar la imagen:', publicId);
        return {
          success: false,
          message: 'No se pudo eliminar la imagen',
        };
      }
    } catch (error: any) {
      console.error('❌ Error eliminando imagen:', error);
      return {
        success: false,
        message: error.message || 'Error al eliminar la imagen',
      };
    }
  }

  /**
   * Eliminar múltiples imágenes
   */
  async deleteMultipleImages(publicIds: string[]): Promise<{
    success: boolean;
    deleted: string[];
    failed: string[];
  }> {
    const deleted: string[] = [];
    const failed: string[] = [];

    for (const publicId of publicIds) {
      const result = await this.deleteImage(publicId);
      if (result.success) {
        deleted.push(publicId);
      } else {
        failed.push(publicId);
      }
    }

    return {
      success: failed.length === 0,
      deleted,
      failed,
    };
  }

  /**
   * Obtener URL optimizada para diferentes tamaños
   */
  getOptimizedUrl(publicId: string, width?: number, height?: number): string {
    if (!publicId) return '';
    
    let transformation = '';
    if (width && height) {
      transformation = `c_fill,w_${width},h_${height}/`;
    } else if (width) {
      transformation = `c_scale,w_${width}/`;
    } else if (height) {
      transformation = `c_scale,h_${height}/`;
    }

    return cloudinary.url(publicId, {
      transformation: transformation ? [{ raw_transformation: transformation }] : [],
      secure: true,
    });
  }

  /**
   * Extraer publicId de una URL de Cloudinary
   */
  extractPublicIdFromUrl(url: string): string | null {
    if (!url || !url.includes('cloudinary.com')) {
      return null;
    }

    try {
      // URL típica: https://res.cloudinary.com/nube/image/upload/v123456/folder/image.jpg
      const matches = url.match(/\/upload\/(?:v\d+\/)?(.+?)\./);
      if (matches && matches[1]) {
        return matches[1];
      }
      return null;
    } catch (error) {
      console.error('Error extrayendo publicId:', error);
      return null;
    }
  }

  /**
   * Verificar si una URL es de Cloudinary - ✅ CORREGIDO
   */
  isCloudinaryUrl(url: string): boolean {
    // ✅ Forma explícita y clara
    if (!url) return false;
    return url.includes('cloudinary.com');
  }
}

export default new CloudinaryService();