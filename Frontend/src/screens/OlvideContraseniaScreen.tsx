import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api'; // 🎯 NUEVO IMPORT
import '../styles/OlvideContraseniaScreen.css';

const schema = z.object({
    email: z.string()
        .min(1, "El correo electrónico es requerido")
        .min(6, "El correo electrónico debe tener al menos 6 caracteres")
        .max(60, "El correo electrónico no puede tener más de 60 caracteres")
        .email("Correo electrónico inválido")
        .regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Formato de email inválido")
});

type FormData = z.infer<typeof schema>;

const OlvideContraseniaScreen: React.FC = () => {
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState<'success' | 'error'>('success');
    const [loading, setLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
    const [blockedUntil, setBlockedUntil] = useState<Date | null>(null);
    const [countdown, setCountdown] = useState<number | null>(null);
    
    const navigate = useNavigate();
    const { sendPasswordReset } = useAuth();

    const { 
        register, 
        handleSubmit, 
        formState: { errors },
        watch
    } = useForm<FormData>({ 
        resolver: zodResolver(schema) 
    });

    const emailValue = watch('email');

    // Efecto para el contador de bloqueo
    useEffect(() => {
        if (!blockedUntil) return;

        const interval = setInterval(() => {
            const now = new Date().getTime();
            const blockedTime = blockedUntil.getTime();
            const remaining = Math.ceil((blockedTime - now) / (1000 * 60)); // minutos restantes
            
            if (remaining <= 0) {
                setBlockedUntil(null);
                setCountdown(null);
                setRemainingAttempts(3);
                clearInterval(interval);
            } else {
                setCountdown(remaining);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [blockedUntil]);

    const getAttemptsMessage = () => {
        if (remainingAttempts === null) return null;
        
        if (remainingAttempts === 0 && blockedUntil) {
            return {
                type: 'blocked' as const,
                message: `🚨 Demasiados intentos. Cuenta bloqueada por ${countdown} minutos.`,
                className: 'attempts-warning blocked'
            };
        }
        
        if (remainingAttempts === 1) {
            return {
                type: 'warning' as const,
                message: '🚨 ¡ÚLTIMO INTENTO disponible!',
                className: 'attempts-warning danger'
            };
        }
        
        if (remainingAttempts === 2) {
            return {
                type: 'info' as const,
                message: `⚠️ Te quedan ${remainingAttempts} intentos`,
                className: 'attempts-warning warning'
            };
        }
        
        if (remainingAttempts === 3) {
            return {
                type: 'info' as const, 
                message: `✅ Tienes ${remainingAttempts} intentos disponibles`,
                className: 'attempts-warning info'
            };
        }
        
        return null;
    };

    const attemptsMessage = getAttemptsMessage();
    const isBlocked = blockedUntil && blockedUntil > new Date();

const onSubmit = async (data: FormData) => {
    setMessage('');
    setLoading(true);
    setMessageType('success');

    try {
        console.log('📧 Iniciando proceso de recuperación para:', data.email);
        
        const response = await sendPasswordReset(data.email);
        
        // Manejar respuesta del backend
        if (response.remainingAttempts !== undefined) {
            setRemainingAttempts(response.remainingAttempts);
        }
        
        if (response.blocked) {
            const blockedTime = new Date();
            blockedTime.setMinutes(blockedTime.getMinutes() + (response.remainingTime || 15));
            setBlockedUntil(blockedTime);
            setMessage(`❌ ${response.message}`);
            setMessageType('error');
        } else if (response.success) {
            // ✅ CORRECTO: NO resetear aquí - solo mostrar éxito
            setMessage('✅ ¡Enlace de recuperación enviado! Revisa tu bandeja de entrada y carpeta de spam.');
            setMessageType('success');
            setEmailSent(true);
            
            // ✅ CORRECTO: Mantener los intentos REALES del backend
            if (response.remainingAttempts !== undefined) {
                setRemainingAttempts(response.remainingAttempts);
            }
        } else {
            setMessage(`❌ ${response.message}`);
            setMessageType('error');
        }
        
        console.log('✅ Proceso de recuperación completado');

    } catch (error: any) {
        console.error('❌ Error en recuperación:', error);
        setMessage(`❌ ${error.message}`);
        setMessageType('error');
    } finally {
        setLoading(false);
    }
};

    return (
        <div className="olvide-contrasenia-container">
            <div className="olvide-contrasenia-card">
                <div className="olvide-contrasenia-header">
                    <h2>Recuperar Contraseña</h2>
                    <p>Ingresa tu email registrado y te enviaremos un enlace para restablecer tu contraseña.</p>
                    
                    {/* Información sobre el sistema de seguridad */}
                    <div className="security-info">
                        <p><strong>🔒 Sistema de seguridad:</strong> Máximo 3 intentos cada 15 minutos</p>
                    </div>
                </div>

                {attemptsMessage && (
                    <div className={attemptsMessage.className}>
                        {attemptsMessage.message}
                    </div>
                )}

                {!emailSent ? (
                    <form onSubmit={handleSubmit(onSubmit)} className="olvide-contrasenia-form">
                        <div className="form-group">
                            <label htmlFor="email">Correo electrónico registrado</label>
                            <input
                                id="email"
                                type="email"
                                placeholder="Ingresa el email con el que te registraste"
                                className={`olvide-input ${errors.email ? 'error' : ''} ${isBlocked ? 'blocked' : ''}`}
                                maxLength={60}
                                disabled={isBlocked || loading}
                                {...register("email")}
                            />
                            {errors.email && (
                                <span className="field-error">{errors.email.message}</span>
                            )}
                        </div>
                        
                        <button 
                            type="submit" 
                            disabled={isBlocked || loading} 
                            className={`submit-button ${isBlocked ? 'blocked' : ''}`}
                        >
                            {loading ? '🔍 Enviando...' : 
                             isBlocked ? `⏳ Bloqueado (${countdown}m)` : 
                             '📧 Enviar Enlace de Recuperación'}
                        </button>
                    </form>
                ) : (
                    <div className="success-section">
                        <div className="success-icon">✅</div>
                        <h3>¡Solicitud Procesada Exitosamente!</h3>
                        <p>Si el email está registrado, recibirás instrucciones en tu correo electrónico.</p>
                    </div>
                )}
                
                {message && (
                    <div className={messageType === 'success' ? 'success-message' : 'error-message'}>
                        <p>{message}</p>
                        {messageType === 'success' && (
                            <div className="email-tips">
                                <h4>💡 Consejos para encontrar el email:</h4>
                                <ul>
                                    <li><strong>Revisa tu bandeja de entrada</strong> principal</li>
                                    <li><strong>Busca en la carpeta de spam</strong> o correo no deseado</li>
                                    <li>El email viene de: <strong>noreply@joyeria-diana-laura.firebaseapp.com</strong></li>
                                    <li>El asunto del email es: <strong>"Restablece tu contraseña de Diana Laura"</strong></li>
                                    <li>El enlace expira en <strong>1 hora</strong></li>
                                    <li>Si no lo encuentras en 5 minutos, intenta nuevamente</li>
                                </ul>
                            </div>
                        )}
                    </div>
                )}
                
                <div className="back-to-login">
                    <button onClick={() => navigate('/login')} className="back-button">
                        ← Volver al Login
                    </button>
                    
                    <button onClick={() => navigate('/registro')} className="register-button">
                        ¿No tienes cuenta? Regístrate aquí
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OlvideContraseniaScreen;