import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { workersAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext'; 
import './AdminTrabajadoresScreen.css';

/* ─── TIPOS ────────────────────────────────── */
interface Trabajador {
  id: number;
  nombre: string;
  apellido?: string;
  email: string;
  rol: string;
  activo: boolean;
  fecha_ingreso?: string;
}

const generarColorDinamico = (rol: string) => {
  let hash = 0;
  for (let i = 0; i < rol.length; i++) {
    hash = rol.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 70%, 70%)`;
};

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
          .map((u: any) => ({
            ...u,
            rol: (u.rol || 'sin rol').toLowerCase(), 
          }))
          .filter((u: any) => u.rol !== 'cliente' && u.email !== user?.email); 
          
        setTrabajadores(lista);
      }
    } catch (error) {
      console.error('Error al cargar trabajadores:', error);
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

  const handleToggleStatus = async (id: number, currentStatus: boolean, nombre: string) => {
    const newStatus = !currentStatus;
    const accionTexto = newStatus ? 'reactivar' : 'desactivar (suspender acceso)';

    if (!window.confirm(`¿Estás seguro de que deseas ${accionTexto} a ${nombre}?`)) return;

    try {
      const res = await workersAPI.toggleStatus(id, newStatus);
      if (res.success) {
        fire(res.message, true);
        setTrabajadores(prev => 
          prev.map(t => t.id === id ? { ...t, activo: newStatus } : t)
        );
      } else {
        fire(res.message || `Error al cambiar estado`, false);
      }
    } catch (error) {
      fire('Error de conexión al cambiar el estado', false);
    }
  };

  const rolesUnicos = ['todos', ...Array.from(new Set(trabajadores.map(t => t.rol))).sort()];
  const filtrosDisponibles = [...rolesUnicos, 'inactivos'];

  const filtrados = trabajadores.filter(t => {
    const matchRol = 
      filtroRol === 'todos' || 
      (filtroRol === 'inactivos' ? !t.activo : t.rol === filtroRol);

    const q = query.toLowerCase();
    const matchQ = !q
      || t.nombre.toLowerCase().includes(q)
      || (t.apellido || '').toLowerCase().includes(q)
      || t.email.toLowerCase().includes(q)
      || t.rol.toLowerCase().includes(q);
    return matchRol && matchQ;
  });

  const listaActivos = filtrados.filter(t => t.activo);
  const listaInactivos = filtrados.filter(t => !t.activo);

  const initials = (t: Trabajador) =>
    `${t.nombre[0]}${t.apellido?.[0] || t.nombre[1] || ''}`.toUpperCase();

  const RenderTabla = ({ datos, titulo }: { datos: Trabajador[], titulo: string }) => (
    <div className="at-table-section" style={{ marginBottom: '40px' }}>
      <h3 className="at-table-title">
        {titulo} <span className="at-table-count">{datos.length}</span>
      </h3>
      <div className="at-table-wrap">
        <table className="at-table">
          <thead>
            <tr>
              <th>Empleado</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {datos.map((t, i) => (
              <tr key={t.id} className={`at-row ${!t.activo ? 'at-row--inactive' : ''}`} style={{ animationDelay: `${i * 0.04}s` }}>
                <td>
                  <div className="at-employee">
                    <div className="at-avatar" style={{ '--ac': t.activo ? generarColorDinamico(t.rol) : '#6b7280', opacity: t.activo ? 1 : 0.5 } as any}>
                      <span>{initials(t)}</span>
                    </div>
                    <div className="at-employee-info">
                      <strong style={{ opacity: t.activo ? 1 : 0.6 }}>{t.nombre} {t.apellido || ''}</strong>
                      {t.fecha_ingreso && (
                        <small>Desde {new Date(t.fecha_ingreso).toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })}</small>
                      )}
                    </div>
                  </div>
                </td>
                <td className="at-email" style={{ opacity: t.activo ? 1 : 0.6 }}>{t.email}</td>
                <td>
                  <span className="at-role-badge" style={{ '--rc': t.activo ? generarColorDinamico(t.rol) : '#6b7280', opacity: t.activo ? 1 : 0.6 } as any}>
                    {t.rol.charAt(0).toUpperCase() + t.rol.slice(1)}
                  </span>
                </td>
                <td>
                  <span className={`at-status-pill ${t.activo ? 'at-status--on' : 'at-status--off'}`}>
                    <span className="at-status-dot" style={{ backgroundColor: t.activo ? '#10b981' : '#ef4444' }}/>
                    {t.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="at-actions-cell">
                  <button className="at-icon-btn at-icon-btn--edit" onClick={() => navigate(`/admin-trabajadores/editar/${t.id}`)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/>
                    </svg>
                  </button>
                  <button 
                    className={`at-icon-btn ${t.activo ? 'at-icon-btn--delete' : 'at-icon-btn--activate'}`}
                    onClick={() => handleToggleStatus(t.id, t.activo, t.nombre)}
                  >
                    {t.activo ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                        <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                      </svg>
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="at-wrap animate-in">
      <div className="at-header">
        <div className="at-header-text">
          <h2 className="at-title">Panel de Personal</h2>
          <p className="at-sub">Gestión de empleados · Joyería Diana Laura</p>
        </div>
        
        {/* 🎯 CONTENEDOR RELATIVO PARA EL TOAST Y EL BOTÓN */}
        <div className="at-header-actions">
          {toast && (
            <div className={`at-toast ${toast.ok ? 'at-toast--ok' : 'at-toast--err'}`}>
              <span className="at-toast-icon">{toast.ok ? '✓' : '✕'}</span>
              {toast.msg}
              <div className="at-toast-arrow" />
            </div>
          )}
          <button className="at-btn-primary" onClick={() => navigate('/admin-trabajadores/nuevo')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Registrar Trabajador
          </button>
        </div>
      </div>

      <div className="at-stats">
        {[
          { n: trabajadores.length, label: 'Total' },
          { n: trabajadores.filter(t => t.activo).length, label: 'Activos' },
          { n: rolesUnicos.length - 1, label: 'Roles' },
          { n: trabajadores.filter(t => !t.activo).length, label: 'Inactivos'}
        ].map(s => (
          <div className="at-stat" key={s.label}><strong>{s.n}</strong><span>{s.label}</span></div>
        ))}
      </div>

      <div className="at-toolbar">
        <div className="at-search-box">
          <svg className="at-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input ref={searchRef} className="at-search" type="text" placeholder="Buscar por nombre, email o rol…" value={query} onChange={e => setQuery(e.target.value)} />
          {query && <button className="at-search-clear" onClick={() => setQuery('')}>✕</button>}
        </div>

        <div className="at-filter-tabs">
          {filtrosDisponibles.map(r => (
            <button
              key={r}
              className={`at-filter-tab ${filtroRol === r ? 'active' : ''}`}
              onClick={() => setFiltroRol(r)}
              style={filtroRol === r && r !== 'todos' && r !== 'inactivos'
                ? { borderColor: generarColorDinamico(r), color: generarColorDinamico(r), background: `${generarColorDinamico(r).replace(')', ', 0.1)')}`.replace('hsl', 'hsla') }
                : undefined
              }
            >
              {r === 'todos' ? 'Todos' : r === 'inactivos' ? 'Inactivos' : r.charAt(0).toUpperCase() + r.slice(1)}
              {r !== 'todos' && (
                <span className="at-filter-count">
                  {r === 'inactivos' ? trabajadores.filter(t => !t.activo).length : trabajadores.filter(t => t.rol === r).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="at-state">
           <div className="at-spinner"><div className="at-ring"/><div className="at-ring at-ring--2"/></div>
           <p>Cargando personal…</p>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="at-state">
          <span className="at-state-icon">👥</span>
          <p>{query ? 'Sin resultados para tu búsqueda' : 'No hay personal registrado'}</p>
        </div>
      ) : (
        <>
          {listaActivos.length > 0 && <RenderTabla datos={listaActivos} titulo="Personal Activo" />}
          {listaInactivos.length > 0 && <RenderTabla datos={listaInactivos} titulo="Personal Deshabilitado / Histórico" />}
        </>
      )}
    </div>
  );
};

export default AdminTrabajadoresScreen;