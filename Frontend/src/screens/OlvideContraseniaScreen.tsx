// Ruta: Joyeria-Diana-Laura/Frontend/src/screens/OlvideContraseniaScreen.tsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
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
    
    const navigate = useNavigate();

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
            const response = await authAPI.forgotPassword(data.email);

            if (response.success) {
                setMessage('✅ Se ha enviado un enlace de recuperación. Revisa tu bandeja de entrada y spam.');
            } else {
                setError('root', { 
                    type: 'manual', 
                    message: response.message || 'Error al enviar el enlace de recuperación' 
                });
            }
        } catch (error: any) {
            setError('root', { 
                type: 'manual', 
                message: error.message || 'Error al conectar con el servidor. Intenta nuevamente.' 
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="olvide-contrasenia-container">
            <div className="olvide-contrasenia-card">
                <div className="olvide-contrasenia-header">
                    <h2>Recuperar Contraseña</h2>
                    <p>Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.</p>
                </div>
                
                {errors.root && (
                    <div className="error-message">
                        {errors.root.message}
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="olvide-contrasenia-form">
                    <div className="form-group">
                        <label htmlFor="email">Correo electrónico</label>
                        <input
                            id="email"
                            type="email"
                            placeholder="tu@email.com (máx. 60 caracteres)"
                            className={`olvide-input ${errors.email ? 'error' : ''}`}
                            maxLength={60}
                            {...register("email")}
                        />
                        {errors.email && (
                            <span className="field-error">{errors.email.message}</span>
                        )}
                        <div className="field-requirements">
                            <ul className="requirements-list">
                                <li>• 6-60 caracteres</li>
                                <li>• Solo caracteres permitidos: letras, números, ., _, %, +, -</li>
                            </ul>
                        </div>
                    </div>
                    
                    <button 
                        type="submit" 
                        disabled={loading} 
                        className="submit-button"
                    >
                        {loading ? 'Enviando...' : 'Enviar Enlace de Recuperación'}
                    </button>
                </form>
                
                {message && (
                    <div className="success-message">
                        <p>{message}</p>
                        <div className="email-tips">
                            <h4>💡 Consejos:</h4>
                            <ul>
                                <li>Revisa tu bandeja de entrada</li>
                                <li>Revisa la carpeta de spam o correo no deseado</li>
                                <li>El enlace expira en 1 hora</li>
                                <li>Si no recibes el email en 5 minutos, intenta nuevamente</li>
                            </ul>
                        </div>
                    </div>
                )}
                
                <div className="back-to-login">
                    <button onClick={() => navigate('/login')} className="back-button">
                        Volver al Login
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OlvideContraseniaScreen;