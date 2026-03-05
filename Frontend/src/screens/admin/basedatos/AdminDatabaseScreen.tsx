// Frontend/src/screens/admin/basedatos/AdminDatabaseScreen.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './styles/AdminDatabaseScreen.css';

interface DatabaseStats {
  totalTables: number;
  totalRecords: number;
  databaseSize: string;
  lastBackup: string | null;
  activeConnections: number;
  cacheHitRatio: number;
  slowQueries: number;
  status: 'healthy' | 'warning' | 'critical';
}

interface RecentActivity {
  id: number;
  type: 'backup' | 'import' | 'export' | 'optimization' | 'security';
  description: string;
  status: 'success' | 'pending' | 'failed';
  timestamp: string;
  user: string;
}

const AdminDatabaseScreen: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DatabaseStats>({
    totalTables: 42,
    totalRecords: 15420,
    databaseSize: '2.4 GB',
    lastBackup: '2024-01-15 03:00 AM',
    activeConnections: 8,
    cacheHitRatio: 98.5,
    slowQueries: 3,
    status: 'healthy'
  });

  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([
    {
      id: 1,
      type: 'backup',
      description: 'Respaldo automático completado',
      status: 'success',
      timestamp: '2024-01-15 03:00 AM',
      user: 'Sistema'
    },
    {
      id: 2,
      type: 'import',
      description: 'Importación de productos desde Excel',
      status: 'success',
      timestamp: '2024-01-14 15:30 PM',
      user: 'Admin'
    },
    {
      id: 3,
      type: 'optimization',
      description: 'Optimización de tablas completada',
      status: 'success',
      timestamp: '2024-01-14 02:00 AM',
      user: 'Sistema'
    },
    {
      id: 4,
      type: 'security',
      description: 'Actualización de reglas Firestore',
      status: 'pending',
      timestamp: '2024-01-15 09:15 AM',
      user: 'Admin'
    }
  ]);

  const [loading, setLoading] = useState(false);

  const handleQuickAction = (action: string) => {
    switch(action) {
      case 'backup':
        navigate('/admin-backups');
        break;
      case 'import':
        navigate('/admin-import-export');
        break;
      case 'optimize':
        // Lógica para optimización rápida
        alert('Iniciando optimización de base de datos...');
        break;
      case 'monitor':
        navigate('/admin-nosql-monitoring');
        break;
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'healthy': return 'var(--success-color)';
      case 'warning': return 'var(--warning-color)';
      case 'critical': return 'var(--error-color)';
      default: return 'var(--text-secondary)';
    }
  };

  const getActivityIcon = (type: string) => {
    switch(type) {
      case 'backup': return '💾';
      case 'import': return '📥';
      case 'export': return '📤';
      case 'optimization': return '⚡';
      case 'security': return '🔒';
      default: return '📋';
    }
  };

  const getActivityStatusClass = (status: string) => {
    switch(status) {
      case 'success': return 'status-success';
      case 'pending': return 'status-pending';
      case 'failed': return 'status-failed';
      default: return '';
    }
  };

  return (
    <div className="database-screen-container">
      {/* Header */}
      <div className="database-header">
        <div className="header-left">
          <h1 className="page-title">Gestión de Base de Datos</h1>
          <p className="page-description">
            Administra copias de seguridad, importaciones, exportaciones y monitoreo de la base de datos
          </p>
        </div>
        <div className="header-right">
          <div className="database-status" style={{ borderColor: getStatusColor(stats.status) }}>
            <span className="status-indicator" style={{ backgroundColor: getStatusColor(stats.status) }}></span>
            <span className="status-text">
              {stats.status === 'healthy' ? 'Sistema Saludable' : 
               stats.status === 'warning' ? 'Advertencias' : 'Crítico'}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <span className="stat-label">Tablas</span>
            <span className="stat-value">{stats.totalTables}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📝</div>
          <div className="stat-content">
            <span className="stat-label">Registros</span>
            <span className="stat-value">{stats.totalRecords.toLocaleString()}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💽</div>
          <div className="stat-content">
            <span className="stat-label">Tamaño BD</span>
            <span className="stat-value">{stats.databaseSize}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🔄</div>
          <div className="stat-content">
            <span className="stat-label">Último Respaldo</span>
            <span className="stat-value">{stats.lastBackup || 'Nunca'}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🔌</div>
          <div className="stat-content">
            <span className="stat-label">Conexiones</span>
            <span className="stat-value">{stats.activeConnections}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⚡</div>
          <div className="stat-content">
            <span className="stat-label">Cache Hit</span>
            <span className="stat-value">{stats.cacheHitRatio}%</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions-section">
        <h2 className="section-title">Acciones Rápidas</h2>
        <div className="quick-actions-grid">
          <button className="quick-action-card" onClick={() => handleQuickAction('backup')}>
            <span className="action-icon">💾</span>
            <span className="action-title">Respaldo Manual</span>
            <span className="action-desc">Crear copia de seguridad ahora</span>
          </button>

          <button className="quick-action-card" onClick={() => handleQuickAction('import')}>
            <span className="action-icon">📥</span>
            <span className="action-title">Importar Datos</span>
            <span className="action-desc">CSV, Excel, JSON</span>
          </button>

          <button className="quick-action-card" onClick={() => handleQuickAction('export')}>
            <span className="action-icon">📤</span>
            <span className="action-title">Exportar Datos</span>
            <span className="action-desc">Respaldar información</span>
          </button>

          <button className="quick-action-card" onClick={() => handleQuickAction('optimize')}>
            <span className="action-icon">⚡</span>
            <span className="action-title">Optimizar BD</span>
            <span className="action-desc">Vacuum y análisis</span>
          </button>

          <button className="quick-action-card" onClick={() => handleQuickAction('monitor')}>
            <span className="action-icon">📈</span>
            <span className="action-title">Monitoreo</span>
            <span className="action-desc">Ver rendimiento</span>
          </button>
        </div>
      </div>

      {/* Main Modules Grid */}
      <div className="modules-grid">
        <div className="module-card" onClick={() => navigate('/admin-backups')}>
          <div className="module-icon">💾</div>
          <div className="module-content">
            <h3 className="module-title">Respaldos y Restauración</h3>
            <p className="module-description">
              Administra copias de seguridad completas, restauras puntos específicos y programa respaldos automáticos.
            </p>
            <div className="module-meta">
              <span className="meta-item">📊 Último: {stats.lastBackup || 'Nunca'}</span>
              <span className="meta-item">🔄 3 respaldos programados</span>
            </div>
          </div>
          <span className="module-arrow">→</span>
        </div>

        <div className="module-card" onClick={() => navigate('/admin-import-export')}>
          <div className="module-icon">🔄</div>
          <div className="module-content">
            <h3 className="module-title">Importación y Exportación</h3>
            <p className="module-description">
              Importa datos desde CSV, Excel, JSON. Exporta tablas completas o consultas personalizadas.
            </p>
            <div className="module-meta">
              <span className="meta-item">📥 2 importaciones recientes</span>
              <span className="meta-item">📤 Formatos soportados: CSV, JSON, SQL</span>
            </div>
          </div>
          <span className="module-arrow">→</span>
        </div>

        <div className="module-card" onClick={() => navigate('/admin-automation')}>
          <div className="module-icon">⚡</div>
          <div className="module-content">
            <h3 className="module-title">Automatización de Tareas</h3>
            <p className="module-description">
              Programa tareas automáticas: respaldos diarios, optimización nocturna, limpieza de logs.
            </p>
            <div className="module-meta">
              <span className="meta-item">⏰ 5 tareas programadas</span>
              <span className="meta-item">✅ 2 ejecutadas hoy</span>
            </div>
          </div>
          <span className="module-arrow">→</span>
        </div>

        <div className="module-card" onClick={() => navigate('/admin-nosql-security')}>
          <div className="module-icon">🔒</div>
          <div className="module-content">
            <h3 className="module-title">Seguridad NoSQL (Firestore)</h3>
            <p className="module-description">
              Administra reglas de seguridad, autenticación, backups de Firestore y monitoreo de accesos.
            </p>
            <div className="module-meta">
              <span className="meta-item">🔑 12 reglas activas</span>
              <span className="meta-item">👥 245 usuarios autorizados</span>
            </div>
          </div>
          <span className="module-arrow">→</span>
        </div>

        <div className="module-card" onClick={() => navigate('/admin-nosql-monitoring')}>
          <div className="module-icon">📊</div>
          <div className="module-content">
            <h3 className="module-title">Monitoreo NoSQL</h3>
            <p className="module-description">
              Visualiza métricas de rendimiento, lecturas/escrituras, latencia y uso de Firestore.
            </p>
            <div className="module-meta">
              <span className="meta-item">📈 2.5k lecturas/hora</span>
              <span className="meta-item">⏱️ Latencia: 45ms</span>
            </div>
          </div>
          <span className="module-arrow">→</span>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="recent-activity-section">
        <div className="section-header">
          <h2 className="section-title">Actividad Reciente</h2>
          <button className="view-all-btn" onClick={() => navigate('/admin-database/activity')}>
            Ver todo →
          </button>
        </div>

        <div className="activity-list">
          {recentActivities.map((activity) => (
            <div key={activity.id} className="activity-item">
              <div className="activity-icon">{getActivityIcon(activity.type)}</div>
              <div className="activity-details">
                <span className="activity-description">{activity.description}</span>
                <span className="activity-time">{activity.timestamp}</span>
              </div>
              <div className={`activity-status ${getActivityStatusClass(activity.status)}`}>
                {activity.status === 'success' ? '✅ Completado' :
                 activity.status === 'pending' ? '⏳ Pendiente' : '❌ Fallido'}
              </div>
              <span className="activity-user">👤 {activity.user}</span>
            </div>
          ))}
        </div>
      </div>

      {/* System Health */}
      <div className="health-section">
        <h2 className="section-title">Salud del Sistema</h2>
        <div className="health-grid">
          <div className="health-item">
            <span className="health-label">PostgreSQL</span>
            <span className="health-value success">✅ Operativo</span>
          </div>
          <div className="health-item">
            <span className="health-label">Firestore</span>
            <span className="health-value success">✅ Conectado</span>
          </div>
          <div className="health-item">
            <span className="health-label">Redis Cache</span>
            <span className="health-value success">✅ Funcionando</span>
          </div>
          <div className="health-item">
            <span className="health-label">Backup Automático</span>
            <span className="health-value warning">⚠️ Pendiente</span>
          </div>
          <div className="health-item">
            <span className="health-label">Espacio en Disco</span>
            <span className="health-value success">✅ 68% libre</span>
          </div>
          <div className="health-item">
            <span className="health-label">Consultas Lentas</span>
            <span className="health-value warning">{stats.slowQueries} detectadas</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDatabaseScreen;