import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';
import './MFASetupScreen.css';

interface MFASetupData {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
  otpauthUrl: string;
}

export default function MFASetupScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [step, setStep] = useState<'intro' | 'qr' | 'verify' | 'complete'>('intro');
  const [mfaData, setMfaData] = useState<MFASetupData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const startMFASetup = async () => {
    if (!user?.dbId || !user?.email) {
      setError('Usuario no identificado correctamente');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('🔐 Iniciando configuración MFA para usuario:', user.dbId);
      
      const response = await authAPI.setupMFA(user.dbId, user.email);
      
      if (response.success) {
        setMfaData(response.data);
        setStep('qr');
        setSuccess('MFA configurado. Escanea el QR code con tu app.');
      } else {
        setError(response.message || 'Error iniciando configuración MFA');
      }
    } catch (error: any) {
      console.error('❌ Error configurando MFA:', error);
      setError(error.message || 'Error configurando MFA');
    } finally {
      setLoading(false);
    }
  };

  const verifyAndEnableMFA = async () => {
    if (!user?.dbId || !verificationCode) {
      setError('Código de verificación requerido');
      return;
    }

    if (verificationCode.length !== 6) {
      setError('El código debe tener 6 dígitos');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('🔐 Verificando y activando MFA para usuario:', user.dbId);
      
      const response = await authAPI.verifyAndEnableMFA(user.dbId, verificationCode);
      
      if (response.success) {
        setBackupCodes(mfaData?.backupCodes || []);
        setStep('complete');
        setSuccess('¡MFA activado correctamente!');
      } else {
        setError(response.message || 'Código de verificación inválido');
      }
    } catch (error: any) {
      console.error('❌ Error activando MFA:', error);
      setError(error.message || 'Error activando MFA');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/perfil');
  };

  const handleComplete = () => {
    navigate('/perfil');
  };

  // Render por pasos
  const renderStep = () => {
    switch (step) {
      case 'intro':
        return (
          <div className="step-intro">
            <h2>🔒 Configurar Autenticación en Dos Pasos</h2>
            <p>
              La autenticación en dos pasos añade una capa adicional de seguridad a tu cuenta. 
              Además de tu contraseña, necesitarás un código de verificación de tu aplicación móvil.
            </p>
            
            <div className="benefits">
              <h3>Beneficios:</h3>
              <ul>
                <li>✅ Protección contra accesos no autorizados</li>
                <li>✅ Seguridad incluso si tu contraseña es comprometida</li>
                <li>✅ Códigos que cambian cada 30 segundos</li>
                <li>✅ Compatible con Google Authenticator, Authy, etc.</li>
              </ul>
            </div>

            <div className="action-buttons">
              <button 
                onClick={startMFASetup}
                className="primary-button"
                disabled={loading}
              >
                {loading ? 'Configurando...' : 'Comenzar Configuración'}
              </button>
              <button 
                onClick={handleCancel}
                className="secondary-button"
              >
                Cancelar
              </button>
            </div>
          </div>
        );

      case 'qr':
        return (
          <div className="step-qr">
            <h2>📱 Escanear Código QR</h2>
            <p>Usa tu aplicación authenticator para escanear este código:</p>
            
            {mfaData?.qrCodeUrl && (
              <div className="qr-container">
                <img 
                  src={mfaData.qrCodeUrl} 
                  alt="Código QR para MFA" 
                  className="qr-code"
                />
              </div>
            )}

            <div className="manual-setup">
              <h4>¿Problemas escaneando el QR?</h4>
              <p>Ingresa este código manualmente en tu app:</p>
              <code className="secret-code">{mfaData?.secret}</code>
            </div>

            <div className="action-buttons">
              <button 
                onClick={() => setStep('verify')}
                className="primary-button"
              >
                Siguiente: Verificar Código
              </button>
              <button 
                onClick={() => setStep('intro')}
                className="secondary-button"
              >
                Atrás
              </button>
            </div>
          </div>
        );

      case 'verify':
        return (
          <div className="step-verify">
            <h2>🔢 Verificar Código</h2>
            <p>Ingresa el código de 6 dígitos que muestra tu aplicación authenticator:</p>
            
            <form onSubmit={(e) => { e.preventDefault(); verifyAndEnableMFA(); }}>
              <div className="form-group">
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setVerificationCode(value);
                    setError('');
                  }}
                  placeholder="123456"
                  maxLength={6}
                  disabled={loading}
                  autoComplete="one-time-code"
                  autoFocus
                />
              </div>

              {error && <div className="error-message">{error}</div>}

              <div className="action-buttons">
                <button 
                  type="submit"
                  className="primary-button"
                  disabled={loading || verificationCode.length !== 6}
                >
                  {loading ? 'Verificando...' : 'Activar MFA'}
                </button>
                <button 
                  onClick={() => setStep('qr')}
                  className="secondary-button"
                  disabled={loading}
                >
                  Atrás
                </button>
              </div>
            </form>
          </div>
        );

      case 'complete':
        return (
          <div className="step-complete">
            <h2>🎉 ¡MFA Activado Correctamente!</h2>
            <p>Tu autenticación en dos pasos ha sido configurada exitosamente.</p>
            
            {backupCodes.length > 0 && (
              <div className="backup-codes">
                <h3>📋 Códigos de Respaldo</h3>
                <p>
                  <strong>¡Guarda estos códigos en un lugar seguro!</strong><br/>
                  Son tu única forma de recuperar acceso si pierdes tu dispositivo.
                </p>
                <div className="codes-list">
                  {backupCodes.map((code, index) => (
                    <code key={index} className="backup-code">{code}</code>
                  ))}
                </div>
                <small>
                  Cada código solo se puede usar una vez. Se recomienda imprimirlos o guardarlos en un administrador de contraseñas.
                </small>
              </div>
            )}

            <div className="action-buttons">
              <button 
                onClick={handleComplete}
                className="primary-button"
              >
                Completar
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="mfa-setup-container">
      <div className="mfa-setup-card">
        {renderStep()}
        
        {success && (
          <div className="success-message">
            {success}
          </div>
        )}
      </div>
    </div>
  );
}