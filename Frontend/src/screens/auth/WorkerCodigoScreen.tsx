import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { workerAuthAPI, solicitudesAPI } from '../../services/api';
import './WorkerAuth.css';

type Vista = 'codigo' | 'recuperar' | 'recuperar-ok';

export default function WorkerCodigoScreen() {
  const navigate = useNavigate();
  const { setAuthData } = useAuth();
  const [vista, setVista] = useState<Vista>('codigo');
  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = sessionStorage.getItem('worker_pre_auth_token');
    if (!token) navigate('/login');
    else inputRef.current?.focus();
  }, [navigate]);

  const handleVerificar = async () => {
    if (!codigo.trim()) { setError('Ingresa tu código de acceso'); return; }
    setLoading(true); setError('');
    try {
      const preAuthToken = sessionStorage.getItem('worker_pre_auth_token') || '';
      const res = await workerAuthAPI.verificarCodigo(preAuthToken, codigo.trim().toUpperCase());
      if (res.success) {
        sessionStorage.removeItem('worker_pre_auth_token');
        setAuthData(res.data);
        navigate('/dashboard-trabajador');
      } else {
        setError(res.message || 'Código incorrecto');
      }
    } catch (e: any) {
      setError(e.message || 'Error al verificar el código');
    } finally { setLoading(false); }
  };

  const handleSolicitarRecuperacion = async () => {
    setLoading(true); setError('');
    try {
      const preAuthToken = sessionStorage.getItem('worker_pre_auth_token') || '';
      const res = await solicitudesAPI.recuperarCodigoSinSesion(preAuthToken);
      if (res.success) {
        setVista('recuperar-ok');
      } else {
        setError(res.message || 'Error al enviar solicitud');
      }
    } catch (e: any) {
      setError(e.message || 'Error de conexión');
    } finally { setLoading(false); }
  };

  // ── VISTA: SOLICITUD ENVIADA ──
  if (vista === 'recuperar-ok') {
    return (
      <div className="wauth-wrapper">
        <div className="wauth-card">
          <div className="wauth-icon wauth-icon--ok">✓</div>
          <h1 className="wauth-title">Solicitud enviada</h1>
          <p className="wauth-sub">
            Tu solicitud de recuperación fue enviada al administrador.<br />
            Una vez que la apruebe, tu nuevo código estará listo.
          </p>
          <div className="wauth-recuperar-pasos">
            <div className="wauth-paso">
              <span className="wauth-paso-n">1</span>
              El administrador verá tu solicitud en su panel
            </div>
            <div className="wauth-paso">
              <span className="wauth-paso-n">2</span>
              Al aprobarla se generará un nuevo código de 6 caracteres
            </div>
            <div className="wauth-paso">
              <span className="wauth-paso-n">3</span>
              Vuelve a iniciar sesión e ingresa el nuevo código
            </div>
          </div>
          <button className="wauth-btn-ghost" onClick={() => navigate('/login')}>
            Volver al inicio de sesión
          </button>
        </div>
      </div>
    );
  }

  // ── VISTA: CONFIRMAR RECUPERACIÓN ──
  if (vista === 'recuperar') {
    return (
      <div className="wauth-wrapper">
        <div className="wauth-card">
          <div className="wauth-icon">🔑</div>
          <h1 className="wauth-title">Recuperar código</h1>
          <p className="wauth-sub">
            Se enviará una solicitud al administrador para que regenere tu código de acceso.
            El administrador deberá aprobarla manualmente.
          </p>
          {error && <span className="wauth-error" style={{ textAlign: 'center' }}>{error}</span>}
          <button className="wauth-btn-primary" onClick={handleSolicitarRecuperacion} disabled={loading}>
            {loading ? 'Enviando solicitud…' : 'Enviar solicitud al administrador'}
          </button>
          <button className="wauth-btn-ghost" onClick={() => { setVista('codigo'); setError(''); }}>
            Volver — ya recuerdo mi código
          </button>
        </div>
      </div>
    );
  }

  // ── VISTA: INGRESAR CÓDIGO ──
  return (
    <div className="wauth-wrapper">
      <div className="wauth-card">
        <div className="wauth-icon">🛡️</div>
        <h1 className="wauth-title">Verificación de acceso</h1>
        <p className="wauth-sub">
          Ingresa tu código de acceso de 6 caracteres para continuar.
        </p>

        <div className="wauth-field">
          <label className="wauth-label">Código de acceso</label>
          <input
            ref={inputRef}
            className={`wauth-input wauth-input--code${error ? ' wauth-input--error' : ''}`}
            type="text"
            value={codigo}
            onChange={e => { setCodigo(e.target.value.toUpperCase()); setError(''); }}
            placeholder="XXXXXX"
            maxLength={6}
            onKeyDown={e => e.key === 'Enter' && handleVerificar()}
            autoComplete="off"
          />
          {error && <span className="wauth-error">{error}</span>}
        </div>

        <button className="wauth-btn-primary" onClick={handleVerificar} disabled={loading}>
          {loading ? 'Verificando...' : 'Ingresar'}
        </button>

        <button className="wauth-btn-recuperar" onClick={() => { setVista('recuperar'); setError(''); }}>
          ¿Olvidaste tu código? Solicitar recuperación
        </button>

        <button className="wauth-btn-ghost" onClick={() => navigate('/login')}>
          Volver al inicio de sesión
        </button>
      </div>
    </div>
  );
}
