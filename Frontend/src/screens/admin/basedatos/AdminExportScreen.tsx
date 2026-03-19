// Frontend/src/screens/admin/basedatos/AdminExportScreen.tsx
import React, { useState, useEffect } from 'react';
import { exportAPI } from '../../../services/api';
import FilterBuilder from './components/FilterBuilder';
import './styles/AdminExportScreen.css';
import { 
  FiDownload, FiFilter, FiDatabase, FiClock, FiCheckCircle,
  FiXCircle, FiRefreshCw, FiInfo, FiPackage, FiUsers,
  FiTruck, FiFolder, FiCalendar, FiTag, FiGift
} from 'react-icons/fi';

const AdminExportScreen: React.FC = () => {
  const [selectedTable, setSelectedTable] = useState('productos');
  const [metadata, setMetadata] = useState<any>(null);
  const [filters, setFilters] = useState<any[]>([]);
  const [includeRelations, setIncludeRelations] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingMetadata, setLoadingMetadata] = useState(true);
  const [previewData, setPreviewData] = useState<any>(null);
  const [message, setMessage] = useState<any>(null);
  const [exporting, setExporting] = useState(false);

  const tables = [
    { value: 'productos', label: 'Productos', icon: FiPackage, color: '#ECB2C3' },
    { value: 'proveedores', label: 'Proveedores', icon: FiTruck, color: '#3498db' },
    { value: 'clientes', label: 'Clientes', icon: FiUsers, color: '#2ecc71' },
    { value: 'categorias', label: 'Categorías', icon: FiFolder, color: '#f39c12' },
    { value: 'temporadas', label: 'Temporadas', icon: FiCalendar, color: '#9b59b6' },
    { value: 'tipos_producto', label: 'Tipos', icon: FiTag, color: '#e74c3c' }
  ];

  useEffect(() => {
    if (selectedTable) loadMetadata();
  }, [selectedTable]);

  const loadMetadata = async () => {
    try {
      setLoadingMetadata(true);
      const response = await exportAPI.getMetadata(selectedTable);
      if (response.success) setMetadata(response.data);
    } catch (error: any) {
      showMessage('error', error.message);
    } finally {
      setLoadingMetadata(false);
    }
  };

  const handlePreview = async () => {
    try {
      setLoading(true);
      const response = await exportAPI.previewExport(selectedTable, filters);
      if (response.success) {
        setPreviewData(response.data);
        showMessage('success', `📊 ${response.data.total} registros encontrados`);
      }
    } catch (error: any) {
      showMessage('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const response = await exportAPI.exportData(selectedTable, filters, includeRelations);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export_${selectedTable}_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      showMessage('success', '✅ Exportación completada');
    } catch (error: any) {
      showMessage('error', error.message);
    } finally {
      setExporting(false);
    }
  };

  const showMessage = (type: string, text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  return (
    <div className="export-screen-container">
      <div className="export-header">
        <div className="header-left">
          <h1 className="page-title"><FiDownload className="title-icon" /> Exportación de Datos</h1>
          <p className="page-description">Exporta datos para análisis o actualización masiva</p>
        </div>
        <div className="header-actions">
          <button className="btn-refresh" onClick={loadMetadata}>
            <FiRefreshCw className={loadingMetadata ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {message && (
        <div className={`export-message ${message.type}`}>
          {message.type === 'success' && <FiCheckCircle />}
          {message.type === 'error' && <FiXCircle />}
          {message.type === 'info' && <FiInfo />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="table-selector-card">
        <div className="selector-header">
          <FiDatabase className="selector-icon" />
          <h3>Seleccionar Tabla</h3>
        </div>
        <div className="table-grid">
          {tables.map(table => {
            const Icon = table.icon;
            const isSelected = selectedTable === table.value;
            return (
              <button key={table.value} className={`table-option ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedTable(table.value)} style={{ borderColor: isSelected ? table.color : 'transparent' }}>
                <Icon size={24} color={table.color} />
                <span>{table.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {loadingMetadata ? (
        <div className="loading-metadata">
          <div className="spinner-large"></div>
          <p>Cargando estructura...</p>
        </div>
      ) : metadata ? (
        <>
          <div className="filters-card">
            <div className="filters-header">
              <FiFilter className="filters-icon" />
              <h3>Filtros</h3>
              <span className="filters-badge">{filters.length} filtros</span>
            </div>
            <FilterBuilder
              tableName={selectedTable}
              columns={metadata.metadata.columns}
              filterOptions={metadata.filterOptions}
              onFiltersChange={setFilters}
            />
            <div className="filters-footer">
              <label className="checkbox-option">
                <input type="checkbox" checked={includeRelations} onChange={(e) => setIncludeRelations(e.target.checked)} />
                <span>Incluir hoja de catálogos</span>
              </label>
            </div>
          </div>

          <div className="export-actions-card">
            <div className="actions-left">
              <button className="btn-preview" onClick={handlePreview} disabled={loading || exporting}>
                {loading ? <><span className="spinner-small"></span> Procesando...</> : <><FiRefreshCw /> Previsualizar</>}
              </button>
            </div>
            {previewData && (
              <div className="preview-stats">
                <FiDatabase />
                <span><strong>{previewData.total.toLocaleString()}</strong> registros</span>
              </div>
            )}
          </div>

          {previewData && (
            <div className="preview-results-card">
              <div className="preview-header">
                <h3><FiClock className="preview-icon" /> Vista Previa</h3>
                <button className="btn-export" onClick={handleExport} disabled={exporting || previewData.total === 0}>
                  {exporting ? <><span className="spinner-small"></span> Exportando...</> : <><FiDownload /> Exportar</>}
                </button>
              </div>
              <div className="table-container">
                <table className="preview-table">
                  <thead>
                    <tr>{previewData.sample[0] && Object.keys(previewData.sample[0]).slice(0,6).map(k => <th key={k}>{k}</th>)}</tr>
                  </thead>
                  <tbody>
                    {previewData.sample.map((row: any, idx: number) => (
                      <tr key={idx}>
                        {Object.keys(row).slice(0,6).map(k => (
                          <td key={k} title={String(row[k])}>{String(row[k]).substring(0,30)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
};

export default AdminExportScreen;