// Frontend/src/screens/admin/basedatos/components/FilterBuilder.tsx
import React, { useState, useEffect } from 'react';
import { FiPlus, FiX, FiFilter } from 'react-icons/fi';
import './FilterBuilder.css';

interface FilterCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in' | 'between';
  value: any;
  value2?: any;
}

interface FilterBuilderProps {
  tableName: string;
  columns: Array<any>;
  filterOptions?: any;
  onFiltersChange: (filters: FilterCondition[]) => void;
}

const operatorLabels: any = {
  eq: '= igual a', neq: '≠ diferente', gt: '> mayor', gte: '≥ mayor o igual',
  lt: '< menor', lte: '≤ menor o igual', like: 'contiene', in: 'en lista', between: 'entre'
};

const FilterBuilder: React.FC<FilterBuilderProps> = ({ columns, filterOptions, onFiltersChange }) => {
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [availableColumns, setAvailableColumns] = useState(columns);

  useEffect(() => {
    setAvailableColumns(columns.filter((col: any) => !['id', 'fecha_creacion', 'fecha_actualizacion'].includes(col.name)));
  }, [columns]);

  const addFilter = () => {
    if (availableColumns.length > 0) {
      const newFilter: FilterCondition = { field: availableColumns[0].name, operator: 'eq', value: '' };
      const newFilters = [...filters, newFilter];
      setFilters(newFilters);
      onFiltersChange(newFilters);
    }
  };

  const removeFilter = (index: number) => {
    const newFilters = filters.filter((_, i) => i !== index);
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const updateFilter = (index: number, field: keyof FilterCondition, value: any) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], [field]: value };
    if (field === 'operator' && value !== 'between') delete newFilters[index].value2;
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const getColumnType = (fieldName: string): string => {
    const col = columns.find((c: any) => c.name === fieldName);
    return col?.type || 'texto';
  };

  const renderValueInput = (filter: FilterCondition, index: number) => {
    const colType = getColumnType(filter.field);
    
    if (filter.operator === 'between') {
      return (
        <div className="between-inputs">
          <input type={colType.includes('número') ? 'number' : 'text'} placeholder="Mínimo"
            value={filter.value || ''} onChange={(e) => updateFilter(index, 'value', e.target.value)} />
          <span>y</span>
          <input type={colType.includes('número') ? 'number' : 'text'} placeholder="Máximo"
            value={filter.value2 || ''} onChange={(e) => updateFilter(index, 'value2', e.target.value)} />
        </div>
      );
    }
    
    if (filter.operator === 'in') {
      return (
        <input type="text" placeholder="valores separados por coma"
          value={filter.value || ''} onChange={(e) => updateFilter(index, 'value', e.target.value.split(',').map(v => v.trim()))} />
      );
    }
    
    if (filterOptions?.[filter.field]) {
      return (
        <select value={filter.value || ''} onChange={(e) => updateFilter(index, 'value', e.target.value)}>
          <option value="">Seleccionar...</option>
          {filterOptions[filter.field].map((opt: any) => (
            <option key={opt.id} value={opt.id}>{opt.nombre}</option>
          ))}
        </select>
      );
    }
    
    return (
      <input type={colType.includes('número') ? 'number' : 'text'} placeholder="Valor"
        value={filter.value || ''} onChange={(e) => updateFilter(index, 'value', e.target.value)} />
    );
  };

  return (
    <div className="filter-builder">
      <div className="filter-header">
        <div className="filter-title"><FiFilter className="filter-icon" /><h4>Filtros</h4></div>
        <button onClick={addFilter} className="btn-add-filter"><FiPlus /> Agregar</button>
      </div>
      {filters.length === 0 ? (
        <div className="no-filters"><FiFilter /><p>Sin filtros - todos los registros</p></div>
      ) : (
        <div className="filters-list">
          {filters.map((filter, index) => (
            <div key={index} className="filter-row">
              <select value={filter.field} onChange={(e) => updateFilter(index, 'field', e.target.value)}>
                {availableColumns.map((col: any) => (
                  <option key={col.name} value={col.name}>{col.name}</option>
                ))}
              </select>
              <select value={filter.operator} onChange={(e) => updateFilter(index, 'operator', e.target.value as any)}>
                {Object.entries(operatorLabels).map(([op, label]) => (
                  <option key={op} value={op}>{label as string}</option>
                ))}
              </select>
              {renderValueInput(filter, index)}
              <button onClick={() => removeFilter(index)} className="btn-remove-filter"><FiX /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FilterBuilder;