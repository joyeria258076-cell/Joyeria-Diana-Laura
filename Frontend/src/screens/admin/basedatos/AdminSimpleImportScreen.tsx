// Frontend/src/screens/admin/basedatos/AdminSimpleImportScreen.tsx
import React, { useState, useEffect } from 'react';
import { importAPI, templateAPI } from '../../../services/api';
import './AdminSimpleImportScreen.css';
import {
  AiOutlineCloudUpload, AiOutlineDownload, AiOutlineEye, AiOutlineFileExcel,
  AiOutlineCheckCircle, AiOutlineWarning, AiOutlineDatabase, AiOutlineInbox,
} from 'react-icons/ai';

interface Column {
  column_name: string;
  data_type: string;
}

const AdminSimpleImportScreen: React.FC = () => {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [columns, setColumns] = useState<Column[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTables, setLoadingTables] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);
  const [totalRows, setTotalRows] = useState(0);
  const [importing, setImporting] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const tableDescriptions: { [key: string]: string } = {
    'productos': 'Catálogo de productos (nombre, categoría, precios, stock)',
    'categorias': 'Categorías para clasificar productos',
    'proveedores': 'Proveedores y fabricantes',
    'clientes': 'Base de datos de clientes',
    'usuarios': 'Usuarios del sistema (solo para migración inicial)',
    'temporadas': 'Temporadas y colecciones',
    'tipos_producto': 'Tipos de productos (joyería fina, bisutería, etc.)',
    'promociones': 'Promociones y descuentos',
    'metodos_pago': 'Métodos de pago disponibles',
    'preguntas_frecuentes': 'FAQ para el centro de ayuda',
    'ventas': 'Ventas y pedidos realizados por clientes',
    'detalle_ventas': 'Detalle de productos vendidos en cada venta'
  };

  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    try {
      setLoadingTables(true);
      const response = await importAPI.getTables();
      if (response.success && response.tables) {
        setTables(response.tables);
      }
    } catch (error) {
      console.error('Error loading tables:', error);
      showMessage('error', 'Error al cargar las tablas');
    } finally {
      setLoadingTables(false);
    }
  };

  const loadColumns = async (tableName: string) => {
    try {
      const response = await importAPI.getTableInfo(tableName);
      if (response.success && response.tableInfo) {
        setColumns(response.tableInfo.columns.map((col: string) => ({
          column_name: col,
          data_type: 'text'
        })));
      }
    } catch (error: any) {
      console.error('Error loading columns:', error);
      showMessage('error', error.message || 'Error al cargar las columnas');
    }
  };

  const handleTableChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const table = e.target.value;
    setSelectedTable(table);
    if (table) loadColumns(table);
    setFile(null);
    setPreviewData([]);
    setHeaders([]);
    setWarnings([]);
    setMessage(null);
  };

  const procesarArchivo = (f: File) => {
    setFile(f);
    setMessage(null);
    setWarnings([]);
    setPreviewData([]);
    setHeaders([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) procesarArchivo(f);
    e.target.value = '';
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) procesarArchivo(f);
  };

  const handlePreview = async () => {
    if (!file) { showMessage('error', 'Selecciona un archivo'); return; }
    if (!selectedTable) { showMessage('error', 'Selecciona una tabla'); return; }

    setLoading(true);
    setMessage(null);
    setWarnings([]);

    try {
      const response = await importAPI.previewFile(file, selectedTable);
      if (response.success) {
        setHeaders(response.headers || []);
        setPreviewData(response.preview || []);
        setTotalRows(response.totalRows || 0);
        if (response.warnings && response.warnings.length > 0) setWarnings(response.warnings);
        if (response.data) sessionStorage.setItem('importData', JSON.stringify(response.data));
        showMessage('success', `Archivo cargado correctamente. ${response.totalRows || 0} filas encontradas.`);
      } else {
        showMessage('error', response.message || 'Error al procesar el archivo');
      }
    } catch (error: any) {
      showMessage('error', error.message || 'Error al procesar el archivo');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!selectedTable) { showMessage('error', 'Selecciona una tabla'); return; }

    const dataStr = sessionStorage.getItem('importData');
    if (!dataStr) { showMessage('error', 'No hay datos para importar'); return; }

    const data = JSON.parse(dataStr);
    setImporting(true);
    setMessage(null);

    try {
      const response = await importAPI.importData(selectedTable, data, headers);
      if (response.success) {
        showMessage('success', response.message);
        if (response.errors && response.errors.length > 0) setWarnings(response.errors);
        setFile(null);
        setPreviewData([]);
        setHeaders([]);
        sessionStorage.removeItem('importData');
      } else {
        showMessage('error', response.message);
        if (response.errors) setWarnings(response.errors);
      }
    } catch (error: any) {
      showMessage('error', error.message || 'Error al importar los datos');
    } finally {
      setImporting(false);
    }
  };

  const showMessage = (type: 'success' | 'error' | 'warning', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const downloadTemplate = async () => {
    if (!selectedTable) { showMessage('error', 'Primero selecciona una tabla'); return; }

    setLoading(true);
    try {
      const response = await templateAPI.downloadTemplate(selectedTable);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al descargar');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `plantilla_${selectedTable}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showMessage('success', 'Plantilla descargada correctamente');
    } catch (error: any) {
      showMessage('error', error.message || 'Error al descargar la plantilla');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="si2-container">
      <div className="si2-header">
        <div>
          <h1><AiOutlineCloudUpload size={22} /> Importación de datos desde Excel</h1>
          <p>Usa las plantillas oficiales para importar datos maestros</p>
        </div>
      </div>

      {message && (
        <div className={`message ${message.type}`}>
          {message.type === 'success' ? <AiOutlineCheckCircle size={16} /> : <AiOutlineWarning size={16} />} {message.text}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="message warning">
          <strong><AiOutlineWarning size={14} /> Advertencias:</strong>
          <ul>{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
        </div>
      )}

      <div className="si2-layout">
        {/* Columna principal — tarjetas numeradas */}
        <div className="si2-main">
          <div className="si2-card">
            <div className="si2-card-num">1</div>
            <div className="si2-card-body">
              <span className="si2-card-title">Selecciona la tabla destino</span>
              {loadingTables ? (
                <div className="loading-tables">Cargando tablas...</div>
              ) : (
                <select value={selectedTable} onChange={handleTableChange} disabled={loading || importing}>
                  <option value="">Seleccionar tabla</option>
                  {tables.map(table => (
                    <option key={table} value={table}>{table}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className={`si2-card ${!selectedTable ? 'si2-card-disabled' : ''}`}>
            <div className="si2-card-num">2</div>
            <div className="si2-card-body">
              <span className="si2-card-title">Descarga la plantilla oficial</span>
              <p className="si2-card-hint">Contiene las columnas exactas que espera el sistema para esta tabla.</p>
              <button className="btn-template" onClick={downloadTemplate} disabled={!selectedTable || loading}>
                <AiOutlineDownload size={16} /> {loading ? 'Descargando...' : 'Descargar plantilla Excel'}
              </button>
            </div>
          </div>

          <div className={`si2-card ${!selectedTable ? 'si2-card-disabled' : ''}`}>
            <div className="si2-card-num">3</div>
            <div className="si2-card-body">
              <span className="si2-card-title">Sube tu archivo lleno</span>
              <div
                className={`si2-dropzone ${isDragging ? 'dragging' : ''} ${!selectedTable ? 'disabled' : ''}`}
                onClick={() => selectedTable && document.getElementById('dataFile')?.click()}
                onDragOver={e => { e.preventDefault(); if (selectedTable) setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
              >
                <input id="dataFile" type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} disabled={!selectedTable || loading || importing} hidden />
                <AiOutlineInbox size={28} />
                <p>{file ? file.name : <>Arrastra el archivo aquí o <span>haz clic para elegir</span></>}</p>
                <small>Formatos: .xlsx, .xls, .csv</small>
              </div>
              <p className="si2-card-hint">
                El sistema leerá los datos desde la <strong>fila 9</strong>. No modifiques las filas 1-8 (encabezados e instrucciones).
              </p>
            </div>
          </div>

          <div className={`si2-card ${!file ? 'si2-card-disabled' : ''}`}>
            <div className="si2-card-num">4</div>
            <div className="si2-card-body">
              <span className="si2-card-title">Previsualiza e importa</span>
              <div className="form-actions">
                <button onClick={handlePreview} disabled={!file || !selectedTable || loading || importing} className="btn-preview">
                  <AiOutlineEye size={15} /> {loading ? 'Procesando...' : 'Vista previa'}
                </button>
                {previewData.length > 0 && (
                  <button onClick={handleImport} disabled={importing} className="btn-import">
                    <AiOutlineCloudUpload size={15} /> {importing ? 'Importando...' : 'Importar datos'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {previewData.length > 0 && (
            <div className="preview-section">
              <h3>Vista previa (primeras 10 filas de {totalRows})</h3>
              <div className="table-responsive">
                <table className="preview-table">
                  <thead>
                    <tr>{headers.map(header => <th key={header}>{header}</th>)}</tr>
                  </thead>
                  <tbody>
                    {previewData.slice(0, 10).map((row, idx) => (
                      <tr key={idx}>
                        {headers.map(header => (
                          <td key={header}>{row[header]?.toString().substring(0, 50) || '-'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {previewData.length > 10 && <p className="preview-note">Mostrando 10 de {totalRows} registros</p>}
            </div>
          )}
        </div>

        {/* Sidebar — info de la tabla seleccionada */}
        <div className="si2-sidebar">
          <span className="si2-sidebar-label">Tabla seleccionada</span>
          {selectedTable ? (
            <>
              <div className="si2-sidebar-table">
                <AiOutlineDatabase size={18} />
                <strong>{selectedTable}</strong>
              </div>
              {tableDescriptions[selectedTable] && (
                <p className="si2-sidebar-desc">{tableDescriptions[selectedTable]}</p>
              )}
              {columns.length > 0 && (
                <>
                  <span className="si2-sidebar-label" style={{ marginTop: '0.8rem' }}>Columnas esperadas</span>
                  <div className="columns-list">
                    {columns.map(col => (
                      <span key={col.column_name} className="column-tag">{col.column_name}</span>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <p className="si2-sidebar-desc">Selecciona una tabla para ver su descripción y columnas esperadas.</p>
          )}

          <div className="si2-sidebar-steps">
            <span className="si2-sidebar-label">Pasos</span>
            <div className={`si2-sidebar-step ${selectedTable ? 'done' : ''}`}><AiOutlineFileExcel size={14} /> Elegir tabla</div>
            <div className={`si2-sidebar-step ${file ? 'done' : ''}`}><AiOutlineInbox size={14} /> Subir archivo</div>
            <div className={`si2-sidebar-step ${previewData.length > 0 ? 'done' : ''}`}><AiOutlineEye size={14} /> Previsualizar</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSimpleImportScreen;
