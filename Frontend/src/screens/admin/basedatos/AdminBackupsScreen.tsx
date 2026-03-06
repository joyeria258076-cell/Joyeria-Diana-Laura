// Ruta: Frontend/src/screens/admin/basedatos/AdminBackupsScreen.tsx

import React, { useState, useEffect } from 'react';
import './styles/AdminBackupsScreen.css';
import { backupsService, Backup } from '../../../services/backupsService';

const AdminBackupsScreen: React.FC = () => {
    // --- ESTADOS ---
    const [isDownloading, setIsDownloading] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [backups, setBackups] = useState<Backup[]>([]);
    
    // Estados para el Modal de Log
    const [selectedLog, setSelectedLog] = useState<Backup | null>(null);
    const [showLogModal, setShowLogModal] = useState(false);

    // --- CARGA DE DATOS ---
    const fetchHistory = async () => {
        try {
            setIsLoading(true);
            const data = await backupsService.getHistory();
            setBackups(data);
        } catch (error) {
            console.error("Error al cargar la bitácora:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    // --- ACCIONES ---

    const handleGenerateAndDownload = async () => {
        setIsDownloading(true);
        try {
            await backupsService.downloadBackupDirectly();
            // Esperamos un momento para que el backend termine el registro en DB
            setTimeout(() => {
                fetchHistory();
            }, 2000);
        } catch (error) {
            console.error("Error en la descarga:", error);
            alert("Hubo un problema al generar el respaldo.");
        } finally {
            setIsDownloading(false);
        }
    };

    const handleOpenLog = (backup: Backup) => {
        setSelectedLog(backup);
        setShowLogModal(true);
    };

    // --- HELPERS DE INTERFAZ ---
    const getStatusBadge = (status: string) => {
        const normalizedStatus = status?.toLowerCase();
        switch (normalizedStatus) {
            case 'completed': return <span className="badge badge-success">✅ COMPLETADO</span>;
            case 'failed': return <span className="badge badge-error">❌ FALLIDO</span>;
            default: return <span className="badge badge-info">{status?.toUpperCase() || 'PENDIENTE'}</span>;
        }
    };

    return (
        <div className={`backups-screen-container ${isRestoring ? 'app-locked' : ''}`}>
            
            {/* Header */}
            <div className="backups-header">
                <div className="header-left">
                    <h1 className="page-title">Panel de Base de Datos</h1>
                    <p className="page-description">
                        Gestión de respaldos y auditoría de datos para <strong>Joyería Diana Laura</strong>.
                    </p>
                </div>
                <div className="header-actions">
                    <button className="btn-refresh" onClick={fetchHistory} title="Actualizar Bitácora">
                        🔄 Refrescar
                    </button>
                </div>
            </div>

            {/* Grid de Acciones Principales */}
            <div className="backup-stats-grid">
                <div className="stat-card action-card">
                    <div className="stat-icon">📥</div>
                    <div className="stat-content">
                        <span className="stat-label">Respaldo Manual</span>
                        <button 
                            className={`btn-primary ${isDownloading ? 'loading' : ''}`} 
                            onClick={handleGenerateAndDownload}
                            disabled={isDownloading || isRestoring}
                        >
                            {isDownloading ? 'Generando archivo...' : 'Descargar .DUMP Actual'}
                        </button>
                        <p className="help-text">
                            Genera una copia binaria y permite elegir destino local.
                        </p>
                    </div>
                </div>

                <div className="stat-card action-card">
                    <div className="stat-icon">🔄</div>
                    <div className="stat-content">
                        <span className="stat-label">Restauración de Sistema</span>
                        <button 
                            className="btn-secondary" 
                            disabled={true} 
                            title="Módulo en desarrollo"
                        >
                            Subir y Restaurar
                        </button>
                        <p className="help-text">
                            Próximamente: Restauración total desde archivo local.
                        </p>
                    </div>
                </div>
            </div>

            {/* --- SECCIÓN: HISTORIAL DE RESPALDOS --- */}
            <section className="backups-history-section" style={{ marginTop: '2rem' }}>
                <h2 className="section-title">Bitácora de Auditoría</h2>
                
                <div className="backups-table-section shadow-sm">
                    {isLoading ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: '#ECB2C3' }}>
                            <span className="spinner-small"></span> Cargando registros...
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="backups-table">
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'center' }}>Tipo</th>
                                        <th>Nombre del Archivo</th>
                                        <th>Fecha / Hora</th>
                                        <th style={{ textAlign: 'center' }}>Estado</th>
                                        <th style={{ textAlign: 'center' }}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {backups.length > 0 ? (
                                        backups.map((backup) => (
                                            <tr key={backup.id}>
                                                <td style={{ textAlign: 'center' }}>
                                                    {backup.type === 'manual' ? '✋' : '🤖'}
                                                </td>
                                                <td>
                                                    <div className="backup-name">
                                                        <strong>{backup.name}</strong>
                                                        <small>ID: {backup.id} | Por: {backup.created_by || 'Admin'}</small>
                                                    </div>
                                                </td>
                                                <td>{backup.created_at}</td>
                                                <td style={{ textAlign: 'center' }}>
                                                    {getStatusBadge(backup.status)}
                                                </td>
                                                <td>
                                                    <div className="action-buttons">
                                                        <button 
                                                            className="btn-icon" 
                                                            title="Ver Detalles Técnicos"
                                                            onClick={() => handleOpenLog(backup)}
                                                        >
                                                            👁️
                                                        </button>
                                                        <button 
                                                            className="btn-icon delete" 
                                                            title="Eliminar Registro"
                                                            onClick={() => alert('Función de borrado en desarrollo')}
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.4)' }}>
                                                No se encontraron registros de respaldos.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </section>

            {/* --- MODAL DE DETALLES (LOG) DINÁMICO --- */}
            {showLogModal && selectedLog && (
                <div className="modal-overlay" onClick={() => setShowLogModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Detalles del Respaldo #{selectedLog.id}</h2>
                            <button className="btn-close" onClick={() => setShowLogModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="log-container">
                                <div className="log-item">
                                    <span className="log-label">Operación:</span>
                                    <span className="log-value">PG_DUMP_STREAM ({selectedLog.type.toUpperCase()})</span>
                                </div>
                                <div className="log-item">
                                    <span className="log-label">Archivo generado:</span>
                                    <span className="log-value">{selectedLog.name}</span>
                                </div>
                                <div className="log-item">
                                    <span className="log-label">Fecha y Hora (Local):</span>
                                    <span className="log-value">{selectedLog.created_at}</span>
                                </div>
                                <div className="log-item">
                                    <span className="log-label">Usuario:</span>
                                    <span className="log-value">{selectedLog.created_by || 'Usuario del Sistema'}</span>
                                </div>
                                <div className="log-item">
                                    <span className="log-label">Estado:</span>
                                    <span className="log-value" style={{ color: selectedLog.status === 'completed' ? '#4CAF50' : '#FF5252' }}>
                                        {selectedLog.status.toUpperCase()}
                                    </span>
                                </div>
                                <div className="log-item">
                                    <span className="log-label">Servidor Origen:</span>
                                    <span className="log-value">aws-1-us-east-2.pooler.supabase.com</span>
                                </div>
                                <div className="log-item" style={{ marginTop: '1rem', opacity: 0.6, borderTop: '1px solid #444', paddingTop: '1rem' }}>
                                    <span className="log-label">Información Técnica:</span>
                                    <p style={{ fontSize: '0.75rem', lineHeight: '1.4' }}>
                                        -- PostgreSQL database dump complete --<br/>
                                        Format: Custom (Compressed)<br/>
                                        Encoding: UTF8<br/>
                                        Status Code: 0 (Success)
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-save" onClick={() => setShowLogModal(false)}>
                                Cerrar Bitácora
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Overlay de Carga Crítica (para restauración) */}
            {isRestoring && (
                <div className="restore-overlay">
                    <div className="restore-loader">
                        <div className="spinner-large"></div>
                        <h2>SINCRONIZANDO CON LA NUBE</h2>
                        <p>Protegiendo la integridad de tus datos...</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminBackupsScreen;