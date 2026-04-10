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
  'preguntas_frecuentes',
  'ventas',           // ✅ NUEVA: Permitir importación de ventas
  'detalle_ventas'    // ✅ NUEVA: Permitir importación de detalle_ventas
];

interface RequestWithFile extends AuthRequest {
  file?: Express.Multer.File;
}

// Configuración de multer para archivos temporales
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    // Aceptar tanto CSV como Excel
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
  // Middleware para upload
  uploadMiddleware: upload.single('file'),

  // Obtener todas las tablas disponibles (solo las permitidas)
  async getTables(req: AuthRequest, res: Response) {
    try {
      const todasLasTablas = await importModel.getTables();
      // Filtrar solo las tablas permitidas
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

  // Obtener información de una tabla específica (solo si está permitida)
  async getTableInfo(req: AuthRequest, res: Response) {
    try {
      const { tableName } = req.params;
      
      // Verificar si la tabla está permitida
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

  // Procesar archivo (CSV o Excel) y validar columnas requeridas
  async previewFile(req: RequestWithFile, res: Response) {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se ha subido ningún archivo'
      });
    }

    const { tableName } = req.body;
    
    // Verificar si la tabla está permitida
    if (!TABLAS_PERMITIDAS.includes(tableName)) {
      // Limpiar archivo temporal
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

      // Procesar según tipo de archivo
      if (fileExt === '.csv') {
        // Mantener compatibilidad con CSV
        const csvData = await this.processCSV(filePath);
        headers = csvData.headers;
        data = csvData.data;
        totalRows = csvData.totalRows;
        warnings = csvData.warnings;
      } else {
        // Procesar Excel (.xlsx, .xls)
        const excelData = await ExcelImportService.processExcel(filePath, tableName);
        headers = excelData.headers;
        data = excelData.data;
        totalRows = excelData.totalRows;
        warnings = excelData.warnings;
      }

      // Eliminar archivo temporal
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Devolver preview
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
      // Limpiar archivo en caso de error
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

  // Helper para procesar CSV (mantener compatibilidad)
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

  // Importar datos a la base de datos (con validaciones adicionales)
  async importData(req: AuthRequest, res: Response) {
    const { tableName, data, columns } = req.body;

    if (!tableName || !data || !columns) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos'
      });
    }

    // Verificar si la tabla está permitida
    if (!TABLAS_PERMITIDAS.includes(tableName)) {
      return res.status(403).json({
        success: false,
        message: `La tabla "${tableName}" no está permitida para importación`
      });
    }

    // Validar tamaño del lote
    if (data.length > 5000) {
      return res.status(400).json({
        success: false,
        message: 'El lote de importación no puede exceder 5000 registros'
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

      // Convertir datos a formato para inserción (array de arrays)
      const values = data.map((row: any) => 
        columns.map((col: string) => row[col] !== undefined ? row[col] : null)
      );

      const XSS_PATTERN = /<\s*script|javascript:|on\w+\s*=|<\s*iframe|<\s*object|<\s*embed/i;
      const SQL_INJECTION_PATTERN = /('(\s)*(or|and)(\s)*')|(-{2})|(\bUNION\b.*\bSELECT\b)|(\bDROP\b.*\bTABLE\b)|(\bINSERT\b.*\bINTO\b)|(\bDELETE\b.*\bFROM\b)|(;(\s)*DROP)|(xp_)/i;

      for (const row of data) {
        for (const col of columns) {
          const val = row[col];
          if (typeof val === 'string' && (XSS_PATTERN.test(val) || SQL_INJECTION_PATTERN.test(val))) {
            return res.status(400).json({
              success: false,
              message: `Dato inválido detectado en columna "${col}": posible XSS o SQLi`
            });
          }
        }
      }
      
      // Insertar datos usando el nuevo bulkInsert que maneja auto-generados
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

  // ✅ MÉTODO AGREGADO: Validar datos sin importar
  async validateImport(req: AuthRequest, res: Response) {
    const { tableName, data } = req.body;

    if (!tableName || !data) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos'
      });
    }

    // Verificar si la tabla está permitida
    if (!TABLAS_PERMITIDAS.includes(tableName)) {
      return res.status(403).json({
        success: false,
        message: `La tabla "${tableName}" no está permitida para importación`
      });
    }

    // Validar tamaño del lote
    if (data.length > 5000) {
      return res.status(400).json({
        success: false,
        message: 'El lote de validación no puede exceder 5000 registros'
      });
    }

    try {
      const validation = await importModel.validateData(tableName, data);
      
      // Validaciones adicionales específicas por tabla
      const advertencias: string[] = [];
      
      if (tableName === 'productos') {
        // Verificar que los registros tengan los campos mínimos
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

      // ✅ VALIDACIONES PARA VENTAS
      if (tableName === 'ventas') {
        data.forEach((row: any, index: number) => {
          if (!row.cliente_id && !row.cliente_nombre_completo) {
            advertencias.push(`Fila ${index + 1}: Se recomienda tener cliente_id o cliente_nombre_completo`);
          }
          if (!row.metodo_pago_id) {
            advertencias.push(`Fila ${index + 1}: metodo_pago_id es recomendado`);
          }
          if (!row.total && !row.subtotal) {
            advertencias.push(`Fila ${index + 1}: Se recomienda total o subtotal`);
          }
        });
      }

      // ✅ VALIDACIONES PARA DETALLE_VENTAS
      if (tableName === 'detalle_ventas') {
        data.forEach((row: any, index: number) => {
          if (!row.venta_id) {
            advertencias.push(`Fila ${index + 1}: venta_id es obligatorio`);
          }
          if (!row.producto_id && !row.producto_codigo) {
            advertencias.push(`Fila ${index + 1}: Se requiere producto_id o producto_codigo`);
          }
          if (!row.cantidad || row.cantidad <= 0) {
            advertencias.push(`Fila ${index + 1}: cantidad debe ser mayor a 0`);
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

  // Obtener lista de tablas permitidas
  async getTablasPermitidas(req: AuthRequest, res: Response) {
    res.json({
      success: true,
      tablas: TABLAS_PERMITIDAS,
      total: TABLAS_PERMITIDAS.length
    });
  }
};