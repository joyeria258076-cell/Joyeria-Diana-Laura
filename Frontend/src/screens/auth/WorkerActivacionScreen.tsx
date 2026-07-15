import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { workerAuthAPI } from '../../services/api';
import './WorkerAuth.css';

export default function WorkerActivacionScreen() {
  const navigate = useNavigate();
  const { setAuthData } = useAuth();
  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [codigoTrabajador, setCodigoTrabajador] = useState('');
  const [copiado, setCopiado] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = sessionStorage.getItem('worker_pre_auth_token');
    if (!token) navigate('/login');
    else inputRef.current?.focus();
  }, [navigate]);

  const handleActivar = async () => {
    if (!codigo.trim()) { setError('Ingresa el código de activación'); return; }
    setLoading(true);
    setError('');
    try {
      const preAuthToken = sessionStorage.getItem('worker_pre_auth_token') || '';
      const res = await workerAuthAPI.activar(preAuthToken, codigo.trim().toUpperCase());
      if (res.success) {
        sessionStorage.removeItem('worker_pre_auth_token');
        setCodigoTrabajador(res.data.codigoTrabajador);
        // Guardar sesión en AuthContext
        setAuthData(res.data);
      } else {
        setError(res.message || 'Código incorrecto');
      }
    } catch (e: any) {
      setError(e.message || 'Error al activar la cuenta');
    } finally {
      setLoading(false);
    }
  };

  const handleCopiar = () => {
    navigator.clipboard.writeText(codigoTrabajador);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const handleContinuar = () => navigate('/dashboard-trabajador');

  // ── PANTALLA: código de trabajador generado ──
  if (codigoTrabajador) {
    return (
      <div className="wauth-wrapper">
        <div className="wauth-card">
          <div className="wauth-icon wauth-icon--ok">✓</div>
          <h1 className="wauth-title">¡Cuenta activada!</h1>
          <p className="wauth-sub">
            Tu cuenta ha sido activada correctamente. Se te asignó el siguiente código de acceso.
            <strong> Guárdalo bien</strong> — lo necesitarás cada vez que inicies sesión.
          </p>

          <div className="wauth-codigo-display">
            <span className="wauth-codigo-label">Tu código de acceso permanente</span>
            <div className="wauth-codigo-value" style={{ letterSpacing: '0.2em' }}>{codigoTrabajador}</div>
            <button className="wauth-btn-copiar" onClick={handleCopiar}>
              {copiado ? '✓ Copiado' : 'Copiar'}
            </button>
          </div>

          <div className="wauth-aviso">
            <span className="wauth-aviso-icon">⚠</span>
            Este código también está disponible en tu perfil. Si lo pierdes, contacta al administrador para obtener uno nuevo.
          </div>

          <button className="wauth-btn-primary" onClick={handleContinuar}>
            Ir al panel de trabajo
          </button>
        </div>
      </div>
    );
  }

  // ── PANTALLA: ingresar código de activación ──
  return (
    <div className="wauth-wrapper">
      <div className="wauth-card">
        <div className="wauth-icon">🔑</div>
        <h1 className="wauth-title">Activar cuenta</h1>
        <p className="wauth-sub">
          El administrador te proporcionó un código de activación de 8 caracteres al crear tu cuenta. Ingrésalo aquí para activarla.
        </p>

        <div className="wauth-field">
          <label className="wauth-label">Código de activación</label>
          <input
            ref={inputRef}
            className={`wauth-input wauth-input--code${error ? ' wauth-input--error' : ''}`}
            type="text"
            value={codigo}
            onChange={e => { setCodigo(e.target.value.toUpperCase()); setError(''); }}
            placeholder="XXXXXXXX"
            maxLength={8}
            onKeyDown={e => e.key === 'Enter' && handleActivar()}
            autoComplete="off"
          />
          {error && <span className="wauth-error">{error}</span>}
        </div>

        <button className="wauth-btn-primary" onClick={handleActivar} disabled={loading}>
          {loading ? 'Verificando...' : 'Activar cuenta'}
        </button>

        <button className="wauth-btn-ghost" onClick={() => navigate('/login')}>
          Volver al inicio de sesión
        </button>
      </div>
    </div>
  );
}
