// Ruta: Joyeria-Diana-Laura/Frontend/src/screens/OlvideContraseniaScreen.tsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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
    const [loading, setLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    
    const navigate = useNavigate();
    const { sendPasswordReset } = useAuth();

    const { 
        register, 
        handleSubmit, 
        formState: { errors },
        setError
    } = useForm<FormData>({ 
        resolver: zodResolver(schema) 
    });

    const onSubmit = async (data: FormData) => {
        setError('root', { message: '' });
        setMessage('');
        setLoading(true);

        try {
            console.log('📧 Iniciando proceso de recuperación para:', data.email);
            
            await sendPasswordReset(data.email);
            
            setMessage('✅ ¡Enlace de recuperación enviado! Revisa tu bandeja de entrada y carpeta de spam.');
            setEmailSent(true);
            console.log('✅ Proceso de recuperación completado exitosamente');

        } catch (error: any) {
            console.error('❌ Error en recuperación:', error);
            
            if (error.message.includes('no está registrado')) {
                setError('root', { 
                    type: 'manual', 
                    message: '❌ ' + error.message 
                });
            } else if (error.message.includes('formato del email')) {
                setError('root', { 
                    type: 'manual', 
                    message: '❌ ' + error.message 
                });
            } else if (error.message.includes('demasiados reseteos')) {
                setError('root', { 
                    type: 'manual', 
                    message: '⏳ ' + error.message 
                });
            } else if (error.message.includes('conexión')) {
                setError('root', { 
                    type: 'manual', 
                    message: '🌐 ' + error.message 
                });
            } else {
                // 🎯 POR SEGURIDAD: Mostrar mensaje genérico de éxito
                setMessage('✅ Si este email está registrado, recibirás un enlace de recuperación en unos minutos. Revisa tu bandeja de entrada y spam.');
                setEmailSent(true);
            }
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
                </div>
                
                {errors.root && (
                    <div className="error-message">
                        {errors.root.message}
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
                                className={`olvide-input ${errors.email ? 'error' : ''}`}
                                maxLength={60}
                                {...register("email")}
                            />
                            {errors.email && (
                                <span className="field-error">{errors.email.message}</span>
                            )}
                        </div>
                        
                        <button 
                            type="submit" 
                            disabled={loading} 
                            className="submit-button"
                        >
                            {loading ? '🔍 Enviando...' : '📧 Enviar Enlace de Recuperación'}
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
                    <div className="success-message">
                        <p>{message}</p>
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