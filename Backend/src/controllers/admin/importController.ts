// Backend/src/controllers/admin/importController.ts
import { Request, Response } from 'express';
import multer, { FileFilterCallback } from 'multer';
import fs from 'fs';
import { importModel } from '../../models/importModel';
import { AuthRequest } from '../../middleware/authMiddleware';
import { ExcelImportService } from '../../services/excelImportService';

// Lista blanca de tablas que pueden ser importadas
const TABLAS_PERMITIDAS = [
  'productos',
  'categorias',
  'proveedores',
  'clientes',
  'usuarios',
  'temporadas',
  'tipos_producto',
  'promociones',
  'metodos_pago',
  'preguntas_frecuentes'
];

interface RequestWithFile extends AuthRequest {
  file?: Express.Multer.File;
}

// Configuración de multer para archivos temporales
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const allowedMimes = [
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    const allowedExt = ['.csv', '.xlsx', '.xls'];
    
    const fileExt = file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase();
    
    if (allowedMimes.includes(file.mimetype) || allowedExt.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos CSV o Excel (.xlsx, .xls)'));
    }
  }
});

export const importController = {
  uploadMiddleware: upload.single('file'),

  async getTables(req: AuthRequest, res: Response) {
    try {
      const todasLasTablas = await importModel.getTables();
      const tablasPermitidas = todasLasTablas.filter(table => 
        TABLAS_PERMITIDAS.includes(table)
      );
      
      res.json({
        success: true,
        tables: tablasPermitidas,
        total: tablasPermitidas.length
      });
    } catch (error) {
      console.error('Error getting tables:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener las tablas'
      });
    }
  },

  async getTableInfo(req: AuthRequest, res: Response) {
    try {
      const { tableName } = req.params;
      
      if (!TABLAS_PERMITIDAS.includes(tableName)) {
        return res.status(403).json({
          success: false,
          message: `La tabla "${tableName}" no está permitida para importación. Tablas permitidas: ${TABLAS_PERMITIDAS.join(', ')}`
        });
      }

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

  async previewFile(req: RequestWithFile, res: Response) {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se ha subido ningún archivo'
      });
    }

    const { tableName } = req.body;
    
    if (!TABLAS_PERMITIDAS.includes(tableName)) {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(403).json({
        success: false,
        message: `La tabla "${tableName}" no está permitida para importación`
      });
    }

    const filePath = req.file.path;
    const fileExt = req.file.originalname.substring(req.file.originalname.lastIndexOf('.')).toLowerCase();

    try {
      let headers: string[] = [];
      let data: any[] = [];
      let warnings: string[] = [];
      let totalRows = 0;

      if (fileExt === '.csv') {
        const csvData = await this.processCSV(filePath);
        headers = csvData.headers;
        data = csvData.data;
        totalRows = csvData.totalRows;
        warnings = csvData.warnings;
      } else {
        const excelData = await ExcelImportService.processExcel(filePath, tableName);
        headers = excelData.headers;
        data = excelData.data;
        totalRows = excelData.totalRows;
        warnings = excelData.warnings;
      }

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      res.json({
        success: true,
        headers,
        preview: data.slice(0, 10),
        totalRows,
        data,
        warnings: warnings.length > 0 ? warnings : undefined,
        tableName
      });

    } catch (error) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      console.error('Error processing file:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error al procesar el archivo'
      });
    }
  },

  async processCSV(filePath: string): Promise<{ headers: string[]; data: any[]; totalRows: number; warnings: string[] }> {
    const csv = require('csv-parser');
    const fs = require('fs');
    
    const results: any[] = [];
    const warnings: string[] = [];

    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data: any) => results.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    const headers = results.length > 0 ? Object.keys(results[0]) : [];

    return {
      headers,
      data: results,
      totalRows: results.length,
      warnings
    };
  },

  async importData(req: AuthRequest, res: Response) {
    const { tableName, data, columns } = req.body;

    if (!tableName || !data || !columns) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos'
      });
    }

    if (!TABLAS_PERMITIDAS.includes(tableName)) {
      return res.status(403).json({
        success: false,
        message: `La tabla "${tableName}" no está permitida para importación`
      });
    }

    if (data.length > 5000) {
      return res.status(400).json({
        success: false,
        message: 'El lote de importación no puede exceder 5000 registros'
      });
    }

    try {
      const validation = await importModel.validateData(tableName, data);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: 'Datos inválidos',
          errors: validation.errors
        });
      }

      const values = data.map((row: any) => 
        columns.map((col: string) => row[col] !== undefined ? row[col] : null)
      );

      const result = await importModel.bulkInsert(tableName, columns, values);

      res.json({
        success: result.success,
        message: result.message,
        recordsProcessed: result.recordsProcessed,
        errors: result.errors.length > 0 ? result.errors : undefined
      });

    } catch (error) {
      console.error('Error importing data:', error);
      res.status(500).json({
        success: false,
        message: 'Error al importar los datos'
      });
    }
  },

  async validateImport(req: AuthRequest, res: Response) {
    const { tableName, data } = req.body;

    if (!tableName || !data) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos'
      });
    }

    if (!TABLAS_PERMITIDAS.includes(tableName)) {
      return res.status(403).json({
        success: false,
        message: `La tabla "${tableName}" no está permitida para importación`
      });
    }

    if (data.length > 5000) {
      return res.status(400).json({
        success: false,
        message: 'El lote de validación no puede exceder 5000 registros'
      });
    }

    try {
      const validation = await importModel.validateData(tableName, data);
      
      const advertencias: string[] = [];
      
      if (tableName === 'productos') {
        data.forEach((row: any, index: number) => {
          if (!row.nombre) {
            advertencias.push(`Fila ${index + 1}: Falta el nombre del producto`);
          }
          if (!row.categoria_id) {
            advertencias.push(`Fila ${index + 1}: Falta categoria_id`);
          }
        });
      }

      if (tableName === 'proveedores') {
        data.forEach((row: any, index: number) => {
          if (!row.nombre) {
            advertencias.push(`Fila ${index + 1}: Falta el nombre del proveedor`);
          }
        });
      }

      res.json({
        success: validation.valid,
        message: validation.valid 
          ? (advertencias.length > 0 ? 'Datos válidos con advertencias' : 'Datos válidos')
          : 'Se encontraron errores en los datos',
        errors: validation.errors,
        warnings: advertencias.length > 0 ? advertencias : undefined
      });

    } catch (error) {
      console.error('Error validating data:', error);
      res.status(500).json({
        success: false,
        message: 'Error al validar los datos'
      });
    }
  },

  async getTablasPermitidas(req: AuthRequest, res: Response) {
    res.json({
      success: true,
      tablas: TABLAS_PERMITIDAS,
      total: TABLAS_PERMITIDAS.length
    });
  }
};