// En Joyeria-Diana-Laura/Frontend/src/screens/MFAVerifyScreen.tsx - COMPLETO
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';
import "../styles/MFAVerifyScreen.css";

export default function MFAVerifyScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login } = useAuth(); // 🆕 AGREGAR login del contexto
  
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
        
        // 🆕 CORRECCIÓN: MANEJAR LA RESPUESTA COMPLETA DEL BACKEND
        if (response.data) {
          console.log('✅ Datos de sesión recibidos después de MFA');
          
          // 🆕 ACTUALIZAR EL CONTEXTO DE AUTENTICACIÓN
          const userData = response.data.user;
          const token = response.data.token;
          const sessionToken = response.data.sessionToken;
          
          const userWithToken = {
            ...userData,
            token: token
          };
          
          // 🆕 GUARDAR EN LOCALSTORAGE
          localStorage.setItem('diana_laura_user', JSON.stringify(userWithToken));
          localStorage.setItem('diana_laura_session_token', sessionToken);
          
          console.log('✅ Login completado después de MFA - redirigiendo a inicio');
          navigate('/inicio');
          
        } else {
          // 🆕 FALLBACK: Si no vienen datos de sesión, intentar login normal
          console.log('⚠️ No hay datos de sesión, intentando login normal...');
          try {
            await login(email, 'dummy_password'); // 🆕 Usar la función login del contexto
            navigate('/inicio');
          } catch (loginError: any) {
            console.error('❌ Error en login después de MFA:', loginError);
            setError('Error completando el login. Por favor, intenta iniciar sesión nuevamente.');
          }
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

  // 🆕 FUNCIÓN: Usar código de respaldo
  const handleUseBackupCode = () => {
    setError('Función de códigos de respaldo no implementada aún');
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
          
          <button 
            onClick={handleUseBackupCode}
            className="backup-code-button"
          >
            🔑 Usar código de respaldo
          </button>
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