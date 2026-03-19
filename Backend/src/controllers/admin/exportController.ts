// Backend/src/controllers/admin/exportController.ts
import { Response } from 'express';
import { AuthRequest } from '../../middleware/authMiddleware';
import { ExportService } from '../../services/exportService';
import { FilterCondition } from '../../utils/queryBuilder';
import { QueryBuilder } from '../../utils/queryBuilder'; // 👈 IMPORT en lugar de require
import pool from '../../config/database';

export const exportController = {
  
  async getTableMetadata(req: AuthRequest, res: Response) {
    try {
      const { tableName } = req.params;
      
      const validTables = ['productos', 'proveedores', 'clientes', 'categorias', 'temporadas', 'tipos_producto'];
      
      if (!validTables.includes(tableName)) {
        return res.status(400).json({
          success: false,
          message: `Tabla no válida. Tablas permitidas: ${validTables.join(', ')}`
        });
      }
      
      const metadata = await ExportService.getTableMetadata(tableName);
      
      const filterOptions: any = {};
      
      if (tableName === 'productos') {
        const categorias = await pool.query(
          'SELECT id, nombre FROM categorias WHERE activo = true ORDER BY nombre'
        );
        filterOptions.categorias = categorias.rows;
        
        const proveedores = await pool.query(
          'SELECT id, nombre FROM proveedores WHERE activo = true ORDER BY nombre'
        );
        filterOptions.proveedores = proveedores.rows;
        
        const temporadas = await pool.query(
          'SELECT id, nombre FROM temporadas WHERE activo = true ORDER BY nombre'
        );
        filterOptions.temporadas = temporadas.rows;
      }
      
      res.json({
        success: true,
        data: { metadata, filterOptions }
      });
      
    } catch (error) {
      console.error('❌ [getTableMetadata] Error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error al obtener metadatos'
      });
    }
  },
  
  async exportData(req: AuthRequest, res: Response) {
    try {
      const { tableName, filters, includeRelations } = req.body;
      
      if (!tableName) {
        return res.status(400).json({ success: false, message: 'Falta el nombre de la tabla' });
      }
      
      let parsedFilters: FilterCondition[] = filters;
      if (typeof filters === 'string') {
        parsedFilters = JSON.parse(filters);
      }
      
      const workbook = await ExportService.exportData({
        tableName,
        filters: parsedFilters || [],
        includeRelations: includeRelations || false,
        maxRows: 10000
      });
      
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=export_${tableName}_${Date.now()}.xlsx`
      );
      
      await workbook.xlsx.write(res);
      res.end();
      
    } catch (error) {
      console.error('❌ [exportData] Error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error al exportar datos'
      });
    }
  },
  
  async previewExport(req: AuthRequest, res: Response) {
    try {
      const { tableName, filters } = req.body;
      
      let parsedFilters: FilterCondition[] = filters;
      if (typeof filters === 'string') {
        parsedFilters = JSON.parse(filters);
      }
      
      // 👈 AHORA USA IMPORT en lugar de require
      const { query, params } = QueryBuilder.buildSelectQuery({
        tableName,
        conditions: parsedFilters || [],
        selectFields: ['COUNT(*) as total']
      });
      
      const result = await pool.query(query, params);
      const row = result.rows[0] as any;
      const totalStr = row?.total || row?.count || '0';
      const total = parseInt(totalStr);
      
      const sampleQuery = QueryBuilder.buildSelectQuery({
        tableName,
        conditions: parsedFilters || [],
        limit: 5
      });
      
      const sampleResult = await pool.query(sampleQuery.query, sampleQuery.params);
      
      res.json({
        success: true,
        data: {
          total,
          sample: sampleResult.rows,
          filters: parsedFilters
        }
      });
      
    } catch (error) {
      console.error('❌ [previewExport] Error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error al previsualizar'
      });
    }
  }
};