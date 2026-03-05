// Ruta: Frontend/src/screens/admin/basedatos/AdminBackupsScreen.tsx

import React, { useState } from 'react';
import './styles/AdminBackupsScreen.css';
import { backupsService } from '../../../services/backupsService';

// 1. Definimos la estructura de un respaldo para el historial
interface Backup {
  id: string;
  name: string;
  type: 'manual' | 'automatic' | 'incremental' | 'full';
  size: string;
  tables: number;
  records: number;
  status: 'completed' | 'in_progress' | 'failed' | 'scheduled';
  created_at: string;
}

const AdminBackupsScreen: React.FC = () => {
  // --- ESTADOS ---
  const [isDownloading, setIsDownloading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // 2. Estado para almacenar el historial (con datos de ejemplo)
  const [backups] = useState<Backup[]>([
    {
      id: '1',
      name: 'Respaldo_Sistema_Completo',
      type: 'full',
      size: '2.4 MB',
      tables: 42,
      records: 15420,
      status: 'completed',
      created_at: '2024-03-05 10:00:00',
    },
    {
      id: '2',
      name: 'Corte_Caja_Previo',
      type: 'manual',
      size: '850 KB',
      tables: 12,
      records: 3200,
      status: 'completed',
      created_at: '2024-03-04 18:30:00',
    }
  ]);

  // --- ACCIONES ---

  const handleGenerateAndDownload = async () => {
    setIsDownloading(true);
    try {
      await backupsService.downloadBackupDirectly();
      console.log("Descarga completada con éxito.");
    } catch (error) {
      console.error("Error en la descarga:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  // --- HELPERS PARA LA TABLA ---
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <span className="badge badge-success">✅ Completado</span>;
      case 'failed': return <span className="badge badge-error">❌ Fallido</span>;
      default: return <span className="badge">{status}</span>;
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
            <span className="stat-label">Restauración de Sistema (NO PROGRAMADO)</span>
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

      {/* --- SECCIÓN NUEVA: HISTORIAL DE RESPALDOS --- */}
      <section className="backups-history-section" style={{ marginTop: '2rem' }}>
        <h2 className="section-title">Historial de Respaldos Recientes (NO PROGRAMADO)</h2>
        <div className="table-container shadow-sm" style={{ background: 'white', borderRadius: '12px', overflow: 'hidden' }}>
          <table className="backups-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Nombre del Respaldo</th>
                <th>Fecha</th>
                <th>Tamaño</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((backup) => (
                <tr key={backup.id}>
                  <td style={{ textAlign: 'center' }}>{backup.type === 'full' ? '💿' : '✋'}</td>
                  <td>
                    <div className="name-cell" style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: '600', color: '#2d3748' }}>{backup.name}</span>
                      <small style={{ color: '#718096' }}>{backup.tables} tablas | {backup.records} registros</small>
                    </div>
                  </td>
                  <td>{backup.created_at}</td>
                  <td>{backup.size}</td>
                  <td>{getStatusBadge(backup.status)}</td>
                  <td>
                    <div className="actions-cell">
                      <button className="btn-icon" title="Ver detalles">👁️</button>
                      <button className="btn-icon" title="Eliminar registro" style={{ marginLeft: '10px' }}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Sección Informativa */}
      <div className="backups-table-section" style={{ marginTop: '2rem' }}>
        <div className="info-box info-gradient">
          <h3><span className="icon">🛡️</span> Seguridad y Almacenamiento</h3>
          <ul>
            <li>Los archivos <strong>.dump</strong> son copias binarias comprimidas de toda tu base de datos.</li>
            <li>Al elegir tu propia carpeta (ej. una USB o Dropbox), mantienes el control total de tus datos.</li>
            <li><strong>Importante:</strong> Este proceso no consume espacio en el servidor de la joyería.</li>
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