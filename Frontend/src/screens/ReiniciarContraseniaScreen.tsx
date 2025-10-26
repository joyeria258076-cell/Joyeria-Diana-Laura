import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import '../styles/ReiniciarContraseniaScreen.css';

const ResetPasswordScreen: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean>(true); // Inicializar como true

  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      verifyToken();
    } else {
      setTokenValid(false);
    }
  }, [token]);

  const verifyToken = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/auth/verify-reset-token/${token}`);
      const data = await response.json();
      setTokenValid(data.success);
    } catch (error) {
      setTokenValid(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

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
      const response = await fetch('http://localhost:5000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      });

      const data = await response.json();

      if (data.success) {
        setMessage('✅ Contraseña actualizada correctamente. Redirigiendo al login...');
        setTimeout(() => navigate('/login'), 3000);
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  // Si no hay token o el token es inválido
  if (!token || !tokenValid) {
    return (
      <div className="reset-password-container">
        <div className="reset-password-form">
          <div className="error-message">
            ❌ {!token ? 'Token de recuperación no válido' : 'Token inválido o expirado'}
          </div>
          <button 
            onClick={() => navigate('/forgot-password')} 
            className="back-button"
          >
            Solicitar nuevo enlace
          </button>
          <button 
            onClick={() => navigate('/login')} 
            className="back-button secondary"
          >
            Volver al Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="reset-password-container">
      <div className="reset-password-form">
        <h2>Establecer Nueva Contraseña</h2>
        
        <form onSubmit={handleSubmit}>
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
        
        <button 
          onClick={() => navigate('/login')} 
          className="back-button"
          style={{ marginTop: '1rem' }}
        >
          ← Volver al Login
        </button>
      </div>
    </div>
  );
};

export default ResetPasswordScreen;