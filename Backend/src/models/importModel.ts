// Backend/src/models/importModel.ts
import pool from '../config/database';

export interface ImportResult {
  success: boolean;
  recordsProcessed: number;
  errors: string[];
  message: string;
}

export interface TableInfo {
  tableName: string;
  columns: string[];
}

// Objeto con métodos en lugar de exportar funciones sueltas
export const importModel = {
  // Obtener información de una tabla
  async getTableInfo(tableName: string): Promise<TableInfo | null> {
    try {
      const query = `
        SELECT 
          column_name, 
          data_type 
        FROM information_schema.columns 
        WHERE table_name = $1 
        ORDER BY ordinal_position
      `;
      
      const result = await pool.query(query, [tableName]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return {
        tableName,
        columns: result.rows.map(row => row.column_name)
      };
    } catch (error) {
      console.error('Error getting table info:', error);
      throw error;
    }
  },

  // Obtener lista de tablas disponibles
  async getTables(): Promise<string[]> {
    try {
      const query = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `;
      
      const result = await pool.query(query);
      return result.rows.map(row => row.table_name);
    } catch (error) {
      console.error('Error getting tables:', error);
      throw error;
    }
  },

  // Insertar datos en lote
  async bulkInsert(tableName: string, columns: string[], data: any[][]): Promise<ImportResult> {
    const client = await pool.connect();
    const errors: string[] = [];
    let recordsProcessed = 0;
    
    try {
      await client.query('BEGIN');
      
      // Construir la consulta parametrizada
      const placeholders = data.map((_, rowIndex) => 
        `(${columns.map((_, colIndex) => `$${rowIndex * columns.length + colIndex + 1}`).join(', ')})`
      ).join(', ');
      
      const values = data.flat();
      const query = `
        INSERT INTO ${tableName} (${columns.join(', ')})
        VALUES ${placeholders}
        ON CONFLICT DO NOTHING
      `;
      
      await client.query(query, values);
      recordsProcessed = data.length;
      
      await client.query('COMMIT');
      
      return {
        success: true,
        recordsProcessed,
        errors,
        message: `Se importaron ${recordsProcessed} registros exitosamente`
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error en bulk insert:', error);
      errors.push(error instanceof Error ? error.message : 'Error desconocido');
      
      return {
        success: false,
        recordsProcessed,
        errors,
        message: 'Error al importar los datos'
      };
    } finally {
      client.release();
    }
  },

  // Validar datos antes de insertar
  async validateData(tableName: string, data: any[]): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      const tableInfo = await this.getTableInfo(tableName);
      if (!tableInfo) {
        errors.push(`La tabla ${tableName} no existe`);
        return { valid: false, errors };
      }
      
      // Validaciones básicas
      data.forEach((row, index) => {
        if (typeof row !== 'object' || row === null) {
          errors.push(`Fila ${index + 1}: formato inválido`);
        }
      });
      
      return {
        valid: errors.length === 0,
        errors
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Error de validación');
      return { valid: false, errors };
    }
  }
};