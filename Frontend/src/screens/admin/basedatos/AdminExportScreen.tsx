// Frontend/src/screens/admin/basedatos/AdminExportScreen.tsx
import React, { useState, useEffect } from 'react';
import { exportAPI } from '../../../services/api';
import FilterBuilder from './components/FilterBuilder';
import './styles/AdminExportScreen.css';
import {
  FiDownload, FiFilter, FiDatabase,
  FiXCircle, FiRefreshCw, FiInfo, FiCheckCircle,
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
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);

  const tables = [
    { value: 'productos', label: 'Productos' },
    { value: 'proveedores', label: 'Proveedores' },
    { value: 'clientes', label: 'Clientes' },
    { value: 'categorias', label: 'Categorías' },
    { value: 'temporadas', label: 'Temporadas' },
    { value: 'tipos_producto', label: 'Tipos' },
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
        showMessage('success', `${response.data.total} registros encontrados`);
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
      showMessage('success', 'Exportación completada');
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

  const cambiarTabla = (value: string) => {
    setSelectedTable(value);
    setPreviewData(null);
    setFilters([]);
  };

  const headers = previewData?.sample?.[0] ? Object.keys(previewData.sample[0]).slice(0, 7) : [];

  return (
    <div className="ex3-container">
      <div className="ex3-header">
        <h1><FiDownload size={22} /> Exportación de datos</h1>
        <p>Exporta datos para análisis o actualización masiva</p>
      </div>

      {message && (
        <div className={`export-message ${message.type}`}>
          {message.type === 'success' && <FiCheckCircle />}
          {message.type === 'error' && <FiXCircle />}
          {message.type === 'info' && <FiInfo />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="ex3-layout">
        {/* Maestro: lista de tablas en texto plano */}
        <div className="ex3-lista">
          <span className="ex3-lista-label">Tablas disponibles</span>
          {tables.map(t => (
            <button
              key={t.value}
              className={`ex3-lista-item ${selectedTable === t.value ? 'active' : ''}`}
              onClick={() => cambiarTabla(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Detalle: hoja de cálculo simulada */}
        <div className="ex3-sheet">
          <div className="ex3-sheet-toolbar">
            <div className="ex3-sheet-title">
              <FiDatabase size={15} /> <strong>{tables.find(t => t.value === selectedTable)?.label}</strong>
              {loadingMetadata && <span className="ex3-sheet-loading">cargando estructura...</span>}
            </div>
            <div className="ex3-sheet-actions">
              <button className={`ex3-btn-filtros ${filtrosAbiertos ? 'active' : ''}`} onClick={() => setFiltrosAbiertos(v => !v)}>
                <FiFilter size={14} /> Filtros {filters.length > 0 && <span className="ex3-filtros-count">{filters.length}</span>}
              </button>
              <button className="btn-preview" onClick={handlePreview} disabled={loading || exporting}>
                {loading ? <><span className="spinner-small"></span> Procesando...</> : <><FiRefreshCw /> Vista previa</>}
              </button>
            </div>
          </div>

          {filtrosAbiertos && (
            <div className="ex3-filtros-panel">
              {metadata ? (
                <>
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
                </>
              ) : (
                <div className="loading-metadata">
                  <div className="spinner-large"></div>
                  <p>Cargando estructura...</p>
                </div>
              )}
            </div>
          )}

          {/* Hoja de cálculo */}
          <div className="ex3-sheet-body">
            {previewData ? (
              <table className="ex3-sheet-table">
                <thead>
                  <tr>
                    <th className="ex3-sheet-corner" />
                    {headers.map((h, i) => <th key={h}>{String.fromCharCode(65 + i)} · {h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {previewData.sample.slice(0, 12).map((row: any, idx: number) => (
                    <tr key={idx}>
                      <td className="ex3-sheet-rownum">{idx + 1}</td>
                      {headers.map(h => (
                        <td key={h} title={String(row[h])}>{String(row[h] ?? '').substring(0, 24)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="ex3-sheet-empty">
                <FiDatabase size={28} />
                <p>Presiona "Vista previa" para ver una muestra de los datos de esta tabla.</p>
              </div>
            )}
          </div>

          <div className="ex3-sheet-footer">
            {previewData && <span className="ex3-sheet-total">{previewData.total.toLocaleString()} registros encontrados</span>}
            <button className="btn-export ex3-export-btn" onClick={handleExport} disabled={exporting || !previewData || previewData.total === 0}>
              {exporting ? <><span className="spinner-small"></span> Exportando...</> : <><FiDownload /> Exportar a Excel</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminExportScreen;
