// Frontend/src/screens/admin/basedatos/AdminImportExportScreen.tsx
import React, { useState, useEffect } from 'react';
import { importAPI, templateAPI } from '../../../services/api';
import './styles/AdminImportExportScreen.css';

interface TableInfo {
  name: string;
}

const AdminImportExportScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [availableTables, setAvailableTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estado para importación
  const [selectedTable, setSelectedTable] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);

  // Estado para exportación
  const [exportTable, setExportTable] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Cargar tablas disponibles desde el backend
  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    try {
      setLoading(true);
      const response = await importAPI.getTables();
      console.log('📋 Tablas recibidas:', response);
      if (response.success && response.tables) {
        const tables = response.tables.map((name: string) => ({ name }));
        setAvailableTables(tables);
        console.log('✅ Tablas cargadas:', tables.map((t: TableInfo) => t.name));
      } else {
        console.error('Respuesta sin tables:', response);
      }
    } catch (error) {
      console.error('Error loading tables:', error);
      setError('Error al cargar las tablas disponibles');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError('');
      setSuccess('');
      setPreviewData([]);
      setPreviewHeaders([]);
    }
  };

  const handlePreview = async () => {
    if (!selectedFile || !selectedTable) {
      setError('Selecciona una tabla y un archivo');
      return;
    }

    setIsProcessing(true);
    setError('');
    setWarnings([]);

    try {
      const response = await importAPI.previewFile(selectedFile, selectedTable);
      if (response.success) {
        setPreviewHeaders(response.headers || []);
        setPreviewData(response.preview || []);
        if (response.warnings) {
          setWarnings(response.warnings);
        }
        setSuccess(`Archivo procesado. ${response.totalRows} registros encontrados.`);
      }
    } catch (error: any) {
      setError(error.message || 'Error al procesar el archivo');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !selectedTable) {
      setError('Selecciona una tabla y un archivo');
      return;
    }

    setIsProcessing(true);
    setError('');
    setSuccess('');

    try {
      // Obtener todos los datos del archivo
      const response = await importAPI.previewFile(selectedFile, selectedTable);
      if (response.success && response.data) {
        const result = await importAPI.importData(selectedTable, response.data, response.headers);
        if (result.success) {
          setSuccess(result.message);
          setPreviewData([]);
          setPreviewHeaders([]);
          setSelectedFile(null);
          // Reset file input
          const fileInput = document.getElementById('file-upload') as HTMLInputElement;
          if (fileInput) fileInput.value = '';
        } else {
          setError(result.message);
        }
      }
    } catch (error: any) {
      setError(error.message || 'Error al importar los datos');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadTemplate = async () => {
    if (!selectedTable) {
      setError('Selecciona una tabla para descargar la plantilla');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const response = await templateAPI.downloadTemplate(selectedTable);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `plantilla_${selectedTable}_${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setSuccess('Plantilla descargada exitosamente');
    } catch (error: any) {
      setError(error.message || 'Error al descargar la plantilla');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = async () => {
    if (!exportTable) {
      setError('Selecciona una tabla para exportar');
      return;
    }

    setIsExporting(true);
    setError('');

    try {
      const response = await templateAPI.downloadTemplate(exportTable);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export_${exportTable}_${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setSuccess('Exportación completada');
    } catch (error: any) {
      setError(error.message || 'Error al exportar');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="import-export-screen-container">
      <div className="import-export-header">
        <h1 className="page-title">Importación y Exportación de Datos</h1>
        <p className="page-description">
          Importa datos desde archivos Excel/CSV o exporta plantillas para llenar información
        </p>
      </div>

      {/* Mensajes */}
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      {warnings.length > 0 && (
        <div className="warning-message">
          <strong>Advertencias:</strong>
          <ul>{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs-container">
        <button className={`tab-btn ${activeTab === 'import' ? 'active' : ''}`} onClick={() => setActiveTab('import')}>
          📥 Importar Datos
        </button>
        <button className={`tab-btn ${activeTab === 'export' ? 'active' : ''}`} onClick={() => setActiveTab('export')}>
          📤 Exportar / Plantillas
        </button>
      </div>

      {/* Import Tab */}
      {activeTab === 'import' && (
        <div className="import-section">
          <div className="import-grid">
            {/* Selección de Tabla */}
            <div className="config-card">
              <h3>1. Selecciona la Tabla</h3>
              <select
                className="form-select"
                value={selectedTable}
                onChange={(e) => {
                  setSelectedTable(e.target.value);
                  setPreviewData([]);
                  setPreviewHeaders([]);
                  setSelectedFile(null);
                  const fileInput = document.getElementById('file-upload') as HTMLInputElement;
                  if (fileInput) fileInput.value = '';
                }}
                disabled={loading}
              >
                <option value="">-- Seleccionar tabla --</option>
                {availableTables.map(table => (
                  <option key={table.name} value={table.name}>
                    {table.name}
                  </option>
                ))}
              </select>
              {loading && <p className="loading-text">Cargando tablas...</p>}
              {!loading && availableTables.length === 0 && (
                <p className="error-text">No se encontraron tablas disponibles</p>
              )}
            </div>

            {/* Descargar Plantilla */}
            {selectedTable && (
              <div className="config-card">
                <h3>2. Descargar Plantilla</h3>
                <p className="info-text">
                  Descarga la plantilla Excel con las columnas correctas para <strong>{selectedTable}</strong>
                </p>
                <button
                  className="btn-download-template"
                  onClick={handleDownloadTemplate}
                  disabled={isProcessing}
                >
                  📥 Descargar Plantilla Excel
                </button>
              </div>
            )}

            {/* Subir Archivo */}
            {selectedTable && (
              <div className="config-card file-upload-card">
                <h3>3. Subir Archivo</h3>
                <div className="file-upload-area">
                  <input type="file" id="file-upload" onChange={handleFileChange} accept=".csv,.xlsx,.xls" />
                  <label htmlFor="file-upload" className="file-upload-label">
                    <span className="upload-icon">📁</span>
                    <span className="upload-text">
                      {selectedFile ? selectedFile.name : 'Selecciona un archivo Excel o CSV'}
                    </span>
                    <span className="upload-hint">Formatos: .xlsx, .xls, .csv</span>
                  </label>
                </div>
              </div>
            )}

            {/* Botones de Acción */}
            {selectedTable && selectedFile && (
              <div className="config-card">
                <h3>4. Previsualizar e Importar</h3>
                <div className="action-buttons">
                  <button className="btn-preview" onClick={handlePreview} disabled={isProcessing}>
                    👁️ Previsualizar
                  </button>
                  <button
                    className="btn-import"
                    onClick={handleImport}
                    disabled={isProcessing || previewData.length === 0}
                  >
                    {isProcessing ? '⏳ Procesando...' : '📥 Importar Datos'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Vista Previa */}
          {previewData.length > 0 && (
            <div className="preview-section">
              <h3>Vista Previa (primeros {Math.min(10, previewData.length)} registros)</h3>
              <div className="preview-table-container">
                <table className="preview-table">
                  <thead>
                    <tr>
                      {previewHeaders.map(header => (
                        <th key={header}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.slice(0, 10).map((row, idx) => (
                      <tr key={idx}>
                        {previewHeaders.map(header => (
                          <td key={header}>
                            {row[header] !== null && row[header] !== undefined ? String(row[header]) : '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Export Tab */}
      {activeTab === 'export' && (
        <div className="export-section">
          <div className="export-grid">
            <div className="config-card">
              <h3>Selecciona una Tabla para Exportar</h3>
              <select
                className="form-select"
                value={exportTable}
                onChange={(e) => setExportTable(e.target.value)}
                disabled={loading}
              >
                <option value="">-- Seleccionar tabla --</option>
                {availableTables.map(table => (
                  <option key={table.name} value={table.name}>
                    {table.name}
                  </option>
                ))}
              </select>
              {loading && <p className="loading-text">Cargando tablas...</p>}
            </div>

            {exportTable && (
              <div className="config-card">
                <h3>Exportar a Excel</h3>
                <p className="info-text">
                  Descargarás un archivo Excel con la estructura de la tabla <strong>{exportTable}</strong>
                </p>
                <p className="info-text-small">
                  Incluye: Hoja de datos, instrucciones y catálogos de referencia
                </p>
                <button className="btn-export" onClick={handleExport} disabled={isExporting}>
                  {isExporting ? '⏳ Exportando...' : '📤 Exportar a Excel'}
                </button>
              </div>
            )}
          </div>

          {/* Información de tablas disponibles */}
          {!loading && availableTables.length > 0 && (
            <div className="info-section">
              <h3>📋 Tablas Disponibles ({availableTables.length})</h3>
              <div className="tables-grid">
                {availableTables.map(table => (
                  <div key={table.name} className="table-badge">
                    <span className="table-icon">
                      {table.name === 'ventas' && '💰'}
                      {table.name === 'detalle_ventas' && '📦'}
                      {table.name === 'productos' && '💎'}
                      {table.name === 'clientes' && '👥'}
                      {table.name === 'proveedores' && '🏭'}
                      {!['ventas', 'detalle_ventas', 'productos', 'clientes', 'proveedores'].includes(table.name) && '📊'}
                    </span>
                    <span className="table-name">{table.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminImportExportScreen;