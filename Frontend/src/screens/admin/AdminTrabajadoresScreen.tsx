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

  const pendientes = trabajadores.filter(t => !t.activado).length;
  const inactivosCount = trabajadores.filter(t => !t.activo).length;

  return (
    <div className="at-wrap animate-in">

      {/* ── HEADER ── */}
      <div className="at-header">
        <div className="at-header-left">
          <h1 className="at-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            Panel de Personal
          </h1>
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

      <div className="at-layout">

        {/* ── RAIL IZQUIERDO: roles + búsqueda + mini-stats ── */}
        <aside className="at-rail">
          <div className="at-rail-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input ref={searchRef} type="text" placeholder="Buscar…"
              value={query} onChange={e => setQuery(e.target.value)} />
          </div>

          <nav className="at-rail-nav">
            {filtrosDisponibles.map(r => {
              const cnt =
                r === 'todos'     ? trabajadores.length :
                r === 'inactivos' ? inactivosCount :
                r === 'pendientes'? pendientes :
                trabajadores.filter(t => t.rol === r).length;
              const meta = rolMeta(r);
              const isActive = filtroRol === r;
              const dotColor = r === 'todos' ? 'var(--gold)' : r === 'inactivos' ? 'var(--text-muted)' : r === 'pendientes' ? 'var(--amber)' : meta.color;
              return (
                <button key={r}
                  className={`at-rail-item ${isActive ? 'active' : ''}`}
                  onClick={() => setFiltroRol(r)}
                  style={{ '--ac': dotColor } as any}
                >
                  <span className="at-rail-dot" />
                  <span className="at-rail-label">{r === 'todos' ? 'Todo el equipo' : r === 'inactivos' ? 'Inactivos' : r === 'pendientes' ? 'Pendientes' : meta.label}</span>
                  <span className="at-rail-count">{cnt}</span>
                </button>
              );
            })}
          </nav>

          <div className="at-rail-summary">
            <div><strong>{trabajadores.length}</strong><span>Total</span></div>
            <div><strong style={{ color: '#86efac' }}>{trabajadores.filter(t => t.activo).length}</strong><span>Activos</span></div>
            <div><strong style={{ color: '#93c5fd' }}>{rolesUnicos.length - 1}</strong><span>Roles</span></div>
          </div>
        </aside>

        {/* ── CONTENIDO: grid de perfiles ── */}
        <div className="at-content">
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
          ) : (
            <div className="at-profile-grid">
              {filtrados.map((t, i) => (
                <PerfilCard
                  key={t.id}
                  t={t}
                  delay={i * 0.04}
                  onEdit={id => navigate(`/admin-trabajadores/editar/${id}`)}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─────────────── TARJETA DE PERFIL ─────────────── */
const PerfilCard: React.FC<{
  t: Trabajador; delay: number;
  onEdit: (id: number) => void;
  onToggle: (id: number, activo: boolean, nombre: string) => void;
}> = ({ t, delay, onEdit, onToggle }) => {
  const meta = rolMeta(t.rol);
  return (
    <div className={`at-profile ${!t.activo ? 'at-profile--inactive' : ''}`}
      style={{ '--ac': meta.color, animationDelay: `${delay}s` } as any}>
      <div className="at-profile-banner" />
      <div className="at-profile-avatar">{initials(t)}</div>

      <div className="at-profile-body">
        <p className="at-profile-name">{t.nombre} {t.apellido || ''}</p>
        <p className="at-profile-email">{t.email}</p>

        <div className="at-profile-tags">
          <span className="at-role-badge" style={{ color: meta.color, background: meta.bg, borderColor: `${meta.color}55` }}>
            {meta.label}
          </span>
          <span className={`at-status-pill ${t.activo ? 'at-status--on' : 'at-status--off'}`}>
            <span className="at-status-dot" />{t.activo ? 'Activo' : 'Suspendido'}
          </span>
        </div>

        {t.activado === false && (
          <span className="at-activacion-badge at-activacion--pending">Activación pendiente</span>
        )}
        {t.fecha_ingreso && (
          <p className="at-profile-fecha">
            Desde {new Date(t.fecha_ingreso).toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })}
          </p>
        )}
      </div>

      <div className="at-profile-actions">
        <button className="at-profile-btn at-profile-btn--edit" onClick={() => onEdit(t.id)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/>
          </svg>
          Editar
        </button>
        <button
          className={`at-profile-btn ${t.activo ? 'at-profile-btn--suspend' : 'at-profile-btn--activate'}`}
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
          {t.activo ? 'Suspender' : 'Reactivar'}
        </button>
      </div>
    </div>
  );
};

export default AdminTrabajadoresScreen;
