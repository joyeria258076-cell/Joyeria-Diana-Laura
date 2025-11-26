// Ruta: Joyeria-Diana-Laura/Frontend/src/screens/RecuperarConPreguntaScreen.tsx
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useLocation } from 'react-router-dom';
import { securityQuestionAPI } from '../services/securityQuestionAPI';
import '../styles/RecuperarConPreguntaScreen.css';

const schema = z.object({
    securityAnswer: z.string()
        .min(1, "La respuesta secreta es requerida")
        .min(2, "La respuesta debe tener al menos 2 caracteres")
        .max(100, "La respuesta no puede tener más de 100 caracteres")
        .refine((answer) => !answer.startsWith(' ') && !answer.endsWith(' '), {
            message: "La respuesta no puede comenzar ni terminar con espacios"
        }),
    newPassword: z.string()
        .min(1, "La nueva contraseña es requerida")
        .min(8, "La contraseña debe tener al menos 8 caracteres")
        .max(16, "La contraseña no puede tener más de 16 caracteres")
        .regex(/[A-Z]/, "La contraseña debe contener al menos una letra mayúscula")
        .regex(/[a-z]/, "La contraseña debe contener al menos una letra minúscula")
        .regex(/\d/, "La contraseña debe contener al menos un número")
        .regex(/^\S*$/, "La contraseña no puede contener espacios"),
    confirmPassword: z.string()
        .min(1, "La confirmación de contraseña es requerida")
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"]
});

type FormData = z.infer<typeof schema>;

