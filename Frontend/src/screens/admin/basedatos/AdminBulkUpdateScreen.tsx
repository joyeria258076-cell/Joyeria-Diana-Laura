// Frontend/src/screens/admin/basedatos/AdminBulkUpdateScreen.tsx
import React, { useState } from 'react';
import { bulkUpdateAPI } from '../../../services/api';
import './styles/AdminBulkUpdateScreen.css';
import {
  FiUpload, FiRefreshCw, FiCheckCircle, FiXCircle, FiInfo,
  FiAlertTriangle, FiDatabase, FiPackage, FiUsers, FiTruck,
  FiFolder, FiCalendar, FiTag, FiEye, FiEdit3, FiSave, FiArrowRight, FiDownload
} from 'react-icons/fi';

const AdminBulkUpdateScreen: React.FC = () => {
  const [selectedTable, setSelectedTable] = useState('productos');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [message, setMessage] = useState<any>(null);
  const [executing, setExecuting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  const tables = [
    { value: 'productos', label: 'Productos', icon: FiPackage, color: '#ECB2C3' },
    { value: 'proveedores', label: 'Proveedores', icon: FiTruck, color: '#3498db' },
    { value: 'clientes', label: 'Clientes', icon: FiUsers, color: '#2ecc71' },
    { value: 'categorias', label: 'Categorías', icon: FiFolder, color: '#f39c12' },
    { value: 'temporadas', label: 'Temporadas', icon: FiCalendar, color: '#9b59b6' },
    { value: 'tipos_producto', label: 'Tipos de Producto', icon: FiTag, color: '#e91e63' }
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setPreview(null);
      setMessage(null);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.name.endsWith('.xlsx')) {
      setFile(droppedFile);
      setPreview(null);
      setMessage(null);
    } else {
      showMessage('error', 'Solo archivos .xlsx');
    }
  };

  // ✅ NUEVO: Descargar plantilla
  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      const response = await bulkUpdateAPI.downloadTemplate(selectedTable);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bulk_update_${selectedTable}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showMessage('success', 'Plantilla descargada correctamente');
    } catch (error: any) {
      showMessage('error', error.message || 'Error al descargar plantilla');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handlePreview = async () => {
    if (!file) return showMessage('error', 'Selecciona un archivo');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('tableName', selectedTable);
    setLoading(true);
    try {
      const response = await bulkUpdateAPI.previewUpdate(formData);
      if (response.success) {
        setPreview(response.data);
        showMessage('success', `✅ ${response.data.totalRows} registros con cambios`);
      }
    } catch (error: any) {
      showMessage('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!preview?.updates) return;
    if (!window.confirm(`¿Actualizar ${preview.totalRows} registros? Esta acción es permanente.`)) return;
    setExecuting(true);
    try {
      const response = await bulkUpdateAPI.executeUpdate(selectedTable, preview.updates);
      if (response.success) {
        showMessage('success', response.data.message);
        setPreview(null);
        setFile(null);
        // Reset file input
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        showMessage('error', response.message);
      }
    } catch (error: any) {
      showMessage('error', error.message);
    } finally {
      setExecuting(false);
    }
  };

  const showMessage = (type: string, text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const getTableIcon = (tableValue: string) => {
    const table = tables.find(t => t.value === tableValue);
    if (table) {
      const Icon = table.icon;
      return <Icon size={20} color={table.color} />;
    }
    return <FiDatabase size={20} />;
  };

  return (
    <div className="bulk-update-container">
      <div className="bulk-header">
        <h1 className="page-title"><FiEdit3 className="title-icon" /> Actualización Masiva</h1>
        <p className="page-description">Actualiza múltiples registros usando archivos Excel</p>
      </div>

      {message && (
        <div className={`bulk-message ${message.type}`}>
          {message.type === 'success' && <FiCheckCircle />}
          {message.type === 'error' && <FiXCircle />}
          {message.type === 'warning' && <FiAlertTriangle />}
          {message.type === 'info' && <FiInfo />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="table-selector-card">
        <div className="selector-header">
          <FiDatabase className="selector-icon" />
          <h3>Seleccionar Tabla</h3>
        </div>
        <div className="table-selector">
          {tables.map(table => {
            const Icon = table.icon;
            const isSelected = selectedTable === table.value;
            return (
              <button 
                key={table.value} 
                className={`table-option ${isSelected ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedTable(table.value);
                  setFile(null);
                  setPreview(null);
                  setMessage(null);
                }}
              >
                <Icon size={20} color={table.color} />
                <span>{table.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="upload-section">
        <div className="upload-instructions">
          <FiInfo className="instructions-icon" size={24} />
          <div className="instructions-text">
            <strong>Instrucciones:</strong>
            <ol>
              <li>Descarga la plantilla con el botón "📥 Descargar Plantilla"</li>
              <li>Abre el archivo Excel y ve a la hoja "ACTUALIZACION"</li>
              <li>La columna <strong>"id"</strong> es OBLIGATORIA</li>
              <li>Completa SOLO las columnas que quieras actualizar</li>
              <li>Las celdas vacías se ignorarán</li>
              <li>Guarda el archivo y súbelo aquí</li>
            </ol>
          </div>
        </div>

        {/* Botón de descarga de plantilla */}
        <div className="template-download-section">
          <button 
            className="btn-download-template"
            onClick={handleDownloadTemplate}
            disabled={downloadingTemplate}
          >
            {downloadingTemplate ? (
              <><span className="spinner-small"></span> Descargando...</>
            ) : (
              <><FiDownload /> Descargar Plantilla Excel</>
            )}
          </button>
          <p className="template-hint">
            La plantilla incluye las columnas necesarias para actualizar {tables.find(t => t.value === selectedTable)?.label}
          </p>
        </div>

        <div className="file-upload-divider">
          <span>O</span>
        </div>

        <div className={`file-upload-area ${dragActive ? 'drag-active' : ''} ${file ? 'has-file' : ''}`}
          onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}>
          <input 
            type="file" 
            id="file-upload"
            accept=".xlsx" 
            onChange={handleFileChange} 
            disabled={loading || executing} 
          />
          {file ? (
            <div className="file-info">
              <FiCheckCircle size={32} color="#4CAF50" />
              <div className="file-details">
                <span className="file-name">{file.name}</span>
                <span className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
              <button className="btn-change-file" onClick={() => { setFile(null); setPreview(null); }}>Cambiar</button>
            </div>
          ) : (
            <div className="upload-prompt">
              <FiUpload size={40} />
              <p>Arrastra o selecciona archivo Excel</p>
              <span className="file-types">.xlsx</span>
            </div>
          )}
        </div>

        <div className="upload-actions">
          <button className="btn-preview" onClick={handlePreview} disabled={!file || loading || executing}>
            {loading ? <><span className="spinner-small"></span> Procesando...</> : <><FiEye /> Vista Previa</>}
          </button>
        </div>
      </div>

      {preview && (
        <div className="preview-section">
          <div className="preview-header">
            <h3><FiRefreshCw className="preview-icon" /> Cambios Detectados</h3>
            <div className="preview-stats">
              <span className="stat-badge"><FiDatabase /> {preview.totalRows} registros</span>
            </div>
          </div>

          {preview.changes && preview.changes.length > 0 ? (
            <div className="changes-table-container">
              <table className="changes-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Campo</th>
                    <th>Valor Actual</th>
                    <th></th>
                    <th>Nuevo Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.changes.map((change: any) => (
                    Object.keys(change.updated).filter(k => k !== 'id').map((field, idx) => (
                      <tr key={`${change.id}-${field}`}>
                        {idx === 0 && <td rowSpan={Object.keys(change.updated).length - 1}><strong>{change.id}</strong></td>}
                        <td><code>{field}</code></td>
                        <td className="current-value">{String(change.current[field] !== null && change.current[field] !== undefined ? change.current[field] : '—')}</td>
                        <td className="arrow-cell"><FiArrowRight /></td>
                        <td className="new-value"><strong>{String(change.updated[field] !== null && change.updated[field] !== undefined ? change.updated[field] : '—')}</strong></td>
                      </tr>
                    ))
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="no-changes"><FiInfo size={48} /><p>No hay cambios detectados</p></div>
          )}

          <div className="preview-footer">
            <div className="warning-box"><FiAlertTriangle /> Esta acción es permanente y no se puede deshacer</div>
            <button className="btn-execute" onClick={handleExecute} disabled={executing || (preview.changes && preview.changes.length === 0)}>
              {executing ? <><span className="spinner-small"></span> Aplicando...</> : <><FiSave /> Ejecutar Actualización</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBulkUpdateScreen;