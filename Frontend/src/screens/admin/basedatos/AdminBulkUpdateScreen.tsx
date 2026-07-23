// Frontend/src/screens/admin/basedatos/AdminBulkUpdateScreen.tsx
import React, { useState } from 'react';
import { bulkUpdateAPI } from '../../../services/api';
import './styles/AdminBulkUpdateScreen.css';
import {
  FiUpload, FiRefreshCw, FiCheckCircle, FiXCircle, FiInfo,
  FiAlertTriangle, FiDatabase, FiEye, FiEdit3, FiSave, FiDownload,
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
  const [showInstrucciones, setShowInstrucciones] = useState(false);

  const tables = [
    { value: 'productos', label: 'Productos' },
    { value: 'proveedores', label: 'Proveedores' },
    { value: 'clientes', label: 'Clientes' },
    { value: 'categorias', label: 'Categorías' },
    { value: 'temporadas', label: 'Temporadas' },
    { value: 'tipos_producto', label: 'Tipos de producto' },
  ];

  const handleTableChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedTable(e.target.value);
    setFile(null);
    setPreview(null);
    setMessage(null);
  };

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
        showMessage('success', `${response.data.totalRows} registros con cambios`);
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

  return (
    <div className="bu2-container">
      <div className="bu2-header">
        <div>
          <h1><FiEdit3 size={22} /> Actualización masiva</h1>
          <p>Actualiza múltiples registros a la vez usando un archivo Excel</p>
        </div>
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

      {/* Barra compacta: tabla + plantilla + archivo, todo en una franja */}
      <div className="bu2-toolbar">
        <div className="bu2-toolbar-field">
          <label><FiDatabase size={13} /> Tabla</label>
          <select value={selectedTable} onChange={handleTableChange}>
            {tables.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        <button className="bu2-btn-template" onClick={handleDownloadTemplate} disabled={downloadingTemplate}>
          {downloadingTemplate ? <><span className="spinner-small"></span> Descargando...</> : <><FiDownload size={14} /> Descargar plantilla</>}
        </button>

        <button className="bu2-btn-info" onClick={() => setShowInstrucciones(v => !v)}>
          <FiInfo size={14} /> Instrucciones
        </button>

        <div
          className={`bu2-dropzone-inline ${dragActive ? 'drag-active' : ''} ${file ? 'has-file' : ''}`}
          onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
          onClick={() => document.getElementById('file-upload')?.click()}
        >
          <input type="file" id="file-upload" accept=".xlsx" onChange={handleFileChange} disabled={loading || executing} hidden />
          {file ? (
            <><FiCheckCircle size={15} color="#4CAF50" /> <span>{file.name}</span></>
          ) : (
            <><FiUpload size={15} /> <span>Arrastra o elige tu archivo .xlsx</span></>
          )}
        </div>

        <button className="btn-preview bu2-btn-preview" onClick={handlePreview} disabled={!file || loading || executing}>
          {loading ? <><span className="spinner-small"></span> Procesando...</> : <><FiEye /> Vista previa</>}
        </button>
      </div>

      {showInstrucciones && (
        <div className="bu2-instrucciones">
          <ol>
            <li>Descarga la plantilla con el botón "Descargar plantilla".</li>
            <li>Abre el archivo Excel y ve a la hoja "ACTUALIZACION".</li>
            <li>La columna <strong>"id"</strong> es obligatoria.</li>
            <li>Completa solo las columnas que quieras actualizar; las celdas vacías se ignoran.</li>
            <li>Guarda el archivo y súbelo en la franja de arriba.</li>
          </ol>
        </div>
      )}

      {/* Revisor de cambios tipo "diff" */}
      {preview && (
        <div className="bu2-diff-section">
          <div className="bu2-diff-header">
            <h2><FiRefreshCw size={16} /> Cambios detectados</h2>
            <span className="bu2-diff-count">{preview.totalRows} registros</span>
          </div>

          {preview.changes && preview.changes.length > 0 ? (
            <div className="bu2-diff-list">
              {preview.changes.map((change: any) => (
                <div key={change.id} className="bu2-diff-card">
                  <div className="bu2-diff-card-id">Registro #{change.id}</div>
                  <div className="bu2-diff-fields">
                    {Object.keys(change.updated).filter(k => k !== 'id').map(field => (
                      <div key={field} className="bu2-diff-field">
                        <span className="bu2-diff-field-name">{field}</span>
                        <span className="bu2-diff-old">
                          {String(change.current[field] !== null && change.current[field] !== undefined ? change.current[field] : '—')}
                        </span>
                        <span className="bu2-diff-arrow">→</span>
                        <span className="bu2-diff-new">
                          {String(change.updated[field] !== null && change.updated[field] !== undefined ? change.updated[field] : '—')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-changes"><FiInfo size={40} /><p>No hay cambios detectados</p></div>
          )}

          <div className="bu2-diff-footer">
            <div className="warning-box"><FiAlertTriangle /> Esta acción es permanente y no se puede deshacer</div>
            <button className="btn-execute" onClick={handleExecute} disabled={executing || (preview.changes && preview.changes.length === 0)}>
              {executing ? <><span className="spinner-small"></span> Aplicando...</> : <><FiSave /> Ejecutar actualización</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBulkUpdateScreen;
