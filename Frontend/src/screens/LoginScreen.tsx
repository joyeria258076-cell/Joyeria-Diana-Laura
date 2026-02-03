// Ruta:Joyeria-Diana-Laura/Frontend/src/screens/LoginScreen.tsx

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import PublicHeader from "../components/PublicHeader";
import PublicFooter from "../components/PublicFooter";
import "../styles/LoginScreen.css";

// 🆕 FUNCIONES DE VALIDACIÓN PARA PREVENIR INYECCIONES
const validateNoSQLInjection = (value: string) => {
    if (!value) return true;
    
    // Patrones de inyección SQL comunes
    const sqlInjectionPatterns = [
        /(\bOR\b|\bAND\b)\s*['"]?\d+['"]?\s*=\s*['"]?\d+['"]?/i,
        /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bCREATE\b)/i,
        /--\s*$/i,
        /;.*?(?:DROP|DELETE|TRUNCATE|UPDATE|INSERT)/i,
        /('\s*OR\s*'.*'='|'\s*OR\s*1\s*=\s*1)/i,
        /"\s*OR\s*"\s*=\s*"/i,
        /(`|%27|%23)/i,
    ];
    
    for (const pattern of sqlInjectionPatterns) {
        if (pattern.test(value)) {
            return false;
        }
    }
    
    return true;
};

const validateNoXSS = (value: string) => {
    if (!value) return true;
    
    // Patrones de XSS comunes
    const xssPatterns = [
        /<script[^>]*>.*?<\/script>/gi,
        /javascript:/gi,
        /<iframe[^>]*>/gi,
        /<svg[^>]*>/gi,
        /on\w+\s*=/gi,
        /<img[^>]*on/gi,
        /eval\s*\(/gi,
        /expression\s*\(/gi,
        /<embed[^>]*>/gi,
        /<object[^>]*>/gi,
    ];
    
    for (const pattern of xssPatterns) {
        if (pattern.test(value)) {
            return false;
        }
    }
    
    return true;
};

const schema = z.object({
    email: z.string()
        .min(1, "El correo electrónico es requerido")
        .min(6, "El correo electrónico debe tener al menos 6 caracteres")
        .max(60, "El correo electrónico no puede tener más de 80 caracteres")
        .email("Correo electrónico inválido")
        .refine(validateNoSQLInjection, "El correo contiene caracteres no permitidos")
        .refine(validateNoXSS, "El correo contiene caracteres no permitidos"),
    password: z.string()
        .min(1, "La contraseña es requerida")
        .min(8, "La contraseña debe tener al menos 8 caracteres")
        .max(16, "La contraseña debe tener como máximo 16 caracteres")
        .refine(validateNoXSS, "La contraseña contiene caracteres no permitidos")
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
    const [loading, setLoading] = useState(false); // 🆕 Estado para loading del login

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
    setLoading(true);
    setError('root', { message: '' }); // Limpiar errores previos
    
    console.log('🔐 Iniciando proceso de login...');
    const response = await login(data.email, data.password);
    
    console.log('✅ Login exitoso (sin MFA)');
    console.log('📊 Response completo:', JSON.stringify(response, null, 2));
    console.log('📦 Usuario del response:', response.data?.user);
    console.log('🎭 Rol detectado (valor):', response.data?.user?.rol);
    console.log('🎭 Rol detectado (tipo):', typeof response.data?.user?.rol);
    console.log('🎭 Rol comparación admin:', response.data?.user?.rol === 'admin');
    console.log('🎭 Rol comparación trabajador:', response.data?.user?.rol === 'trabajador');
    console.log('🎭 Rol comparación cliente:', response.data?.user?.rol === 'cliente');
    console.log('🎭 Rol con .toLowerCase():', response.data?.user?.rol?.toLowerCase?.());
    
    // 🆕 REDIRECCIONAR SEGÚN EL ROL - CON VERIFICACIÓN MÁS ROBUSTA
    const rol = response.data?.user?.rol;
    const rolLower = String(rol).toLowerCase().trim();
    
    console.log('🎭 Rol normalizado:', rolLower);
    
    if (rol === 'admin' || rolLower === 'admin') {
      console.log('👨‍💼 Usuario es Admin - redirigiendo a dashboard admin');
      navigate("/admin-dashboard");
    } else if (rol === 'trabajador' || rolLower === 'trabajador') {
      console.log('👷 Usuario es Trabajador - redirigiendo a dashboard trabajador');
      navigate("/dashboard-trabajador");
    } else {
      console.log('👤 Usuario es Cliente (rol:', rol, ', tipo:', typeof rol, ') - redirigiendo a inicio');
      navigate("/inicio");
    }
    
  } catch (error: any) {
    console.log('🔍 Error en login:', error);
    
    // 🆕 CORRECCIÓN: MANEJAR REDIRECCIÓN MFA DE FORMA ESPECÍFICA
    if (error.mfaRequired) {
      console.log('🔐 MFA detectado - redirigiendo a verificación');
      navigate('/verify-mfa', { 
        state: { 
          userId: error.userId,
          email: data.email 
        } 
      });
      return;
    }
    
    // 🎯 MANEJAR BLOQUEOS
    if (error.message.includes('bloqueada')) {
      setError('root', { 
        type: 'manual', 
        message: error.message
      });
    }
    // 🎯 MANEJAR INTENTOS RESTANTES
    else if (error.remainingAttempts !== undefined) {
      let attemptsMessage = '';
      
      if (error.remainingAttempts === 0) {
        attemptsMessage = '🔒 Cuenta bloqueada. Espera 5 minutos.';
      } else if (error.remainingAttempts === 1) {
        attemptsMessage = '🚨 ¡ÚLTIMO INTENTO!';
      } else if (error.remainingAttempts === 2) {
        attemptsMessage = `⚠️ Te quedan ${error.remainingAttempts} intentos`;
      } else {
        attemptsMessage = `✅ Tienes ${error.remainingAttempts} intentos disponibles`;
      }
      
      setError('root', { 
        type: 'manual', 
        message: `${error.message} ${attemptsMessage}`
      });
    }
    // 🎯 MANEJAR OTROS ERRORES
    else if (error.message.includes("Esta cuenta no existe")) {
      setError('root', { 
        type: 'manual', 
        message: "❌ Esta cuenta no existe. Por favor, regístrate primero." 
      });
    }
    else if (error.message.includes("contraseña incorrecta") || 
             error.message.includes("Email o contraseña incorrectos")) {
      setError('root', { 
        type: 'manual', 
        message: "❌ Email o contraseña incorrectos. Si no tienes cuenta, regístrate primero." 
      });
    }
    else if (error.message.includes("verificado")) {
      setError('root', { 
        type: 'manual', 
        message: "📧 " + error.message 
      });
    }
    else if (error.message.includes("conexión")) {
      setError('root', { 
        type: 'manual', 
        message: "🌐 Error de conexión. Verifica tu internet e intenta nuevamente." 
      });
    }
    else {
      setError('root', { 
        type: 'manual', 
        message: "❌ " + (error.message || "Error al iniciar sesión. Por favor, intenta nuevamente.") 
      });
    }
  } finally {
    setLoading(false);
  }
};

    // 🎯 NUEVA FUNCIÓN: Mostrar mensajes de intentos igual que recuperación
    const getLoginAttemptsMessage = (remainingAttempts: number, maxAttempts: number = 3): string => {
    if (remainingAttempts === 0) {
        return '🚨 ¡CUENTA BLOQUEADA! Espera 2 minutos.';
    } else if (remainingAttempts === 1) {
        return '🚨 ¡ÚLTIMO INTENTO disponible!';
    } else if (remainingAttempts === 2) {
        return `⚠️ Te quedan ${remainingAttempts} intentos`;
    } else {
        return `✅ Tienes ${remainingAttempts} de ${maxAttempts} intentos disponibles`;
    }
    };

    return (
        <div className="login-page-wrapper">
            <PublicHeader />
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

                    {loading && (
                        <div className="processing-message">
                            ⏳ Procesando tu inicio de sesión...
                        </div>
                    )}

                    {!loading && errors.root?.message && (
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
                                    placeholder="Tu contraseña (8-16 caracteres)"
                                    className={`login-input password-input ${errors.password ? 'error' : ''}`}
                                    {...register("password")} 
                                    maxLength={16}
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
                            disabled={isVerifying || loading} // 🆕 Agregar loading al disable
                        >
                            {isVerifying ? "Verificando..." : loading ? "Iniciando sesión..." : "Entrar"}
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
            <PublicFooter />
        </div>
    );
}