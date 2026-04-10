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

  // ✅ ACTUALIZADO: Descripciones de tablas incluyendo ventas y detalle_ventas
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
    // ✅ NUEVAS TABLAS
    'ventas': '💰 Ventas y pedidos realizados por clientes',
    'detalle_ventas': '📦 Detalle de productos vendidos en cada venta'
  };

  // Cargar tablas disponibles
  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    try {
      setLoadingTables(true);
      const response = await importAPI.getTables();
      console.log('📋 Tablas recibidas en SimpleImport:', response);
      if (response.success && response.tables) {
        setTables(response.tables);
        console.log('✅ Tablas cargadas:', response.tables);
      } else {
        console.error('Respuesta sin tables:', response);
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
        console.log(`✅ Columnas cargadas para ${tableName}:`, response.tableInfo.columns);
      }
    } catch (error: any) {
      console.error('Error loading columns:', error);
      showMessage('error', error.message || 'Error al cargar las columnas');
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
    // Limpiar input file
    const fileInput = document.getElementById('dataFile') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
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

    setLoading(true);
    setMessage(null);
    setWarnings([]);

    try {
      const response = await importAPI.previewFile(file, selectedTable);
      console.log('📊 Preview response:', response);
      
      if (response.success) {
        setHeaders(response.headers || []);
        setPreviewData(response.preview || []);
        setTotalRows(response.totalRows || 0);
        
        if (response.warnings && response.warnings.length > 0) {
          setWarnings(response.warnings);
        }
        
        // Guardar datos completos para importar
        if (response.data) {
          sessionStorage.setItem('importData', JSON.stringify(response.data));
        }
        
        showMessage('success', `✅ Archivo cargado correctamente. ${response.totalRows || 0} filas encontradas.`);
      } else {
        showMessage('error', response.message || 'Error al procesar el archivo');
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
      console.log('📤 Import response:', response);

      if (response.success) {
        showMessage('success', response.message);
        if (response.errors && response.errors.length > 0) {
          setWarnings(response.errors);
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

    setLoading(true);
    try {
      console.log(`📥 Descargando plantilla para: ${selectedTable}`);
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
      
      showMessage('success', '✅ Plantilla descargada correctamente');
    } catch (error: any) {
      console.error('Error downloading template:', error);
      showMessage('error', error.message || 'Error al descargar la plantilla');
    } finally {
      setLoading(false);
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
            disabled={!selectedTable || loading}
          >
            {loading ? '⏳ Descargando...' : '📥 Descargar Plantilla Excel'}
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
            {previewData.length > 10 && (
              <p className="preview-note">Mostrando 10 de {totalRows} registros</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSimpleImportScreen;