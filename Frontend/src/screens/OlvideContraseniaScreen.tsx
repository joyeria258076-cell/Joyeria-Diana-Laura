import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/OlvideContraseniaScreen.css';

const OlvideContraseniaScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetToken, setResetToken] = useState(''); // ✅ Nuevo estado para el token
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setResetToken(''); // ✅ Limpiar token anterior
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (data.success) {
        setMessage(data.message);
        
        // ✅ MOSTRAR TOKEN EN PANTALLA en desarrollo
        if (data.debug) {
          console.log('🔗 Enlace de recuperación:', data.debug.resetLink);
          setResetToken(data.debug.resetToken); // ✅ Guardar token para mostrarlo
          setMessage(`${data.message} \n\n🔗 Usa este enlace para continuar:`);
        }
        
        // ❌ ELIMINAR la redirección automática
        // El usuario debe hacer clic manualmente en el enlace
        
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Función para copiar enlace al portapapeles
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Enlace copiado al portapapeles');
  };

  return (
    <div className="olvide-contrasenia-container">
      <div className="olvide-contrasenia-form">
        <h2>Recuperar Contraseña</h2>
        <p>Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.</p>
        
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
          <button type="submit" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar Enlace de Recuperación'}
          </button>
        </form>
        
        {message && (
          <div className="success-message">
            <div style={{ whiteSpace: 'pre-line', marginBottom: '1rem' }}>
              {message}
            </div>
            
            {/* ✅ MOSTRAR ENLACE EN PANTALLA */}
            {resetToken && (
              <div className="token-section">
                <h4>🔗 Enlace de Recuperación (Desarrollo):</h4>
                <div className="token-box">
                  <code>
                    http://localhost:3000/reset-password?token={resetToken}
                  </code>
                  <button 
                    onClick={() => copyToClipboard(`http://localhost:3000/reset-password?token=${resetToken}`)}
                    className="copy-button"
                  >
                    📋 Copiar
                  </button>
                </div>
                <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
                  <strong>Nota:</strong> Haz clic en el enlace o cópialo y ábrelo en una nueva pestaña
                </p>
              </div>
            )}
          </div>
        )}
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="back-to-login">
          <button onClick={() => navigate('/login')} className="back-button">
            ← Volver al Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default OlvideContraseniaScreen;