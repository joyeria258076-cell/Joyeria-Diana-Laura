// Ruta: Joyeria-Diana-Laura/Frontend/src/screens/ReiniciarContraseniaScreen.tsx
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
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

  useEffect(() => {
    // En esta versión simplificada, pedimos el email directamente
    // ya que el backend desplegado no maneja códigos OOB de Firebase
  }, [searchParams]);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');
  setMessage('');

  if (!email) {
    setError('Por favor ingresa tu email');
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
    const response = await authAPI.resetPassword(email, newPassword);

    if (response.success) {
      // 🎯 NUEVO: Resetear intentos de recuperación cuando la contraseña se cambia exitosamente
      try {
        await authAPI.resetRecoveryAttempts(email);
        console.log('✅ Intentos de recuperación reseteados para:', email);
      } catch (resetError) {
        console.log('⚠️ Error reseteando intentos (no crítico):', resetError);
        // No bloqueamos el flujo si falla el reset de intentos
      }
      
      setMessage('✅ Contraseña actualizada correctamente. Redirigiendo al login...');
      setTimeout(() => navigate('/login'), 3000);
    } else {
      setError(response.message);
    }
  } catch (error: any) {
    setError(error.message || 'Error al conectar con el servidor');
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

  return (
    <div className="reset-password-container">
      <div className="reset-password-card">
        <div className="reset-password-header">
          <h2>Establecer Nueva Contraseña</h2>
          <p>Ingresa tu email y crea una nueva contraseña para tu cuenta.</p>
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
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="tu@email.com"
              className="reset-password-input"
              maxLength={60}
            />
          </div>

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