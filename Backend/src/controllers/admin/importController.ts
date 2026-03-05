// Backend/src/controllers/admin/importController.ts
import { Request, Response } from 'express';
import multer from 'multer';
import csv from 'csv-parser';
import fs from 'fs';
import { importModel } from '../../models/importModel';
import { AuthRequest } from '../../middleware/authMiddleware';

// Configuración de multer para archivos temporales
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos CSV'));
    }
  }
});

export const importController = {
  // Middleware para upload
  uploadMiddleware: upload.single('file'),

  // Obtener todas las tablas disponibles
  async getTables(req: AuthRequest, res: Response) {
    try {
      const tables = await importModel.getTables();
      res.json({
        success: true,
        tables
      });
    } catch (error) {
      console.error('Error getting tables:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener las tablas'
      });
    }
  },

  // Obtener información de una tabla específica
  async getTableInfo(req: AuthRequest, res: Response) {
    try {
      const { tableName } = req.params;
      const tableInfo = await importModel.getTableInfo(tableName);
      
      if (!tableInfo) {
        return res.status(404).json({
          success: false,
          message: `La tabla ${tableName} no existe`
        });
      }
      
      res.json({
        success: true,
        tableInfo
      });
    } catch (error) {
      console.error('Error getting table info:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener información de la tabla'
      });
    }
  },

  // Procesar archivo CSV y mostrar vista previa
  async previewCSV(req: AuthRequest, res: Response) {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se ha subido ningún archivo'
      });
    }

    const results: any[] = [];
    const filePath = req.file.path;

    try {
      await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', (data) => results.push(data))
          .on('end', resolve)
          .on('error', reject);
      });

      // Eliminar archivo temporal
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Devolver primeras 10 filas como preview
      res.json({
        success: true,
        headers: results.length > 0 ? Object.keys(results[0]) : [],
        preview: results.slice(0, 10),
        totalRows: results.length,
        data: results // Enviar todos los datos para importar
      });

    } catch (error) {
      // Limpiar archivo en caso de error
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      console.error('Error processing CSV:', error);
      res.status(500).json({
        success: false,
        message: 'Error al procesar el archivo CSV'
      });
    }
  },

  // Importar datos a la base de datos
  async importData(req: AuthRequest, res: Response) {
    const { tableName, data, columns } = req.body;

    if (!tableName || !data || !columns) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos'
      });
    }

    try {
      // Validar datos
      const validation = await importModel.validateData(tableName, data);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: 'Datos inválidos',
          errors: validation.errors
        });
      }

      // Convertir datos a formato para inserción
      const values = data.map((row: any) => 
        columns.map((col: string) => row[col])
      );

      // Insertar datos
      const result = await importModel.bulkInsert(tableName, columns, values);

      res.json({
        success: result.success,
        message: result.message,
        recordsProcessed: result.recordsProcessed,
        errors: result.errors
      });

    } catch (error) {
      console.error('Error importing data:', error);
      res.status(500).json({
        success: false,
        message: 'Error al importar los datos'
      });
    }
  },

  // Validar datos sin importar
  async validateImport(req: AuthRequest, res: Response) {
    const { tableName, data } = req.body;

    if (!tableName || !data) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos'
      });
    }

    try {
      const validation = await importModel.validateData(tableName, data);
      
      res.json({
        success: validation.valid,
        message: validation.valid ? 'Datos válidos' : 'Se encontraron errores',
        errors: validation.errors
      });

    } catch (error) {
      console.error('Error validating data:', error);
      res.status(500).json({
        success: false,
        message: 'Error al validar los datos'
      });
    }
  }
};