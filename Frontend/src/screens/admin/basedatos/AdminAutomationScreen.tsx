// Frontend/src/screens/admin/basedatos/AdminAutomationScreen.tsx
import React, { useState } from 'react';
import './styles/AdminAutomationScreen.css';

interface ScheduledTask {
  id: string;
  name: string;
  description: string;
  type: 'backup' | 'optimization' | 'cleanup' | 'report' | 'sync' | 'validation';
  schedule: string;
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom';
  lastRun: string | null;
  nextRun: string;
  status: 'active' | 'paused' | 'failed' | 'completed';
  enabled: boolean;
  config: any;
  notifications: boolean;
  createdBy: string;
}

interface TaskLog {
  id: string;
  taskId: string;
  taskName: string;
  startTime: string;
  endTime: string | null;
  status: 'success' | 'failed' | 'running';
  recordsProcessed?: number;
  errorMessage?: string;
  details?: string;
}

const AdminAutomationScreen: React.FC = () => {
  const [tasks, setTasks] = useState<ScheduledTask[]>([
    {
      id: '1',
      name: 'Respaldo Nocturno Completo',
      description: 'Respaldo completo de todas las tablas',
      type: 'backup',
      schedule: '0 3 * * *',
      frequency: 'daily',
      lastRun: '2024-01-15 03:00:00',
      nextRun: '2024-01-16 03:00:00',
      status: 'completed',
      enabled: true,
      config: {
        type: 'full',
        compression: true,
        encryption: true,
        retention: 30
      },
      notifications: true,
      createdBy: 'Admin'
    },
    {
      id: '2',
      name: 'Optimización de Tablas',
      description: 'VACUUM y ANALYZE en tablas principales',
      type: 'optimization',
      schedule: '0 4 * * 0',
      frequency: 'weekly',
      lastRun: '2024-01-14 04:00:00',
      nextRun: '2024-01-21 04:00:00',
      status: 'completed',
      enabled: true,
      config: {
        tables: ['ventas', 'detalle_ventas', 'movimientos_inventario'],
        fullVacuum: false,
        analyze: true
      },
      notifications: true,
      createdBy: 'Admin'
    },
    {
      id: '3',
      name: 'Limpieza de Logs',
      description: 'Eliminar logs y auditoría antigua',
      type: 'cleanup',
      schedule: '0 5 * * *',
      frequency: 'daily',
      lastRun: '2024-01-15 05:00:00',
      nextRun: '2024-01-16 05:00:00',
      status: 'completed',
      enabled: true,
      config: {
        tables: ['auditoria', 'login_attempts', 'notificaciones'],
        olderThan: 90,
        delete: true
      },
      notifications: false,
      createdBy: 'Admin'
    },
    {
      id: '4',
      name: 'Generación Reporte Ventas',
      description: 'Reporte diario de ventas y estadísticas',
      type: 'report',
      schedule: '0 6 * * *',
      frequency: 'daily',
      lastRun: '2024-01-15 06:00:00',
      nextRun: '2024-01-16 06:00:00',
      status: 'completed',
      enabled: true,
      config: {
        format: 'pdf',
        email: ['admin@joyeriadiana.com'],
        includeCharts: true
      },
      notifications: true,
      createdBy: 'Admin'
    },
    {
      id: '5',
      name: 'Sincronización Firestore',
      description: 'Sincronizar datos con Firestore',
      type: 'sync',
      schedule: '0 */6 * * *',
      frequency: 'custom',
      lastRun: '2024-01-15 12:00:00',
      nextRun: '2024-01-15 18:00:00',
      status: 'completed',
      enabled: true,
      config: {
        collections: ['productos', 'categorias'],
        bidirectional: false,
        conflictResolution: 'postgres'
      },
      notifications: true,
      createdBy: 'Admin'
    },
    {
      id: '6',
      name: 'Validación de Integridad',
      description: 'Verificar integridad referencial',
      type: 'validation',
      schedule: '0 2 * * 1',
      frequency: 'weekly',
      lastRun: '2024-01-08 02:00:00',
      nextRun: '2024-01-22 02:00:00',
      status: 'failed',
      enabled: true,
      config: {
        checkForeignKeys: true,
        checkDuplicates: true,
        fixIssues: false,
        reportOnly: true
      },
      notifications: true,
      createdBy: 'Admin'
    }
  ]);

  const [taskLogs, setTaskLogs] = useState<TaskLog[]>([
    {
      id: 'log1',
      taskId: '1',
      taskName: 'Respaldo Nocturno Completo',
      startTime: '2024-01-15 03:00:00',
      endTime: '2024-01-15 03:18:24',
      status: 'success',
      recordsProcessed: 15420
    },
    {
      id: 'log2',
      taskId: '2',
      taskName: 'Optimización de Tablas',
      startTime: '2024-01-14 04:00:00',
      endTime: '2024-01-14 04:05:12',
      status: 'success'
    },
    {
      id: 'log3',
      taskId: '3',
      taskName: 'Limpieza de Logs',
      startTime: '2024-01-15 05:00:00',
      endTime: '2024-01-15 05:02:30',
      status: 'success',
      recordsProcessed: 12500
    },
    {
      id: 'log4',
      taskId: '6',
      taskName: 'Validación de Integridad',
      startTime: '2024-01-08 02:00:00',
      endTime: '2024-01-08 02:08:45',
      status: 'failed',
      errorMessage: 'Se encontraron 15 registros huérfanos en detalle_ventas'
    },
    {
      id: 'log5',
      taskId: '4',
      taskName: 'Generación Reporte Ventas',
      startTime: '2024-01-15 06:00:00',
      endTime: '2024-01-15 06:01:15',
      status: 'success'
    }
  ]);

  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ScheduledTask | null>(null);
  const [newTask, setNewTask] = useState<Partial<ScheduledTask>>({
    name: '',
    description: '',
    type: 'backup',
    frequency: 'daily',
    enabled: true,
    notifications: true,
    config: {}
  });

  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const handleToggleTask = (taskId: string) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, enabled: !task.enabled } : task
    ));
  };

  const handleRunNow = (task: ScheduledTask) => {
    alert(`Ejecutando tarea: ${task.name}`);
    
    // Simular ejecución
    const newLog: TaskLog = {
      id: `log${Date.now()}`,
      taskId: task.id,
      taskName: task.name,
      startTime: new Date().toLocaleString(),
      endTime: null,
      status: 'running'
    };
    setTaskLogs([newLog, ...taskLogs]);

    setTimeout(() => {
      setTaskLogs(logs => logs.map(log => 
        log.id === newLog.id ? { 
          ...log, 
          endTime: new Date().toLocaleString(), 
          status: 'success',
          recordsProcessed: globalThis.crypto.getRandomValues(new Uint32Array(1))[0] % 1000
        } : log
      ));
    }, 3000);
  };

  const handleEditTask = (task: ScheduledTask) => {
    setSelectedTask(task);
    setNewTask(task);
    setShowNewTaskModal(true);
  };

  const handleDeleteTask = (taskId: string) => {
    if (window.confirm('¿Estás seguro de eliminar esta tarea?')) {
      setTasks(tasks.filter(t => t.id !== taskId));
    }
  };

  const handleSaveTask = () => {
    if (!newTask.name) {
      alert('El nombre de la tarea es obligatorio');
      return;
    }

    if (selectedTask) {
      // Editar existente
      setTasks(tasks.map(t => 
        t.id === selectedTask.id ? { ...t, ...newTask } as ScheduledTask : t
      ));
    } else {
      // Crear nueva
      const task: ScheduledTask = {
        id: Date.now().toString(),
        name: newTask.name!,
        description: newTask.description || '',
        type: newTask.type as any,
        schedule: '0 3 * * *',
        frequency: newTask.frequency as any,
        lastRun: null,
        nextRun: new Date().toLocaleString(),
        status: 'active',
        enabled: true,
        config: newTask.config || {},
        notifications: newTask.notifications || false,
        createdBy: 'Admin'
      };
      setTasks([task, ...tasks]);
    }

    setShowNewTaskModal(false);
    setSelectedTask(null);
    setNewTask({});
  };

  const getTaskIcon = (type: string) => {
    switch(type) {
      case 'backup': return '💾';
      case 'optimization': return '⚡';
      case 'cleanup': return '🧹';
      case 'report': return '📊';
      case 'sync': return '🔄';
      case 'validation': return '✓';
      default: return '📋';
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'active':
        return <span className="badge badge-success">● Activo</span>;
      case 'paused':
        return <span className="badge badge-warning">⏸️ Pausado</span>;
      case 'failed':
        return <span className="badge badge-error">❌ Fallido</span>;
      case 'completed':
        return <span className="badge badge-info">✅ Completado</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  const getLogStatusBadge = (status: string) => {
    switch(status) {
      case 'success':
        return <span className="badge badge-success">✅ Éxito</span>;
      case 'failed':
        return <span className="badge badge-error">❌ Fallo</span>;
      case 'running':
        return <span className="badge badge-info">⏳ En ejecución</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (filterType !== 'all' && task.type !== filterType) return false;
    if (filterStatus !== 'all' && task.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="automation-screen-container">
      {/* Header */}
      <div className="automation-header">
        <div className="header-left">
          <h1 className="page-title">Automatización de Tareas</h1>
          <p className="page-description">
            Programa y automatiza tareas de mantenimiento, respaldos y optimización de la base de datos
          </p>
        </div>
        <div className="header-actions">
          <button className="btn-primary" onClick={() => setShowNewTaskModal(true)}>
            ➕ Nueva Tarea
          </button>
          <button className="btn-secondary" onClick={() => setShowLogsModal(true)}>
            📋 Ver Logs
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="automation-stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <span className="stat-label">Tareas Activas</span>
            <span className="stat-value">{tasks.filter(t => t.enabled).length}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⏰</div>
          <div className="stat-content">
            <span className="stat-label">Próxima Ejecución</span>
            <span className="stat-value">03:00 AM</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <span className="stat-label">Ejecuciones Hoy</span>
            <span className="stat-value">8</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">❌</div>
          <div className="stat-content">
            <span className="stat-label">Fallos</span>
            <span className="stat-value">1</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <select 
          className="filter-select"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="all">Todos los tipos</option>
          <option value="backup">Respaldos</option>
          <option value="optimization">Optimización</option>
          <option value="cleanup">Limpieza</option>
          <option value="report">Reportes</option>
          <option value="sync">Sincronización</option>
          <option value="validation">Validación</option>
        </select>

        <select 
          className="filter-select"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="paused">Pausados</option>
          <option value="failed">Fallidos</option>
          <option value="completed">Completados</option>
        </select>

        <button className="btn-refresh" onClick={() => {}}>
          🔄 Actualizar
        </button>
      </div>

      {/* Tasks Grid */}
      <div className="tasks-grid">
        {filteredTasks.map(task => (
          <div key={task.id} className={`task-card ${!task.enabled ? 'paused' : ''}`}>
            <div className="task-header">
              <div className="task-icon">{getTaskIcon(task.type)}</div>
              <div className="task-title">
                <h3>{task.name}</h3>
                <p>{task.description}</p>
              </div>
              <div className="task-status">
                {getStatusBadge(task.enabled ? task.status : 'paused')}
              </div>
            </div>

            <div className="task-body">
              <div className="task-schedule">
                <span className="schedule-icon">⏰</span>
                <div className="schedule-details">
                  <span className="frequency">{task.frequency}</span>
                  <span className="next-run">Próxima: {task.nextRun}</span>
                </div>
              </div>

              <div className="task-meta">
                <div className="meta-item">
                  <span className="meta-label">Última ejecución:</span>
                  <span className="meta-value">{task.lastRun || 'Nunca'}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Creada por:</span>
                  <span className="meta-value">{task.createdBy}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Notificaciones:</span>
                  <span className="meta-value">{task.notifications ? '✅' : '❌'}</span>
                </div>
              </div>

              {task.type === 'backup' && (
                <div className="task-config">
                  <span className="config-tag">Tipo: {task.config.type}</span>
                  <span className="config-tag">Compresión: {task.config.compression ? '✅' : '❌'}</span>
                  <span className="config-tag">Encriptación: {task.config.encryption ? '✅' : '❌'}</span>
                </div>
              )}

              {task.type === 'optimization' && (
                <div className="task-config">
                  <span className="config-tag">{task.config.tables?.length} tablas</span>
                  <span className="config-tag">VACUUM: {task.config.fullVacuum ? 'Full' : 'Normal'}</span>
                </div>
              )}

              {task.type === 'cleanup' && (
                <div className="task-config">
                  <span className="config-tag">{task.config.tables?.length} tablas</span>
                  <span className="config-tag">&gt; {task.config.olderThan} días</span>
                </div>
              )}
            </div>

            <div className="task-footer">
              <button 
                className={`btn-toggle ${task.enabled ? 'active' : ''}`}
                onClick={() => handleToggleTask(task.id)}
              >
                {task.enabled ? '⏸️ Pausar' : '▶️ Activar'}
              </button>
              <button className="btn-run" onClick={() => handleRunNow(task)}>
                ▶️ Ejecutar Ahora
              </button>
              <button className="btn-edit" onClick={() => handleEditTask(task)}>
                ✏️
              </button>
              <button className="btn-delete" onClick={() => handleDeleteTask(task.id)}>
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* New Task Modal */}
      {showNewTaskModal && (
        <div className="modal-overlay" onClick={() => {
          setShowNewTaskModal(false);
          setSelectedTask(null);
          setNewTask({});
        }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedTask ? 'Editar Tarea' : 'Nueva Tarea Automatizada'}</h2>
              <button 
                className="btn-close" 
                onClick={() => {
                  setShowNewTaskModal(false);
                  setSelectedTask(null);
                  setNewTask({});
                }}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nombre de la tarea</label>
                <input
                  type="text"
                  className="form-input"
                  value={newTask.name || ''}
                  onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                  placeholder="ej: Respaldo Nocturno"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Descripción</label>
                <textarea
                  className="form-textarea"
                  value={newTask.description || ''}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Describe el propósito de la tarea"
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tipo de tarea</label>
                <select
                  className="form-select"
                  value={newTask.type || 'backup'}
                  onChange={(e) => setNewTask({ ...newTask, type: e.target.value as any })}
                >
                  <option value="backup">Respaldo</option>
                  <option value="optimization">Optimización</option>
                  <option value="cleanup">Limpieza</option>
                  <option value="report">Reporte</option>
                  <option value="sync">Sincronización</option>
                  <option value="validation">Validación</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Frecuencia</label>
                <select
                  className="form-select"
                  value={newTask.frequency || 'daily'}
                  onChange={(e) => setNewTask({ ...newTask, frequency: e.target.value as any })}
                >
                  <option value="hourly">Cada hora</option>
                  <option value="daily">Diario</option>
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensual</option>
                  <option value="custom">Personalizado (cron)</option>
                </select>
              </div>

              {newTask.frequency === 'custom' && (
                <div className="form-group">
                  <label className="form-label">Expresión Cron</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="0 3 * * *"
                  />
                  <small className="form-hint">
                    * * * * * (minuto hora día-del-mes mes día-de-la-semana)
                  </small>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Configuración específica</label>
                {newTask.type === 'backup' && (
                  <div className="config-subform">
                    <select className="form-select">
                      <option value="full">Completo</option>
                      <option value="incremental">Incremental</option>
                      <option value="differential">Diferencial</option>
                    </select>
                    <label className="checkbox-option">
                      <input type="checkbox" /> Comprimir
                    </label>
                    <label className="checkbox-option">
                      <input type="checkbox" /> Encriptar
                    </label>
                  </div>
                )}

                {newTask.type === 'cleanup' && (
                  <div className="config-subform">
                    <input
                      type="number"
                      className="form-input"
                      placeholder="Días a conservar"
                    />
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="checkbox-option">
                  <input
                    type="checkbox"
                    checked={newTask.notifications || false}
                    onChange={(e) => setNewTask({ ...newTask, notifications: e.target.checked })}
                  />
                  Enviar notificaciones al completar
                </label>
              </div>

              <div className="form-group">
                <label className="checkbox-option">
                  <input
                    type="checkbox"
                    checked={newTask.enabled}
                    onChange={(e) => setNewTask({ ...newTask, enabled: e.target.checked })}
                  />
                  Activar tarea inmediatamente
                </label>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn-cancel" 
                onClick={() => {
                  setShowNewTaskModal(false);
                  setSelectedTask(null);
                  setNewTask({});
                }}
              >
                Cancelar
              </button>
              <button className="btn-save" onClick={handleSaveTask}>
                {selectedTask ? 'Guardar Cambios' : 'Crear Tarea'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logs Modal */}
      {showLogsModal && (
        <div className="modal-overlay" onClick={() => setShowLogsModal(false)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Historial de Ejecuciones</h2>
              <button className="btn-close" onClick={() => setShowLogsModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="logs-table-container">
                <table className="logs-table">
                  <thead>
                    <tr>
                      <th>Tarea</th>
                      <th>Inicio</th>
                      <th>Fin</th>
                      <th>Registros</th>
                      <th>Estado</th>
                      <th>Detalles</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taskLogs.map(log => (
                      <tr key={log.id}>
                        <td>
                          <strong>{log.taskName}</strong>
                        </td>
                        <td>{log.startTime}</td>
                        <td>{log.endTime || 'En ejecución'}</td>
                        <td>{log.recordsProcessed?.toLocaleString() || '-'}</td>
                        <td>{getLogStatusBadge(log.status)}</td>
                        <td>
                          {log.errorMessage && (
                            <span className="error-message" title={log.errorMessage}>
                              ⚠️ Error
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-primary" onClick={() => {
                // Exportar logs
                alert('Exportando logs...');
              }}>
                📥 Exportar Logs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAutomationScreen;