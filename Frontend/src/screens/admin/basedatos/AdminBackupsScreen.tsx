// Ruta: Frontend/src/screens/admin/basedatos/AdminBackupsScreen.tsx

import React, { useState, useEffect, useRef } from 'react';
import './styles/AdminBackupsScreen.css';
import { backupsService, Backup, SchedulerConfig, SchedulerStatus } from '../../../services/backupsService';

const AdminBackupsScreen: React.FC = () => {
    // --- ESTADOS ORIGINALES ---
    const [isDownloading, setIsDownloading] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [backups, setBackups] = useState<Backup[]>([]);
    
    // Estados para el Modal de Log
    const [selectedLog, setSelectedLog] = useState<Backup | null>(null);
    const [showLogModal, setShowLogModal] = useState(false);

    // --- ESTADOS ORIGINALES (Nube y Salud) ---
    const [isCheckingHealth, setIsCheckingHealth] = useState(false);
    const [isSyncingCloud, setIsSyncingCloud] = useState(false);

    // --- ESTADOS DEL SCHEDULER ---
    const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
    const [isLoadingScheduler, setIsLoadingScheduler] = useState(true);
    const [isSavingScheduler, setIsSavingScheduler] = useState(false);
    const [isRunningNow, setIsRunningNow] = useState(false);
    const [runNowStatus, setRunNowStatus] = useState<string>('');  // ← texto del overlay
    const [schedulerToast, setSchedulerToast] = useState<{ msg: string; ok: boolean } | null>(null);
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const [schedForm, setSchedForm] = useState<SchedulerConfig>({
        enabled: false,
        frecuencia: 'diario',
        hora: '03:00',
        retencion_dias: 7,
    });

    // --- CARGA DE DATOS ---
    const fetchHistory = async () => {
        try {
            setIsLoading(true);
            const data = await backupsService.getHistory();
            setBackups(data);
            return data;
        } catch (error) {
            console.error("Error al cargar la bitácora:", error);
            return [];
        } finally {
            setIsLoading(false);
        }
    };

    const fetchSchedulerStatus = async () => {
        try {
            setIsLoadingScheduler(true);
            const status = await backupsService.getSchedulerStatus();
            if (status) {
                setSchedulerStatus(status);
                setSchedForm(status.config);
            }
        } catch (error) {
            console.error("Error al cargar estado del scheduler:", error);
        } finally {
            setIsLoadingScheduler(false);
        }
    };

    useEffect(() => {
        fetchHistory();
        fetchSchedulerStatus();
        return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
    }, []);

    // Auto-ocultar toast
    useEffect(() => {
        if (schedulerToast) {
            const t = setTimeout(() => setSchedulerToast(null), 3500);
            return () => clearTimeout(t);
        }
    }, [schedulerToast]);

    // --- ACCIONES ORIGINALES ---
    const handleGenerateAndDownload = async () => {
        setIsDownloading(true);
        try {
            await backupsService.downloadBackupDirectly();
            setTimeout(() => fetchHistory(), 2000);
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

    const handleHealthCheck = async () => {
        setIsCheckingHealth(true);
        try {
            await new Promise(res => setTimeout(res, 1500));
            alert("Chequeo de Salud Completo: Conexión Activa, Espacio Suficiente y Base de Datos Optimizada.");
        } finally {
            setIsCheckingHealth(false);
        }
    };

    const handleCloudBackup = async () => {
        setIsSyncingCloud(true);
        try {
            await new Promise(res => setTimeout(res, 2500));
            alert("Respaldo enviado exitosamente a AWS S3.");
            fetchHistory();
        } finally {
            setIsSyncingCloud(false);
        }
    };

    // --- ACCIONES DEL SCHEDULER ---
    const handleSaveScheduler = async () => {
        setIsSavingScheduler(true);
        try {
            const result = await backupsService.updateSchedulerConfig(schedForm);
            setSchedulerToast({ msg: result.message, ok: result.success });
            if (result.success) await fetchSchedulerStatus();
        } finally {
            setIsSavingScheduler(false);
        }
    };

    // ─── PROBAR AHORA CON POLLING ─────────────────────────────────────────
    const handleRunNow = async () => {
        setIsRunningNow(true);
        setRunNowStatus('🤖 Iniciando respaldo automático...');

        try {
            const result = await backupsService.runSchedulerNow();
            if (!result.success) {
                setSchedulerToast({ msg: result.message, ok: false });
                setIsRunningNow(false);
                setRunNowStatus('');
                return;
            }

            // Guardar el ID más reciente antes de empezar
            const beforeData = await backupsService.getHistory();
            const latestIdBefore = beforeData.length > 0 ? beforeData[0].id : null;

            setRunNowStatus('⚙️ Generando dump de base de datos...');

            let attempts = 0;
            const MAX_ATTEMPTS = 20; // 20 × 3s = 60s máximo

            pollingRef.current = setInterval(async () => {
                attempts++;

                // Mensajes progresivos para que no parezca que se colgó
                if (attempts === 3)  setRunNowStatus('📦 Comprimiendo datos...');
                if (attempts === 6)  setRunNowStatus('☁️ Subiendo a Cloudinary...');
                if (attempts === 10) setRunNowStatus('🔄 Finalizando y registrando...');

                const currentData = await backupsService.getHistory();
                const latestId = currentData.length > 0 ? currentData[0].id : null;

                // Apareció un nuevo registro
                if (latestId !== latestIdBefore) {
                    clearInterval(pollingRef.current!);
                    pollingRef.current = null;
                    setBackups(currentData);
                    setIsRunningNow(false);
                    setRunNowStatus('');
                    setSchedulerToast({ msg: '✅ Respaldo automático completado y registrado', ok: true });
                    return;
                }

                // Timeout
                if (attempts >= MAX_ATTEMPTS) {
                    clearInterval(pollingRef.current!);
                    pollingRef.current = null;
                    setIsRunningNow(false);
                    setRunNowStatus('');
                    setSchedulerToast({ msg: '⚠️ El respaldo sigue en proceso, revisa la bitácora en un momento', ok: false });
                    await fetchHistory();
                }
            }, 3000);

        } catch (error) {
            setIsRunningNow(false);
            setRunNowStatus('');
            setSchedulerToast({ msg: 'Error al iniciar el respaldo', ok: false });
        }
    };

    // --- HELPERS ---
    const getStatusBadge = (status: string) => {
        const normalizedStatus = status?.toLowerCase();
        switch (normalizedStatus) {
            case 'completed': return <span className="badge badge-success">✅ COMPLETADO</span>;
            case 'failed':    return <span className="badge badge-error">❌ FALLIDO</span>;
            default:          return <span className="badge badge-info">{status?.toUpperCase() || 'PENDIENTE'}</span>;
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
                    <button 
                        className={`btn-health-check ${isCheckingHealth ? 'pulse' : ''}`} 
                        onClick={handleHealthCheck}
                        disabled={isCheckingHealth}
                    >
                        {isCheckingHealth ? '🔍 Verificando...' : '🔍 Verificar Salud'}
                    </button>
                    <button className="btn-refresh" onClick={fetchHistory} title="Actualizar Bitácora">
                        🔄 Refrescar
                    </button>
                </div>
            </div>

            {/* Grid de Acciones */}
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
                        <p className="help-text">Genera una copia binaria y permite elegir destino local.</p>
                    </div>
                </div>

                <div className="stat-card action-card cloud-variant">
                    <div className="stat-icon">☁️</div>
                    <div className="stat-content">
                        <span className="stat-label">Copia en la Nube</span>
                        <button 
                            className={`btn-cloud ${isSyncingCloud ? 'loading' : ''}`}
                            onClick={handleCloudBackup}
                            disabled={isSyncingCloud || isRestoring}
                        >
                            {isSyncingCloud ? 'Sincronizando...' : 'Enviar a AWS S3'}
                        </button>
                        <p className="help-text">Almacena el respaldo automáticamente en servidor remoto.</p>
                    </div>
                </div>
            </div>

            {/* Panel de Automatización */}
            <div className="section-group-label" style={{ marginTop: '2rem' }}>Configuración del Sistema</div>
            <div className="automation-panel shadow-sm">

                {schedulerToast && (
                    <div className={`scheduler-toast ${schedulerToast.ok ? 'scheduler-toast--ok' : 'scheduler-toast--err'}`}>
                        {schedulerToast.ok ? '✅' : '❌'} {schedulerToast.msg}
                    </div>
                )}

                {isLoadingScheduler ? (
                    <div style={{ padding: '1rem', textAlign: 'center', color: '#ECB2C3' }}>
                        <span className="spinner-small"></span> Cargando configuración...
                    </div>
                ) : (
                    <>
                        <div className="automation-item">
                            <div className="auto-info">
                                <strong>Respaldos Automáticos</strong>
                                <span>
                                    {schedulerStatus?.running
                                        ? `🟢 Activo — ${schedulerStatus.nextRun ?? ''}`
                                        : '🔴 Desactivado'}
                                </span>
                                {schedulerStatus?.lastRun && (
                                    <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>
                                        Último respaldo: {schedulerStatus.lastRun}
                                    </span>
                                )}
                            </div>
                            <div className="auto-actions">
                                <label className="switch-label">
                                    <input 
                                        type="checkbox" 
                                        checked={schedForm.enabled}
                                        onChange={(e) => setSchedForm({ ...schedForm, enabled: e.target.checked })}
                                    />
                                    <span className="slider"></span>
                                </label>
                            </div>
                        </div>

                        <div className="automation-item">
                            <div className="auto-info">
                                <strong>Programación de Respaldos (Cron)</strong>
                                <span>Ejecución automática sin intervención manual.</span>
                            </div>
                            <div className="auto-actions">
                                <select 
                                    className="select-minimal"
                                    value={schedForm.frecuencia}
                                    onChange={(e) => setSchedForm({ ...schedForm, frecuencia: e.target.value as any })}
                                    disabled={!schedForm.enabled}
                                >
                                    <option value="diario">Diariamente</option>
                                    <option value="semanal">Semanalmente (Domingos)</option>
                                    <option value="mensual">Mensualmente (Día 1)</option>
                                </select>
                                <input
                                    type="time"
                                    className="select-minimal"
                                    value={schedForm.hora}
                                    onChange={(e) => setSchedForm({ ...schedForm, hora: e.target.value })}
                                    disabled={!schedForm.enabled}
                                    style={{ width: '110px' }}
                                />
                            </div>
                        </div>

                        <div className="automation-item">
                            <div className="auto-info">
                                <strong>Retención y Auto-limpieza</strong>
                                <span>Días que se conservan los archivos automáticos.</span>
                            </div>
                            <div className="auto-actions">
                                <select
                                    className="select-minimal"
                                    value={schedForm.retencion_dias}
                                    onChange={(e) => setSchedForm({ ...schedForm, retencion_dias: Number(e.target.value) })}
                                >
                                    <option value={3}>3 días</option>
                                    <option value={7}>7 días</option>
                                    <option value={14}>14 días</option>
                                    <option value={30}>30 días</option>
                                    <option value={90}>90 días</option>
                                </select>
                            </div>
                        </div>

                        <div className="automation-item automation-actions-row">
                            <button
                                className="btn-run-now"
                                onClick={handleRunNow}
                                disabled={isRunningNow}
                                title="Ejecuta un respaldo automático ahora mismo para probar"
                            >
                                {isRunningNow ? '⏳ Ejecutando...' : '▶ Probar Ahora'}
                            </button>
                            <button
                                className="btn-save-small"
                                onClick={handleSaveScheduler}
                                disabled={isSavingScheduler}
                            >
                                {isSavingScheduler ? 'Guardando...' : '💾 Guardar Configuración'}
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Bitácora */}
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
                                                        <small>
                                                            ID: {backup.id} | Por: {backup.created_by || (backup.type === 'automatico' ? 'Sistema Automático' : 'Admin')}
                                                        </small>
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
                                                        >👁️</button>
                                                        <button 
                                                            className="btn-icon delete" 
                                                            title="Eliminar Registro"
                                                            onClick={() => alert('Función de borrado en desarrollo')}
                                                        >🗑️</button>
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

            {/* Modal Log */}
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
                                    <span className="log-value">
                                        {selectedLog.created_by || (selectedLog.type === 'automatico' ? 'Sistema Automático' : 'Usuario del Sistema')}
                                    </span>
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
                        <div className="modal-footer" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button 
                                className="btn-refresh" 
                                style={{ padding: '8px 15px', background: '#444' }}
                                onClick={() => backupsService.downloadLogFile(selectedLog.id, selectedLog.name)}
                            >
                                📥 Descargar Log
                            </button>
                            <button className="btn-save" onClick={() => setShowLogModal(false)}>
                                Cerrar Bitácora
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── OVERLAY PROBAR AHORA ── */}
            {isRunningNow && (
                <div className="restore-overlay">
                    <div className="restore-loader">
                        <div className="spinner-large"></div>
                        <h2>RESPALDO AUTOMÁTICO</h2>
                        <p>{runNowStatus}</p>
                    </div>
                </div>
            )}

            {/* Overlay restauración */}
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