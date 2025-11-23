// Ruta:Joyeria-Diana-Laura/Frontend/src/screens/RegistroScreen.tsx
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "../styles/RegistroScreen.css";

const schema = z.object({
    nombre: z.string()
        .min(1, "El nombre completo es requerido")
        .min(2, "El nombre debe tener al menos 2 caracteres")
        .max(50, "El nombre no puede tener más de 50 caracteres")
        .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, "El nombre no puede contener símbolos especiales ni números")
        .refine((nombre) => !/^\s+$/.test(nombre), {
            message: "El nombre no puede contener solo espacios"
        })
        .refine((nombre) => !nombre.startsWith(' ') && !nombre.endsWith(' '), {
            message: "El nombre no puede comenzar ni terminar con espacios"
        }),
    email: z.string()
        .min(1, "El correo electrónico es requerido")
        .min(6, "El correo electrónico debe tener al menos 6 caracteres")
        .max(60, "El correo electrónico no puede tener más de 60 caracteres")
        .email("Correo electrónico inválido")
        .regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Formato de email inválido"),
    password: z.string()
        .min(1, "La contraseña es requerida")
        .min(8, "La contraseña debe tener al menos 8 caracteres")
        .max(16, "La contraseña no puede tener más de 16 caracteres")
        .regex(/[A-Z]/, "La contraseña debe contener al menos una letra mayúscula")
        .regex(/[a-z]/, "La contraseña debe contener al menos una letra minúscula")
        .regex(/\d/, "La contraseña debe contener al menos un número")
        .regex(/^\S*$/, "La contraseña no puede contener espacios")
        .refine((password) => !password.includes(' '), {
            message: "La contraseña no puede contener espacios"
        }),
    confirmPassword: z.string()
        .min(1, "La confirmación de contraseña es requerida"),
    acceptTerms: z.boolean()
        .refine((val) => val === true, {
            message: "Debes aceptar los términos y condiciones para registrarte"
        })
}).refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"]
});

type FormData = z.infer<typeof schema>;

export default function RegistroScreen() {
    const navigate = useNavigate();
    const { register } = useAuth();
    const { register: formRegister, handleSubmit, formState: { errors }, setError } = useForm<FormData>({ 
        resolver: zodResolver(schema) 
    });
    
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleNombreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const cleanedValue = value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
        if (value !== cleanedValue) {
            e.target.value = cleanedValue;
        }
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const cleanedValue = value.replace(/\s/g, '');
        if (value !== cleanedValue) {
            e.target.value = cleanedValue;
        }
    };

    const onSubmit = async (data: FormData) => {
        try {
            await register(data.email, data.password, data.nombre);
            alert("✅ Usuario registrado correctamente. Revisa tu email para verificar tu cuenta antes de iniciar sesión.");
            navigate("/login");
        } catch (error: any) {
            setError('root', { 
                type: 'manual', 
                message: error.message 
            });
        }
    };

    return (
        <div className="register-container">
            <div className="register-card">
                <div className="register-header">
                    <h2>Crear Cuenta</h2>
                    <p>Regístrate en Joyería Diana Laura</p>
                </div>
                
                {errors.root && (
                    <div className="error-message">
                        {errors.root.message}
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="register-form">
                    <div className="register-form-group">
                        <label htmlFor="nombre">Nombre completo</label>
                        <input 
                            id="nombre"
                            type="text"
                            placeholder="Tu nombre completo (mín. 2 caracteres, solo letras)"
                            className={`register-input ${errors.nombre ? 'error' : ''}`}
                            {...formRegister("nombre")} 
                            maxLength={50}
                            onChange={handleNombreChange}
                        />
                        {errors.nombre && (
                            <span className="register-error">{errors.nombre.message}</span>
                        )}
                        <div className="field-requirements">
                            <ul className="requirements-list">
                                <li>Mínimo 2 caracteres</li>
                                <li>Máximo 50 caracteres</li>
                                <li>Solo letras (A-Z, a-z, áéíóú, ñ)</li>
                                <li>Se permiten espacios entre nombres</li>
                                <li>No símbolos especiales (#, $, %, 1, 2, 3, etc.)</li>
                            </ul>
                        </div>
                    </div>

                    <div className="register-form-group">
                        <label htmlFor="email">Correo electrónico</label>
                        <input 
                            id="email"
                            type="email"
                            placeholder="tu@email.com (máx. 60 caracteres)"
                            className={`register-input ${errors.email ? 'error' : ''}`}
                            {...formRegister("email")} 
                            maxLength={60}
                        />
                        {errors.email && (
                            <span className="register-error">{errors.email.message}</span>
                        )}
                    </div>

                    <div className="register-form-group">
                        <label htmlFor="password">Contraseña</label>
                        <div className="password-input-container">
                            <input 
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="Ej: Pass123 (8-16 caracteres, sin espacios)"
                                className={`register-input password-input ${errors.password ? 'error' : ''}`}
                                {...formRegister("password")} 
                                maxLength={16}
                                onChange={handlePasswordChange}
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
                            <span className="register-error">{errors.password.message}</span>
                        )}
                        <div className="password-requirements">
                            <strong>DEBE CUMPLIR TODOS ESTOS REQUISITOS:</strong>
                            <ul className="requirements-list">
                                <li>8-16 caracteres exactamente</li>
                                <li>Al menos 1 letra MAYÚSCULA (A-Z)</li>
                                <li>Al menos 1 letra minúscula (a-z)</li>
                                <li>Al menos 1 número (0-9)</li>
                                <li>SIN espacios en blanco</li>
                                <li>SIN símbolos especiales (#, @, $, %, etc.)</li>
                            </ul>
                        </div>
                    </div>

                    <div className="register-form-group">
                        <label htmlFor="confirmPassword">Confirmar Contraseña</label>
                        <div className="password-input-container">
                            <input 
                                id="confirmPassword"
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Repite tu contraseña"
                                className={`register-input password-input ${errors.confirmPassword ? 'error' : ''}`}
                                {...formRegister("confirmPassword")} 
                                maxLength={16}
                                onChange={handlePasswordChange}
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
                            <span className="register-error">{errors.confirmPassword.message}</span>
                        )}
                    </div>

                    <div className="terms-container">
                        <div className="terms-content">
                            <h4>Términos y Condiciones</h4>
                            <div className="terms-text">
                                <p>Al registrarte en Joyería Diana Laura, aceptas:</p>
                                <ul>
                                    <li>Nuestros términos de servicio y políticas de privacidad</li>
                                    <li>El tratamiento de tus datos personales según la ley aplicable</li>
                                    <li>Recibir comunicaciones relacionadas con tu cuenta</li>
                                    <li>Responsabilizarte por la seguridad de tu cuenta y contraseña</li>
                                </ul>
                                <p>Para más información, consulta nuestras políticas completas en nuestro sitio web.</p>
                            </div>
                        </div>
                        <label className="terms-checkbox">
                            <input 
                                type="checkbox" 
                                {...formRegister("acceptTerms")}
                            />
                            <span className="checkmark"></span>
                            Acepto los términos y condiciones
                        </label>
                        {errors.acceptTerms && (
                            <span className="register-error">{errors.acceptTerms.message}</span>
                        )}
                        <div className="field-requirements">
                            <ul className="requirements-list">
                                <li>Debes aceptar los términos y condiciones para registrarte</li>
                            </ul>
                        </div>
                    </div>

                    <button type="submit" className="register-button">
                        Crear Cuenta
                    </button>
                </form>

                <div className="register-links">
                    <Link to="/login" className="register-link">
                        ¿Ya tienes cuenta? Inicia sesión aquí
                    </Link>
                </div>
            </div>
        </div>
    );
}