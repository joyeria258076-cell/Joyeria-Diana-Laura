// Frontend/src/screens/admin/basedatos/AdminSimpleImportScreen.tsx
import React, { useState, useEffect } from 'react';
import { importAPI, templateAPI } from '../../../services/api';
import './AdminSimpleImportScreen.css';

interface Table {
  table_name: string;
}

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

  // Descripciones de tablas para ayudar al usuario
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
    'preguntas_frecuentes': 'FAQ para el centro de ayuda'
  };

  // Cargar tablas disponibles
  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    try {
      setLoadingTables(true);
      const response = await importAPI.getTables();
      if (response.success) {
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
      if (response.success) {
        setColumns(response.tableInfo.columns.map((col: string) => ({
          column_name: col,
          data_type: 'text'
        })));
      }
    } catch (error: any) {
      console.error('Error loading columns:', error);
      showMessage('error', error.message || 'Error al cargar las columnas');
      setSelectedTable('');
    }
  };

  const handleTableChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const table = e.target.value;
    setSelectedTable(table);
    if (table) {
      loadColumns(table);
    }
    // Resetear datos
    setFile(null);
    setPreviewData([]);
    setHeaders([]);
    setWarnings([]);
    setMessage(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setMessage(null);
      setWarnings([]);
    }
  };

  const handlePreview = async () => {
    if (!file) {
      showMessage('error', 'Selecciona un archivo');
      return;
    }

    if (!selectedTable) {
      showMessage('error', 'Selecciona una tabla');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('tableName', selectedTable);

    setLoading(true);
    setMessage(null);
    setWarnings([]);

    try {
      // Usar el mismo endpoint pero ahora acepta Excel
      const response = await importAPI.previewFile(file, selectedTable);
      
      if (response.success) {
        setHeaders(response.headers);
        setPreviewData(response.preview);
        setTotalRows(response.totalRows);
        
        if (response.warnings && response.warnings.length > 0) {
          setWarnings(response.warnings);
        }
        
        // Guardar datos completos para importar
        sessionStorage.setItem('importData', JSON.stringify(response.data));
        
        showMessage('success', `✅ Archivo cargado correctamente. ${response.totalRows} filas encontradas.`);
      }
    } catch (error: any) {
      console.error('Error previewing file:', error);
      showMessage('error', error.message || 'Error al procesar el archivo');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!selectedTable) {
      showMessage('error', 'Selecciona una tabla');
      return;
    }

    const dataStr = sessionStorage.getItem('importData');
    if (!dataStr) {
      showMessage('error', 'No hay datos para importar');
      return;
    }

    const data = JSON.parse(dataStr);
    
    setImporting(true);
    setMessage(null);

    try {
      const response = await importAPI.importData(selectedTable, data, headers);

      if (response.success) {
        showMessage('success', response.message);
        if (response.warnings && response.warnings.length > 0) {
          setWarnings(response.warnings);
        }
        // Limpiar
        setFile(null);
        setPreviewData([]);
        setHeaders([]);
        sessionStorage.removeItem('importData');
        
        // Resetear input file
        const fileInput = document.getElementById('dataFile') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        showMessage('error', response.message);
        if (response.errors) {
          setWarnings(response.errors);
        }
      }
    } catch (error: any) {
      console.error('Error importing:', error);
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
    if (!selectedTable) {
      showMessage('error', 'Primero selecciona una tabla');
      return;
    }

    try {
      const response = await templateAPI.downloadTemplate(selectedTable);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `plantilla_${selectedTable}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      showMessage('success', '✅ Plantilla descargada correctamente');
    } catch (error: any) {
      console.error('Error downloading template:', error);
      showMessage('error', error.message || 'Error al descargar la plantilla');
    }
  };

  return (
    <div className="simple-import-container">
      <div className="simple-import-header">
        <h1>📥 Importación de Datos desde Excel</h1>
        <p>Usa las plantillas oficiales para importar datos maestros</p>
      </div>
      
      {selectedTable && tableDescriptions[selectedTable] && (
        <div className="template-info">
          <div className="template-info-content">
            <p>
              <strong>📋 Tabla seleccionada:</strong> {selectedTable} - {tableDescriptions[selectedTable]}
            </p>
            <p className="template-instructions">
              <strong>📝 Instrucciones:</strong>
              <br />
              1. Descarga la plantilla con el botón "Descargar Plantilla"
              <br />
              2. Abre el archivo Excel y ve a la hoja "DATOS"
              <br />
              3. Ingresa tus datos a partir de la <strong>FILA 9</strong> (las filas 1-8 son encabezados)
              <br />
              4. Guarda el archivo y súbelo aquí
            </p>
          </div>
          <button 
            className="btn-template"
            onClick={downloadTemplate}
            disabled={!selectedTable}
          >
            📥 Descargar Plantilla Excel
          </button>
        </div>
      )}

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="message warning">
          <strong>⚠️ Advertencias:</strong>
          <ul>
            {warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      <div className="import-form">
        <div className="form-group">
          <label>Tabla destino:</label>
          {loadingTables ? (
            <div className="loading-tables">Cargando tablas...</div>
          ) : (
            <select 
              value={selectedTable} 
              onChange={handleTableChange}
              disabled={loading || importing}
            >
              <option value="">Seleccionar tabla</option>
              {tables.map(table => (
                <option key={table} value={table}>
                  {table} {tableDescriptions[table] ? `- ${tableDescriptions[table]}` : ''}
                </option>
              ))}
            </select>
          )}
        </div>
        
        <div className="form-group">
          <label>Archivo (Excel o CSV):</label>
          <input
            id="dataFile"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            disabled={!selectedTable || loading || importing}
          />
          <small>
            📌 Usa la plantilla Excel descargada. El sistema leerá automáticamente los datos desde la fila 9.
            <br />
            ⚠️ No modifiques las filas 1-8 (encabezados, instrucciones y ejemplos).
          </small>
        </div>

        <div className="form-actions">
          <button 
            onClick={handlePreview}
            disabled={!file || !selectedTable || loading || importing}
            className="btn-preview"
          >
            {loading ? 'Procesando...' : '👁️ Vista Previa'}
          </button>

          {previewData.length > 0 && (
            <button 
              onClick={handleImport}
              disabled={importing}
              className="btn-import"
            >
              {importing ? 'Importando...' : '📤 Importar Datos'}
            </button>
          )}
        </div>

        {previewData.length > 0 && (
          <div className="preview-section">
            <h3>Vista Previa (primeras 10 filas de {totalRows})</h3>
            <div className="table-responsive">
              <table className="preview-table">
                <thead>
                  <tr>
                    {headers.map(header => (
                      <th key={header}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, idx) => (
                    <tr key={idx}>
                      {headers.map(header => (
                        <td key={header}>{row[header]?.toString().substring(0, 50)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSimpleImportScreen;