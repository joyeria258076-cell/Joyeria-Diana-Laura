import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';
import "../styles/MFAVerifyScreen.css";

export default function MFAVerifyScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login } = useAuth();
  
  const [mfaCode, setMfaCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState<number | null>(null);
  const [email, setEmail] = useState('');

  useEffect(() => {
    // Obtener datos de la navegación
    if (location.state) {
      setUserId(location.state.userId);
      setEmail(location.state.email);
    } else {
      // Si no hay datos, redirigir al login
      navigate('/login');
    }
  }, [location, navigate]);

// En MFAVerifyScreen.tsx - REEMPLAZAR la función handleVerifyMFA completa
const handleVerifyMFA = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!mfaCode || mfaCode.length !== 6) {
    setError('Por favor ingresa un código de 6 dígitos');
    return;
  }

  if (!userId || !email) {
    setError('Error: No se pudo identificar el usuario');
    return;
  }

  setLoading(true);
  setError('');

  try {
    console.log('🔐 Verificando código MFA para usuario:', userId);
    
    // 1. Primero verificar el código MFA
    const mfaResponse = await authAPI.verifyLoginMFA(userId, mfaCode);
    
    if (mfaResponse.success && mfaResponse.verified) {
      console.log('✅ MFA verificado correctamente');
      
      // 2. 🆕 CREAR UNA SESIÓN TEMPORAL O COMPLETAR EL LOGIN
      // Necesitamos que el backend cree una sesión después de MFA
      
      try {
        console.log('🔄 Creando sesión después de MFA...');
        
        // 🆕 LLAMAR A UN NUEVO ENDPOINT QUE COMPLETE EL LOGIN POST-MFA
        const loginResponse = await authAPI.completeLoginAfterMFA(userId, email);
        
        if (loginResponse.success) {
          console.log('✅ Sesión creada después de MFA');
          
          // 🆕 NAVEGAR AL INICIO
          navigate('/inicio');
        } else {
          throw new Error('Error creando sesión después de MFA');
        }
        
      } catch (loginError: any) {
        console.error('❌ Error completando login:', loginError);
        setError('Error completando el proceso de login. Intenta nuevamente.');
      }
      
    } else {
      setError('Código MFA inválido');
    }
  } catch (error: any) {
    console.error('❌ Error verificando MFA:', error);
    setError(error.message || 'Error verificando el código MFA');
  } finally {
    setLoading(false);
  }
};

  const handleBackToLogin = () => {
    navigate('/login');
  };

  if (!userId) {
    return (
      <div className="mfa-verify-container">
        <div className="mfa-verify-card">
          <h2>Cargando...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="mfa-verify-container">
      <div className="mfa-verify-card">
        <div className="mfa-header">
          <h1>🔒 Verificación en Dos Pasos</h1>
          <p>Para continuar, ingresa el código de tu aplicación authenticator</p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleVerifyMFA} className="mfa-form">
          <div className="form-group">
            <label htmlFor="mfaCode">Código de 6 dígitos</label>
            <input
              type="text"
              id="mfaCode"
              value={mfaCode}
              onChange={(e) => {
                // Permitir solo números y máximo 6 dígitos
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setMfaCode(value);
                setError('');
              }}
              placeholder="123456"
              maxLength={6}
              disabled={loading}
              autoComplete="one-time-code"
              autoFocus
            />
            <small>
              Abre tu aplicación authenticator (Google Authenticator, Authy, etc.) 
              y ingresa el código de 6 dígitos
            </small>
          </div>

          <button 
            type="submit" 
            className="verify-button"
            disabled={loading || mfaCode.length !== 6}
          >
            {loading ? 'Verificando...' : 'Verificar Código'}
          </button>
        </form>

        <div className="mfa-help">
          <h3>¿Problemas con tu código?</h3>
          <ul>
            <li>Asegúrate de que la hora de tu dispositivo sea correcta</li>
            <li>El código cambia cada 30 segundos</li>
            <li>Usa códigos de respaldo si los configuraste</li>
          </ul>
        </div>

        <button 
          onClick={handleBackToLogin}
          className="back-button"
          disabled={loading}
        >
          ← Volver al Login
        </button>
      </div>
    </div>
  );
}