// Frontend/src/screens/admin/basedatos/AdminBackupsScreen.tsx
import React, { useState, useEffect } from 'react';
import './styles/AdminBackupsScreen.css';

interface Backup {
  id: string;
  name: string;
  type: 'manual' | 'automatic' | 'incremental' | 'full';
  size: string;
  tables: number;
  records: number;
  status: 'completed' | 'in_progress' | 'failed' | 'scheduled';
  created_at: string;
  completed_at?: string;
  created_by: string;
  location: string;
  compression: string;
  encryption: boolean;
  description?: string;
}

interface RestorePoint {
  id: string;
  name: string;
  timestamp: string;
  type: 'pitr' | 'snapshot' | 'backup';
  size: string;
}

const AdminBackupsScreen: React.FC = () => {
  const [backups, setBackups] = useState<Backup[]>([
    {
      id: '1',
      name: 'Respaldo Completo Diario',
      type: 'full',
      size: '2.4 GB',
      tables: 42,
      records: 15420,
      status: 'completed',
      created_at: '2024-01-15 03:00:00',
      completed_at: '2024-01-15 03:15:23',
      created_by: 'Sistema',
      location: '/backups/postgres/full/2024-01-15',
      compression: 'gzip (68%)',
      encryption: true,
      description: 'Respaldo completo automático diario'
    },
    {
      id: '2',
      name: 'Respaldo Incremental',
      type: 'incremental',
      size: '156 MB',
      tables: 42,
      records: 450,
      status: 'completed',
      created_at: '2024-01-15 12:00:00',
      completed_at: '2024-01-15 12:02:45',
      created_by: 'Sistema',
      location: '/backups/postgres/incremental/2024-01-15',
      compression: 'gzip (72%)',
      encryption: true
    },
    {
      id: '3',
      name: 'Respaldo Manual - Pre-Update',
      type: 'manual',
      size: '2.4 GB',
      tables: 42,
      records: 15420,
      status: 'completed',
      created_at: '2024-01-14 18:30:00',
      completed_at: '2024-01-14 18:42:12',
      created_by: 'Admin',
      location: '/backups/postgres/manual/pre-update',
      compression: 'gzip (65%)',
      encryption: true,
      description: 'Respaldo manual antes de actualización mayor'
    },
    {
      id: '4',
      name: 'Respaldo Programado Nocturno',
      type: 'automatic',
      size: '2.4 GB',
      tables: 42,
      records: 15420,
      status: 'scheduled',
      created_at: '2024-01-16 03:00:00',
      created_by: 'Sistema',
      location: '/backups/postgres/auto/2024-01-16',
      compression: 'gzip',
      encryption: true
    },
    {
      id: '5',
      name: 'Respaldo Completo Semanal',
      type: 'full',
      size: '2.4 GB',
      tables: 42,
      records: 15420,
      status: 'failed',
      created_at: '2024-01-13 03:00:00',
      created_by: 'Sistema',
      location: '/backups/postgres/full/2024-01-13',
      compression: 'gzip',
      encryption: true,
      description: 'Fallo por espacio en disco insuficiente'
    }
  ]);

  const [restorePoints, setRestorePoints] = useState<RestorePoint[]>([
    {
      id: 'rp1',
      name: 'Pre-Update 2024-01-14',
      timestamp: '2024-01-14 18:30:00',
      type: 'backup',
      size: '2.4 GB'
    },
    {
      id: 'rp2',
      name: 'PITR 2024-01-15 12:00',
      timestamp: '2024-01-15 12:00:00',
      type: 'pitr',
      size: '156 MB'
    },
    {
      id: 'rp3',
      name: 'Snapshot Diario',
      timestamp: '2024-01-15 03:00:00',
      type: 'snapshot',
      size: '2.4 GB'
    }
  ]);

  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [restoreType, setRestoreType] = useState<'full' | 'point-in-time' | 'table'>('full');
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [restoreTimestamp, setRestoreTimestamp] = useState('');
  const [loading, setLoading] = useState(false);

  // Configuración de respaldo programado
  const [scheduleConfig, setScheduleConfig] = useState({
    enabled: true,
    frequency: 'daily',
    time: '03:00',
    dayOfWeek: '0',
    dayOfMonth: '1',
    type: 'full',
    retention: 30,
    compression: true,
    encryption: true,
    destination: '/backups/postgres'
  });

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'completed':
        return <span className="badge badge-success">✅ Completado</span>;
      case 'in_progress':
        return <span className="badge badge-info">⏳ En Progreso</span>;
      case 'failed':
        return <span className="badge badge-error">❌ Fallido</span>;
      case 'scheduled':
        return <span className="badge badge-warning">⏰ Programado</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'full': return '💿';
      case 'incremental': return '📀';
      case 'manual': return '✋';
      case 'automatic': return '🤖';
      default: return '💾';
    }
  };

  const handleCreateBackup = () => {
    setLoading(true);
    // Simular creación de respaldo
    setTimeout(() => {
      const newBackup: Backup = {
        id: Date.now().toString(),
        name: `Respaldo Manual ${new Date().toLocaleString()}`,
        type: 'manual',
        size: 'Calculando...',
        tables: 42,
        records: 15420,
        status: 'in_progress',
        created_at: new Date().toISOString(),
        created_by: 'Admin',
        location: '/backups/postgres/manual/' + Date.now(),
        compression: 'gzip',
        encryption: true
      };
      setBackups([newBackup, ...backups]);
      setLoading(false);
    }, 2000);
  };

  const handleRestore = () => {
    setShowRestoreModal(true);
  };

  const handleDownload = (backup: Backup) => {
    alert(`Descargando respaldo: ${backup.name}`);
  };

  const handleDelete = (backupId: string) => {
    if (window.confirm('¿Estás seguro de eliminar este respaldo?')) {
      setBackups(backups.filter(b => b.id !== backupId));
    }
  };

  const handleVerify = (backup: Backup) => {
    alert(`Verificando integridad del respaldo: ${backup.name}`);
  };

  const handleScheduleSave = () => {
    setShowScheduleModal(false);
    alert('Configuración de respaldo programado guardada');
  };

  const handlePointInTimeRestore = () => {
    alert(`Restaurando base de datos al punto: ${restoreTimestamp}`);
    setShowRestoreModal(false);
  };

  return (
    <div className="backups-screen-container">
      {/* Header */}
      <div className="backups-header">
        <div className="header-left">
          <h1 className="page-title">Copias de Seguridad y Restauración</h1>
          <p className="page-description">
            Administra respaldos completos, incrementales y restaura la base de datos a cualquier punto en el tiempo
          </p>
        </div>
        <div className="header-actions">
          <button className="btn-primary" onClick={handleCreateBackup} disabled={loading}>
            {loading ? '⏳ Creando...' : '➕ Nuevo Respaldo'}
          </button>
          <button className="btn-secondary" onClick={() => setShowScheduleModal(true)}>
            ⚙️ Programar
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="backup-stats-grid">
        <div className="stat-card">
          <div className="stat-icon">💾</div>
          <div className="stat-content">
            <span className="stat-label">Respaldos Totales</span>
            <span className="stat-value">{backups.length}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <span className="stat-label">Espacio Ocupado</span>
            <span className="stat-value">12.8 GB</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🔄</div>
          <div className="stat-content">
            <span className="stat-label">Último Respaldo</span>
            <span className="stat-value">Hace 2 horas</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <span className="stat-label">Retención</span>
            <span className="stat-value">30 días</span>
          </div>
        </div>
      </div>

      {/* Schedule Status */}
      <div className="schedule-status">
        <div className="schedule-info">
          <span className="schedule-icon">⏰</span>
          <div className="schedule-details">
            <h3>Respaldo Programado</h3>
            <p>Diario a las 03:00 AM - Completo - Retención: 30 días</p>
          </div>
        </div>
        <div className="schedule-badge">
          <span className="badge-success">● Activo</span>
        </div>
      </div>

      {/* Restore Points */}
      <div className="restore-points-section">
        <h2 className="section-title">Puntos de Restauración</h2>
        <div className="restore-points-grid">
          {restorePoints.map(point => (
            <div key={point.id} className="restore-point-card">
              <div className="point-icon">
                {point.type === 'pitr' ? '⏱️' : point.type === 'snapshot' ? '📸' : '💾'}
              </div>
              <div className="point-content">
                <h4>{point.name}</h4>
                <div className="point-meta">
                  <span>📅 {point.timestamp}</span>
                  <span>📦 {point.size}</span>
                  <span className="point-type">
                    {point.type === 'pitr' ? 'Point-in-Time' : 
                     point.type === 'snapshot' ? 'Snapshot' : 'Backup'}
                  </span>
                </div>
              </div>
              <button className="btn-restore" onClick={() => {
                setRestoreType('point-in-time');
                setRestoreTimestamp(point.timestamp);
                setShowRestoreModal(true);
              }}>
                Restaurar
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Backups Table */}
      <div className="backups-table-section">
        <h2 className="section-title">Historial de Respaldos</h2>
        <div className="table-container">
          <table className="backups-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Nombre</th>
                <th>Fecha</th>
                <th>Tamaño</th>
                <th>Tablas</th>
                <th>Registros</th>
                <th>Compresión</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {backups.map(backup => (
                <tr key={backup.id} className={selectedBackup?.id === backup.id ? 'selected' : ''}>
                  <td>
                    <span className="backup-type" title={backup.type}>
                      {getTypeIcon(backup.type)}
                    </span>
                  </td>
                  <td>
                    <div className="backup-name">
                      <strong>{backup.name}</strong>
                      {backup.description && <small>{backup.description}</small>}
                    </div>
                  </td>
                  <td>{backup.created_at}</td>
                  <td>{backup.size}</td>
                  <td>{backup.tables}</td>
                  <td>{backup.records.toLocaleString()}</td>
                  <td>{backup.compression}</td>
                  <td>{getStatusBadge(backup.status)}</td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="btn-icon" 
                        title="Restaurar"
                        onClick={() => {
                          setSelectedBackup(backup);
                          handleRestore();
                        }}
                      >
                        🔄
                      </button>
                      <button 
                        className="btn-icon" 
                        title="Descargar"
                        onClick={() => handleDownload(backup)}
                      >
                        ⬇️
                      </button>
                      <button 
                        className="btn-icon" 
                        title="Verificar"
                        onClick={() => handleVerify(backup)}
                      >
                        ✓
                      </button>
                      <button 
                        className="btn-icon delete" 
                        title="Eliminar"
                        onClick={() => handleDelete(backup.id)}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Restore Modal */}
      {showRestoreModal && (
        <div className="modal-overlay" onClick={() => setShowRestoreModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Restaurar Base de Datos</h2>
              <button className="btn-close" onClick={() => setShowRestoreModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="restore-options">
                <label className="radio-option">
                  <input
                    type="radio"
                    name="restoreType"
                    value="full"
                    checked={restoreType === 'full'}
                    onChange={(e) => setRestoreType('full')}
                  />
                  <div className="option-content">
                    <strong>Restauración Completa</strong>
                    <small>Restaura toda la base de datos desde un respaldo</small>
                  </div>
                </label>

                <label className="radio-option">
                  <input
                    type="radio"
                    name="restoreType"
                    value="point-in-time"
                    checked={restoreType === 'point-in-time'}
                    onChange={(e) => setRestoreType('point-in-time')}
                  />
                  <div className="option-content">
                    <strong>Point-in-Time Recovery (PITR)</strong>
                    <small>Restaura la base de datos a un momento específico</small>
                  </div>
                </label>

                <label className="radio-option">
                  <input
                    type="radio"
                    name="restoreType"
                    value="table"
                    checked={restoreType === 'table'}
                    onChange={(e) => setRestoreType('table')}
                  />
                  <div className="option-content">
                    <strong>Restauración Selectiva</strong>
                    <small>Restaura solo tablas específicas</small>
                  </div>
                </label>
              </div>

              {restoreType === 'full' && selectedBackup && (
                <div className="restore-details">
                  <h4>Respaldo seleccionado:</h4>
                  <p><strong>{selectedBackup.name}</strong></p>
                  <p>Fecha: {selectedBackup.created_at}</p>
                  <p>Tamaño: {selectedBackup.size}</p>
                  <p>Tablas: {selectedBackup.tables}</p>
                  <div className="warning-box">
                    ⚠️ Esta operación reemplazará todos los datos actuales. 
                    Asegúrate de tener un respaldo reciente.
                  </div>
                </div>
              )}

              {restoreType === 'point-in-time' && (
                <div className="restore-details">
                  <label className="form-label">
                    Fecha y hora de restauración:
                    <input
                      type="datetime-local"
                      className="form-input"
                      value={restoreTimestamp}
                      onChange={(e) => setRestoreTimestamp(e.target.value)}
                    />
                  </label>
                  <div className="info-box">
                    ℹ️ Se requiere que WAL (Write-Ahead Logging) esté habilitado
                  </div>
                </div>
              )}

              {restoreType === 'table' && (
                <div className="restore-details">
                  <h4>Selecciona las tablas a restaurar:</h4>
                  <div className="tables-list">
                    {['usuarios', 'productos', 'categorias', 'ventas', 'compras', 'inventario'].map(table => (
                      <label key={table} className="checkbox-option">
                        <input
                          type="checkbox"
                          checked={selectedTables.includes(table)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTables([...selectedTables, table]);
                            } else {
                              setSelectedTables(selectedTables.filter(t => t !== table));
                            }
                          }}
                        />
                        {table}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="restore-advanced">
                <h4>Opciones avanzadas:</h4>
                <label className="checkbox-option">
                  <input type="checkbox" />
                  Validar integridad antes de restaurar
                </label>
                <label className="checkbox-option">
                  <input type="checkbox" />
                  Crear respaldo automático antes de restaurar
                </label>
                <label className="checkbox-option">
                  <input type="checkbox" />
                  Notificar a administradores
                </label>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowRestoreModal(false)}>
                Cancelar
              </button>
              <button 
                className="btn-restore-confirm"
                onClick={restoreType === 'point-in-time' ? handlePointInTimeRestore : () => {
                  alert('Iniciando restauración...');
                  setShowRestoreModal(false);
                }}
              >
                Iniciar Restauración
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="modal-overlay" onClick={() => setShowScheduleModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Programar Respaldos Automáticos</h2>
              <button className="btn-close" onClick={() => setShowScheduleModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">
                  <input
                    type="checkbox"
                    checked={scheduleConfig.enabled}
                    onChange={(e) => setScheduleConfig({...scheduleConfig, enabled: e.target.checked})}
                  />
                  Habilitar respaldos automáticos
                </label>
              </div>

              <div className="form-group">
                <label className="form-label">Frecuencia:</label>
                <select 
                  className="form-select"
                  value={scheduleConfig.frequency}
                  onChange={(e) => setScheduleConfig({...scheduleConfig, frequency: e.target.value})}
                >
                  <option value="hourly">Cada hora</option>
                  <option value="daily">Diario</option>
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensual</option>
                </select>
              </div>

              {scheduleConfig.frequency === 'daily' && (
                <div className="form-group">
                  <label className="form-label">Hora del día:</label>
                  <input
                    type="time"
                    className="form-input"
                    value={scheduleConfig.time}
                    onChange={(e) => setScheduleConfig({...scheduleConfig, time: e.target.value})}
                  />
                </div>
              )}

              {scheduleConfig.frequency === 'weekly' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Día de la semana:</label>
                    <select
                      className="form-select"
                      value={scheduleConfig.dayOfWeek}
                      onChange={(e) => setScheduleConfig({...scheduleConfig, dayOfWeek: e.target.value})}
                    >
                      <option value="0">Domingo</option>
                      <option value="1">Lunes</option>
                      <option value="2">Martes</option>
                      <option value="3">Miércoles</option>
                      <option value="4">Jueves</option>
                      <option value="5">Viernes</option>
                      <option value="6">Sábado</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Hora:</label>
                    <input
                      type="time"
                      className="form-input"
                      value={scheduleConfig.time}
                      onChange={(e) => setScheduleConfig({...scheduleConfig, time: e.target.value})}
                    />
                  </div>
                </>
              )}

              <div className="form-group">
                <label className="form-label">Tipo de respaldo:</label>
                <select
                  className="form-select"
                  value={scheduleConfig.type}
                  onChange={(e) => setScheduleConfig({...scheduleConfig, type: e.target.value})}
                >
                  <option value="full">Completo</option>
                  <option value="incremental">Incremental</option>
                  <option value="differential">Diferencial</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Días de retención:</label>
                <input
                  type="number"
                  className="form-input"
                  value={scheduleConfig.retention}
                  onChange={(e) => setScheduleConfig({...scheduleConfig, retention: parseInt(e.target.value)})}
                  min="1"
                  max="365"
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <input
                    type="checkbox"
                    checked={scheduleConfig.compression}
                    onChange={(e) => setScheduleConfig({...scheduleConfig, compression: e.target.checked})}
                  />
                  Comprimir respaldos
                </label>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <input
                    type="checkbox"
                    checked={scheduleConfig.encryption}
                    onChange={(e) => setScheduleConfig({...scheduleConfig, encryption: e.target.checked})}
                  />
                  Encriptar respaldos
                </label>
              </div>

              <div className="form-group">
                <label className="form-label">Destino:</label>
                <input
                  type="text"
                  className="form-input"
                  value={scheduleConfig.destination}
                  onChange={(e) => setScheduleConfig({...scheduleConfig, destination: e.target.value})}
                  placeholder="/ruta/del/backup"
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowScheduleModal(false)}>
                Cancelar
              </button>
              <button className="btn-save" onClick={handleScheduleSave}>
                Guardar Configuración
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBackupsScreen;