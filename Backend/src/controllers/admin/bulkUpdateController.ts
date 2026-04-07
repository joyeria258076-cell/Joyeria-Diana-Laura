// Backend/src/controllers/admin/bulkUpdateController.ts
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

// Mapeo de tablas a sus esquemas
const TABLE_SCHEMAS: { [key: string]: string } = {
  productos: 'catalogo',
  proveedores: 'catalogo',
  categorias: 'catalogo',
  temporadas: 'catalogo',
  clientes: 'ventas',
};

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

export const bulkUpdateController = {
  
  uploadMiddleware: upload.single('file'),
  
  async previewUpdate(req: RequestWithFile, res: Response) {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No se ha subido ningún archivo' });
    }
    
    const { tableName } = req.body;
    const filePath = req.file.path;
    
    try {
      const validTables = ['productos', 'proveedores', 'clientes', 'categorias', 'temporadas'];
      if (!validTables.includes(tableName)) {
        throw new Error(`Tabla no válida: ${tableName}`);
      }
      
      const schema = TABLE_SCHEMAS[tableName] || 'public';
      const fullTableName = `${schema}.${tableName}`;
      
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      
      const dataSheet = workbook.getWorksheet('DATOS');
      if (!dataSheet) {
        throw new Error('El archivo no contiene la hoja "DATOS"');
      }
      
      const headerRow = dataSheet.getRow(4);
      const headers: string[] = [];
      headerRow.eachCell((cell) => {
        if (cell.value) {
          headers.push(cell.value.toString().trim());
        }
      });
      
      const idColumnIndex = headers.length + 1;
      const updates: any[] = [];
      const changes: any[] = [];
      
      for (let rowNumber = 7; rowNumber <= dataSheet.rowCount; rowNumber++) {
        const row = dataSheet.getRow(rowNumber);
        const idCell = row.getCell(idColumnIndex);
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
        
        headers.forEach((header, index) => {
          const cell = row.getCell(index + 1);
          let newValue = cell.value;
          
          if (newValue instanceof Date) {
            newValue = newValue.toISOString().split('T')[0];
          } else if (newValue && typeof newValue === 'object' && 'text' in newValue) {
            newValue = (newValue as any).text;
          } else if (newValue !== null && newValue !== undefined) {
            newValue = newValue.toString().trim();
          }
          
          if (newValue !== null && newValue !== undefined && newValue !== '') {
            updatedRow[header] = newValue;
            hasChanges = true;
          }
        });
        
        if (hasChanges && Object.keys(updatedRow).length > 1) {
          updates.push(updatedRow);
          
          const currentQuery = await pool.query(
            `SELECT * FROM ${fullTableName} WHERE id = $1`,
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
      
      fs.unlinkSync(filePath);
      
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
      console.error('Error:', error);
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
    
    const schema = TABLE_SCHEMAS[tableName] || 'public';
    const fullTableName = `${schema}.${tableName}`;
    
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
          results.errors.push(`Fila ${i + 1}: ID no válido`);
          continue;
        }
        
        try {
          const setClauses = [];
          const values = [];
          let paramIndex = 1;
          
          for (const [field, value] of Object.entries(fields)) {
            setClauses.push(`${field} = $${paramIndex}`);
            values.push(value);
            paramIndex++;
          }
          
          if (setClauses.length === 0) {
            results.failed++;
            results.errors.push(`Fila ${i + 1}: No hay campos para actualizar`);
            continue;
          }
          
          setClauses.push(`fecha_actualizacion = CURRENT_TIMESTAMP`);
          values.push(id);
          
          const query = `
            UPDATE ${fullTableName}
            SET ${setClauses.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING id
          `;
          
          const result = await client.query(query, values);
          
          if (result.rows.length > 0) {
            results.successful++;
          } else {
            results.failed++;
            results.errors.push(`Fila ${i + 1}: No se encontró el registro`);
          }
          
        } catch (err) {
          results.failed++;
          results.errors.push(`Fila ${i + 1}: ${err instanceof Error ? err.message : 'Error'}`);
        }
      }
      
      await client.query('COMMIT');
      
      res.json({
        success: true,
        data: results,
        message: `✅ Actualización: ${results.successful} exitosos, ${results.failed} fallidos`
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error al ejecutar actualización'
      });
    } finally {
      client.release();
    }
  }
};