// Backend/src/utils/queryBuilder.ts
export interface FilterCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in' | 'between';
  value: any;
  value2?: any;
}

export interface ExportFilters {
  tableName: string;
  conditions: FilterCondition[];
  selectFields?: string[];
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

export class QueryBuilder {
  
  static buildSelectQuery(filters: ExportFilters): { query: string; params: any[] } {
    const { tableName, conditions, selectFields, orderBy, orderDirection, limit, offset } = filters;
    
    let selectClause = '*';
    if (selectFields && selectFields.length > 0) {
      selectClause = selectFields.join(', ');
    }
    
    let whereClause = '';
    const params: any[] = [];
    let paramIndex = 1;
    
    if (conditions && conditions.length > 0) {
      const conditionStrings = conditions.map(cond => {
        return this.buildCondition(cond, params, paramIndex++);
      });
      whereClause = `WHERE ${conditionStrings.join(' AND ')}`;
    }
    
    let orderClause = '';
    if (orderBy) {
      orderClause = `ORDER BY ${orderBy} ${orderDirection || 'ASC'}`;
    }
    
    let limitClause = '';
    if (limit) {
      limitClause = `LIMIT $${paramIndex++}`;
      params.push(limit);
      
      if (offset) {
        limitClause += ` OFFSET $${paramIndex++}`;
        params.push(offset);
      }
    }
    
    const query = `
      SELECT ${selectClause}
      FROM ${tableName}
      ${whereClause}
      ${orderClause}
      ${limitClause}
    `;
    
    return { query, params };
  }
  
  private static buildCondition(cond: FilterCondition, params: any[], paramIndex: number): string {
    const { field, operator, value, value2 } = cond;
    
    switch (operator) {
      case 'eq':
        params.push(value);
        return `${field} = $${paramIndex}`;
      case 'neq':
        params.push(value);
        return `${field} != $${paramIndex}`;
      case 'gt':
        params.push(value);
        return `${field} > $${paramIndex}`;
      case 'gte':
        params.push(value);
        return `${field} >= $${paramIndex}`;
      case 'lt':
        params.push(value);
        return `${field} < $${paramIndex}`;
      case 'lte':
        params.push(value);
        return `${field} <= $${paramIndex}`;
      case 'like':
        params.push(`%${value}%`);
        return `${field} ILIKE $${paramIndex}`;
      case 'in':
        if (Array.isArray(value)) {
          const placeholders = value.map((_, i) => `$${paramIndex + i}`).join(', ');
          params.push(...value);
          return `${field} IN (${placeholders})`;
        }
        params.push(value);
        return `${field} = $${paramIndex}`;
      case 'between':
        params.push(value, value2);
        return `${field} BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      default:
        throw new Error(`Operador no soportado: ${operator}`);
    }
  }
}