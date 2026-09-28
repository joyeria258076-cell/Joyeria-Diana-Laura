// Frontend/src/screens/admin/basedatos/AdminBulkUpdateScreen.tsx
import React, { useState } from 'react';
import { bulkUpdateAPI } from '../../../services/api';
import './styles/AdminBulkUpdateScreen.css';
import AdminHero from '../../../components/AdminHero';
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
    <div className="av-page bu2-container">
      <AdminHero icono={<FiEdit3 size={24} />} seccion="Gestión BD" titulo="Actualización" resaltado="masiva"
        descripcion="Cambia precios, existencias u otros datos de muchos registros a la vez con un archivo de Excel." />

      {message && (
        <div className={`bulk-message ${message.type}`}>
          {message.type === 'success' && <FiCheckCircle />}
          {message.type === 'error' && <FiXCircle />}
          {message.type === 'warning' && <FiAlertTriangle />}
          {message.type === 'info' && <FiInfo />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="bu4-pasos">
        {/* Paso 1: qué tabla */}
        <section className="bu4-paso">
          <header><span className="bu4-num">1</span><div><h2>¿Qué quieres actualizar?</h2><p>Elige la tabla que vas a cambiar.</p></div></header>
          <div className="bu4-tablas">
            {tables.map(t => (
              <button key={t.value} className={`bu4-tabla ${selectedTable === t.value ? 'activa' : ''}`}
                onClick={() => handleTableChange({ target: { value: t.value } } as React.ChangeEvent<HTMLSelectElement>)}>
                <FiDatabase size={18} /><span>{t.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Paso 2: plantilla */}
        <section className="bu4-paso">
          <header><span className="bu4-num">2</span><div><h2>Descarga y llena la plantilla</h2><p>Trae los datos actuales; cambia solo lo que necesites.</p></div></header>
          <ul className="bu4-reglas">
            <li>Abre la hoja <b>ACTUALIZACION</b> del archivo.</li>
            <li>La columna <b>id</b> es obligatoria; no la cambies.</li>
            <li>Las celdas vacías se ignoran: el dato actual se queda igual.</li>
          </ul>
          <button className="av-btn av-btn--sec bu4-descargar" onClick={handleDownloadTemplate} disabled={downloadingTemplate}>
            {downloadingTemplate ? <><span className="spinner-small"></span> Descargando...</> : <><FiDownload size={16} /> Descargar plantilla de {tables.find(t => t.value === selectedTable)?.label.toLowerCase()}</>}
          </button>
        </section>

        {/* Paso 3: subir */}
        <section className="bu4-paso">
          <header><span className="bu4-num">3</span><div><h2>Sube el archivo y revisa</h2><p>Antes de guardar verás exactamente qué va a cambiar.</p></div></header>
          <div
            className={`bu4-drop ${dragActive ? 'arrastrando' : ''} ${file ? 'con-archivo' : ''}`}
            onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <input type="file" id="file-upload" accept=".xlsx" onChange={handleFileChange} disabled={loading || executing} hidden />
            {file ? (
              <><FiCheckCircle size={30} /><strong>{file.name}</strong><small>Toca para cambiar el archivo</small></>
            ) : (
              <><FiUpload size={30} /><strong>Arrastra tu archivo aquí</strong><small>o toca para elegirlo · solo .xlsx</small></>
            )}
          </div>
          <button className="av-btn bu4-revisar" onClick={handlePreview} disabled={!file || loading || executing}>
            {loading ? <><span className="spinner-small"></span> Revisando...</> : <><FiEye size={17} /> Revisar cambios</>}
          </button>
        </section>
      </div>

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
