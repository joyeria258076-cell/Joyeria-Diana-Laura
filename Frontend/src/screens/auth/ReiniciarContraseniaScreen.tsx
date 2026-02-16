// Ruta: Joyeria-Diana-Laura/Frontend/src/screens/ReiniciarContraseniaScreen.tsx
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import PublicHeader from '../../components/PublicHeader';
import PublicFooter from '../../components/PublicFooter';
import { authAPI } from '../../services/api';
import { getAuth, verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import './ReiniciarContraseniaScreen.css';

const ResetPasswordScreen: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [oobCode, setOobCode] = useState<string | null>(null);
  const [validCode, setValidCode] = useState(false);
  const [verifying, setVerifying] = useState(true);

  const validatePassword = (password: string): string | null => {
    if (password.length < 8 || password.length > 16) {
      return 'La contraseña debe tener entre 8 y 16 caracteres';
    }
    if (!/[A-Z]/.test(password)) {
      return 'La contraseña debe contener al menos una letra MAYÚSCULA (A-Z)';
    }
    if (!/[a-z]/.test(password)) {
      return 'La contraseña debe contener al menos una letra minúscula (a-z)';
    }
    if (!/\d/.test(password)) {
      return 'La contraseña debe contener al menos un número (0-9)';
    }
    if (/\s/.test(password)) {
      return 'La contraseña no puede contener espacios en blanco';
    }
    if (/[^a-zA-Z0-9]/.test(password)) {
      return 'La contraseña no puede contener símbolos especiales (#, @, $, %, etc.)';
    }
    return null;
  };

  useEffect(() => {
    const verifyResetCode = async () => {
      try {
        // 🎯 OBTENER TODOS LOS PARÁMETROS POSIBLES DE FIREBASE
        const code = searchParams.get('oobCode');
        const apiKey = searchParams.get('apiKey');
        const mode = searchParams.get('mode');
        const continueUrl = searchParams.get('continueUrl');
        const lang = searchParams.get('lang');
        
        console.log('🔍 Todos los parámetros de Firebase:', { 
          mode, 
          oobCode: code ? 'PRESENTE' : 'FALTANTE',
          apiKey: apiKey ? 'PRESENTE' : 'FALTANTE',
          continueUrl,
          lang
        });

        // 🎯 FIREBASE ENVÍA DIFERENTES FORMATOS DE URL
        if (mode === 'resetPassword' && code) {
          // 🎯 FORMATO IDEAL: Con mode y oobCode
          setOobCode(code);
          
          console.log('🔐 Verificando código con Firebase...');
          const auth = getAuth();
          const verifiedEmail = await verifyPasswordResetCode(auth, code);
          
          console.log('✅ Código válido para email:', verifiedEmail);
          setEmail(verifiedEmail);
          setValidCode(true);
          
        } else if (code) {
          // 🎯 FORMATO ALTERNATIVO: Solo oobCode sin mode
          setOobCode(code);
          
          console.log('🔐 Verificando código con Firebase (sin mode)...');
          const auth = getAuth();
          const verifiedEmail = await verifyPasswordResetCode(auth, code);
          
          console.log('✅ Código válido para email:', verifiedEmail);
          setEmail(verifiedEmail);
          setValidCode(true);
          
        } else {
          // 🎯 FORMATO NO COMPATIBLE
          console.log('❌ Formato de URL no reconocido');
          setError('❌ Enlace de recuperación inválido. Por favor, solicita un nuevo enlace.');
          setValidCode(false);
        }
      } catch (error: any) {
        console.error('❌ Error verificando código:', error);
        
        if (error.code === 'auth/expired-action-code') {
          setError('❌ El enlace ha expirado. Por favor, solicita uno nuevo.');
        } else if (error.code === 'auth/invalid-action-code') {
          setError('❌ Enlace inválido. Por favor, solicita uno nuevo.');
        } else if (error.code === 'auth/user-disabled') {
          setError('❌ Esta cuenta ha sido deshabilitada.');
        } else {
          setError('❌ Error al verificar el enlace: ' + error.message);
        }
        setValidCode(false);
      } finally {
        setVerifying(false);
      }
    };

    verifyResetCode();
  }, [searchParams]);

    // Agregar esta función TEMPORAL en ReiniciarContraseniaScreen.tsx antes del return
    const logAllParams = () => {
      const allParams: { [key: string]: string | null } = {};
      searchParams.forEach((value, key) => {
        allParams[key] = value;
      });
      console.log('🔍 TODOS los parámetros de la URL:', allParams);
    };

    // Llamar esta función temporalmente
    useEffect(() => {
      logAllParams();
    }, []);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');
  setMessage('');

  if (!validCode || !oobCode) {
    setError('Enlace de recuperación no válido');
    return;
  }

  if (newPassword !== confirmPassword) {
    setError('Las contraseñas no coinciden');
    return;
  }

  if (newPassword.length < 8) {
    setError('La contraseña debe tener al menos 8 caracteres');
    return;
  }

  const passwordError = validatePassword(newPassword);
  if (passwordError) {
    setError(passwordError);
    return;
  }

  setLoading(true);

  try {
    // 🎯 PRIMERO: Actualizar en Firebase usando el código OOB
    console.log('🔄 Confirmando reset de contraseña con Firebase...');
    const auth = getAuth();
    await confirmPasswordReset(auth, oobCode, newPassword);
    
    console.log('✅ Contraseña actualizada en Firebase para:', email);

    // 🎯 SEGUNDO: Actualizar también en nuestro backend
    try {
      console.log('🔄 Actualizando contraseña en nuestro backend...');
      const response = await authAPI.resetPassword(email, newPassword);
      
      if (response.success) {
        // 🎯 RESETEAR INTENTOS DE RECUPERACIÓN
        try {
          await authAPI.resetRecoveryAttempts(email);
          console.log('✅ Intentos de recuperación reseteados para:', email);
        } catch (resetError) {
          console.log('⚠️ Error reseteando intentos (no crítico):', resetError);
        }
        
        setMessage('✅ Contraseña actualizada correctamente. Redirigiendo al login...');
        setTimeout(() => navigate('/login'), 3000);
      } else {
        setError(response.message);
      }
    } catch (backendError: any) {
      // SI FALLA EL BACKEND PERO FIREBASE SÍ FUNCIONÓ, MOSTRAR ÉXITO PARCIAL
      console.log('⚠️ Firebase OK pero error en backend:', backendError);
      setMessage('✅ Contraseña actualizada. Redirigiendo al login...');
      setTimeout(() => navigate('/login'), 3000);
    }

  } catch (firebaseError: any) {
    console.error('❌ Error en Firebase:', firebaseError);
    
    if (firebaseError.code === 'auth/expired-action-code') {
      setError('❌ El enlace ha expirado. Por favor, solicita uno nuevo.');
    } else if (firebaseError.code === 'auth/invalid-action-code') {
      setError('❌ Enlace inválido. Por favor, solicita uno nuevo.');
    } else if (firebaseError.code === 'auth/user-disabled') {
      setError('❌ Esta cuenta ha sido deshabilitada.');
    } else if (firebaseError.code === 'auth/weak-password') {
      setError('❌ La contraseña es demasiado débil. Debe tener al menos 6 caracteres.');
    } else {
      setError('❌ Error al actualizar la contraseña: ' + firebaseError.message);
    }
  } finally {
    setLoading(false);
  }
};

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cleanedValue = value.replace(/\s/g, '');
    if (value !== cleanedValue) {
      e.target.value = cleanedValue;
    }
    setNewPassword(cleanedValue);
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cleanedValue = value.replace(/\s/g, '');
    if (value !== cleanedValue) {
      e.target.value = cleanedValue;
    }
    setConfirmPassword(cleanedValue);
  };

  if (verifying) {
    return (
      <div className="reiniciar-page-wrapper">
        <PublicHeader />
        <div className="reset-password-container">
          <div className="reset-password-card">
            <div className="verifying-message">
              <p>🔍 Verificando enlace de recuperación...</p>
            </div>
          </div>
        </div>
        <PublicFooter />
      </div>
    );
  }

  if (!validCode) {
    return (
      <div className="reiniciar-page-wrapper">
        <PublicHeader />
        <div className="reset-password-container">
          <div className="reset-password-card">
            <div className="error-message">
              <p>{error}</p>
              <div className="action-buttons">
                <button 
                  onClick={() => navigate('/olvide')} 
                  className="back-button"
                >
                  ← Solicitar nuevo enlace
                </button>
                <button 
                  onClick={() => navigate('/login')} 
                  className="secondary-button"
                >
                  Volver al Login
                </button>
              </div>
            </div>
          </div>
        </div>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="reiniciar-page-wrapper">
      <PublicHeader />
      <div className="reset-password-container">
        <div className="reset-password-card">
          <div className="reset-password-header">
            <h2>Establecer Nueva Contraseña</h2>
            <p>Creando nueva contraseña para: <strong>{email}</strong></p>
            <div className="security-notice">
              <small>🔒 Solo puedes cambiar la contraseña de esta cuenta</small>
            </div>
          </div>
          
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {message && (
            <div className="success-message">
              {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="reset-password-form">
          <div className="reset-password-form-group">
            <label htmlFor="newPassword">Nueva Contraseña</label>
            <div className="password-input-container">
              <input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={handlePasswordChange}
                required
                minLength={8}
                placeholder="8-16 caracteres, sin espacios"
                className="reset-password-input password-input"
                maxLength={16}
              />
              <button 
                type="button"
                className="password-toggle"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? "🙈" : "👁️"}
              </button>
            </div>
            <div className="password-requirements">
              <strong>Requisitos de la contraseña:</strong>
              <ul className="requirements-list">
                <li>8-16 caracteres</li>
                <li>Al menos 1 letra MAYÚSCULA (A-Z)</li>
                <li>Al menos 1 letra minúscula (a-z)</li>
                <li>Al menos 1 número (0-9)</li>
                <li>SIN espacios en blanco</li>
                <li>SIN símbolos especiales (#, @, $, %, etc.)</li>
              </ul>
            </div>
          </div>

          <div className="reset-password-form-group">
            <label htmlFor="confirmPassword">Confirmar Contraseña</label>
            <div className="password-input-container">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={handleConfirmPasswordChange}
                required
                minLength={8}
                placeholder="Repite tu contraseña"
                className="reset-password-input password-input"
                maxLength={16}
              />
              <button 
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="reset-password-button"
          >
            {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
          </button>
        </form>
        
        <div className="reset-password-links">
          <button 
            onClick={() => navigate('/login')} 
            className="reset-password-link"
          >
            ← Volver al Login
          </button>
        </div>
      </div>
    </div>
    <PublicFooter />
  </div>
  );
};

export default ResetPasswordScreen;