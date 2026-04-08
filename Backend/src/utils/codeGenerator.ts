// Backend/src/utils/codeGenerator.ts
import crypto from 'node:crypto';

export class CodeGenerator {
  
  /**
   * Genera un código único para producto basado en categoría y timestamp
   * Formato: CAT-YYYYMMDD-XXXX (ej: ANI-20251215-0001)
   */
  static async generateProductCode(categoriaId: number, pool: any): Promise<string> {
    try {
      // Obtener prefijo de categoría
      const categoriaResult = await pool.query(
        'SELECT nombre FROM categorias WHERE id = $1',
        [categoriaId]
      );
      
      let prefix = 'PRD'; // Default prefix
      if (categoriaResult.rows.length > 0) {
        const categoriaNombre = categoriaResult.rows[0].nombre;
        // Tomar primeras 3 letras de la categoría en mayúsculas
        prefix = categoriaNombre
          .split(' ')
          .map((word: string) => word[0])
          .join('')
          .substring(0, 3)
          .toUpperCase();
          
        // Si tiene menos de 3 caracteres, rellenar con PRD
        if (prefix.length < 3) {
          prefix = (prefix + 'PRD').substring(0, 3);
        }
      }
      
      // Fecha actual: YYYYMMDD
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
      
      // Buscar último código con este prefijo y fecha
      const lastCodeResult = await pool.query(
        `SELECT codigo FROM productos 
         WHERE codigo LIKE $1 
         ORDER BY codigo DESC LIMIT 1`,
        [`${prefix}-${dateStr}-%`]
      );
      
      let sequence = 1;
      if (lastCodeResult.rows.length > 0) {
        const lastCode = lastCodeResult.rows[0].codigo;
        const lastSeq = Number.parseInt(lastCode.split('-')[2] || '0');
        sequence = lastSeq + 1;
      }
      
      // Formatear secuencia con 4 dígitos
      const seqStr = sequence.toString().padStart(4, '0');
      
      return `${prefix}-${dateStr}-${seqStr}`;
      
    } catch (error) {
      console.error('Error generando código de producto:', error);
      // Fallback: código basado en timestamp
      return `PRD-${Date.now()}-${crypto.randomInt(0, 1000).toString().padStart(4, '0')}`;
    }
  }

  /**
   * Genera código para otras entidades
   */
  static async generateCode(tableName: string, pool: any, prefix?: string): Promise<string> {
    const prefixes: { [key: string]: string } = {
      productos: 'PRD',
      proveedores: 'PROV',
      clientes: 'CLI',
      categorias: 'CAT',
      promociones: 'PROMO'
    };
    
    const codePrefix = prefix || prefixes[tableName] || tableName.substring(0, 4).toUpperCase();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    
    // Buscar último código
    const lastCodeResult = await pool.query(
      `SELECT codigo FROM ${tableName} 
       WHERE codigo LIKE $1 
       ORDER BY codigo DESC LIMIT 1`,
      [`${codePrefix}-${dateStr}-%`]
    );
    
    let sequence = 1;
    if (lastCodeResult.rows.length > 0) {
      const lastCode = lastCodeResult.rows[0].codigo;
      const parts = lastCode.split('-');
      const lastSeq = Number.parseInt(parts[parts.length - 1] || '0');
      sequence = lastSeq + 1;
    }
    
    return `${codePrefix}-${dateStr}-${sequence.toString().padStart(4, '0')}`;
  }
}