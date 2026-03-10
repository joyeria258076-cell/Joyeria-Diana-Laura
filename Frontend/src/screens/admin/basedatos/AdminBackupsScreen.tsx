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

    // --- ESTADOS (Salud) ---
    const [isCheckingHealth, setIsCheckingHealth] = useState(false);
    const [showHealthModal, setShowHealthModal] = useState(false);
    const [healthData, setHealthData] = useState<any>(null);
    const [isOptimizing, setIsOptimizing] = useState(false);

    // --- ESTADOS DEL SCHEDULER ---
    const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
    const [isLoadingScheduler, setIsLoadingScheduler] = useState(true);
    const [isSavingScheduler, setIsSavingScheduler] = useState(false);
    const [isRunningNow, setIsRunningNow] = useState(false);
    const [runNowStatus, setRunNowStatus] = useState<string>('');
    const [schedulerToast, setSchedulerToast] = useState<{ msg: string; ok: boolean } | null>(null);
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Estado para confirmar eliminación
    const [backupToDelete, setBackupToDelete] = useState<{id: string, name: string} | null>(null);

    // Estado para descarga desde Cloudinary — guarda el id del backup en descarga
    const [downloadingCloudId, setDownloadingCloudId] = useState<string | null>(null);

    // Estados para modal de respaldo de colección
    const [showCollectionModal, setShowCollectionModal] = useState(false);
    const [tablesList, setTablesList] = useState<{ tabla: string; filas: number }[]>([]);
    const [selectedTable, setSelectedTable] = useState<string | null>(null);
    const [selectedFormat, setSelectedFormat] = useState<'dump' | 'csv'>('dump');
    const [isLoadingTables, setIsLoadingTables] = useState(false);
    const [isDownloadingCollection, setIsDownloadingCollection] = useState(false);

    const [schedForm, setSchedForm] = useState<SchedulerConfig>({
        enabled: false,
        frecuencia: 'diario' as 'cada5min' | 'diario' | 'semanal' | 'mensual',
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

    // Ticker para recalcular "próximo" cada minuto cuando frecuencia es cada5min
    const [tick, setTick] = useState(0);
    useEffect(() => {
        if (schedulerStatus?.config?.frecuencia !== 'cada5min' || !schedulerStatus?.running) return;
        const interval = setInterval(() => setTick(t => t + 1), 60000);
        return () => clearInterval(interval);
    }, [schedulerStatus?.config?.frecuencia, schedulerStatus?.running]);
    useEffect(() => {
        if (schedulerToast) {
            const t = setTimeout(() => setSchedulerToast(null), 3500);
            return () => clearTimeout(t);
        }
    }, [schedulerToast]);

    // --- ACCIONES ---
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
        setShowHealthModal(true);
        setHealthData(null);
        try {
            const data = await backupsService.getDatabaseHealth();
            if (!data) throw new Error("No data");
            setHealthData(data);
        } catch (error) {
            console.error("Error al obtener salud:", error);
            setHealthData({ error: true, message: 'Error interno en el servidor.' });
        } finally {
            setIsCheckingHealth(false);
        }
    };

    // ─── MODAL COLECCIÓN ──────────────────────────────────────────────────
    const handleOpenCollectionModal = async () => {
        setShowCollectionModal(true);
        setSelectedTable(null);
        setSelectedFormat('dump');
        setIsLoadingTables(true);
        try {
            const tables = await backupsService.getTablesList();
            setTablesList(tables);
        } catch (error) {
            console.error("Error al cargar tablas:", error);
        } finally {
            setIsLoadingTables(false);
        }
    };

    const handleDownloadCollection = async () => {
        if (!selectedTable) return;
        setIsDownloadingCollection(true);
        try {
            if (selectedFormat === 'csv') {
                await backupsService.downloadCollectionCSV(selectedTable);
            } else {
                await backupsService.downloadCollectionBackup(selectedTable);
            }
        } catch (error) {
            console.error("Error al descargar colección:", error);
            setSchedulerToast({ msg: '❌ Error al descargar la colección', ok: false });
        } finally {
            setIsDownloadingCollection(false);
            setShowCollectionModal(false);
        }
    };

    // ─── DESCARGAR DESDE CLOUDINARY ───────────────────────────────────────
    const handleDownloadFromCloud = async (backup: Backup) => {
        if (!backup.url_archivo) return;
        setDownloadingCloudId(backup.id);
        try {
            await backupsService.downloadFromCloudinary(backup.url_archivo, backup.name);
        } catch (error) {
            console.error("Error al descargar desde Cloudinary:", error);
            setSchedulerToast({ msg: '❌ No se pudo descargar el archivo desde la nube', ok: false });
        } finally {
            setDownloadingCloudId(null);
        }
    };

    // ─── MODAL ELIMINACIÓN ────────────────────────────────────────────────
    const handleDeleteBackup = (id: string, name: string) => {
        setBackupToDelete({ id, name });
    };

    const confirmDeleteBackup = async () => {
        if (!backupToDelete) return;
        try {
            setSchedulerToast({ msg: '⏳ Eliminando respaldo...', ok: true });
            const result = await backupsService.deleteBackup(backupToDelete.id);
            if (result.success) {
                setSchedulerToast({ msg: '🗑️ Respaldo eliminado correctamente', ok: true });
                fetchHistory();
            } else {
                setSchedulerToast({ msg: `❌ Error: ${result.message}`, ok: false });
            }
        } catch (error) {
            setSchedulerToast({ msg: '❌ Error de red al intentar eliminar', ok: false });
        } finally {
            setBackupToDelete(null);
        }
    };
    
    const handleOptimize = async () => {
        if (!window.confirm('¿Deseas ejecutar el mantenimiento? Esto optimizará el rendimiento de las tablas.')) return;
        setIsOptimizing(true);
        try {
            const result = await backupsService.runMaintenance();
            alert(result.message);
            if (result.success) {
                const newData = await backupsService.getDatabaseHealth();
                setHealthData(newData);
            }
        } catch (error) {
            alert("Error al ejecutar mantenimiento técnico.");
        } finally {
            setIsOptimizing(false);
        }
    };

    // --- SCHEDULER ---
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

            const beforeData = await backupsService.getHistory();
            const latestIdBefore = beforeData.length > 0 ? beforeData[0].id : null;

            setRunNowStatus('⚙️ Generando dump de base de datos...');
            let attempts = 0;
            const MAX_ATTEMPTS = 20;

            pollingRef.current = setInterval(async () => {
                attempts++;
                if (attempts === 3)  setRunNowStatus('📦 Comprimiendo datos...');
                if (attempts === 6)  setRunNowStatus('☁️ Subiendo a Cloudinary...');
                if (attempts === 10) setRunNowStatus('🔄 Finalizando y registrando...');

                const currentData = await backupsService.getHistory();
                const latestId = currentData.length > 0 ? currentData[0].id : null;

                if (latestId !== latestIdBefore) {
                    clearInterval(pollingRef.current!);
                    pollingRef.current = null;
                    setBackups(currentData);
                    setIsRunningNow(false);
                    setRunNowStatus('');
                    setSchedulerToast({ msg: '✅ Respaldo automático completado y registrado', ok: true });
                    return;
                }

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
            <div className="backup-stats-grid" style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div className="stat-card action-card" style={{ flex: 1, minWidth: '260px' }}>
                    <div className="stat-icon">📥</div>
                    <div className="stat-content">
                        <span className="stat-label">Respaldo Manual Completo</span>
                        <button 
                            className={`btn-primary ${isDownloading ? 'loading' : ''}`} 
                            onClick={handleGenerateAndDownload}
                            disabled={isDownloading || isRestoring}
                        >
                            {isDownloading ? 'Generando archivo...' : 'Descargar .DUMP Actual'}
                        </button>
                        <p className="help-text">Genera una copia binaria completa y permite elegir destino local.</p>
                    </div>
                </div>

                <div className="stat-card action-card" style={{ flex: 1, minWidth: '260px' }}>
                    <div className="stat-icon">🗂️</div>
                    <div className="stat-content">
                        <span className="stat-label">Respaldo de Colección</span>
                        <button 
                            className="btn-primary"
                            onClick={handleOpenCollectionModal}
                            disabled={isRestoring}
                        >
                            Seleccionar Tabla
                        </button>
                        <p className="help-text">Descarga el .dump de una tabla específica de la base de datos.</p>
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
                                        ? `🟢 Activo — ${(() => {
                                            if (schedulerStatus.config?.frecuencia === 'cada5min') {
                                                void tick; // fuerza re-render cada minuto
                                                const now = new Date();
                                                const next = new Date(now);
                                                const minActual = now.getMinutes();
                                                const minSiguiente = Math.ceil((minActual + 1) / 5) * 5;
                                                next.setMinutes(minSiguiente, 0, 0);
                                                if (minSiguiente >= 60) {
                                                    next.setHours(now.getHours() + 1);
                                                    next.setMinutes(0, 0, 0);
                                                }
                                                return `Cada 5 min — próximo: ${next.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`;
                                            }
                                            return schedulerStatus.nextRun ?? '';
                                          })()}`
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
                                    <option value="cada5min">Cada 5 minutos (pruebas)</option>
                                    <option value="diario">Diariamente</option>
                                    <option value="semanal">Semanalmente (Domingos)</option>
                                    <option value="mensual">Mensualmente (Día 1)</option>
                                </select>
                                {schedForm.frecuencia !== 'cada5min' && (
                                    <input
                                        type="time"
                                        className="select-minimal"
                                        value={schedForm.hora}
                                        onChange={(e) => setSchedForm({ ...schedForm, hora: e.target.value })}
                                        disabled={!schedForm.enabled}
                                        style={{ width: '110px' }}
                                    />
                                )}
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
                                    <option value={0.04}>1 hora (pruebas)</option>
                                    <option value={3}>3 días</option>
                                    <option value={7}>7 días</option>
                                    <option value={14}>14 días</option>
                                    <option value={30}>30 días</option>
                                    <option value={90}>90 días</option>
                                </select>
                            </div>
                        </div>

                        <div className="automation-actions-row">
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
                                                    {backup.type === 'manual' ? '✋' : backup.type === 'coleccion' ? '🗂️' : '🤖'}
                                                </td>
                                                <td>
                                                    <div className="backup-name">
                                                        <strong>{backup.name}</strong>
                                                        <small>
                                                            ID: {backup.id} | Por: {backup.created_by || (backup.type === 'automatico' ? 'Sistema Automático' : backup.type === 'coleccion' ? 'Admin (Colección)' : 'Admin')}
                                                        </small>
                                                        {/* Etiqueta de almacenamiento en nube */}
                                                        {backup.url_archivo && (
                                                            <small style={{ color: '#ECB2C3' }}>☁️ En la nube</small>
                                                        )}
                                                    </div>
                                                </td>
                                                <td>{backup.created_at}</td>
                                                <td style={{ textAlign: 'center' }}>
                                                    {getStatusBadge(backup.status)}
                                                </td>
                                                <td>
                                                    <div className="action-buttons">
                                                        {/* Ver log — siempre visible */}
                                                        <button 
                                                            className="btn-icon" 
                                                            title="Ver Detalles Técnicos"
                                                            onClick={() => handleOpenLog(backup)}
                                                        >👁️</button>

                                                        {/* Descargar desde Cloudinary — solo si tiene url_archivo y está completado */}
                                                        {backup.url_archivo && backup.status === 'completed' && (
                                                            <button
                                                                className="btn-icon download-cloud"
                                                                title="Descargar desde la nube"
                                                                onClick={() => handleDownloadFromCloud(backup)}
                                                                disabled={downloadingCloudId === backup.id}
                                                            >
                                                                {downloadingCloudId === backup.id ? '⏳' : '☁️'}
                                                            </button>
                                                        )}

                                                        {/* Eliminar — siempre visible */}
                                                        <button 
                                                            className="btn-icon delete" 
                                                            title="Eliminar Registro"
                                                            onClick={() => handleDeleteBackup(backup.id, backup.name)}
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
                                {selectedLog.url_archivo && (
                                    <div className="log-item">
                                        <span className="log-label">Almacenamiento:</span>
                                        <span className="log-value" style={{ color: '#ECB2C3', fontSize: '0.8rem', wordBreak: 'break-all' }}>
                                            ☁️ Cloudinary — {selectedLog.url_archivo}
                                        </span>
                                    </div>
                                )}
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

            {/* ── MODAL VERIFICAR SALUD ── */}
            {showHealthModal && (
                <div className="modal-overlay" onClick={() => { if (!isCheckingHealth && !isOptimizing) setShowHealthModal(false); }}>
                    <div className="modal-content health-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>🔍 Salud de la Base de Datos</h2>
                            {!isCheckingHealth && !isOptimizing && (
                                <button className="btn-close" onClick={() => setShowHealthModal(false)}>×</button>
                            )}
                        </div>
                        <div className="modal-body">
                            {isCheckingHealth || !healthData ? (
                                <div className="health-loading">
                                    <div className="spinner-large" style={{ margin: '0 auto 1rem' }}></div>
                                    <p style={{ color: '#ECB2C3', textAlign: 'center', margin: 0 }}>Ejecutando diagnóstico...</p>
                                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', textAlign: 'center', marginTop: '0.4rem' }}>
                                        VACUUM · ANALYZE · Conexión · Espacio
                                    </p>
                                </div>
                            ) : healthData.error ? (
                                <div className="info-box" style={{ background: 'rgba(255, 82, 82, 0.1)', color: '#FF5252', border: '1px solid #FF5252', padding: '1rem', borderRadius: '8px' }}>
                                    <strong>Error en el Servidor:</strong>
                                    <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>{healthData.message}</p>
                                </div>
                            ) : (
                                <div className="health-results">
                                    <div className="health-section">
                                        <h3 className="health-section-title">🔗 Conexión</h3>
                                        <div className="health-row">
                                            <span className="health-label">Estado</span>
                                            <span className="health-value ok">✅ Activa</span>
                                        </div>
                                        <div className="health-row">
                                            <span className="health-label">Latencia</span>
                                            <span className="health-value">{healthData.conexion?.latencia || '12ms'}</span>
                                        </div>
                                        <div className="health-row">
                                            <span className="health-label">Servidor</span>
                                            <span className="health-value" style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>{healthData.conexion?.servidor || 'supabase.com'}</span>
                                        </div>
                                    </div>

                                    <div className="health-section">
                                        <h3 className="health-section-title">🧹 VACUUM — Limpieza de Filas Muertas</h3>
                                        <table className="health-table">
                                            <thead>
                                                <tr>
                                                    <th>Tabla</th>
                                                    <th>Último VACUUM</th>
                                                    <th>Filas muertas</th>
                                                    <th>Estado</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(healthData.vacuum || []).map((row: any) => (
                                                    <tr key={row.tabla}>
                                                        <td><code>{row.tabla}</code></td>
                                                        <td style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>{row.ultimo_vacuum}</td>
                                                        <td>{row.filas_muertas}</td>
                                                        <td>
                                                            <span className={`health-badge ${row.filas_muertas > 100 ? 'warn' : 'ok'}`}>
                                                                {row.filas_muertas > 100 ? '⚠️ Alto' : '✅ OK'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="health-section">
                                        <h3 className="health-section-title">📊 ANALYZE — Estadísticas del Planificador</h3>
                                        <table className="health-table">
                                            <thead>
                                                <tr>
                                                    <th>Tabla</th>
                                                    <th>Último ANALYZE</th>
                                                    <th>Estado</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(healthData.analyze || []).map((row: any) => (
                                                    <tr key={row.tabla}>
                                                        <td><code>{row.tabla}</code></td>
                                                        <td style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>{row.ultimo_analyze}</td>
                                                        <td><span className="health-badge ok">✅ OK</span></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <p className="health-note">
                                            💡 PostgreSQL en Supabase ejecuta autovacuum automáticamente. Estos datos son informativos.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                        {!isCheckingHealth && healthData && !healthData.error && (
                            <div className="modal-footer">
                                <button className="btn-cancel" onClick={() => setShowHealthModal(false)}>Cerrar</button>
                                <button 
                                    className="btn-primary pulse" 
                                    onClick={handleOptimize}
                                    disabled={isOptimizing}
                                >
                                    {isOptimizing ? '⏳ Optimizando...' : '🧹 Ejecutar Mantenimiento'}
                                </button>
                            </div>
                        )}
                        {healthData?.error && (
                            <div className="modal-footer">
                                <button className="btn-save" onClick={() => setShowHealthModal(false)}>Cerrar</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── MODAL DE CONFIRMACIÓN DE BORRADO ── */}
            {backupToDelete && (
                <div className="modal-overlay" onClick={() => setBackupToDelete(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>⚠️ Confirmar Eliminación</h2>
                            <button className="btn-close" onClick={() => setBackupToDelete(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <p style={{ marginBottom: '1rem', color: '#ECB2C3' }}>
                                ¿Estás seguro de que deseas eliminar permanentemente este respaldo?
                            </p>
                            <div className="info-box" style={{ background: 'rgba(255, 82, 82, 0.1)', color: '#FF5252', border: '1px solid #FF5252', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                                <strong>Archivo seleccionado:</strong><br />
                                <span style={{ wordBreak: 'break-all', marginTop: '0.5rem', display: 'block' }}>
                                    {backupToDelete.name}
                                </span>
                                <p style={{ fontSize: '0.85rem', marginTop: '0.8rem', opacity: 0.9 }}>
                                    Esta acción no se puede deshacer. El archivo se borrará del sistema y de Cloudinary.
                                </p>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => setBackupToDelete(null)}>
                                Cancelar
                            </button>
                            <button className="btn-save" onClick={confirmDeleteBackup}>
                                Sí, eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL RESPALDO DE COLECCIÓN ── */}
            {showCollectionModal && (
                <div className="modal-overlay" onClick={() => { if (!isDownloadingCollection) setShowCollectionModal(false); }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>🗂️ Respaldo de Colección</h2>
                            {!isDownloadingCollection && (
                                <button className="btn-close" onClick={() => setShowCollectionModal(false)}>×</button>
                            )}
                        </div>
                        <div className="modal-body">
                            <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                                Selecciona la tabla y el formato de descarga.
                            </p>

                            {/* Selector de formato */}
                            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.2rem' }}>
                                <div
                                    onClick={() => setSelectedFormat('dump')}
                                    style={{
                                        flex: 1, padding: '0.75rem', borderRadius: '8px', cursor: 'pointer', textAlign: 'center',
                                        border: selectedFormat === 'dump' ? '1px solid #ECB2C3' : '1px solid rgba(255,255,255,0.1)',
                                        background: selectedFormat === 'dump' ? 'rgba(236,178,195,0.1)' : 'rgba(255,255,255,0.03)',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    <div style={{ fontSize: '1.4rem' }}>🗄️</div>
                                    <div style={{ fontWeight: 600, fontSize: '0.9rem', marginTop: '0.3rem' }}>.dump</div>
                                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.2rem' }}>Restaurable con pg_restore</div>
                                </div>
                                <div
                                    onClick={() => setSelectedFormat('csv')}
                                    style={{
                                        flex: 1, padding: '0.75rem', borderRadius: '8px', cursor: 'pointer', textAlign: 'center',
                                        border: selectedFormat === 'csv' ? '1px solid #ECB2C3' : '1px solid rgba(255,255,255,0.1)',
                                        background: selectedFormat === 'csv' ? 'rgba(236,178,195,0.1)' : 'rgba(255,255,255,0.03)',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    <div style={{ fontSize: '1.4rem' }}>📊</div>
                                    <div style={{ fontWeight: 600, fontSize: '0.9rem', marginTop: '0.3rem' }}>.csv</div>
                                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.2rem' }}>Abrir en Excel o editor</div>
                                </div>
                            </div>

                            {/* Lista de tablas */}
                            {isLoadingTables ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: '#ECB2C3' }}>
                                    <span className="spinner-small"></span> Cargando tablas...
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '280px', overflowY: 'auto' }}>
                                    {tablesList.map((t) => (
                                        <div
                                            key={t.tabla}
                                            onClick={() => setSelectedTable(t.tabla)}
                                            style={{
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                padding: '0.75rem 1rem', borderRadius: '8px', cursor: 'pointer',
                                                border: selectedTable === t.tabla ? '1px solid #ECB2C3' : '1px solid rgba(255,255,255,0.1)',
                                                background: selectedTable === t.tabla ? 'rgba(236,178,195,0.1)' : 'rgba(255,255,255,0.03)',
                                                transition: 'all 0.2s',
                                            }}
                                        >
                                            <span style={{ fontFamily: 'monospace', fontSize: '0.95rem' }}>
                                                {selectedTable === t.tabla ? '✅ ' : ''}{t.tabla}
                                            </span>
                                            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
                                                {Number(t.filas).toLocaleString()} filas
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => setShowCollectionModal(false)} disabled={isDownloadingCollection}>
                                Cancelar
                            </button>
                            <button
                                className="btn-save"
                                onClick={handleDownloadCollection}
                                disabled={!selectedTable || isDownloadingCollection}
                            >
                                {isDownloadingCollection
                                    ? '⏳ Generando...'
                                    : selectedFormat === 'csv' ? '📊 Descargar .csv' : '📥 Descargar .dump'}
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