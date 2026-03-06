// Backend/src/middleware/uploadMiddleware.ts
import multer from 'multer';
import path from 'path';
import { Request } from 'express';

// Configuración de almacenamiento en memoria
const storage = multer.memoryStorage();

// Filtro de archivos - solo imágenes
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
  const mimetype = allowedTypes.test(file.mimetype);
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }

  cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, gif, webp, svg)'));
};

// Configuración de multer
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter,
});

// Middleware para subir una sola imagen
export const uploadSingleImage = upload.single('imagen');

// Middleware para subir múltiples imágenes
export const uploadMultipleImages = upload.array('imagenes', 10); // Máximo 10 imágenes

// Middleware para manejar errores de multer
export const handleUploadError = (err: any, req: Request, res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'El archivo es demasiado grande. Máximo 10MB',
      });
    }
    return res.status(400).json({
      success: false,
      message: `Error de subida: ${err.message}`,
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
  next();
};