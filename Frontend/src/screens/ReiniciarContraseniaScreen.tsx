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

  return (
    <div className="reset-password-container">
      <div className="reset-password-form">
        <h2>Establecer Nueva Contraseña</h2>
        <p>Ingresa tu email y crea una nueva contraseña para tu cuenta.</p>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="tu@email.com"
            />
          </div>
          <div className="form-group">
            <label>Nueva Contraseña:</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <div className="form-group">
            <label>Confirmar Contraseña:</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Repite tu contraseña"
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
          </button>
        </form>
        
        {message && <div className="success-message">{message}</div>}
        {error && <div className="error-message">{error}</div>}
        
        <div className="back-to-login">
          <button onClick={() => navigate('/login')} className="back-button">
            Volver al Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordScreen;