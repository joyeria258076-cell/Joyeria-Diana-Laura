// Ruta: Frontend/src/screens/admin/basedatos/AdminBackupsScreen.tsx

import React, { useState } from 'react';
import './styles/AdminBackupsScreen.css';
import { backupsService } from '../../../services/backupsService';

const AdminBackupsScreen: React.FC = () => {
  // --- ESTADOS ---
  const [isDownloading, setIsDownloading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // --- ACCIONES ---

  /**
   * Genera el respaldo y abre el cuadro de diálogo para elegir ruta (Guardar como)
   */
  const handleGenerateAndDownload = async () => {
    setIsDownloading(true);
    try {
      // Invocamos el servicio asíncrono que ahora permite elegir ruta
      await backupsService.downloadBackupDirectly();
      
      // Opcional: Podrías poner una notificación de éxito aquí con un Toast
      console.log("Descarga completada con éxito.");
    } catch (error) {
      // Manejamos errores (ej. si el usuario cancela la ventana de Guardar)
      console.error("Error en la descarga:", error);
    } finally {
      // Liberamos el botón inmediatamente al terminar o cancelar
      setIsDownloading(false);
    }
  };

  return (
    <div className={`backups-screen-container ${isRestoring ? 'app-locked' : ''}`}>
      {/* Header */}
      <div className="backups-header">
        <div className="header-left">
          <h1 className="page-title">Panel de Base de Datos</h1>
          <p className="page-description">
            Estado de Supabase: <span className="status-badge">Conectado</span>
          </p>
        </div>
      </div>

      {/* Grid de Acciones Principales */}
      <div className="backup-stats-grid">
        <div className="stat-card action-card">
          <div className="stat-icon">📥</div>
          <div className="stat-content">
            <span className="stat-label">Respaldo Personalizado</span>
            <button 
              className={`btn-primary ${isDownloading ? 'loading' : ''}`} 
              onClick={handleGenerateAndDownload}
              disabled={isDownloading || isRestoring}
            >
              {isDownloading ? (
                <>
                  <span className="spinner-small"></span> Generando...
                </>
              ) : (
                'Generar y Elegir Carpeta .DUMP'
              )}
            </button>
            <p className="help-text">
              Extrae los datos y permite elegir <strong>exactamente dónde guardar</strong> el archivo en tu PC.
            </p>
          </div>
        </div>

        <div className="stat-card action-card disabled">
          <div className="stat-icon">🔄</div>
          <div className="stat-content">
            <span className="stat-label">Restauración de Sistema</span>
            <button 
              className="btn-secondary" 
              disabled={true}
              title="Para restaurar, sube un archivo descargado previamente"
            >
              Subir y Restaurar (Próximamente)
            </button>
            <p className="help-text">
              Para restaurar, deberás seleccionar el archivo <strong>.dump</strong> generado anteriormente.
            </p>
          </div>
        </div>
      </div>

      {/* Sección Informativa */}
      <div className="backups-table-section">
        <div className="info-box info-gradient">
          <h3><span className="icon">🛡️</span> Seguridad y Almacenamiento</h3>
          <ul>
            <li>Los archivos <strong>.dump</strong> son copias binarias comprimidas de toda tu base de datos.</li>
            <li>Al elegir tu propia carpeta (ej. una USB o Dropbox), mantienes el control total de tus datos.</li>
            <li><strong>Importante:</strong> Este proceso no consume espacio en el servidor de la joyería.</li>
          </ul>
        </div>
      </div>

      {/* Overlay de Carga Crítica (Para futuras restauraciones) */}
      {isRestoring && (
        <div className="restore-overlay">
          <div className="restore-loader">
            <div className="spinner-large"></div>
            <h2>SINCRONIZANDO CON SUPABASE</h2>
            <p>Por favor, no cierres esta ventana...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBackupsScreen;