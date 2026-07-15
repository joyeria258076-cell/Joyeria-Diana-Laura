import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { workersAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import './AdminTrabajadoresScreen.css';

interface Trabajador {
  id: number;
  nombre: string;
  apellido?: string;
  email: string;
  rol: string;
  activo: boolean;
  activado?: boolean;
  fecha_ingreso?: string;
  telefono?: string;
}

const ROL_META: Record<string, { color: string; bg: string; label: string }> = {
  admin:      { color: '#c9a84c', bg: 'rgba(201,168,76,0.1)',   label: 'Admin' },
  trabajador: { color: '#ECB2C3', bg: 'rgba(236,178,195,0.1)', label: 'Trabajador' },
  vendedor:   { color: '#86efac', bg: 'rgba(134,239,172,0.1)', label: 'Vendedor' },
  diseñador:  { color: '#93c5fd', bg: 'rgba(147,197,253,0.1)', label: 'Diseñador' },
};
const rolMeta = (rol: string) =>
  ROL_META[rol.toLowerCase()] ?? { color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', label: rol };

const initials = (t: Trabajador) =>
  `${t.nombre[0]}${t.apellido?.[0] || t.nombre[1] || ''}`.toUpperCase();

const AdminTrabajadoresScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filtroRol, setFiltroRol] = useState('todos');
  const [vista, setVista] = useState<'tabla' | 'cards'>('tabla');
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const cargarTrabajadores = async () => {
    try {
      setLoading(true);
      const res = await workersAPI.getAll();
      if (res.success && Array.isArray(res.data)) {
        const lista = res.data
          .map((u: any) => ({ ...u, rol: (u.rol || 'sin rol').toLowerCase() }))
          .filter((u: any) => u.rol !== 'cliente' && u.email !== user?.email);
        setTrabajadores(lista);
      }
    } catch {
      fire('Error al cargar el personal', false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarTrabajadores(); }, []);

  const fire = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3400);
  };

  const handleToggle = async (id: number, current: boolean, nombre: string) => {
    if (!window.confirm(`¿${current ? 'Suspender acceso a' : 'Reactivar a'} ${nombre}?`)) return;
    try {
      const res = await workersAPI.toggleStatus(id, !current);
      if (res.success) {
        fire(res.message, true);
        setTrabajadores(prev => prev.map(t => t.id === id ? { ...t, activo: !current } : t));
      } else fire(res.message || 'Error al cambiar estado', false);
    } catch { fire('Error de conexión', false); }
  };

  const rolesUnicos = ['todos', ...Array.from(new Set(trabajadores.map(t => t.rol))).sort()];
  const filtrosDisponibles = [...rolesUnicos, 'inactivos', 'pendientes'];

  const filtrados = trabajadores.filter(t => {
    const matchRol =
      filtroRol === 'todos' ? true :
      filtroRol === 'inactivos' ? !t.activo :
      filtroRol === 'pendientes' ? !t.activado :
      t.rol === filtroRol;
    const q = query.toLowerCase();
    const matchQ = !q || t.nombre.toLowerCase().includes(q) || t.email.toLowerCase().includes(q) || t.rol.toLowerCase().includes(q);
    return matchRol && matchQ;
  });

  const activos   = filtrados.filter(t =>  t.activo);
  const inactivos = filtrados.filter(t => !t.activo);
  const pendientes = trabajadores.filter(t => !t.activado).length;

  const stats = [
    { n: trabajadores.length,                    label: 'Total',     icon: IconUsers,  accent: 'var(--gold)' },
    { n: trabajadores.filter(t => t.activo).length, label: 'Activos', icon: IconCheck,  accent: '#86efac' },
    { n: rolesUnicos.length - 1,                 label: 'Roles',     icon: IconBadge,  accent: '#93c5fd' },
    { n: pendientes,                              label: 'Pendientes', icon: IconClock,  accent: '#fbbf24' },
  ];

  return (
    <div className="at-wrap animate-in">

      {/* ── HEADER ── */}
      <div className="at-header">
        <div className="at-header-left">
          <p className="at-eyebrow">Joyería Diana Laura · Gestión de Personal</p>
          <h1 className="at-title">Panel de <span>Personal</span></h1>
          <p className="at-sub">Administra cuentas, roles y accesos del equipo</p>
        </div>
        <div className="at-header-right">
          {toast && (
            <div className={`at-toast ${toast.ok ? 'at-toast--ok' : 'at-toast--err'}`}>
              <span className="at-toast-icon">{toast.ok ? '✓' : '✕'}</span>
              {toast.msg}
            </div>
          )}
          <button className="at-btn-primary" onClick={() => navigate('/admin-trabajadores/nuevo')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16"><path d="M12 5v14M5 12h14"/></svg>
            Registrar Trabajador
          </button>
        </div>
      </div>

      {/* ── STATS ── */}
      <div className="at-stats">
        {stats.map(s => (
          <div className="at-stat" key={s.label} style={{ '--sa': s.accent } as any}>
            <div className="at-stat-icon"><s.icon /></div>
            <div className="at-stat-body">
              <strong>{s.n}</strong>
              <span>{s.label}</span>
            </div>
            <div className="at-stat-glow" />
          </div>
        ))}
      </div>

      {/* ── TOOLBAR ── */}
      <div className="at-toolbar">
        <div className="at-search-box">
          <svg className="at-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input ref={searchRef} className="at-search" type="text"
            placeholder="Buscar por nombre, email o rol…"
            value={query} onChange={e => setQuery(e.target.value)} />
          {query && <button className="at-search-clear" onClick={() => setQuery('')}>✕</button>}
        </div>

        <div className="at-filter-tabs">
          {filtrosDisponibles.map(r => {
            const cnt =
              r === 'todos'     ? undefined :
              r === 'inactivos' ? trabajadores.filter(t => !t.activo).length :
              r === 'pendientes'? trabajadores.filter(t => !t.activado).length :
              trabajadores.filter(t => t.rol === r).length;
            const meta = rolMeta(r);
            const isActive = filtroRol === r;
            return (
              <button key={r}
                className={`at-filter-tab ${isActive ? 'active' : ''}`}
                onClick={() => setFiltroRol(r)}
                style={isActive && r !== 'todos' && r !== 'inactivos' && r !== 'pendientes'
                  ? { borderColor: meta.color, color: meta.color, background: meta.bg } : undefined}
              >
                {r === 'todos' ? 'Todos' : r === 'inactivos' ? 'Inactivos' : r === 'pendientes' ? '⏳ Pendientes' : meta.label}
                {cnt !== undefined && <span className="at-filter-count">{cnt}</span>}
              </button>
            );
          })}
        </div>

        <div className="at-vista-toggle">
          <button className={`at-vista-btn ${vista === 'tabla' ? 'active' : ''}`} onClick={() => setVista('tabla')} title="Vista tabla">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>
          </button>
          <button className={`at-vista-btn ${vista === 'cards' ? 'active' : ''}`} onClick={() => setVista('cards')} title="Vista cards">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
          </button>
        </div>
      </div>

      {/* ── CONTENIDO ── */}
      {loading ? (
        <div className="at-state">
          <div className="at-spinner"><div className="at-ring"/><div className="at-ring at-ring--2"/></div>
          <p>Cargando personal…</p>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="at-state">
          <div className="at-state-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="36" height="36"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <p className="at-state-title">{query ? 'Sin resultados' : 'No hay personal'}</p>
          <p className="at-state-sub">{query ? `No se encontró "${query}"` : 'Registra el primer trabajador'}</p>
          {!query && <button className="at-btn-primary" onClick={() => navigate('/admin-trabajadores/nuevo')}>+ Registrar Trabajador</button>}
        </div>
      ) : vista === 'tabla' ? (
        <>
          {activos.length > 0   && <TablaSeccion datos={activos}   titulo="Personal Activo"   onEdit={id => navigate(`/admin-trabajadores/editar/${id}`)} onToggle={handleToggle} />}
          {inactivos.length > 0 && <TablaSeccion datos={inactivos} titulo="Personal Suspendido" onEdit={id => navigate(`/admin-trabajadores/editar/${id}`)} onToggle={handleToggle} />}
        </>
      ) : (
        <>
          {activos.length > 0   && <CardsSeccion datos={activos}   titulo="Personal Activo"    onEdit={id => navigate(`/admin-trabajadores/editar/${id}`)} onToggle={handleToggle} />}
          {inactivos.length > 0 && <CardsSeccion datos={inactivos} titulo="Personal Suspendido" onEdit={id => navigate(`/admin-trabajadores/editar/${id}`)} onToggle={handleToggle} />}
        </>
      )}
    </div>
  );
};

/* ─────────────── TABLA ─────────────── */
const TablaSeccion: React.FC<{
  datos: Trabajador[]; titulo: string;
  onEdit: (id: number) => void;
  onToggle: (id: number, activo: boolean, nombre: string) => void;
}> = ({ datos, titulo, onEdit, onToggle }) => (
  <div className="at-section">
    <div className="at-section-head">
      <h3 className="at-section-title">{titulo}</h3>
      <span className="at-section-badge">{datos.length}</span>
    </div>
    <div className="at-table-wrap">
      <table className="at-table">
        <thead>
          <tr>
            <th>Empleado</th>
            <th>Email</th>
            <th>Rol</th>
            <th>Estado</th>
            <th>Activación</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {datos.map((t, i) => {
            const meta = rolMeta(t.rol);
            return (
              <tr key={t.id} className={`at-row ${!t.activo ? 'at-row--inactive' : ''}`} style={{ animationDelay: `${i * 0.04}s` }}>
                <td>
                  <div className="at-employee">
                    <div className="at-avatar" style={{ '--ac': t.activo ? meta.color : '#6b7280', opacity: t.activo ? 1 : 0.45 } as any}>
                      {initials(t)}
                    </div>
                    <div className="at-employee-info">
                      <strong>{t.nombre} {t.apellido || ''}</strong>
                      {t.fecha_ingreso && (
                        <small>Desde {new Date(t.fecha_ingreso).toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })}</small>
                      )}
                    </div>
                  </div>
                </td>
                <td className="at-email">{t.email}</td>
                <td>
                  <span className="at-role-badge" style={{ color: meta.color, background: meta.bg, borderColor: `${meta.color}55` }}>
                    {meta.label}
                  </span>
                </td>
                <td>
                  <span className={`at-status-pill ${t.activo ? 'at-status--on' : 'at-status--off'}`}>
                    <span className="at-status-dot" />
                    {t.activo ? 'Activo' : 'Suspendido'}
                  </span>
                </td>
                <td>
                  {t.activado === false ? (
                    <span className="at-activacion-badge at-activacion--pending">⏳ Pendiente</span>
                  ) : (
                    <span className="at-activacion-badge at-activacion--ok">✓ Activado</span>
                  )}
                </td>
                <td>
                  <div className="at-actions-cell">
                    <button className="at-icon-btn at-icon-btn--edit" title="Editar" onClick={() => onEdit(t.id)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/>
                      </svg>
                    </button>
                    <button
                      className={`at-icon-btn ${t.activo ? 'at-icon-btn--delete' : 'at-icon-btn--activate'}`}
                      title={t.activo ? 'Suspender acceso' : 'Reactivar'}
                      onClick={() => onToggle(t.id, t.activo, t.nombre)}
                    >
                      {t.activo ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                          <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);

/* ─────────────── CARDS ─────────────── */
const CardsSeccion: React.FC<{
  datos: Trabajador[]; titulo: string;
  onEdit: (id: number) => void;
  onToggle: (id: number, activo: boolean, nombre: string) => void;
}> = ({ datos, titulo, onEdit, onToggle }) => (
  <div className="at-section">
    <div className="at-section-head">
      <h3 className="at-section-title">{titulo}</h3>
      <span className="at-section-badge">{datos.length}</span>
    </div>
    <div className="at-cards-grid">
      {datos.map((t, i) => {
        const meta = rolMeta(t.rol);
        return (
          <div key={t.id} className={`at-card ${!t.activo ? 'at-card--inactive' : ''}`}
            style={{ animationDelay: `${i * 0.05}s`, '--ac': meta.color } as any}>
            <div className="at-card-glow" style={{ background: meta.color }} />
            <div className="at-card-top">
              <div className="at-card-avatar" style={{ color: meta.color, borderColor: `${meta.color}55`, opacity: t.activo ? 1 : 0.4 }}>
                {initials(t)}
              </div>
              <div className="at-card-badges">
                <span className="at-role-badge" style={{ color: meta.color, background: meta.bg, borderColor: `${meta.color}55` }}>
                  {meta.label}
                </span>
                <span className={`at-status-pill ${t.activo ? 'at-status--on' : 'at-status--off'}`}>
                  <span className="at-status-dot" />{t.activo ? 'Activo' : 'Suspendido'}
                </span>
              </div>
            </div>
            <div className="at-card-body">
              <p className="at-card-name">{t.nombre} {t.apellido || ''}</p>
              <p className="at-card-email">{t.email}</p>
              {t.telefono && <p className="at-card-tel">{t.telefono}</p>}
              {t.fecha_ingreso && (
                <p className="at-card-date">
                  Desde {new Date(t.fecha_ingreso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              )}
            </div>
            <div className="at-card-footer">
              {t.activado === false && <span className="at-activacion-badge at-activacion--pending">⏳ Pendiente activación</span>}
              <div className="at-card-actions">
                <button className="at-card-btn at-card-btn--edit" onClick={() => onEdit(t.id)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/>
                  </svg>
                  Editar
                </button>
                <button
                  className={`at-card-btn ${t.activo ? 'at-card-btn--suspend' : 'at-card-btn--activate'}`}
                  onClick={() => onToggle(t.id, t.activo, t.nombre)}
                >
                  {t.activo ? 'Suspender' : 'Reactivar'}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

/* ─────────────── ICONOS ─────────────── */
const IconUsers = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);
const IconBadge = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22">
    <circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
  </svg>
);
const IconClock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);

export default AdminTrabajadoresScreen;
