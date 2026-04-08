// Frontend/src/screens/admin/basedatos/AdminImportExportScreen.tsx
import React, { useState } from 'react';
import './styles/AdminImportExportScreen.css';

interface ExportConfig {
  format: 'csv' | 'json' | 'sql' | 'excel';
  tables: string[];
  includeData: boolean;
  includeSchema: boolean;
  compress: boolean;
  encrypt: boolean;
  where?: string;
  limit?: number;
}

interface ImportConfig {
  format: 'csv' | 'json' | 'sql' | 'excel';
  file: File | null;
  table: string;
  mode: 'insert' | 'update' | 'upsert' | 'replace';
  hasHeader: boolean;
  delimiter: string;
  encoding: string;
  validateData: boolean;
  dryRun: boolean;
}

interface TableInfo {
  name: string;
  records: number;
  size: string;
  columns: number;
}

const AdminImportExportScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('export');
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    format: 'csv',
    tables: [],
    includeData: true,
    includeSchema: true,
    compress: false,
    encrypt: false,
    limit: 1000
  });

  const [importConfig, setImportConfig] = useState<ImportConfig>({
    format: 'csv',
    file: null,
    table: '',
    mode: 'insert',
    hasHeader: true,
    delimiter: ',',
    encoding: 'UTF-8',
    validateData: true,
    dryRun: false
  });

  const [tables, setTables] = useState<TableInfo[]>([
    { name: 'usuarios', records: 1250, size: '45 MB', columns: 15 },
    { name: 'productos', records: 3500, size: '120 MB', columns: 22 },
    { name: 'categorias', records: 45, size: '2 MB', columns: 8 },
    { name: 'ventas', records: 8500, size: '280 MB', columns: 18 },
    { name: 'detalle_ventas', records: 32450, size: '890 MB', columns: 12 },
    { name: 'compras', records: 320, size: '25 MB', columns: 16 },
    { name: 'inventario', records: 12500, size: '180 MB', columns: 10 },
    { name: 'clientes', records: 980, size: '35 MB', columns: 14 },
    { name: 'proveedores', records: 45, size: '3 MB', columns: 12 },
    { name: 'promociones', records: 28, size: '1.5 MB', columns: 20 }
  ]);

  const [exportHistory, setExportHistory] = useState([
    { id: 1, file: 'productos_export_20240115.csv', size: '45 MB', date: '2024-01-15 14:30', status: 'completed', tables: 3 },
    { id: 2, file: 'ventas_completas.json', size: '120 MB', date: '2024-01-14 09:15', status: 'completed', tables: 2 },
    { id: 3, file: 'backup_inventario.sql', size: '280 MB', date: '2024-01-13 03:00', status: 'completed', tables: 5 },
    { id: 4, file: 'usuarios_export.xlsx', size: '8 MB', date: '2024-01-12 16:45', status: 'failed', tables: 1 }
  ]);

  const [importHistory, setImportHistory] = useState([
    { id: 1, file: 'productos_nuevos.csv', records: 150, date: '2024-01-15 11:20', status: 'completed' },
    { id: 2, file: 'precios_actualizados.xlsx', records: 850, date: '2024-01-14 10:00', status: 'completed' },
    { id: 3, file: 'clientes_migracion.json', records: 320, date: '2024-01-12 15:30', status: 'pending' }
  ]);

  const [exportProgress, setExportProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);

  const handleSelectAllTables = () => {
    if (exportConfig.tables.length === tables.length) {
      setExportConfig({ ...exportConfig, tables: [] });
    } else {
      setExportConfig({ ...exportConfig, tables: tables.map(t => t.name) });
    }
  };

  const handleExport = () => {
    if (exportConfig.tables.length === 0) {
      alert('Selecciona al menos una tabla para exportar');
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    // Simular progreso de exportación
    const interval = setInterval(() => {
      setExportProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsExporting(false);
          
          // Añadir a historial
          setExportHistory([
            {
              id: Date.now(),
              file: `export_${Date.now()}.${exportConfig.format}`,
              size: '150 MB',
              date: new Date().toLocaleString(),
              status: 'completed',
              tables: exportConfig.tables.length
            },
            ...exportHistory
          ]);

          alert('Exportación completada exitosamente');
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportConfig({ ...importConfig, file });

      // Simular preview
      if (importConfig.dryRun) {
        setImportPreview([
          { id: 1, nombre: 'Producto 1', precio: 100 },
          { id: 2, nombre: 'Producto 2', precio: 200 },
          { id: 3, nombre: 'Producto 3', precio: 300 }
        ]);
      }
    }
  };

  const handleImport = () => {
    if (!importConfig.file) {
      alert('Selecciona un archivo para importar');
      return;
    }

    if (!importConfig.table) {
      alert('Selecciona la tabla destino');
      return;
    }

    setIsImporting(true);

    // Simular importación
    setTimeout(() => {
      setIsImporting(false);
      
      setImportHistory([
        {
          id: Date.now(),
          file: importConfig.file!.name,
          records: 150,
          date: new Date().toLocaleString(),
          status: importConfig.dryRun ? 'completed' : 'completed'
        },
        ...importHistory
      ]);

      alert(importConfig.dryRun ? 
        'Validación completada. No se realizaron cambios.' : 
        'Importación completada exitosamente'
      );
    }, 2000);
  };

  const handleDownload = (filename: string) => {
    alert(`Descargando ${filename}`);
  };

  const getFormatIcon = (format: string) => {
    switch(format) {
      case 'csv': return '📊';
      case 'json': return '📋';
      case 'sql': return '🗄️';
      case 'excel': return '📈';
      default: return '📄';
    }
  };

  return (
    <div className="import-export-screen-container">
      {/* Header */}
      <div className="import-export-header">
        <h1 className="page-title">Importación y Exportación de Datos</h1>
        <p className="page-description">
          Exporta datos a diferentes formatos o importa información desde archivos externos
        </p>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <button
          className={`tab-btn ${activeTab === 'export' ? 'active' : ''}`}
          onClick={() => setActiveTab('export')}
        >
          📤 Exportar Datos
        </button>
        <button
          className={`tab-btn ${activeTab === 'import' ? 'active' : ''}`}
          onClick={() => setActiveTab('import')}
        >
          📥 Importar Datos
        </button>
      </div>

      {/* Export Tab */}
      {activeTab === 'export' && (
        <div className="export-section">
          <div className="export-config-grid">
            {/* Formato */}
            <div className="config-card">
              <h3>Formato de Exportación</h3>
              <div className="format-options">
                {['csv', 'json', 'sql', 'excel'].map(format => (
                  <label key={format} className={`format-option ${exportConfig.format === format ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="format"
                      value={format}
                      checked={exportConfig.format === format}
                      onChange={(e) => setExportConfig({ ...exportConfig, format: e.target.value as any })}
                    />
                    <span className="format-icon">{getFormatIcon(format)}</span>
                    <span className="format-name">{format.toUpperCase()}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Tablas */}
            <div className="config-card tables-card">
              <div className="tables-header">
                <h3>Tablas a Exportar</h3>
                <button className="btn-select-all" onClick={handleSelectAllTables}>
                  {exportConfig.tables.length === tables.length ? 'Deseleccionar Todas' : 'Seleccionar Todas'}
                </button>
              </div>
              <div className="tables-list">
                {tables.map(table => (
                  <label key={table.name} className="table-checkbox">
                    <input
                      type="checkbox"
                      checked={exportConfig.tables.includes(table.name)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setExportConfig({
                            ...exportConfig,
                            tables: [...exportConfig.tables, table.name]
                          });
                        } else {
                          setExportConfig({
                            ...exportConfig,
                            tables: exportConfig.tables.filter(t => t !== table.name)
                          });
                        }
                      }}
                    />
                    <div className="table-info">
                      <span className="table-name">{table.name}</span>
                      <span className="table-stats">
                        {table.records.toLocaleString()} registros • {table.size}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Opciones */}
            <div className="config-card">
              <h3>Opciones de Exportación</h3>
              
              <label className="checkbox-option">
                <input
                  type="checkbox"
                  checked={exportConfig.includeData}
                  onChange={(e) => setExportConfig({ ...exportConfig, includeData: e.target.checked })}
                />
                Incluir datos
              </label>

              <label className="checkbox-option">
                <input
                  type="checkbox"
                  checked={exportConfig.includeSchema}
                  onChange={(e) => setExportConfig({ ...exportConfig, includeSchema: e.target.checked })}
                />
                Incluir estructura (CREATE TABLE)
              </label>

              <label className="checkbox-option">
                <input
                  type="checkbox"
                  checked={exportConfig.compress}
                  onChange={(e) => setExportConfig({ ...exportConfig, compress: e.target.checked })}
                />
                Comprimir archivo (ZIP)
              </label>

              <label className="checkbox-option">
                <input
                  type="checkbox"
                  checked={exportConfig.encrypt}
                  onChange={(e) => setExportConfig({ ...exportConfig, encrypt: e.target.checked })}
                />
                Encriptar archivo
              </label>

              <div className="input-group">
                <label>Límite de registros (0 = sin límite)</label>
                <input
                  type="number"
                  className="form-input"
                  value={exportConfig.limit}
                  onChange={(e) => setExportConfig({ ...exportConfig, limit: Number.parseInt(e.target.value) })}
                  min="0"
                />
              </div>

              <div className="input-group">
                <label>Filtro WHERE (opcional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={exportConfig.where}
                  onChange={(e) => setExportConfig({ ...exportConfig, where: e.target.value })}
                  placeholder="ej: activo = true AND precio > 100"
                />
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          {isExporting && (
            <div className="progress-section">
              <div className="progress-label">
                <span>Exportando...</span>
                <span>{exportProgress}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${exportProgress}%` }}></div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="export-actions">
            <button 
              className="btn-export"
              onClick={handleExport}
              disabled={isExporting || exportConfig.tables.length === 0}
            >
              {isExporting ? '⏳ Exportando...' : '📤 Iniciar Exportación'}
            </button>
            <button className="btn-preview">
              👁️ Vista Previa
            </button>
          </div>

          {/* Export History */}
          <div className="history-section">
            <h3>Exportaciones Recientes</h3>
            <div className="history-list">
              {exportHistory.map(item => (
                <div key={item.id} className="history-item">
                  <div className="history-icon">📄</div>
                  <div className="history-details">
                    <span className="history-name">{item.file}</span>
                    <span className="history-meta">
                      {item.size} • {item.tables} tablas • {item.date}
                    </span>
                  </div>
                  <span className={`history-status ${item.status}`}>
                    {item.status === 'completed' ? '✅ Completado' : '❌ Fallido'}
                  </span>
                  <button 
                    className="btn-download"
                    onClick={() => handleDownload(item.file)}
                  >
                    ⬇️
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Import Tab */}
      {activeTab === 'import' && (
        <div className="import-section">
          <div className="import-grid">
            {/* File Upload */}
            <div className="config-card file-upload-card">
              <h3>Archivo a Importar</h3>
              <div 
                className="file-upload-area"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file) {
                    setImportConfig({ ...importConfig, file });
                  }
                }}
              >
                <input
                  type="file"
                  id="file-upload"
                  onChange={handleFileChange}
                  accept=".csv,.json,.sql,.xlsx,.xls"
                />
                <label htmlFor="file-upload" className="file-upload-label">
                  <span className="upload-icon">📁</span>
                  <span className="upload-text">
                    {importConfig.file ? importConfig.file.name : 'Arrastra o selecciona un archivo'}
                  </span>
                  <span className="upload-hint">
                    Formatos soportados: CSV, JSON, SQL, Excel
                  </span>
                </label>
              </div>
            </div>

            {/* Import Settings */}
            <div className="config-card">
              <h3>Configuración de Importación</h3>

              <div className="input-group">
                <label>Formato</label>
                <select
                  className="form-select"
                  value={importConfig.format}
                  onChange={(e) => setImportConfig({ ...importConfig, format: e.target.value as any })}
                >
                  <option value="csv">CSV</option>
                  <option value="json">JSON</option>
                  <option value="sql">SQL</option>
                  <option value="excel">Excel</option>
                </select>
              </div>

              <div className="input-group">
                <label>Tabla Destino</label>
                <select
                  className="form-select"
                  value={importConfig.table}
                  onChange={(e) => setImportConfig({ ...importConfig, table: e.target.value })}
                >
                  <option value="">Seleccionar tabla</option>
                  {tables.map(table => (
                    <option key={table.name} value={table.name}>{table.name}</option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label>Modo de Importación</label>
                <select
                  className="form-select"
                  value={importConfig.mode}
                  onChange={(e) => setImportConfig({ ...importConfig, mode: e.target.value as any })}
                >
                  <option value="insert">Insertar nuevos registros</option>
                  <option value="update">Actualizar existentes</option>
                  <option value="upsert">Insertar o actualizar</option>
                  <option value="replace">Reemplazar tabla completa</option>
                </select>
              </div>

              {importConfig.format === 'csv' && (
                <>
                  <div className="input-group">
                    <label>Delimitador</label>
                    <input
                      type="text"
                      className="form-input"
                      value={importConfig.delimiter}
                      onChange={(e) => setImportConfig({ ...importConfig, delimiter: e.target.value })}
                      maxLength={1}
                    />
                  </div>

                  <label className="checkbox-option">
                    <input
                      type="checkbox"
                      checked={importConfig.hasHeader}
                      onChange={(e) => setImportConfig({ ...importConfig, hasHeader: e.target.checked })}
                    />
                    La primera fila contiene encabezados
                  </label>
                </>
              )}

              <div className="input-group">
                <label>Codificación</label>
                <select
                  className="form-select"
                  value={importConfig.encoding}
                  onChange={(e) => setImportConfig({ ...importConfig, encoding: e.target.value })}
                >
                  <option value="UTF-8">UTF-8</option>
                  <option value="ISO-8859-1">ISO-8859-1 (Latin-1)</option>
                  <option value="Windows-1252">Windows-1252</option>
                </select>
              </div>

              <label className="checkbox-option">
                <input
                  type="checkbox"
                  checked={importConfig.validateData}
                  onChange={(e) => setImportConfig({ ...importConfig, validateData: e.target.checked })}
                />
                Validar datos antes de importar
              </label>

              <label className="checkbox-option">
                <input
                  type="checkbox"
                  checked={importConfig.dryRun}
                  onChange={(e) => setImportConfig({ ...importConfig, dryRun: e.target.checked })}
                />
                Modo prueba (no realizar cambios)
              </label>
            </div>

            {/* Preview */}
            {importPreview.length > 0 && (
              <div className="config-card preview-card">
                <h3>Vista Previa de Datos</h3>
                <div className="preview-table-container">
                  <table className="preview-table">
                    <thead>
                      <tr>
                        {Object.keys(importPreview[0]).map(key => (
                          <th key={key}>{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.slice(0, 5).map((row, idx) => (
                        <tr key={idx}>
                          {Object.values(row).map((val: any, i) => (
                            <td key={i}>{val}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="preview-note">
                  Mostrando 5 de {importPreview.length} registros
                </p>
              </div>
            )}
          </div>

          {/* Import Progress */}
          {isImporting && (
            <div className="progress-section">
              <div className="progress-label">
                <span>Importando...</span>
                <span>Procesando...</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill indeterminate"></div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="import-actions">
            <button 
              className="btn-import"
              onClick={handleImport}
              disabled={isImporting || !importConfig.file}
            >
              {isImporting ? '⏳ Importando...' : '📥 Iniciar Importación'}
            </button>
            {importConfig.dryRun && importConfig.file && (
              <button 
                className="btn-validate"
                onClick={() => {
                  setImportPreview([
                    { id: 1, nombre: 'Producto 1', precio: 100 },
                    { id: 2, nombre: 'Producto 2', precio: 200 }
                  ]);
                }}
              >
                ✓ Validar Archivo
              </button>
            )}
          </div>

          {/* Import History */}
          <div className="history-section">
            <h3>Importaciones Recientes</h3>
            <div className="history-list">
              {importHistory.map(item => (
                <div key={item.id} className="history-item">
                  <div className="history-icon">📥</div>
                  <div className="history-details">
                    <span className="history-name">{item.file}</span>
                    <span className="history-meta">
                      {item.records} registros • {item.date}
                    </span>
                  </div>
                  <span className={`history-status ${item.status}`}>
                    {item.status === 'completed' ? '✅ Completado' : 
                     item.status === 'pending' ? '⏳ Pendiente' : '❌ Fallido'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminImportExportScreen;