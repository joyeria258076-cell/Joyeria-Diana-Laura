// Ruta:Joyeria-Diana-Laura/Frontend/src/screens/LoginScreen.tsx

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
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
    const { login } = useAuth();
    const { register, handleSubmit, formState: { errors }, setError } = useForm<FormData>({ 
        resolver: zodResolver(schema)
    });
    
    // Estado para mostrar/ocultar contraseña
    const [showPassword, setShowPassword] = useState(false);

    const onSubmit = async (data: FormData) => {
        try {
            await login(data.email, data.password);
            navigate("/inicio");
        } catch (error: any) {
            // Verificación de existencia del usuario
            if (error.message.includes("no existe") || error.message.includes("not found") || 
                error.message.includes("usuario") || error.message.includes("user")) {
                setError('root', { 
                    type: 'manual', 
                    message: "El usuario no existe. Por favor, verifica tu correo electrónico." 
                });
            } else if (error.message.includes("contraseña") || error.message.includes("password") || 
                       error.message.includes("incorrecta")) {
                setError('root', { 
                    type: 'manual', 
                    message: "Contraseña incorrecta. Por favor, intenta nuevamente." 
                });
            } else {
                setError('root', { 
                    type: 'manual', 
                    message: error.message || "Error al iniciar sesión. Por favor, intenta nuevamente." 
                });
            }
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

                        <button type="submit" className="login-button">
                            Entrar
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