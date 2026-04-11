// Backend/src/controllers/admin/bulkUpdateController.ts
import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/authMiddleware';
import multer, { FileFilterCallback } from 'multer';
import ExcelJS from 'exceljs';
import fs from 'fs';
import pool from '../../config/database';

interface RequestWithFile extends AuthRequest {
  file?: Express.Multer.File;
}

const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const isExcel = file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                    file.originalname.endsWith('.xlsx');
    if (isExcel) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos Excel (.xlsx)'));
    }
  }
});

// Columnas que NO deben ser actualizables (auto-generadas o desnormalizadas)
const NON_UPDATABLE_COLUMNS: { [key: string]: string[] } = {
  productos: ['id', 'codigo', 'fecha_creacion', 'fecha_actualizacion', 'categoria_nombre', 'proveedor_nombre'],
  proveedores: ['id', 'fecha_creacion', 'fecha_actualizacion'],
  clientes: ['id', 'fecha_creacion', 'fecha_actualizacion'],
  categorias: ['id', 'fecha_creacion', 'fecha_actualizacion'],
  temporadas: ['id', 'fecha_creacion', 'fecha_actualizacion'],
  tipos_producto: ['id', 'fecha_creacion'],
};

export const bulkUpdateController = {
  
  uploadMiddleware: upload.single('file'),
  
  // Descargar plantilla para actualización masiva
  async downloadTemplate(req: AuthRequest, res: Response) {
    const { tableName } = req.params;
    const validTables = ['productos', 'proveedores', 'categorias', 'clientes', 'tipos_producto', 'temporadas'];

    if (!validTables.includes(tableName)) {
      return res.status(400).json({ success: false, message: `Tabla no válida. Permitidas: ${validTables.join(', ')}` });
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const ws = workbook.addWorksheet('ACTUALIZACION', {
        properties: { tabColor: { argb: 'FFECB2C3' } }
      });

      // Obtener columnas actualizables de la tabla
      const columnsQuery = `
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = $1 
        AND column_name NOT IN ('id', 'fecha_creacion', 'fecha_actualizacion', 'codigo', 'categoria_nombre', 'proveedor_nombre')
        ORDER BY ordinal_position
      `;
      const columnsResult = await pool.query(columnsQuery, [tableName]);
      const columns = columnsResult.rows.map(row => row.column_name);

      // Título
      ws.mergeCells(1, 1, 1, columns.length + 1);
      const titleCell = ws.getCell('A1');
      titleCell.value = `📦 ACTUALIZACIÓN MASIVA - Tabla: ${tableName.toUpperCase()}`;
      titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A2E' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getRow(1).height = 34;

      // Subtítulo
      ws.mergeCells(2, 1, 2, columns.length + 1);
      const subCell = ws.getCell('A2');
      subCell.value = '★ La columna "id" es OBLIGATORIA | Solo completa las columnas que quieras actualizar';
      subCell.font = { italic: true, size: 10, color: { argb: 'FFECB2C3' } };
      subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16213E' } };
      subCell.alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getRow(2).height = 20;

      // Franja decorativa
      ws.mergeCells(3, 1, 3, columns.length + 1);
      const accentCell = ws.getCell('A3');
      accentCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECB2C3' } };
      ws.getRow(3).height = 5;

      // Encabezados (fila 4)
      const headerRow = ws.getRow(4);
      headerRow.height = 24;
      
      // Columna ID (requerida)
      let idCell = ws.getCell(4, 1);
      idCell.value = 'id';
      idCell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      idCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B4332' } };
      idCell.alignment = { horizontal: 'center', vertical: 'middle' };
      idCell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };

      // Otras columnas
      columns.forEach((col, idx) => {
        const cell = ws.getCell(4, idx + 2);
        cell.value = col;
        cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF37474F' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      });

      // Fila de ejemplo (fila 5)
      const exampleRow = ws.getRow(5);
      exampleRow.height = 20;
      
      // Obtener un ejemplo de la tabla
      const exampleQuery = await pool.query(`SELECT * FROM ${tableName} LIMIT 1`);
      if (exampleQuery.rows.length > 0) {
        const example = exampleQuery.rows[0];
        const idCellExample = ws.getCell(5, 1);
        idCellExample.value = example.id;
        idCellExample.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF9C4' } };
        idCellExample.font = { italic: true, color: { argb: 'FF4E342E' } };
        
        columns.forEach((col, idx) => {
          const cell = ws.getCell(5, idx + 2);
          const value = example[col];
          cell.value = value !== null && value !== undefined ? String(value) : '...';
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF9C4' } };
          cell.font = { italic: true, color: { argb: 'FF4E342E' } };
        });
      }

      // Nota importante (fila 6)
      ws.mergeCells(6, 1, 6, columns.length + 1);
      const noteCell = ws.getCell('A6');
      noteCell.value = '📌 IMPORTANTE: No incluyas las columnas: id, codigo, fecha_creacion, fecha_actualizacion, categoria_nombre, proveedor_nombre (se generan automáticamente)';
      noteCell.font = { italic: true, size: 9, color: { argb: 'FF666666' } };
      noteCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
      ws.getRow(6).height = 30;

      // Filas de datos (desde fila 7 hasta 207)
      for (let rowNum = 7; rowNum <= 207; rowNum++) {
        const row = ws.getRow(rowNum);
        row.height = 18;
        const bg = rowNum % 2 === 0 ? 'FFFFFFFF' : 'FFFFF8FB';
        
        for (let colNum = 1; colNum <= columns.length + 1; colNum++) {
          const cell = ws.getCell(rowNum, colNum);
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
          cell.border = {
            top: { style: 'hair', color: { argb: 'FFD0D0D0' } },
            bottom: { style: 'hair', color: { argb: 'FFD0D0D0' } },
            left: { style: 'hair', color: { argb: 'FFD0D0D0' } },
            right: { style: 'hair', color: { argb: 'FFD0D0D0' } },
          };
        }
      }

      // Anchos de columna
      ws.getColumn(1).width = 10;
      columns.forEach((_, idx) => {
        ws.getColumn(idx + 2).width = 25;
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=bulk_update_${tableName}_${Date.now()}.xlsx`);
      await workbook.xlsx.write(res);
      res.end();

    } catch (error) {
      console.error('Error downloading template:', error);
      res.status(500).json({ success: false, message: 'Error al generar la plantilla' });
    }
  },
  
  async previewUpdate(req: RequestWithFile, res: Response) {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No se ha subido ningún archivo' });
    }
    
    const { tableName } = req.body;
    const filePath = req.file.path;
    
    try {
      const validTables = ['productos', 'proveedores', 'clientes', 'categorias', 'temporadas', 'tipos_producto'];
      if (!validTables.includes(tableName)) {
        throw new Error(`Tabla no válida: ${tableName}. Permitidas: ${validTables.join(', ')}`);
      }
      
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      
      // Buscar la hoja (puede ser 'DATOS' o 'ACTUALIZACION')
      let dataSheet = workbook.getWorksheet('DATOS');
      if (!dataSheet) {
        dataSheet = workbook.getWorksheet('ACTUALIZACION');
      }
      if (!dataSheet) {
        throw new Error('El archivo no contiene la hoja "DATOS" o "ACTUALIZACION"');
      }
      
      // Leer encabezados (fila 4)
      const headerRow = dataSheet.getRow(4);
      const headers: string[] = [];
      headerRow.eachCell((cell) => {
        if (cell.value) {
          headers.push(cell.value.toString().trim());
        }
      });
      
      // Verificar que existe la columna id
      if (!headers.includes('id')) {
        throw new Error('La columna "id" es obligatoria en el archivo');
      }
      
      // Filtrar columnas no actualizables
      const nonUpdatable = NON_UPDATABLE_COLUMNS[tableName] || [];
      const validHeaders = headers.filter(h => h !== 'id' && !nonUpdatable.includes(h));
      
      const updates: any[] = [];
      const changes: any[] = [];
      
      // Leer datos desde fila 7 en adelante
      for (let rowNumber = 7; rowNumber <= dataSheet.rowCount; rowNumber++) {
        const row = dataSheet.getRow(rowNumber);
        
        // Obtener el ID (primera columna)
        const idCell = row.getCell(1);
        let idValue = idCell.value;
        let id: number | null = null;
        
        if (idValue) {
          if (typeof idValue === 'object' && idValue !== null && 'result' in idValue) {
            idValue = (idValue as any).result;
          }
          const numId = Number(idValue);
          if (!isNaN(numId)) {
            id = numId;
          }
        }
        
        if (!id) continue;
        
        const updatedRow: any = { id };
        let hasChanges = false;
        
        // Solo procesar columnas válidas
        validHeaders.forEach((header) => {
          const colIndex = headers.indexOf(header) + 1;
          const cell = row.getCell(colIndex);
          let newValue = cell.value;
          
          if (newValue instanceof Date) {
            newValue = newValue.toISOString().split('T')[0];
          } else if (newValue && typeof newValue === 'object' && 'text' in newValue) {
            newValue = (newValue as any).text;
          } else if (newValue !== null && newValue !== undefined && newValue !== '') {
            newValue = newValue.toString().trim();
          } else {
            return; // Valor vacío, no actualizar
          }
          
          updatedRow[header] = newValue;
          hasChanges = true;
        });
        
        if (hasChanges && Object.keys(updatedRow).length > 1) {
          updates.push(updatedRow);
          
          // Obtener datos actuales para preview
          const currentQuery = await pool.query(
            `SELECT * FROM ${tableName} WHERE id = $1`,
            [id]
          );
          
          if (currentQuery.rows.length > 0) {
            changes.push({
              id,
              current: currentQuery.rows[0],
              updated: updatedRow
            });
          }
        }
      }
      
      // Limpiar archivo temporal
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No se encontraron datos para actualizar. Asegúrate de tener IDs válidos y al menos un campo para actualizar.'
        });
      }
      
      res.json({
        success: true,
        data: {
          totalRows: updates.length,
          changes: changes.slice(0, 10),
          updates
        }
      });
      
    } catch (error) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      console.error('Error in previewUpdate:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error al procesar archivo'
      });
    }
  },
  
  async executeUpdate(req: AuthRequest, res: Response) {
    const { tableName, updates } = req.body;
    
    if (!tableName || !updates || !Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ success: false, message: 'Datos inválidos' });
    }
    
    const validTables = ['productos', 'proveedores', 'clientes', 'categorias', 'temporadas', 'tipos_producto'];
    if (!validTables.includes(tableName)) {
      return res.status(400).json({ success: false, message: `Tabla no válida: ${tableName}` });
    }
    
    const nonUpdatable = NON_UPDATABLE_COLUMNS[tableName] || [];
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const results = {
        total: updates.length,
        successful: 0,
        failed: 0,
        errors: [] as string[]
      };
      
      for (let i = 0; i < updates.length; i++) {
        const update = updates[i];
        const { id, ...fields } = update;
        
        if (!id || typeof id !== 'number') {
          results.failed++;
          results.errors.push(`Fila ${i + 1}: ID no válido (${id})`);
          continue;
        }
        
        // Filtrar campos no actualizables
        const updatableFields: any = {};
        for (const [key, value] of Object.entries(fields)) {
          if (!nonUpdatable.includes(key)) {
            updatableFields[key] = value;
          }
        }
        
        if (Object.keys(updatableFields).length === 0) {
          results.failed++;
          results.errors.push(`ID ${id}: No hay campos actualizables (todos son auto-generados)`);
          continue;
        }
        
        // Verificar que el registro existe
        const checkExist = await client.query(
          `SELECT id FROM ${tableName} WHERE id = $1`,
          [id]
        );
        
        if (checkExist.rows.length === 0) {
          results.failed++;
          results.errors.push(`ID ${id}: No existe en la tabla ${tableName}`);
          continue;
        }
        
        try {
          const setClauses = [];
          const values = [];
          let paramIndex = 1;
          
          for (const [field, value] of Object.entries(updatableFields)) {
            setClauses.push(`${field} = $${paramIndex}`);
            values.push(value);
            paramIndex++;
          }
          
          setClauses.push(`fecha_actualizacion = CURRENT_TIMESTAMP`);
          values.push(id);
          
          const query = `
            UPDATE ${tableName}
            SET ${setClauses.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING id
          `;
          
          const result = await client.query(query, values);
          
          if (result.rows.length > 0) {
            results.successful++;
          } else {
            results.failed++;
            results.errors.push(`ID ${id}: No se pudo actualizar`);
          }
          
        } catch (err) {
          results.failed++;
          const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
          results.errors.push(`ID ${id}: ${errorMsg}`);
          
          // Si hay un error, hacemos ROLLBACK y salimos
          await client.query('ROLLBACK');
          return res.status(500).json({
            success: false,
            message: `Error en ID ${id}: ${errorMsg}`,
            errors: results.errors
          });
        }
      }
      
      await client.query('COMMIT');
      
      res.json({
        success: results.failed === 0,
        data: results,
        message: results.failed === 0 
          ? `✅ Se actualizaron ${results.successful} registros exitosamente`
          : `⚠️ Se actualizaron ${results.successful} registros con ${results.failed} errores`
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error in executeUpdate:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error al ejecutar actualización'
      });
    } finally {
      client.release();
    }
  }
};