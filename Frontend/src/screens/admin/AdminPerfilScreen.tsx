import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { profileAPI, solicitudesAPI, workerAuthAPI, workersAPI, uploadAPI } from '../../services/api';
import './AdminPerfilScreen.css';

export default function AdminPerfilScreen() {
  const { user, refreshUserName, refreshUserFoto } = useAuth();

  const [perfil, setPerfil]       = useState({ nombre: '', telefono: '' });
  const [fotoUrl, setFotoUrl]     = useState<string | null>(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const fotoInputRef              = useRef<HTMLInputElement>(null);
  const [loadingP, setLoadingP]   = useState(false);
  const [savingP, setSavingP]     = useState(false);
  const [codigoAcceso, setCodigoAcceso] = useState('');
  const [showCodigo, setShowCodigo]     = useState(false);

  const [passForm, setPassForm]   = useState({ actual: '', nueva: '', confirmar: '' });
  const [savingPw, setSavingPw]   = useState(false);
  const [showPw, setShowPw]       = useState({ actual: false, nueva: false, confirmar: false });

  const [emailForm, setEmailForm] = useState({ emailNuevo: '', passwordConfirm: '' });
  const [savingEmail, setSavingEmail] = useState(false);
  const [showEmailPw, setShowEmailPw] = useState(false);

  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [loadingS, setLoadingS]   = useState(false);
  const [filtroS, setFiltroS]     = useState<'todas' | 'pendiente' | 'aprobada' | 'rechazada'>('todas');

  const [trabajadores, setTrabajadores] = useState<any[]>([]);
  const [codigoGenerado, setCodigoGenerado] = useState<{ userId: number; codigo: string } | null>(null);

  const [toast, setToast]         = useState<{ msg: string; tipo: 'ok' | 'err' } | null>(null);
  const toastTimer                = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    cargarPerfil();
    cargarSolicitudes();
    cargarTrabajadores();
  }, []);

  const mostrarToast = (msg: string, tipo: 'ok' | 'err') => {
    clearTimeout(toastTimer.current);
    setToast({ msg, tipo });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };

  const cargarPerfil = async () => {
    setLoadingP(true);
    try {
      const res = await profileAPI.getProfile();
      if (res.success) {
        setPerfil({ nombre: res.data.nombre || '', telefono: res.data.telefono || '' });
        if (res.data.codigo_trabajador) setCodigoAcceso(res.data.codigo_trabajador);
        setFotoUrl(res.data.foto_perfil_url || null);
      }
    } catch { setPerfil({ nombre: user?.nombre || '', telefono: '' }); }
    finally { setLoadingP(false); }
  };

  const cargarTrabajadores = async () => {
    try {
      const res = await workersAPI.getAll();
      if (res.success) {
        const filtrados = (res.data || []).filter((u: any) => u.codigo_trabajador && u.email !== user?.email);
        setTrabajadores(filtrados);
      }
    } catch (err) { console.error('ERROR cargarTrabajadores:', err); }
  };

  const handleRegenerarCodigo = async (userId: number, nombre: string) => {
    if (!window.confirm(`¿Generar un nuevo código de trabajador para ${nombre}? El anterior quedará inválido.`)) return;
    try {
      const res = await workerAuthAPI.regenerarCodigo(userId);
      if (res.success) {
        setCodigoGenerado({ userId, codigo: res.data.codigoTrabajador });
        mostrarToast(`Código regenerado para ${nombre}`, 'ok');
      } else { mostrarToast(res.message || 'Error al regenerar', 'err'); }
    } catch (e: any) { mostrarToast(e.message, 'err'); }
  };

  const cargarSolicitudes = async () => {
    setLoadingS(true);
    try {
      const res = await solicitudesAPI.getTodas();
      setSolicitudes(Array.isArray(res?.data) ? res.data : []);
    } catch { /**/ }
    finally { setLoadingS(false); }
  };

  const handleGuardarPerfil = async () => {
    if (!perfil.nombre.trim()) { mostrarToast('El nombre es obligatorio', 'err'); return; }
    setSavingP(true);
    try {
      const res = await profileAPI.updateProfile({ nombre: perfil.nombre, telefono: perfil.telefono });
      if (res.success) { refreshUserName(perfil.nombre); mostrarToast('Perfil actualizado', 'ok'); }
      else mostrarToast(res.message || 'Error', 'err');
    } catch (e: any) { mostrarToast(e.message, 'err'); }
    finally { setSavingP(false); }
  };

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

  const handleCambiarPassword = async () => {
    if (!passForm.actual)              { mostrarToast('Ingresa tu contraseña actual', 'err'); return; }
    if (passForm.nueva.length < 6)    { mostrarToast('Mínimo 6 caracteres', 'err'); return; }
    if (passForm.nueva !== passForm.confirmar) { mostrarToast('Las contraseñas no coinciden', 'err'); return; }
    setSavingPw(true);
    try {
      const res = await profileAPI.changePassword({ passwordActual: passForm.actual, passwordNueva: passForm.nueva });
      if (res.success) { setPassForm({ actual: '', nueva: '', confirmar: '' }); mostrarToast('Contraseña actualizada', 'ok'); }
      else mostrarToast(res.message || 'Error', 'err');
    } catch (e: any) { mostrarToast(e.message, 'err'); }
    finally { setSavingPw(false); }
  };

  const handleAprobar = async (id: number) => {
    try {
      const res = await solicitudesAPI.aprobar(id);
      if (res.success) { mostrarToast('Solicitud aprobada', 'ok'); cargarSolicitudes(); }
      else mostrarToast(res.message, 'err');
    } catch (e: any) { mostrarToast(e.message, 'err'); }
  };

  const handleCambiarEmail = async () => {
    if (!emailForm.emailNuevo.trim()) { mostrarToast('Ingresa el nuevo email', 'err'); return; }
    if (!emailForm.passwordConfirm)   { mostrarToast('Confirma tu contraseña', 'err'); return; }
    setSavingEmail(true);
    try {
      const res = await profileAPI.changeEmail({ emailNuevo: emailForm.emailNuevo.trim(), passwordConfirm: emailForm.passwordConfirm });
      if (res.success) {
        mostrarToast('Email actualizado correctamente', 'ok');
        setEmailForm({ emailNuevo: '', passwordConfirm: '' });
        cargarPerfil();
      } else { mostrarToast(res.message || 'Error al actualizar email', 'err'); }
    } catch (e: any) { mostrarToast(e.message, 'err'); }
    finally { setSavingEmail(false); }
  };

  const handleEliminar = async (id: number) => {
    if (!window.confirm('¿Eliminar esta solicitud del historial?')) return;
    try {
      const res = await solicitudesAPI.eliminar(id);
      if (res.success) { mostrarToast('Solicitud eliminada', 'ok'); setSolicitudes(prev => prev.filter(s => s.id !== id)); }
      else mostrarToast(res.message, 'err');
    } catch (e: any) { mostrarToast(e.message, 'err'); }
  };

  const handleRechazar = async (id: number) => {
    if (!window.confirm('¿Rechazar esta solicitud?')) return;
    try {
      const res = await solicitudesAPI.rechazar(id);
      if (res.success) { mostrarToast('Solicitud rechazada', 'ok'); cargarSolicitudes(); }
      else mostrarToast(res.message, 'err');
    } catch (e: any) { mostrarToast(e.message, 'err'); }
  };

  const pendientes = solicitudes.filter(s => s.estado === 'pendiente');
  const solicitudesFiltradas = filtroS === 'todas' ? solicitudes : solicitudes.filter(s => s.estado === filtroS);
  const inicial = user?.nombre?.charAt(0).toUpperCase() || 'A';

  return (
    <div className="apf-container">
      {toast && <div className={`apf-toast apf-toast--${toast.tipo}`}>{toast.msg}</div>}

      {/* Hero */}
      <div className="apf-hero">
        <div className="apf-avatar-wrap" onClick={() => !subiendoFoto && fotoInputRef.current?.click()} title="Cambiar foto de perfil">
          {fotoUrl ? <img src={fotoUrl} alt="Foto de perfil" className="apf-avatar-img" /> : <div className="apf-avatar">{inicial}</div>}
          <div className="apf-avatar-overlay">{subiendoFoto ? '...' : 'Cambiar'}</div>
          <input ref={fotoInputRef} type="file" accept="image/*" hidden onChange={handleSubirFoto} />
        </div>
        <div className="apf-hero-info">
          <h1 className="apf-hero-name">{user?.nombre}</h1>
          <p className="apf-hero-email">{user?.email}</p>
          <span className="apf-hero-role">Administrador</span>
        </div>
      </div>

      <div className="apf-grid">

        {/* Datos personales */}
        <div className="apf-card">
          <h2 className="apf-card-title">Datos personales</h2>
          <p className="apf-card-sub">El email no se puede cambiar.</p>
          {loadingP ? <p className="apf-loading">Cargando...</p> : (
            <div className="apf-form">
              <div className="apf-field">
                <label>Nombre completo</label>
                <input type="text" value={perfil.nombre}
                  onChange={e => setPerfil(p => ({ ...p, nombre: e.target.value }))} placeholder="Tu nombre" />
              </div>
              <div className="apf-field">
                <label>Teléfono</label>
                <input type="tel" value={perfil.telefono}
                  onChange={e => setPerfil(p => ({ ...p, telefono: e.target.value }))} placeholder="771 123 4567" />
              </div>
              <div className="apf-field apf-field--locked">
                <label>Correo electrónico <span className="apf-locked-badge">No editable</span></label>
                <input type="email" value={user?.email || ''} disabled />
              </div>
              {codigoAcceso && (
                <div className="apf-codigo-acceso">
                  <div className="apf-codigo-header">
                    <span className="apf-codigo-label">Tu código de acceso</span>
                    <button className="apf-codigo-toggle" onClick={() => setShowCodigo(p => !p)}>
                      {showCodigo ? 'Ocultar' : 'Mostrar'}
                    </button>
                  </div>
                  <div className="apf-codigo-value">
                    {showCodigo ? codigoAcceso : '• • • • • •'}
                  </div>
                  <p className="apf-codigo-aviso">
                    Lo necesitas cada vez que inicias sesión. Si lo pierdes contacta al administrador principal.
                  </p>
                </div>
              )}
              <button className="apf-btn-save" onClick={handleGuardarPerfil} disabled={savingP}>
                {savingP ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          )}
        </div>

        {/* Cambiar contraseña */}
        <div className="apf-card">
          <h2 className="apf-card-title">Cambiar contraseña</h2>
          <p className="apf-card-sub">Mínimo 6 caracteres.</p>
          <div className="apf-form">
            {(['actual', 'nueva', 'confirmar'] as const).map(campo => (
              <div className="apf-field" key={campo}>
                <label>{campo === 'actual' ? 'Contraseña actual' : campo === 'nueva' ? 'Nueva contraseña' : 'Confirmar nueva'}</label>
                <div className="apf-pass-wrap">
                  <input
                    type={showPw[campo] ? 'text' : 'password'}
                    value={passForm[campo]}
                    onChange={e => setPassForm(p => ({ ...p, [campo]: e.target.value }))}
                    placeholder="••••••••"
                  />
                  <button type="button" className="apf-pass-eye"
                    onClick={() => setShowPw(p => ({ ...p, [campo]: !p[campo] }))}>
                    {showPw[campo] ? '🙈' : '👁'}
                  </button>
                </div>
              </div>
            ))}
            <button className="apf-btn-save" onClick={handleCambiarPassword} disabled={savingPw}>
              {savingPw ? 'Actualizando...' : 'Actualizar contraseña'}
            </button>
          </div>
        </div>
        {/* Cambiar email */}
        <div className="apf-card apf-card--full">
          <h2 className="apf-card-title">Cambiar correo electrónico</h2>
          <p className="apf-card-sub">Como administrador puedes actualizar tu email. Se requiere confirmar tu contraseña.</p>
          <div className="apf-form apf-form--email">
            <div className="apf-field">
              <label>Nuevo correo electrónico</label>
              <input
                type="email"
                value={emailForm.emailNuevo}
                onChange={e => setEmailForm(f => ({ ...f, emailNuevo: e.target.value }))}
                placeholder={user?.email || 'nuevo@correo.com'}
              />
            </div>
            <div className="apf-field">
              <label>Confirmar con tu contraseña</label>
              <div className="apf-pass-wrap">
                <input
                  type={showEmailPw ? 'text' : 'password'}
                  value={emailForm.passwordConfirm}
                  onChange={e => setEmailForm(f => ({ ...f, passwordConfirm: e.target.value }))}
                  placeholder="••••••••"
                />
                <button type="button" className="apf-pass-eye" onClick={() => setShowEmailPw(p => !p)}>
                  {showEmailPw ? '🙈' : '👁'}
                </button>
              </div>
            </div>
            <button className="apf-btn-save" onClick={handleCambiarEmail} disabled={savingEmail}>
              {savingEmail ? 'Actualizando...' : 'Actualizar email'}
            </button>
          </div>
        </div>
      </div>

      {/* Códigos de trabajadores */}
      <div className="apf-card apf-card--full">
        <h2 className="apf-card-title">Códigos de trabajadores</h2>
        <p className="apf-card-sub">Puedes regenerar el código de acceso de cualquier trabajador. El código anterior quedará inválido.</p>
        {trabajadores.length === 0 ? (
          <p className="apf-empty">No hay trabajadores registrados.</p>
        ) : (
          <div className="apf-solicitudes-list">
            {trabajadores.map(t => (
              <div key={t.id} className="apf-solicitud-row">
                <div className="apf-sol-info">
                  <span className="apf-sol-nuevo">{t.nombre}</span>
                  <span className="apf-sol-email">{t.email}</span>
                  {!t.activado && (
                    <span className="apf-sol-estado apf-sol-estado--pendiente">Sin activar</span>
                  )}
                </div>
                <div className="apf-sol-right">
                  {codigoGenerado?.userId === t.id && (
                    <span className="apf-codigo-nuevo">Nuevo código: <strong>{codigoGenerado.codigo}</strong></span>
                  )}
                  <button
                    className="apf-btn-rechazar"
                    onClick={() => handleRegenerarCodigo(t.id, t.nombre)}
                  >
                    Regenerar código
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Solicitudes de cambio */}
      <div className="apf-card apf-card--full">
        <div className="apf-solicitudes-header">
          <div>
            <h2 className="apf-card-title">Solicitudes de cambio</h2>
            <p className="apf-card-sub">Cambios de nombre solicitados por los trabajadores.</p>
          </div>
          <div className="apf-stats">
            <span className="apf-stat-pill apf-stat-pill--pend">{pendientes.length} pendientes</span>
            <span className="apf-stat-pill apf-stat-pill--total">{solicitudes.length} total</span>
          </div>
        </div>

        {/* Filtros */}
        <div className="apf-filtros">
          {(['todas', 'pendiente', 'aprobada', 'rechazada'] as const).map(f => (
            <button
              key={f}
              className={`apf-filtro-btn${filtroS === f ? ' apf-filtro-btn--active' : ''}`}
              onClick={() => setFiltroS(f)}
            >
              {f === 'todas' ? 'Todas' : f.charAt(0).toUpperCase() + f.slice(1)}
              {f !== 'todas' && (
                <span className="apf-filtro-count">{solicitudes.filter(s => s.estado === f).length}</span>
              )}
            </button>
          ))}
        </div>

        {loadingS ? (
          <p className="apf-loading">Cargando solicitudes...</p>
        ) : solicitudes.length === 0 ? (
          <p className="apf-empty">No hay solicitudes registradas.</p>
        ) : solicitudesFiltradas.length === 0 ? (
          <p className="apf-empty">Sin solicitudes en este filtro.</p>
        ) : (
          <div className="apf-solicitudes-list">
            {solicitudesFiltradas.map(s => (
              <div key={s.id} className={`apf-solicitud-row ${s.campo === 'recuperar_codigo' ? 'apf-solicitud-row--codigo' : ''}`}>
                <div className="apf-sol-info">
                  {s.campo === 'recuperar_codigo' ? (
                    <>
                      <span className="apf-sol-tipo-badge">🔑 Recuperación de código</span>
                      <span className="apf-sol-nombre">{s.nombre_actual}</span>
                      <span className="apf-sol-email">{s.email}</span>
                      {s.estado === 'aprobada' && s.valor_nuevo && (
                        <span className="apf-sol-codigo-nuevo">Nuevo código: <strong>{s.valor_nuevo}</strong></span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="apf-sol-nombre">{s.nombre_actual}</span>
                      <span className="apf-sol-arrow">→</span>
                      <span className="apf-sol-nuevo">{s.valor_nuevo}</span>
                      <span className="apf-sol-email">{s.email}</span>
                    </>
                  )}
                </div>
                <div className="apf-sol-right">
                  <span className={`apf-sol-estado apf-sol-estado--${s.estado}`}>
                    {s.estado === 'pendiente' ? 'Pendiente' : s.estado === 'aprobada' ? 'Aprobada' : 'Rechazada'}
                  </span>
                  <div className="apf-sol-actions">
                    {s.estado === 'pendiente' && (
                      <>
                        <button className="apf-btn-aprobar" onClick={() => handleAprobar(s.id)}>Aprobar</button>
                        <button className="apf-btn-rechazar" onClick={() => handleRechazar(s.id)}>Rechazar</button>
                      </>
                    )}
                    <button className="apf-btn-del" onClick={() => handleEliminar(s.id)} title="Eliminar">✕</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
