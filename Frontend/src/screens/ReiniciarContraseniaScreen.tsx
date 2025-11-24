// Ruta: Joyeria-Diana-Laura/Frontend/src/screens/ReiniciarContraseniaScreen.tsx
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { getAuth, verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import '../styles/ReiniciarContraseniaScreen.css';

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

  useEffect(() => {
    const verifyResetCode = async () => {
      try {
        const code = searchParams.get('oobCode');
        const mode = searchParams.get('mode');
        
        console.log('🔍 Parámetros en reset:', { mode, oobCode: code ? 'PRESENTE' : 'FALTANTE' });

        if (mode === 'resetPassword' && code) {
          setOobCode(code);
          
          // 🎯 NUEVO: Verificar el código de reset con Firebase
          const auth = getAuth();
          const verifiedEmail = await verifyPasswordResetCode(auth, code);
          
          console.log('✅ Código válido para email:', verifiedEmail);
          setEmail(verifiedEmail);
          setValidCode(true);
        } else {
          setError('❌ Enlace inválido o faltante. Por favor, solicita un nuevo enlace de recuperación.');
          setValidCode(false);
        }
      } catch (error: any) {
        console.error('❌ Error verificando código:', error);
        setError('❌ El enlace de recuperación es inválido o ha expirado. Por favor, solicita uno nuevo.');
        setValidCode(false);
      } finally {
        setVerifying(false);
      }
    };

    verifyResetCode();
  }, [searchParams]);

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

    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      // 🎯 NUEVO: Usar Firebase para resetear la contraseña
      const auth = getAuth();
      
      // 1. Confirmar el reset con Firebase
      await confirmPasswordReset(auth, oobCode, newPassword);
      
      console.log('✅ Contraseña actualizada en Firebase para:', email);

      // 2. Actualizar también en nuestro backend
      try {
        const response = await authAPI.resetPassword(email, newPassword);
        
        if (response.success) {
          // 🎯 Resetear intentos de recuperación
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
        // Si falla el backend pero Firebase sí funcionó, mostrar éxito parcial
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
      <div className="reset-password-container">
        <div className="reset-password-card">
          <div className="verifying-message">
            <p>🔍 Verificando enlace de recuperación...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!validCode) {
    return (
      <div className="reset-password-container">
        <div className="reset-password-card">
          <div className="error-message">
            <p>{error}</p>
            <button 
              onClick={() => navigate('/olvide')} 
              className="back-button"
            >
              ← Solicitar nuevo enlace
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
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
          {/* 🎯 ELIMINADO: Campo de email - ahora viene automáticamente */}

          <div className="reset-password-form-group">
            <label htmlFor="newPassword">Nueva Contraseña</label>
            <div className="password-input-container">
              <input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={handlePasswordChange}
                required
                minLength={6}
                placeholder="Mínimo 6 caracteres"
                className="reset-password-input password-input"
                maxLength={20}
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
                <li>Mínimo 6 caracteres</li>
                <li>Sin espacios en blanco</li>
                <li>Se recomienda usar mayúsculas, minúsculas y números</li>
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
                placeholder="Repite tu contraseña"
                className="reset-password-input password-input"
                maxLength={20}
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
  );
};

export default ResetPasswordScreen;