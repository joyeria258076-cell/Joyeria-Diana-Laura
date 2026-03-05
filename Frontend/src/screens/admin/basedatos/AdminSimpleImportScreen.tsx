// Frontend/src/screens/admin/basedatos/AdminSimpleImportScreen.tsx
import React, { useState, useEffect } from 'react';
import { importAPI } from '../../../services/api'; // ✅ Importar importAPI directamente
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
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [totalRows, setTotalRows] = useState(0);
  const [importing, setImporting] = useState(false);

  // Cargar tablas disponibles
  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    try {
      const response = await importAPI.getTables(); // ✅ Usar importAPI
      if (response.success) {
        setTables(response.tables);
      }
    } catch (error) {
      console.error('Error loading tables:', error);
      showMessage('error', 'Error al cargar las tablas');
    }
  };

  const loadColumns = async (tableName: string) => {
    try {
      const response = await importAPI.getTableInfo(tableName); // ✅ Usar importAPI
      if (response.success) {
        setColumns(response.tableInfo.columns.map((col: string) => ({
          column_name: col,
          data_type: 'text'
        })));
      }
    } catch (error) {
      console.error('Error loading columns:', error);
      showMessage('error', 'Error al cargar las columnas');
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
    setMessage(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setMessage(null);
    }
  };

  const handlePreview = async () => {
    if (!file) {
      showMessage('error', 'Selecciona un archivo CSV');
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await importAPI.previewCSV(file); // ✅ Usar importAPI
      
      if (response.success) {
        setHeaders(response.headers);
        setPreviewData(response.preview);
        setTotalRows(response.totalRows);
        
        // Guardar datos completos para importar
        sessionStorage.setItem('importData', JSON.stringify(response.data));
        
        showMessage('success', `Archivo cargado correctamente. ${response.totalRows} filas encontradas.`);
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
      const response = await importAPI.importData(selectedTable, data, headers); // ✅ Usar importAPI

      if (response.success) {
        showMessage('success', response.message);
        // Limpiar
        setFile(null);
        setPreviewData([]);
        setHeaders([]);
        sessionStorage.removeItem('importData');
        
        // Resetear input file
        const fileInput = document.getElementById('csvFile') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        showMessage('error', response.message);
      }
    } catch (error: any) {
      console.error('Error importing:', error);
      showMessage('error', error.message || 'Error al importar los datos');
    } finally {
      setImporting(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  return (
    <div className="simple-import-container">
      <div className="simple-import-header">
        <h1>Importación Simple desde CSV</h1>
        <p>Selecciona una tabla y sube un archivo CSV para importar datos</p>
      </div>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="import-form">
        <div className="form-group">
          <label>Tabla destino:</label>
          <select 
            value={selectedTable} 
            onChange={handleTableChange}
            disabled={loading || importing}
          >
            <option value="">Seleccionar tabla</option>
            {tables.map(table => (
              <option key={table} value={table}>{table}</option>
            ))}
          </select>
        </div>

        {selectedTable && columns.length > 0 && (
          <div className="columns-info">
            <h3>Columnas disponibles:</h3>
            <div className="columns-list">
              {columns.map(col => (
                <span key={col.column_name} className="column-tag">
                  {col.column_name}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="form-group">
          <label>Archivo CSV:</label>
          <input
            id="csvFile"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={!selectedTable || loading || importing}
          />
          <small>El archivo debe tener encabezados que coincidan con las columnas de la tabla</small>
        </div>

        <div className="form-actions">
          <button 
            onClick={handlePreview}
            disabled={!file || !selectedTable || loading || importing}
            className="btn-preview"
          >
            {loading ? 'Procesando...' : 'Vista Previa'}
          </button>

          {previewData.length > 0 && (
            <button 
              onClick={handleImport}
              disabled={importing}
              className="btn-import"
            >
              {importing ? 'Importando...' : 'Importar Datos'}
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
                        <td key={header}>{row[header]}</td>
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