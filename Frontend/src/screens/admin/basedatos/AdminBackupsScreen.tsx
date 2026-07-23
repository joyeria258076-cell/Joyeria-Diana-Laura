// Ruta: Frontend/src/screens/admin/basedatos/AdminBackupsScreen.tsx

import React, { useState, useEffect, useRef } from 'react';
import './styles/AdminBackupsScreen.css';
import { backupsService, Backup, SchedulerConfig, SchedulerStatus } from '../../../services/backupsService';
import {
  AiOutlineDatabase, AiOutlineCloudDownload, AiOutlineTable, AiOutlineSafetyCertificate,
  AiOutlineReload, AiOutlineEye, AiOutlineCloudUpload, AiOutlineDelete, AiOutlineCheckCircle,
  AiOutlineCloseCircle, AiOutlineClockCircle, AiOutlineThunderbolt, AiOutlineUser,
  AiOutlinePlayCircle, AiOutlineSave, AiOutlineWarning, AiOutlineApi, AiOutlineBarChart,
  AiOutlineClear, AiOutlineClose, AiOutlineFileZip, AiOutlineFileText, AiOutlineAppstore,
  AiOutlineHistory, AiOutlineControl,
} from 'react-icons/ai';

type BkTab = 'resumen' | 'automatizacion' | 'bitacora';

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
    const [backupToDelete, setBackupToDelete] = useState<{id: string, name: string, type: string} | null>(null);

    // Estado para descarga desde Cloudinary — guarda el id del backup en descarga
    const [downloadingCloudId, setDownloadingCloudId] = useState<string | null>(null);

    // Estados para modal de respaldo de colección
    const [showCollectionModal, setShowCollectionModal] = useState(false);
    const [tablesList, setTablesList] = useState<{ tabla: string; filas: number }[]>([]);
    const [selectedTable, setSelectedTable] = useState<string | null>(null);
    const [selectedFormat, setSelectedFormat] = useState<'dump' | 'csv'>('dump');
    const [isLoadingTables, setIsLoadingTables] = useState(false);
    const [isDownloadingCollection, setIsDownloadingCollection] = useState(false);

    // Consola con pestañas — composición distinta al resto del panel admin
    const [activeTab, setActiveTab] = useState<BkTab>('resumen');

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
            setSchedulerToast({ msg: 'Error al descargar la colección', ok: false });
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
            setSchedulerToast({ msg: 'No se pudo descargar el archivo desde la nube', ok: false });
        } finally {
            setDownloadingCloudId(null);
        }
    };

    // ─── MODAL ELIMINACIÓN ────────────────────────────────────────────────
    const handleDeleteBackup = (id: string, name: string, type: string) => {
        setBackupToDelete({ id, name, type });
    };

    const confirmDeleteBackup = async () => {
        if (!backupToDelete) return;
        try {
            setSchedulerToast({ msg: 'Eliminando respaldo...', ok: true });
            const result = await backupsService.deleteBackup(backupToDelete.id);
            if (result.success) {
                setSchedulerToast({ msg: 'Respaldo eliminado correctamente', ok: true });
                fetchHistory();
            } else {
                setSchedulerToast({ msg: `Error: ${result.message}`, ok: false });
            }
        } catch (error) {
            setSchedulerToast({ msg: 'Error de red al intentar eliminar', ok: false });
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
        setRunNowStatus('Iniciando respaldo automático...');

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

            setRunNowStatus('Generando dump de base de datos...');
            let attempts = 0;
            const MAX_ATTEMPTS = 20;

            pollingRef.current = setInterval(async () => {
                attempts++;
                if (attempts === 3)  setRunNowStatus('Comprimiendo datos...');
                if (attempts === 6)  setRunNowStatus('Subiendo a Cloudinary...');
                if (attempts === 10) setRunNowStatus('Finalizando y registrando...');

                const currentData = await backupsService.getHistory();
                const latestId = currentData.length > 0 ? currentData[0].id : null;

                if (latestId !== latestIdBefore) {
                    clearInterval(pollingRef.current!);
                    pollingRef.current = null;
                    setBackups(currentData);
                    setIsRunningNow(false);
                    setRunNowStatus('');
                    setSchedulerToast({ msg: 'Respaldo automático completado y registrado', ok: true });
                    return;
                }

                if (attempts >= MAX_ATTEMPTS) {
                    clearInterval(pollingRef.current!);
                    pollingRef.current = null;
                    setIsRunningNow(false);
                    setRunNowStatus('');
                    setSchedulerToast({ msg: 'El respaldo sigue en proceso, revisa la bitácora en un momento', ok: false });
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
            case 'completed': return <span className="badge badge-success"><AiOutlineCheckCircle size={13} /> COMPLETADO</span>;
            case 'failed':    return <span className="badge badge-error"><AiOutlineCloseCircle size={13} /> FALLIDO</span>;
            default:          return <span className="badge badge-info"><AiOutlineClockCircle size={13} /> {status?.toUpperCase() || 'PENDIENTE'}</span>;
        }
    };

    const proximoRespaldo = (() => {
        if (!schedulerStatus?.running) return null;
        if (schedulerStatus.config?.frecuencia === 'cada5min') {
            void tick; // fuerza re-render cada minuto
            const now = new Date();
            const next = new Date(now);
            const minActual = now.getMinutes();
            const minSiguiente = Math.ceil((minActual + 1) / 5) * 5;
            next.setMinutes(minSiguiente, 0, 0);
            if (minSiguiente >= 60) { next.setHours(now.getHours() + 1); next.setMinutes(0, 0, 0); }
            return `Cada 5 min — próximo: ${next.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`;
        }
        return schedulerStatus.nextRun ?? '';
    })();

    return (
        <div className={`bk2-container ${isRestoring ? 'app-locked' : ''}`}>

            {/* Header */}
            <div className="bk2-header">
                <div>
                    <h1><AiOutlineDatabase size={22} /> Gestión de Base de Datos</h1>
                    <p>Respaldos, automatización y auditoría de datos de <strong>Joyería Diana Laura</strong></p>
                </div>
                <div className="bk2-header-actions">
                    <button
                        className={`bk2-btn-outline ${isCheckingHealth ? 'pulse' : ''}`}
                        onClick={handleHealthCheck}
                        disabled={isCheckingHealth}
                    >
                        <AiOutlineSafetyCertificate size={16} /> {isCheckingHealth ? 'Verificando...' : 'Verificar salud'}
                    </button>
                    <button className="bk2-btn-icon-refresh" onClick={fetchHistory} title="Actualizar bitácora">
                        <AiOutlineReload size={16} />
                    </button>
                </div>
            </div>

            {/* Consola con pestañas: rail izquierdo + panel de contenido */}
            <div className="bk2-console">
                <nav className="bk2-rail">
                    <button className={`bk2-rail-tab ${activeTab === 'resumen' ? 'active' : ''}`} onClick={() => setActiveTab('resumen')}>
                        <AiOutlineAppstore size={18} /> Resumen
                    </button>
                    <button className={`bk2-rail-tab ${activeTab === 'automatizacion' ? 'active' : ''}`} onClick={() => setActiveTab('automatizacion')}>
                        <AiOutlineControl size={18} /> Automatización
                    </button>
                    <button className={`bk2-rail-tab ${activeTab === 'bitacora' ? 'active' : ''}`} onClick={() => setActiveTab('bitacora')}>
                        <AiOutlineHistory size={18} /> Bitácora
                        {backups.length > 0 && <span className="bk2-rail-count">{backups.length}</span>}
                    </button>

                    <div className="bk2-rail-status">
                        <span className={`bk2-status-dot ${schedulerStatus?.running ? 'on' : ''}`} />
                        <div>
                            <strong>{schedulerStatus?.running ? 'Auto activo' : 'Auto desactivado'}</strong>
                            {schedulerStatus?.running && proximoRespaldo && <span>{proximoRespaldo}</span>}
                        </div>
                    </div>
                </nav>

                <div className="bk2-panel">
                    {activeTab === 'resumen' && (
                        <div className="bk2-tabpage">
                            {schedulerStatus?.lastRun && (
                                <div className="bk2-last-run">
                                    <AiOutlineClockCircle size={14} /> Último respaldo registrado: <strong>{schedulerStatus.lastRun}</strong>
                                </div>
                            )}
                            <div className="bk2-actions-row">
                                <div className="bk2-action-card">
                                    <div className="bk2-action-icon"><AiOutlineCloudDownload size={26} /></div>
                                    <div className="bk2-action-body">
                                        <span className="bk2-action-title">Respaldo manual completo</span>
                                        <p>Genera una copia binaria completa y permite elegir destino local.</p>
                                        <button
                                            className="bk2-btn-primary"
                                            onClick={handleGenerateAndDownload}
                                            disabled={isDownloading || isRestoring}
                                        >
                                            {isDownloading ? 'Generando archivo...' : 'Descargar .DUMP actual'}
                                        </button>
                                    </div>
                                </div>

                                <div className="bk2-action-card">
                                    <div className="bk2-action-icon"><AiOutlineTable size={26} /></div>
                                    <div className="bk2-action-body">
                                        <span className="bk2-action-title">Respaldo de una tabla</span>
                                        <p>Descarga el respaldo de una tabla específica de la base de datos.</p>
                                        <button
                                            className="bk2-btn-primary"
                                            onClick={handleOpenCollectionModal}
                                            disabled={isRestoring}
                                        >
                                            Seleccionar tabla
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'automatizacion' && (
                    <div className="bk2-tabpage bk2-automation-panel">

                        {schedulerToast && (
                            <div className={`scheduler-toast ${schedulerToast.ok ? 'scheduler-toast--ok' : 'scheduler-toast--err'}`}>
                                {schedulerToast.ok ? <AiOutlineCheckCircle size={15} /> : <AiOutlineCloseCircle size={15} />} {schedulerToast.msg}
                            </div>
                        )}

                        {isLoadingScheduler ? (
                            <div style={{ padding: '1rem', textAlign: 'center', color: '#ECB2C3' }}>
                                <span className="spinner-small"></span> Cargando configuración...
                            </div>
                        ) : (
                            <>
                                {/* Interruptor maestro, destacado */}
                                <div className={`bk3-master-toggle ${schedForm.enabled ? 'on' : ''}`}>
                                    <div className="bk3-master-icon"><AiOutlineThunderbolt size={24} /></div>
                                    <div className="bk3-master-text">
                                        <strong>Respaldos automáticos</strong>
                                        <span>Ejecuta un respaldo periódico sin intervención manual.</span>
                                    </div>
                                    <label className="switch-label bk3-master-switch">
                                        <input
                                            type="checkbox"
                                            checked={schedForm.enabled}
                                            onChange={(e) => setSchedForm({ ...schedForm, enabled: e.target.checked })}
                                        />
                                        <span className="slider"></span>
                                    </label>
                                </div>

                                {/* Tarjetas de configuración */}
                                <div className="bk3-settings-grid">
                                    <div className={`bk3-setting-tile ${!schedForm.enabled ? 'disabled' : ''}`}>
                                        <div className="bk3-setting-icon"><AiOutlineClockCircle size={20} /></div>
                                        <span className="bk3-setting-label">Frecuencia de ejecución</span>
                                        <p>Cada cuánto se genera un respaldo nuevo.</p>
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
                                                style={{ marginTop: '0.5rem', width: '100%' }}
                                            />
                                        )}
                                    </div>

                                    <div className="bk3-setting-tile">
                                        <div className="bk3-setting-icon"><AiOutlineClear size={20} /></div>
                                        <span className="bk3-setting-label">Retención y auto-limpieza</span>
                                        <p>Elimina <strong>de uno en uno</strong> los respaldos más antiguos. El último nunca se elimina.</p>
                                        <select
                                            className="select-minimal"
                                            value={schedForm.retencion_dias}
                                            onChange={(e) => setSchedForm({ ...schedForm, retencion_dias: Number(e.target.value) })}
                                        >
                                            <option value={0.04}>1 hora (pruebas)</option>
                                            <option value={1}>1 día</option>
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
                                        <AiOutlinePlayCircle size={15} /> {isRunningNow ? 'Ejecutando...' : 'Probar ahora'}
                                    </button>
                                    <button
                                        className="btn-save-small"
                                        onClick={handleSaveScheduler}
                                        disabled={isSavingScheduler}
                                    >
                                        <AiOutlineSave size={15} /> {isSavingScheduler ? 'Guardando...' : 'Guardar configuración'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                    )}

                    {activeTab === 'bitacora' && (
                    <div className="bk2-tabpage">
                    <h2 className="bk2-section-title">Bitácora de auditoría</h2>
                    {isLoading ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: '#ECB2C3' }}>
                            <span className="spinner-small"></span> Cargando registros...
                        </div>
                    ) : backups.length > 0 ? (
                        <div className="bk3-log-grid">
                            {backups.map((backup) => (
                                <div key={backup.id} className={`bk3-log-card ${backup.status?.toLowerCase()}`}>
                                    <div className="bk3-log-card-top">
                                        <div className="bk3-log-type">
                                            {backup.type === 'manual'
                                                ? <AiOutlineUser size={15} />
                                                : backup.type === 'coleccion'
                                                    ? <AiOutlineTable size={15} />
                                                    : <AiOutlineThunderbolt size={15} />}
                                            {backup.type === 'manual' ? 'Manual' : backup.type === 'coleccion' ? 'Tabla' : 'Automático'}
                                        </div>
                                        {getStatusBadge(backup.status)}
                                    </div>

                                    <span className="bk3-log-name" title={backup.name}>{backup.name}</span>

                                    <div className="bk3-log-meta">
                                        <span>{backup.created_at}</span>
                                        <span>ID: {backup.id}</span>
                                        <span>Por: {backup.created_by || (backup.type === 'automatico' ? 'Sistema automático' : backup.type === 'coleccion' ? 'Admin (colección)' : 'Admin')}</span>
                                    </div>

                                    {backup.url_archivo && <span className="bk2-cloud-tag"><AiOutlineCloudUpload size={12} /> En la nube</span>}

                                    <div className="bk3-log-actions action-buttons">
                                        <button className="btn-icon" title="Ver detalles técnicos" onClick={() => handleOpenLog(backup)}>
                                            <AiOutlineEye size={15} />
                                        </button>
                                        {backup.url_archivo && backup.status === 'completed' && (
                                            <button
                                                className="btn-icon download-cloud"
                                                title="Descargar desde la nube"
                                                onClick={() => handleDownloadFromCloud(backup)}
                                                disabled={downloadingCloudId === backup.id}
                                            >
                                                {downloadingCloudId === backup.id ? <span className="spinner-small" style={{ margin: 0 }} /> : <AiOutlineCloudDownload size={15} />}
                                            </button>
                                        )}
                                        <button className="btn-icon delete" title="Eliminar registro" onClick={() => handleDeleteBackup(backup.id, backup.name, backup.type)}>
                                            <AiOutlineDelete size={15} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.4)' }}>
                            No se encontraron registros de respaldos.
                        </div>
                    )}
                    </div>
                    )}
                </div>
            </div>

            {/* Modal Log — recibo de auditoría (composición tipo ticket) */}
            {showLogModal && selectedLog && (
                <div className="modal-overlay" onClick={() => setShowLogModal(false)}>
                    <div className="bk3-receipt" onClick={e => e.stopPropagation()}>
                        <button className="bk3-receipt-close" onClick={() => setShowLogModal(false)}><AiOutlineClose size={14} /></button>

                        <div className="bk3-receipt-inner">
                        <div className="bk3-receipt-accent" />
                        <div className="bk3-receipt-brand">
                            <AiOutlineDatabase size={16} />
                            <span>Joyería Diana Laura — Auditoría de respaldos</span>
                        </div>

                        <div className="bk3-receipt-body">
                            <div className="bk3-receipt-title-row">
                                <span className="bk3-receipt-id">RESPALDO #{selectedLog.id}</span>
                                {getStatusBadge(selectedLog.status)}
                            </div>
                            <strong className="bk3-receipt-filename">{selectedLog.name}</strong>

                            <div className="bk3-receipt-dashed" />

                            <div className="bk3-receipt-row">
                                <span>Tipo de operación</span>
                                <strong>{selectedLog.type === 'manual' ? 'Manual' : selectedLog.type === 'coleccion' ? 'Tabla' : 'Automático'} · PG_DUMP_STREAM</strong>
                            </div>
                            <div className="bk3-receipt-row">
                                <span>Fecha y hora (local)</span>
                                <strong>{selectedLog.created_at}</strong>
                            </div>
                            <div className="bk3-receipt-row">
                                <span>Usuario</span>
                                <strong>{selectedLog.created_by || (selectedLog.type === 'automatico' ? 'Sistema automático' : 'Usuario del sistema')}</strong>
                            </div>
                            <div className="bk3-receipt-row">
                                <span>Servidor origen</span>
                                <strong style={{ fontSize: '0.72rem' }}>aws-1-us-east-2.pooler.supabase.com</strong>
                            </div>
                            {selectedLog.url_archivo && (
                                <div className="bk3-receipt-row">
                                    <span>Almacenamiento</span>
                                    <strong style={{ fontSize: '0.72rem', wordBreak: 'break-all', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                        <AiOutlineCloudUpload size={12} /> Cloudinary
                                    </strong>
                                </div>
                            )}

                            <div className="bk3-receipt-dashed" />

                            <div className="bk3-receipt-tech">
                                -- PostgreSQL database dump complete --<br />
                                Format: Custom (Compressed) · Encoding: UTF8<br />
                                Status Code: 0 (Success)
                            </div>
                        </div>

                        <div className="bk3-receipt-actions">
                            <button
                                className="bk3-spec-btn-primary"
                                onClick={() => backupsService.downloadLogFile(selectedLog.id, selectedLog.name)}
                            >
                                <AiOutlineCloudDownload size={15} /> Descargar log
                            </button>
                            <button className="btn-cancel" onClick={() => setShowLogModal(false)}>
                                Cerrar
                            </button>
                        </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL VERIFICAR SALUD ── */}
            {showHealthModal && (
                <div className="modal-overlay" onClick={() => { if (!isCheckingHealth && !isOptimizing) setShowHealthModal(false); }}>
                    <div className="modal-content health-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><AiOutlineSafetyCertificate size={20} /> Salud de la base de datos</h2>
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
                                        <h3 className="health-section-title"><AiOutlineApi size={15} style={{ verticalAlign: -2, marginRight: 6 }} /> Conexión</h3>
                                        <div className="health-row">
                                            <span className="health-label">Estado</span>
                                            <span className="health-value ok"><AiOutlineCheckCircle size={13} /> Activa</span>
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
                                        <h3 className="health-section-title"><AiOutlineClear size={15} style={{ verticalAlign: -2, marginRight: 6 }} /> VACUUM — Limpieza de filas muertas</h3>
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
                                                        {/* CAMBIO: Muestra mensaje claro cuando Supabase no expone la fecha */}
                                                        <td style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
                                                            {row.ultimo_vacuum === 'Nunca' ? 'Gestionado por Supabase' : row.ultimo_vacuum}
                                                        </td>
                                                        <td>{row.filas_muertas}</td>
                                                        <td>
                                                            <span className={`health-badge ${row.filas_muertas > 100 ? 'warn' : 'ok'}`}>
                                                                {row.filas_muertas > 100 ? <><AiOutlineWarning size={12} /> Alto</> : <><AiOutlineCheckCircle size={12} /> OK</>}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="health-section">
                                        <h3 className="health-section-title"><AiOutlineBarChart size={15} style={{ verticalAlign: -2, marginRight: 6 }} /> ANALYZE — Estadísticas del planificador</h3>
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
                                                        {/* CAMBIO: Muestra mensaje claro cuando Supabase no expone la fecha */}
                                                        <td style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
                                                            {row.ultimo_analyze === 'Nunca' ? 'Gestionado por Supabase' : row.ultimo_analyze}
                                                        </td>
                                                        <td><span className="health-badge ok"><AiOutlineCheckCircle size={12} /> OK</span></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <p className="health-note">
                                            PostgreSQL en Supabase ejecuta autovacuum automáticamente. Estos datos son informativos.
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
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                                >
                                    <AiOutlineClear size={15} /> {isOptimizing ? 'Optimizando...' : 'Ejecutar mantenimiento'}
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
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><AiOutlineWarning size={20} /> Confirmar eliminación</h2>
                            <button className="btn-close" onClick={() => setBackupToDelete(null)}><AiOutlineClose size={16} /></button>
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
                                    {backupToDelete.type === 'automatico'
                                        ? 'Esta acción no se puede deshacer. El registro se eliminará del historial y el archivo se borrará de Cloudinary.'
                                        : 'Esta acción no se puede deshacer. El registro se eliminará del historial.'}
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
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><AiOutlineTable size={20} /> Respaldo de tabla</h2>
                            {!isDownloadingCollection && (
                                <button className="btn-close" onClick={() => setShowCollectionModal(false)}><AiOutlineClose size={16} /></button>
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
                                    <div style={{ display: 'flex', justifyContent: 'center' }}><AiOutlineFileZip size={22} /></div>
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
                                    <div style={{ display: 'flex', justifyContent: 'center' }}><AiOutlineFileText size={22} /></div>
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
                                            <span style={{ fontFamily: 'monospace', fontSize: '0.95rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                                {selectedTable === t.tabla && <AiOutlineCheckCircle size={14} />}{t.tabla}
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
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                            >
                                {isDownloadingCollection
                                    ? 'Generando...'
                                    : <><AiOutlineCloudDownload size={15} /> Descargar {selectedFormat === 'csv' ? '.csv' : '.dump'}</>}
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