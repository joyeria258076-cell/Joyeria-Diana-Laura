// En Joyeria-Diana-Laura/Frontend/src/screens/MFAVerifyScreen.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authAPI } from '../services/api';
import "../styles/MFAVerifyScreen.css";

export default function MFAVerifyScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  
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
      console.log('📧 Datos MFA recibidos:', { userId: location.state.userId, email: location.state.email });
    } else {
      console.log('❌ No hay datos de navegación, redirigiendo al login');
      navigate('/login');
    }
  }, [location, navigate]);

  const handleVerifyMFA = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!mfaCode || mfaCode.length !== 6) {
      setError('Por favor ingresa un código de 6 dígitos');
      return;
    }

    if (!userId) {
      setError('Error: No se pudo identificar el usuario');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('🔐 Verificando código MFA para usuario:', userId);
      
      const response = await authAPI.verifyLoginMFA(userId, mfaCode);
      
      if (response.success && response.verified) {
        console.log('✅ MFA verificado correctamente');
        
        // 🆕 CORRECCIÓN: MANEJAR LA RESPUESTA COMPLETA
        if (response.data) {
          console.log('✅ Datos de sesión recibidos:', response.data);
          
          const userData = response.data.user;
          const token = response.data.token;
          const sessionToken = response.data.sessionToken;
          
          // 🆕 GUARDAR DIRECTAMENTE EN LOCALSTORAGE
          const userWithToken = {
            ...userData,
            token: token
          };
          
          localStorage.setItem('diana_laura_user', JSON.stringify(userWithToken));
          localStorage.setItem('diana_laura_session_token', sessionToken);
          
          console.log('✅ Usuario guardado en localStorage:', userData.email);
          
          // 🆕 FORZAR REDIRECCIÓN CON TIMEOUT
          setTimeout(() => {
            console.log('🔄 Redirigiendo a /inicio...');
            window.location.href = '/inicio'; // 🆕 USAR window.location PARA FORZAR
          }, 100);
          
        } else {
          console.error('❌ No hay datos de sesión en la respuesta');
          setError('Error: No se recibieron datos de sesión. Intenta nuevamente.');
        }
      } else {
        setError(response.message || 'Código MFA inválido');
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
          <p className="user-email">Usuario: <strong>{email}</strong></p>
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
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setMfaCode(value);
                setError('');
              }}
              placeholder="123456"
              maxLength={6}
              disabled={loading}
              autoComplete="one-time-code"
              autoFocus
              className="mfa-code-input"
            />
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
          <p><strong>¿Problemas?</strong></p>
          <ul>
            <li>Asegúrate de que la hora de tu dispositivo sea correcta</li>
            <li>El código cambia cada 30 segundos</li>
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