const RecuperarConPreguntaScreen: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState<'success' | 'error'>('success');
    const [securityQuestion, setSecurityQuestion] = useState<string>('');
    const [userId, setUserId] = useState<number | null>(null);
    const [email, setEmail] = useState<string>('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [answerVerified, setAnswerVerified] = useState(false);

    const { 
        register, 
        handleSubmit, 
        formState: { errors, isValid },
        watch,
        trigger
    } = useForm<FormData>({ 
        resolver: zodResolver(schema),
        mode: 'onChange' // 🆕 Para validar en tiempo real
    });

    const securityAnswerValue = watch('securityAnswer');

    // Obtener email de los parámetros de la URL
    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const emailParam = searchParams.get('email');
        
        console.log('📧 Email de parámetros:', emailParam);
        
        if (emailParam) {
            setEmail(emailParam);
            loadSecurityQuestion(emailParam);
        } else {
            setMessage('❌ Email no proporcionado');
            setMessageType('error');
        }
    }, [location]);

    const loadSecurityQuestion = async (userEmail: string) => {
        try {
            setLoading(true);
            console.log('🔍 Cargando pregunta secreta para:', userEmail);
            const response = await securityQuestionAPI.getSecurityQuestion(userEmail);
            console.log('📊 Respuesta de pregunta secreta:', response);
            
            if (response.success && response.data.question) {
                setSecurityQuestion(response.data.question);
                setUserId(response.data.userId);
                setMessage('');
                console.log('✅ Pregunta cargada:', response.data.question);
            } else {
                setMessage('❌ No se encontró pregunta secreta para este usuario');
                setMessageType('error');
                console.log('❌ No se encontró pregunta secreta');
            }
        } catch (error: any) {
            console.error('❌ Error cargando pregunta secreta:', error);
            setMessage(`❌ Error cargando pregunta secreta: ${error.message}`);
            setMessageType('error');
        } finally {
            setLoading(false);
        }
    };

    const verifyAnswer = async (answer: string) => {
        if (!userId) {
            console.log('❌ No hay userId para verificar');
            return false;
        }

        try {
            console.log('🔍 Verificando respuesta para usuario:', userId, 'Respuesta:', answer);
            const response = await securityQuestionAPI.verifySecurityAnswer(userId, answer);
            console.log('📊 Respuesta de verificación:', response);
            return response.success;
        } catch (error: any) {
            console.error('❌ Error verificando respuesta:', error);
            return false;
        }
    };

    const onSubmit = async (data: FormData) => {
        console.log('🎯 onSubmit ejecutado con datos:', data);
        setLoading(true);
        setMessage('');

        try {
            // Verificar respuesta si aún no está verificada
            if (!answerVerified) {
                console.log('🔍 Verificando respuesta secreta...');
                const isAnswerCorrect = await verifyAnswer(data.securityAnswer);
                
                if (!isAnswerCorrect) {
                    setMessage('❌ Respuesta incorrecta. Intenta nuevamente.');
                    setMessageType('error');
                    setLoading(false);
                    return;
                }
                
                setAnswerVerified(true);
                setMessage('✅ Respuesta correcta. Ahora puedes establecer tu nueva contraseña.');
                setMessageType('success');
                setLoading(false);
                return;
            }

            // Si la respuesta ya está verificada, cambiar la contraseña
            console.log('🔄 Cambiando contraseña...');
            const resetResponse = await securityQuestionAPI.resetPasswordWithQuestion(
                email, 
                data.securityAnswer, 
                data.newPassword
            );
            
            console.log('📊 Respuesta de cambio de contraseña:', resetResponse);
            
            if (resetResponse.success) {
                setMessage('✅ Contraseña actualizada correctamente. Redirigiendo al login...');
                setMessageType('success');
                
                setTimeout(() => {
                    navigate('/login');
                }, 3000);
            } else {
                setMessage(`❌ ${resetResponse.message}`);
                setMessageType('error');
            }

        } catch (error: any) {
            console.error('❌ Error en onSubmit:', error);
            setMessage(`❌ Error: ${error.message}`);
            setMessageType('error');
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
    };

    const handleTryAgain = () => {
        setAnswerVerified(false);
        setMessage('');
    };

    const handleVerifyClick = async () => {
        console.log('🖱️ Botón verificar clickeado');
        
        // Validar el campo de respuesta primero
        const isAnswerValid = await trigger('securityAnswer');
        console.log('✅ Validación de respuesta:', isAnswerValid);
        
        if (!isAnswerValid) {
            setMessage('❌ Por favor, ingresa una respuesta válida');
            setMessageType('error');
            return;
        }

        // Si la validación pasa, ejecutar el onSubmit
        const formData = {
            securityAnswer: securityAnswerValue,
            newPassword: '', // Valores vacíos para la primera fase
            confirmPassword: ''
        };
        
        await onSubmit(formData as FormData);
    };

    if (loading && !securityQuestion) {
        return (
            <div className="recuperar-pregunta-container">
                <div className="recuperar-pregunta-card">
                    <div className="loading-message">
                        <p>🔍 Cargando pregunta secreta...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!securityQuestion && !loading) {
        return (
            <div className="recuperar-pregunta-container">
                <div className="recuperar-pregunta-card">
                    <div className="error-message">
                        <p>{message || '❌ No se pudo cargar la pregunta secreta'}</p>
                        <div className="action-buttons">
                            <button onClick={() => navigate('/olvide')} className="back-button">
                                ← Volver a recuperación
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="recuperar-pregunta-container">
            <div className="recuperar-pregunta-card">
                <div className="recuperar-pregunta-header">
                    <h2>Recuperar Contraseña con Pregunta Secreta</h2>
                    <p>Para: <strong>{email}</strong></p>
                </div>

                {message && (
                    <div className={`message ${messageType}`}>
                        {message}
                    </div>
                )}

                {!answerVerified ? (
                    <div className="recuperar-pregunta-form">
                        <div className="security-question-display">
                            <h3>🔒 Tu Pregunta Secreta:</h3>
                            <div className="question-text">
                                {securityQuestion}
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="securityAnswer">Tu respuesta:</label>
                            <input
                                id="securityAnswer"
                                type="text"
                                placeholder="Escribe tu respuesta secreta"
                                className={`pregunta-input ${errors.securityAnswer ? 'error' : ''}`}
                                {...register("securityAnswer")}
                                maxLength={100}
                                disabled={loading}
                            />
                            {errors.securityAnswer && (
                                <span className="field-error">{errors.securityAnswer.message}</span>
                            )}
                        </div>

                        <button 
                            type="button" // 🆕 Cambiado a type="button"
                            onClick={handleVerifyClick} // 🆕 Usar función separada
                            disabled={loading || !securityAnswerValue}
                            className="verify-button"
                        >
                            {loading ? 'Verificando...' : '✅ Verificar Respuesta'}
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit(onSubmit)} className="recuperar-pregunta-form">
                        <div className="success-verification">
                            <div className="success-icon">✅</div>
                            <h3>Respuesta Verificada Correctamente</h3>
                            <p>Ahora establece tu nueva contraseña</p>
                            
                            <button 
                                type="button" 
                                onClick={handleTryAgain}
                                className="try-again-button"
                            >
                                🔄 Usar otra respuesta
                            </button>
                        </div>

                        <div className="form-group">
                            <label htmlFor="newPassword">Nueva Contraseña:</label>
                            <div className="password-input-container">
                                <input
                                    id="newPassword"
                                    type={showNewPassword ? "text" : "password"}
                                    placeholder="Nueva contraseña (8-16 caracteres)"
                                    className={`pregunta-input password-input ${errors.newPassword ? 'error' : ''}`}
                                    {...register("newPassword")}
                                    maxLength={16}
                                    onChange={handlePasswordChange}
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                >
                                    {showNewPassword ? "🙈" : "👁️"}
                                </button>
                            </div>
                            {errors.newPassword && (
                                <span className="field-error">{errors.newPassword.message}</span>
                            )}
                        </div>

                        <div className="form-group">
                            <label htmlFor="confirmPassword">Confirmar Contraseña:</label>
                            <div className="password-input-container">
                                <input
                                    id="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="Repite tu nueva contraseña"
                                    className={`pregunta-input password-input ${errors.confirmPassword ? 'error' : ''}`}
                                    {...register("confirmPassword")}
                                    maxLength={16}
                                    onChange={handlePasswordChange}
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    {showConfirmPassword ? "🙈" : "👁️"}
                                </button>
                            </div>
                            {errors.confirmPassword && (
                                <span className="field-error">{errors.confirmPassword.message}</span>
                            )}
                        </div>

                        <div className="password-requirements">
                            <strong>Requisitos de la contraseña:</strong>
                            <ul>
                                <li>8-16 caracteres</li>
                                <li>Al menos 1 letra MAYÚSCULA (A-Z)</li>
                                <li>Al menos 1 letra minúscula (a-z)</li>
                                <li>Al menos 1 número (0-9)</li>
                                <li>SIN espacios en blanco</li>
                                <li>SIN símbolos especiales (#, @, $, %, etc.)</li>
                            </ul>
                        </div>

                        <button type="submit" disabled={loading} className="submit-button">
                            {loading ? 'Actualizando...' : '🔄 Actualizar Contraseña'}
                        </button>
                    </form>
                )}

                <div className="action-buttons">
                    <button onClick={() => navigate('/olvide')} className="back-button">
                        ← Volver a métodos de recuperación
                    </button>
                    <button onClick={() => navigate('/login')} className="login-button">
                        Ir al Login
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RecuperarConPreguntaScreen;