// Ruta:Joyeria-Diana-Laura/Frontend/src/screens/LoginScreen.tsx

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "../styles/LoginScreen.css";

const schema = z.object({
    email: z.string()
        .min(1, "El correo electrónico es requerido")
        .min(6, "El correo electrónico debe tener al menos 6 caracteres")
        .max(60, "El correo electrónico no puede tener más de 80 caracteres")
        .email("Correo electrónico inválido"),
    password: z.string()
        .min(1, "La contraseña es requerida")
        .min(6, "La contraseña debe tener al menos 6 caracteres")
        .max(8, "La contraseña debe tener como máximo 8 caracteres")
});

type FormData = z.infer<typeof schema>;

export default function LoginScreen() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { login, verifyEmail } = useAuth();
    const { register, handleSubmit, formState: { errors }, setError, setValue } = useForm<FormData>({ 
        resolver: zodResolver(schema)
    });
    
    const [showPassword, setShowPassword] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);

    useEffect(() => {
        const oobCode = searchParams.get('oobCode');
        const mode = searchParams.get('mode');
        const verified = searchParams.get('verified');
        const email = searchParams.get('email');
        const apiKey = searchParams.get('apiKey');
        const continueUrl = searchParams.get('continueUrl');

        console.log('🔗 Parámetros en Login:', { mode, oobCode: oobCode ? 'PRESENTE' : 'FALTANTE' });

        // 🎯 DETECTAR SI ES UN LINK DE RESET PASSWORD Y REDIRIGIR
        if (mode === 'resetPassword' && oobCode) {
            console.log('🔄 Redirigiendo a pantalla de reset password...');
            navigate(`/reiniciar?oobCode=${oobCode}${apiKey ? `&apiKey=${apiKey}` : ''}${continueUrl ? `&continueUrl=${continueUrl}` : ''}`);
            return;
        }

        // 🎯 MANEJAR VERIFICACIÓN DE EMAIL
        if (oobCode && mode === 'verifyEmail' && !isVerifying) {
            handleEmailVerification(oobCode);
        }

        // 🎯 MOSTRAR MENSAJE DE VERIFICACIÓN EXITOSA
        if (verified === 'true' && !sessionStorage.getItem('verificationShown')) {
            sessionStorage.setItem('verificationShown', 'true');
            alert('✅ ¡Email verificado correctamente! Ahora puedes iniciar sesión.');
            window.history.replaceState({}, '', window.location.pathname);
        }

        if (email) {
            setValue('email', email);
        }
    }, [searchParams, setValue, navigate, isVerifying]);

    const handleEmailVerification = async (oobCode: string) => {
        try {
            setIsVerifying(true);
            await verifyEmail(oobCode);
            
            const email = searchParams.get('email');
            const redirectUrl = email 
                ? `/login?verified=true&email=${encodeURIComponent(email)}`
                : '/login?verified=true';
            
            window.location.href = redirectUrl;
        } catch (error: any) {
            console.error('Error en verificación:', error);
            setError('root', { 
                type: 'manual', 
                message: error.message || 'Error al verificar el email. El enlace puede haber expirado.'
            });
        } finally {
            setIsVerifying(false);
        }
    };

    const onSubmit = async (data: FormData) => {
    try {
        await login(data.email, data.password);
        navigate("/inicio");
    } catch (error: any) {
        // 🎯 NUEVO: Manejar bloqueos e intentos restantes del login
        if (error.message.includes("bloqueada") || error.message.includes("bloqueada")) {
        setError('root', { 
            type: 'manual', 
            message: error.message
        });
        } else if (error.remainingAttempts !== undefined) {
        // 🎯 MOSTRAR INTENTOS RESTANTES IGUAL QUE RECUPERACIÓN
        const attemptsMessage = getLoginAttemptsMessage(error.remainingAttempts);
        setError('root', { 
            type: 'manual', 
            message: `${error.message} ${attemptsMessage}` 
        });
        } else if (error.message.includes("Esta cuenta no existe") || 
            error.message.includes("no existe") || 
            error.message.includes("not found") || 
            error.message.includes("user-not-found")) {
        setError('root', { 
            type: 'manual', 
            message: "❌ Esta cuenta no existe. Por favor, regístrate primero." 
        });
        } else if (error.message.includes("contraseña incorrecta") || 
            error.message.includes("wrong-password") ||
            error.message.includes("invalid-credential")) {
        setError('root', { 
            type: 'manual', 
            message: "❌ Email o contraseña incorrectos. Si no tienes cuenta, regístrate primero." 
        });
        } else if (error.message.includes("verificado") || 
            error.message.includes("verified")) {
        setError('root', { 
            type: 'manual', 
            message: "📧 " + error.message 
        });
        } else if (error.message.includes("conexión") || 
            error.message.includes("connection") || 
            error.message.includes("network")) {
        setError('root', { 
            type: 'manual', 
            message: "🌐 Error de conexión. Verifica tu internet e intenta nuevamente." 
        });
        } else {
        setError('root', { 
            type: 'manual', 
            message: "❌ " + (error.message || "Error al iniciar sesión. Por favor, intenta nuevamente.") 
        });
        }
    }
    };

    // 🎯 NUEVA FUNCIÓN: Mostrar mensajes de intentos igual que recuperación
    const getLoginAttemptsMessage = (remainingAttempts: number): string => {
    if (remainingAttempts === 0) {
        return '🚨 ¡CUENTA BLOQUEADA!';
    } else if (remainingAttempts === 1) {
        return '🚨 ¡ÚLTIMO INTENTO disponible!';
    } else if (remainingAttempts === 2) {
        return `⚠️ Te quedan ${remainingAttempts} intentos`;
    } else {
        return `✅ Tienes ${remainingAttempts} intentos disponibles`;
    }
    };

    return (
        <div className="login-container">
            <div className="login-image-section">
                <div className="login-image-content">
                    <h1>Joyería y Bisutería Diana Laura</h1>
                    <p>Descubre nuestra exclusiva colección de joyas elaboradas especialmente para ti</p>
                </div>
            </div>

            <div className="login-form-section">
                <div className="login-card">
                    <div className="login-header">
                        <h2>Iniciar sesión</h2>
                        <p>Ingresa a tu cuenta de Joyería Diana Laura</p>
                    </div>
                    
                    {isVerifying && (
                        <div className="verification-message">
                            <p>🔄 Verificando tu email...</p>
                        </div>
                    )}

                    {errors.root && (
                        <div className="error-message">
                            {errors.root.message}
                        </div>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} className="login-form">
                        <div className="login-form-group">
                            <label htmlFor="email">Correo electrónico</label>
                            <input 
                                id="email"
                                type="email" 
                                placeholder="tu@email.com" 
                                className={`login-input ${errors.email ? 'error' : ''}`}
                                {...register("email")} 
                                maxLength={60}
                            />
                            {errors.email && (
                                <span className="login-error">{errors.email.message}</span>
                            )}
                        </div>

                        <div className="login-form-group">
                            <label htmlFor="password">Contraseña</label>
                            <div className="password-input-container">
                                <input 
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Tu contraseña"
                                    className={`login-input password-input ${errors.password ? 'error' : ''}`}
                                    {...register("password")} 
                                    maxLength={8}
                                />
                                <button 
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? "🙈" : "👁️"}
                                </button>
                            </div>
                            {errors.password && (
                                <span className="login-error">{errors.password.message}</span>
                            )}
                        </div>

                        <button 
                            type="submit" 
                            className="login-button"
                            disabled={isVerifying}
                        >
                            {isVerifying ? "Verificando..." : "Entrar"}
                        </button>
                    </form>

                    <div className="login-links">
                        <Link to="/registro" className="login-link">
                            Crear cuenta
                        </Link>
                        <Link to="/olvide" className="login-link">
                            ¿Olvidaste tu contraseña?
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}