// Ruta: Frontend/src/screens/admin/basedatos/AdminBackupsScreen.tsx

import React, { useState } from 'react';
import './styles/AdminBackupsScreen.css';
import { backupsService } from '../../../services/backupsService';

const AdminBackupsScreen: React.FC = () => {
  // --- ESTADOS ---
  // Ahora solo necesitamos estados para la UI inmediata
  const [isDownloading, setIsDownloading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // --- ACCIONES ---

  /**
   * Genera y descarga el respaldo vía Streaming
   */
  const handleGenerateAndDownload = async () => {
    setIsDownloading(true);
    try {
      // Invocamos el servicio que dispara la descarga directa
      backupsService.downloadBackupDirectly();
      
      // Nota: Como es una descarga de navegador, no hay una promesa 
      // de "finalización" real, así que liberamos el botón tras un breve delay
      setTimeout(() => setIsDownloading(false), 2000);
    } catch (error) {
      alert("No se pudo conectar con el servicio de descarga.");
      setIsDownloading(false);
    }
  };

  /**
   * NOTA: La restauración sigue requiriendo un archivo. 
   * Si borraste la carpeta, la restauración manual por lista ya no aplica.
   * Aquí podrías implementar un "Upload" de archivo si lo necesitas en el futuro.
   */

  return (
    <div className={`backups-screen-container ${isRestoring ? 'app-locked' : ''}`}>
      {/* Header */}
      <div className="backups-header">
        <div className="header-left">
          <h1 className="page-title">Panel de Base de Datos</h1>
          <p className="page-description">
            Estado de Supabase: <strong>Conectado</strong>
          </p>
        </div>
      </div>

      {/* Grid de Acciones Principales */}
      <div className="backup-stats-grid">
        <div className="stat-card action-card">
          <div className="stat-icon">📥</div>
          <div className="stat-content">
            <span className="stat-label">Respaldo Inmediato</span>
            <button 
              className="btn-primary" 
              onClick={handleGenerateAndDownload}
              disabled={isDownloading || isRestoring}
            >
              {isDownloading ? 'Generando Archivo...' : 'Generar y Descargar .SQL'}
            </button>
            <p className="help-text">
              Esto extraerá los datos actuales de Supabase y los descargará en tu computadora sin guardarlos en el servidor.
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
              La restauración ahora requiere que cargues un archivo descargado previamente.
            </p>
          </div>
        </div>
      </div>

      {/* Sección Informativa (Ya no hay tabla porque no hay archivos en el servidor) */}
      <div className="backups-table-section">
        <div className="info-box">
          <h3>Información de Seguridad</h3>
          <ul>
            <li>Los respaldos generados contienen toda la información de la joyería.</li>
            <li>Al usar el método de <strong>Descarga Directa</strong>, el servidor no almacena copias, lo cual es más seguro.</li>
            <li>Se recomienda generar un respaldo antes de cualquier modificación masiva de precios o inventario.</li>
          </ul>
        </div>
      </div>

      {/* Overlay de Carga Crítica */}
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