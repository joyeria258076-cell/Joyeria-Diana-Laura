import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { authAPI, profileAPI, solicitudesAPI, uploadAPI } from "../../services/api";
import { AiOutlineEye, AiOutlineEyeInvisible, AiOutlineDesktop, AiOutlineReload } from "react-icons/ai";
import "./PerfilScreen.css";

interface SesionActiva {
  id: number;
  device_name: string;
  browser: string;
  os: string;
  ip_address: string;
  location: string;
  created_at: string;
  last_activity: string;
  is_current?: boolean;
}

interface MFAStatus { mfaEnabled: boolean; }

type Tab = 'info' | 'seguridad' | 'sesiones';

export default function PerfilScreen() {
  const { user, logout, getActiveSessions, revokeSession,
          revokeAllOtherSessions, revokeAllSessions, refreshUserName, refreshUserFoto } = useAuth();
  const navigate = useNavigate();

  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const fotoInputRef = useRef<HTMLInputElement>(null);

  const userRole = user?.rol?.toLowerCase().trim() || 'cliente';
  const isCliente = userRole === 'cliente';

  // Tab activa
  const [tab, setTab] = useState<Tab>('info');

  // Toast
  const [toast, setToast] = useState<{ msg: string; tipo: 'ok' | 'err' } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();
  const mostrarToast = (msg: string, tipo: 'ok' | 'err') => {
    clearTimeout(toastTimer.current);
    setToast({ msg, tipo });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };

  // ── DATOS PERSONALES (solo cliente) ────────────────────────
  const [perfil, setPerfil]         = useState({ nombre: '', telefono: '' });
  const [loadingPerfil, setLoadingPerfil] = useState(false);
  const [savingPerfil, setSavingPerfil]   = useState(false);

  // ── CONTRASEÑA ──────────────────────────────────────────────
  const [passForm, setPassForm]   = useState({ actual: '', nueva: '', confirmar: '' });
  const [savingPass, setSavingPass] = useState(false);
  const [showPass, setShowPass]   = useState({ actual: false, nueva: false, confirmar: false });

  // ── MFA ─────────────────────────────────────────────────────
  const [mfaStatus, setMfaStatus]   = useState<MFAStatus>({ mfaEnabled: false });
  const [cargandoMFA, setCargandoMFA] = useState(false);

  // ── CÓDIGO DE TRABAJADOR ────────────────────────────────────
  const [codigoTrabajador, setCodigoTrabajador] = useState('');
  const [showCodigo, setShowCodigo] = useState(false);
  const [solicitandoCodigo, setSolicitandoCodigo] = useState(false);

  // ── SOLICITUD CAMBIO NOMBRE (trabajador) ────────────────────
  const [showSolicitud, setShowSolicitud] = useState(false);
  const [solicitudNombre, setSolicitudNombre] = useState('');
  const [savingSolicitud, setSavingSolicitud] = useState(false);
  const [misSolicitudes, setMisSolicitudes] = useState<any[]>([]);
  const [filtroSolicitud, setFiltroSolicitud] = useState<'todas' | 'pendiente' | 'aprobada' | 'rechazada'>('todas');

  // ── SESIONES ────────────────────────────────────────────────
  const [sesiones, setSesiones]     = useState<SesionActiva[]>([]);
  const [cargandoSes, setCargandoSes] = useState(true);

  // Cargar datos al montar
  useEffect(() => {
    if (isCliente) cargarPerfil();
    if (user?.dbId) cargarMFA();
    if (!isCliente) { cargarMisSolicitudes(); cargarCodigoTrabajador(); }
    cargarSesiones();
    profileAPI.getProfile().then(res => { if (res.success) setFotoUrl(res.data.foto_perfil_url || null); }).catch(() => {});
  }, []);

  const handleSubirFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { mostrarToast('El archivo debe ser una imagen', 'err'); return; }
    setSubiendoFoto(true);
    try {
      const up = await uploadAPI.uploadImage(file, 'joyeria/usuarios');
      if (!up.success) throw new Error(up.message || 'Error al subir la imagen');
      const url = up.data.url;
      const res = await profileAPI.updateProfile({ foto_perfil_url: url });
      if (!res.success) throw new Error(res.message || 'Error al guardar la foto');
      setFotoUrl(url);
      refreshUserFoto(url);
      mostrarToast('Foto de perfil actualizada', 'ok');
    } catch (err: any) {
      mostrarToast(err.message || 'Error al actualizar la foto', 'err');
    } finally {
      setSubiendoFoto(false);
    }
  };

  const cargarMisSolicitudes = async (silencioso = false) => {
    try {
      const res = await solicitudesAPI.getMias();
      const arr: any[] = Array.isArray(res?.data) ? res.data : [];

      // Detectar si alguna pasó de pendiente a aprobada
      setMisSolicitudes(prev => {
        const recienAprobada = arr.find(nueva =>
          nueva.estado === 'aprobada' &&
          prev.some(vieja => vieja.id === nueva.id && vieja.estado === 'pendiente')
        );
        if (recienAprobada) {
          refreshUserName(recienAprobada.valor_nuevo);
          if (!silencioso) mostrarToast('¡Tu nombre fue actualizado por el administrador!', 'ok');
        }
        return arr;
      });
    } catch { /**/ }
  };

  // Polling cada 10s si hay solicitudes pendientes
  useEffect(() => {
    if (isCliente) return;
    const intervalo = setInterval(() => {
      setMisSolicitudes(prev => {
        const tienePendiente = prev.some(s => s.estado === 'pendiente');
        if (tienePendiente) cargarMisSolicitudes(true);
        return prev;
      });
    }, 10000);
    return () => clearInterval(intervalo);
  }, [isCliente]);

  const handleEliminarSolicitud = async (id: number) => {
    if (!window.confirm('¿Eliminar esta solicitud?')) return;
    try {
      const res = await solicitudesAPI.eliminar(id);
      if (res.success) {
        setMisSolicitudes(prev => prev.filter(s => s.id !== id));
        mostrarToast('Solicitud eliminada', 'ok');
      } else { mostrarToast(res.message || 'Error al eliminar', 'err'); }
    } catch (e: any) { mostrarToast(e.message, 'err'); }
  };

  const handleEnviarSolicitud = async () => {
    if (!solicitudNombre.trim()) { mostrarToast('Escribe el nombre que deseas', 'err'); return; }
    if (solicitudNombre.trim() === user?.nombre) { mostrarToast('El nombre es igual al actual', 'err'); return; }
    setSavingSolicitud(true);
    try {
      const res = await solicitudesAPI.crear('nombre', solicitudNombre.trim());
      if (res.success) {
        mostrarToast('Solicitud enviada al administrador', 'ok');
        setShowSolicitud(false);
        setSolicitudNombre('');
        cargarMisSolicitudes();
      } else { mostrarToast(res.message || 'Error al enviar solicitud', 'err'); }
    } catch (e: any) { mostrarToast(e.message, 'err'); }
    finally { setSavingSolicitud(false); }
  };

  const handleSolicitarRecuperacionCodigo = async () => {
    if (solicitandoCodigo) return;
    setSolicitandoCodigo(true);
    try {
      const res = await solicitudesAPI.crear('recuperar_codigo', 'solicitud_recuperacion');
      if (res.success) {
        mostrarToast('Solicitud enviada al administrador. Te avisará cuando regenere tu código.', 'ok');
        cargarMisSolicitudes();
      } else { mostrarToast(res.message || 'Error al enviar solicitud', 'err'); }
    } catch (e: any) { mostrarToast(e.message || 'Error de conexión', 'err'); }
    finally { setSolicitandoCodigo(false); }
  };

  const cargarCodigoTrabajador = async () => {
    try {
      const res = await profileAPI.getProfile();
      if (res.success && res.data?.codigo_trabajador) {
        setCodigoTrabajador(res.data.codigo_trabajador);
      }
    } catch { /**/ }
  };

  const cargarPerfil = async () => {
    setLoadingPerfil(true);
    try {
      const res = await profileAPI.getProfile();
      if (res.success) {
        setPerfil({
          nombre:   res.data.nombre   || user?.nombre || '',
          telefono: res.data.telefono || '',
        });
      }
    } catch { setPerfil({ nombre: user?.nombre || '', telefono: '' }); }
    finally { setLoadingPerfil(false); }
  };

  const cargarMFA = async () => {
    try {
      const res = await authAPI.checkMFAStatus(user!.dbId!);
      if (res.success) setMfaStatus(res.data);
    } catch { /**/ }
  };

  const cargarSesiones = async () => {
    setCargandoSes(true);
    try {
      const data = await getActiveSessions();
      setSesiones(data);
    } catch (e: any) { mostrarToast('Error al cargar sesiones: ' + e.message, 'err'); }
    finally { setCargandoSes(false); }
  };

  // ── GUARDAR DATOS PERSONALES ────────────────────────────────
  const handleGuardarPerfil = async () => {
    if (!perfil.nombre.trim()) { mostrarToast('El nombre es obligatorio', 'err'); return; }
    setSavingPerfil(true);
    try {
      const res = await profileAPI.updateProfile({ nombre: perfil.nombre, telefono: perfil.telefono });
      if (res.success) {
        refreshUserName(perfil.nombre);
        mostrarToast('Perfil actualizado correctamente', 'ok');
      } else { mostrarToast(res.message || 'Error al actualizar', 'err'); }
    } catch (e: any) { mostrarToast(e.message, 'err'); }
    finally { setSavingPerfil(false); }
  };

  // ── CAMBIAR CONTRASEÑA ──────────────────────────────────────
  const handleCambiarPassword = async () => {
    if (!passForm.actual)    { mostrarToast('Ingresa tu contraseña actual', 'err'); return; }
    if (!passForm.nueva)     { mostrarToast('Ingresa la nueva contraseña', 'err'); return; }
    if (passForm.nueva.length < 6) { mostrarToast('La nueva contraseña debe tener al menos 6 caracteres', 'err'); return; }
    if (passForm.nueva !== passForm.confirmar) { mostrarToast('Las contraseñas no coinciden', 'err'); return; }
    setSavingPass(true);
    try {
      const res = await profileAPI.changePassword({ passwordActual: passForm.actual, passwordNueva: passForm.nueva });
      if (res.success) {
        setPassForm({ actual: '', nueva: '', confirmar: '' });
        mostrarToast('Contraseña actualizada correctamente', 'ok');
      } else { mostrarToast(res.message || 'Error al cambiar contraseña', 'err'); }
    } catch (e: any) { mostrarToast(e.message, 'err'); }
    finally { setSavingPass(false); }
  };

  // ── MFA ─────────────────────────────────────────────────────
  const handleDesactivarMFA = async () => {
    if (!user?.dbId) return;
    if (!window.confirm('¿Desactivar la autenticación en dos pasos? Reducirá la seguridad de tu cuenta.')) return;
    setCargandoMFA(true);
    try {
      const res = await authAPI.disableMFA(user.dbId);
      if (res.success) { setMfaStatus({ mfaEnabled: false }); mostrarToast('MFA desactivado', 'ok'); }
      else mostrarToast(res.message, 'err');
    } catch (e: any) { mostrarToast(e.message, 'err'); }
    finally { setCargandoMFA(false); }
  };

  // ── SESIONES ────────────────────────────────────────────────
  const handleCerrarSesion = async (id: number) => {
    const s = sesiones.find(x => x.id === id);
    if (!window.confirm(s?.is_current ? '¿Cerrar tu sesión actual?' : `¿Cerrar sesión en ${s?.device_name}?`)) return;
    try {
      await revokeSession(id);
      if (s?.is_current) { await logout(); navigate('/login'); }
      else { setSesiones(prev => prev.filter(x => x.id !== id)); mostrarToast('Sesión cerrada', 'ok'); }
    } catch (e: any) { mostrarToast(e.message, 'err'); }
  };

  const handleCerrarOtras = async () => {
    if (!window.confirm('¿Cerrar sesión en todos los otros dispositivos?')) return;
    try {
      const r = await revokeAllOtherSessions();
      await cargarSesiones();
      mostrarToast(`${r.revokedCount} sesiones cerradas`, 'ok');
    } catch (e: any) { mostrarToast(e.message, 'err'); }
  };

  const handleCerrarTodas = async () => {
    if (!window.confirm('¿Cerrar sesión en TODOS los dispositivos incluyendo este?')) return;
    try {
      await revokeAllSessions();
      navigate('/login');
    } catch (e: any) { mostrarToast(e.message, 'err'); }
  };

  const formatFecha = (f: string) => {
    const diff = Date.now() - new Date(f).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return 'Hace unos segundos';
    if (m < 60) return `Hace ${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `Hace ${h}h`;
    return `Hace ${Math.floor(h / 24)} días`;
  };

  const inicial = user?.nombre?.charAt(0).toUpperCase() || 'U';

  return (
    <div className="pf-container">

      {/* Toast */}
      {toast && <div className={`pf-toast pf-toast--${toast.tipo}`}>{toast.msg}</div>}

      {/* Header tarjeta usuario */}
      <div className="pf-hero">
        <div className="pf-hero-avatar-wrap" onClick={() => !subiendoFoto && fotoInputRef.current?.click()} title="Cambiar foto de perfil">
          {fotoUrl ? <img src={fotoUrl} alt="Foto de perfil" className="pf-hero-avatar-img" /> : <div className="pf-hero-avatar">{inicial}</div>}
          <div className="pf-hero-avatar-overlay">{subiendoFoto ? '...' : 'Cambiar'}</div>
          <input ref={fotoInputRef} type="file" accept="image/*" hidden onChange={handleSubirFoto} />
        </div>
        <div className="pf-hero-info">
          <h1 className="pf-hero-name">{user?.nombre}</h1>
          <p className="pf-hero-email">{user?.email}</p>
          <span className="pf-hero-role">
            {userRole === 'admin' ? 'Administrador' : userRole === 'trabajador' ? 'Trabajador' : 'Cliente'}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="pf-tabs">
        <button className={`pf-tab${tab === 'info' ? ' pf-tab--active' : ''}`} onClick={() => setTab('info')}>
          {isCliente ? 'Mis datos' : 'Mi cuenta'}
        </button>
        <button className={`pf-tab${tab === 'seguridad' ? ' pf-tab--active' : ''}`} onClick={() => setTab('seguridad')}>
          Seguridad
        </button>
        <button className={`pf-tab${tab === 'sesiones' ? ' pf-tab--active' : ''}`} onClick={() => setTab('sesiones')}>
          Sesiones
        </button>
      </div>

      {/* ── TAB: INFO ── */}
      {tab === 'info' && (
        <div className="pf-section">
          {isCliente ? (
            <>
              <h2 className="pf-section-title">Datos personales</h2>
              <p className="pf-section-sub">Puedes editar tu nombre y teléfono. El email no se puede cambiar.</p>

              {loadingPerfil ? (
                <p className="pf-loading">Cargando datos...</p>
              ) : (
                <div className="pf-form">
                  <div className="pf-field">
                    <label>Nombre completo</label>
                    <input
                      type="text"
                      value={perfil.nombre}
                      onChange={e => setPerfil(p => ({ ...p, nombre: e.target.value }))}
                      placeholder="Tu nombre"
                    />
                  </div>
                  <div className="pf-field">
                    <label>Teléfono</label>
                    <input
                      type="tel"
                      value={perfil.telefono}
                      onChange={e => setPerfil(p => ({ ...p, telefono: e.target.value }))}
                      placeholder="Ej: 771 123 4567"
                    />
                  </div>
                  <div className="pf-field pf-field--locked">
                    <label>Correo electrónico <span className="pf-locked-badge">No editable</span></label>
                    <input type="email" value={user?.email || ''} disabled />
                  </div>
                  <button className="pf-btn-save" onClick={handleGuardarPerfil} disabled={savingPerfil}>
                    {savingPerfil ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <h2 className="pf-section-title">Mi cuenta</h2>
              <p className="pf-section-sub">La información de tu cuenta es gestionada por el administrador.</p>
              <div className="pf-form">
                <div className="pf-field pf-field--locked">
                  <label>Nombre <span className="pf-locked-badge">Solo lectura</span></label>
                  <input type="text" value={user?.nombre || ''} disabled />
                </div>
                <div className="pf-field pf-field--locked">
                  <label>Correo electrónico <span className="pf-locked-badge">Solo lectura</span></label>
                  <input type="email" value={user?.email || ''} disabled />
                </div>

                {/* Código de trabajador */}
                {codigoTrabajador && (
                  <div className="pf-codigo-trabajador">
                    <div className="pf-codigo-header">
                      <span className="pf-codigo-label">Tu código de trabajador</span>
                      <button className="pf-codigo-toggle" onClick={() => setShowCodigo(p => !p)}>
                        {showCodigo ? 'Ocultar' : 'Mostrar'}
                      </button>
                    </div>
                    <div className="pf-codigo-value">
                      {showCodigo ? codigoTrabajador : '• • • • • •'}
                    </div>
                    <p className="pf-codigo-aviso">
                      Necesitarás este código cada vez que inicies sesión.
                    </p>
                    <button
                      className="pf-btn-recuperar-codigo"
                      onClick={handleSolicitarRecuperacionCodigo}
                      disabled={solicitandoCodigo}
                    >
                      {solicitandoCodigo ? 'Enviando solicitud…' : '¿Olvidaste tu código? Solicitar nuevo'}
                    </button>
                  </div>
                )}

                {/* Botón solicitar cambio de nombre */}
                {!showSolicitud ? (
                  <button className="pf-btn-solicitar" onClick={() => setShowSolicitud(true)}>
                    Solicitar cambio de nombre
                  </button>
                ) : (
                  <div className="pf-solicitud-form">
                    <p className="pf-solicitud-info">El administrador revisará tu solicitud y aplicará el cambio si lo aprueba.</p>
                    <div className="pf-field">
                      <label>Nombre que deseas</label>
                      <input
                        type="text"
                        value={solicitudNombre}
                        onChange={e => setSolicitudNombre(e.target.value)}
                        placeholder="Escribe tu nuevo nombre"
                        autoFocus
                      />
                    </div>
                    <div className="pf-solicitud-btns">
                      <button className="pf-btn-secondary" onClick={() => { setShowSolicitud(false); setSolicitudNombre(''); }}>
                        Cancelar
                      </button>
                      <button className="pf-btn-save" onClick={handleEnviarSolicitud} disabled={savingSolicitud}>
                        {savingSolicitud ? 'Enviando...' : 'Enviar solicitud'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Historial de solicitudes */}
                {misSolicitudes.length > 0 && (
                  <div className="pf-solicitudes-historial">
                    <div className="pf-solicitudes-header">
                      <p className="pf-solicitudes-titulo">Mis solicitudes</p>
                      <div className="pf-filtros-sol">
                        {(['todas', 'pendiente', 'aprobada', 'rechazada'] as const).map(f => (
                          <button
                            key={f}
                            className={`pf-filtro-btn${filtroSolicitud === f ? ' pf-filtro-btn--active' : ''}`}
                            onClick={() => setFiltroSolicitud(f)}
                          >
                            {f === 'todas' ? 'Todas' : f.charAt(0).toUpperCase() + f.slice(1)}
                            {f !== 'todas' && (
                              <span className="pf-filtro-count">
                                {misSolicitudes.filter(s => s.estado === f).length}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                    {misSolicitudes
                      .filter(s => filtroSolicitud === 'todas' || s.estado === filtroSolicitud)
                      .map(s => (
                        <div key={s.id} className="pf-solicitud-item">
                          <span className="pf-solicitud-campo">Nombre → <strong>{s.valor_nuevo}</strong></span>
                          <div className="pf-solicitud-right">
                            <span className={`pf-solicitud-estado pf-solicitud-estado--${s.estado}`}>
                              {s.estado === 'pendiente' ? 'Pendiente' : s.estado === 'aprobada' ? 'Aprobada' : 'Rechazada'}
                            </span>
                            {s.estado !== 'pendiente' && (
                              <button
                                className="pf-btn-del-sol"
                                onClick={() => handleEliminarSolicitud(s.id)}
                                title="Eliminar"
                              >✕</button>
                            )}
                          </div>
                        </div>
                      ))
                    }
                    {misSolicitudes.filter(s => filtroSolicitud === 'todas' || s.estado === filtroSolicitud).length === 0 && (
                      <p className="pf-empty-sol">Sin solicitudes en este filtro.</p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── TAB: SEGURIDAD ── */}
      {tab === 'seguridad' && (
        <div className="pf-section">
          {/* Cambiar contraseña */}
          <h2 className="pf-section-title">Cambiar contraseña</h2>
          <p className="pf-section-sub">Usa una contraseña segura de al menos 6 caracteres.</p>
          <div className="pf-form">
            {(['actual', 'nueva', 'confirmar'] as const).map((campo) => (
              <div className="pf-field pf-field--pass" key={campo}>
                <label>
                  {campo === 'actual' ? 'Contraseña actual' : campo === 'nueva' ? 'Nueva contraseña' : 'Confirmar nueva contraseña'}
                </label>
                <div className="pf-pass-wrap">
                  <input
                    type={showPass[campo] ? 'text' : 'password'}
                    value={passForm[campo]}
                    onChange={e => setPassForm(p => ({ ...p, [campo]: e.target.value }))}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="pf-pass-eye"
                    onClick={() => setShowPass(p => ({ ...p, [campo]: !p[campo] }))}
                  >
                    {showPass[campo] ? <AiOutlineEyeInvisible size={16} /> : <AiOutlineEye size={16} />}
                  </button>
                </div>
              </div>
            ))}
            <button className="pf-btn-save" onClick={handleCambiarPassword} disabled={savingPass}>
              {savingPass ? 'Actualizando...' : 'Actualizar contraseña'}
            </button>
          </div>

          {/* MFA */}
          <div className="pf-divider" />
          <h2 className="pf-section-title">Autenticación en dos pasos</h2>
          <div className="pf-mfa-card">
            <div className="pf-mfa-info">
              <span className={`pf-mfa-badge${mfaStatus.mfaEnabled ? ' pf-mfa-badge--on' : ' pf-mfa-badge--off'}`}>
                {mfaStatus.mfaEnabled ? 'Activada' : 'No activada'}
              </span>
              <p>{mfaStatus.mfaEnabled
                ? 'Tu cuenta está protegida con autenticación en dos pasos.'
                : 'Añade una capa extra de seguridad a tu cuenta.'}</p>
            </div>
            <div>
              {mfaStatus.mfaEnabled ? (
                <button className="pf-btn-danger" onClick={handleDesactivarMFA} disabled={cargandoMFA}>
                  {cargandoMFA ? 'Desactivando...' : 'Desactivar MFA'}
                </button>
              ) : (
                <button className="pf-btn-save" onClick={() => navigate('/mfa-setup')}>
                  Activar MFA
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: SESIONES ── */}
      {tab === 'sesiones' && (
        <div className="pf-section">
          <div className="pf-section-header-row">
            <div>
              <h2 className="pf-section-title">Sesiones activas</h2>
              <p className="pf-section-sub">Dispositivos donde tienes sesión iniciada.</p>
            </div>
            <button className="pf-btn-refresh" onClick={cargarSesiones} disabled={cargandoSes}>
              <AiOutlineReload size={14} /> Actualizar
            </button>
          </div>

          {cargandoSes ? (
            <p className="pf-loading">Cargando sesiones...</p>
          ) : sesiones.length === 0 ? (
            <p className="pf-empty">No hay sesiones activas.</p>
          ) : (
            <div className="pf-sesiones-list">
              {sesiones.map(s => (
                <div key={s.id} className={`pf-sesion${s.is_current ? ' pf-sesion--actual' : ''}`}>
                  <div className="pf-sesion-icon"><AiOutlineDesktop size={20} /></div>
                  <div className="pf-sesion-info">
                    <span className="pf-sesion-device">{s.device_name}</span>
                    <span className="pf-sesion-meta">{s.location} · {formatFecha(s.last_activity)}</span>
                    <span className="pf-sesion-ip">IP: {s.ip_address}</span>
                  </div>
                  <div className="pf-sesion-right">
                    {s.is_current && <span className="pf-sesion-actual-badge">Este dispositivo</span>}
                    {!s.is_current && (
                      <button className="pf-btn-cerrar-ses" onClick={() => handleCerrarSesion(s.id)}>
                        Cerrar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pf-sesiones-actions">
            <button
              className="pf-btn-secondary"
              onClick={handleCerrarOtras}
              disabled={sesiones.filter(s => !s.is_current).length === 0}
            >
              Cerrar otras sesiones
            </button>
            <button className="pf-btn-danger" onClick={handleCerrarTodas}>
              Cerrar todas las sesiones
            </button>
          </div>
          <p className="pf-sesiones-note">
            Al cerrar otras sesiones, esos dispositivos serán desconectados en los próximos 15 segundos.
          </p>
        </div>
      )}
    </div>
  );
}
