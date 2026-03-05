// Ruta: Joyeria-Diana-Laura/Frontend/src/screens/RegistroScreen.tsx
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import PublicHeader from "../../components/PublicHeader";
import PublicFooter from "../../components/PublicFooter";
import { securityQuestionAPI } from "../../services/securityQuestionAPI";
import "./RegistroScreen.css";

// FUNCIONES DE VALIDACIÓN PARA PREVENIR INYECCIONES
const validateNoSQLInjection = (value: string) => {
    if (!value) return true;
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
        if (pattern.test(value)) return false;
    }
    return true;
};

const validateNoXSS = (value: string) => {
    if (!value) return true;
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
        if (pattern.test(value)) return false;
    }
    return true;
};

const schema = z.object({
    nombre: z.string()
        .min(1, "El nombre completo es requerido")
        .min(3, "El nombre debe tener al menos 3 caracteres")
        .max(30, "El nombre no puede tener más de 30 caracteres")
        .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, "El nombre no puede contener símbolos especiales ni números")
        .refine((nombre) => !/^\s+$/.test(nombre), { message: "El nombre no puede contener solo espacios" })
        .refine((nombre) => !nombre.startsWith(' ') && !nombre.endsWith(' '), { message: "El nombre no puede comenzar ni terminar con espacios" })
        .refine(validateNoSQLInjection, "El nombre contiene caracteres no permitidos")
        .refine(validateNoXSS, "El nombre contiene caracteres no permitidos"),
    email: z.string()
        .min(1, "El correo electrónico es requerido")
        .min(6, "El correo electrónico debe tener al menos 6 caracteres")
        .max(60, "El correo electrónico no puede tener más de 60 caracteres")
        .email("Correo electrónico inválido")
        .regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Formato de email inválido")
        .refine(validateNoSQLInjection, "El correo contiene caracteres no permitidos")
        .refine(validateNoXSS, "El correo contiene caracteres no permitidos"),
    password: z.string()
        .min(1, "La contraseña es requerida")
        .min(8, "La contraseña debe tener al menos 8 caracteres")
        .max(16, "La contraseña no puede tener más de 16 caracteres")
        .regex(/[A-Z]/, "La contraseña debe contener al menos una letra mayúscula")
        .regex(/[a-z]/, "La contraseña debe contener al menos una letra minúscula")
        .regex(/\d/, "La contraseña debe contener al menos un número")
        .regex(/^\S*$/, "La contraseña no puede contener espacios")
        .refine((password) => !password.includes(' '), { message: "La contraseña no puede contener espacios" })
        .refine(validateNoXSS, "La contraseña contiene caracteres no permitidos"),
    confirmPassword: z.string()
        .min(1, "La confirmación de contraseña es requerida"),
    questionType: z.string()
        .min(1, "Debes seleccionar un tipo de pregunta"),
    customQuestion: z.string().optional(),
    securityAnswer: z.string()
        .min(1, "La respuesta secreta es requerida")
        .min(2, "La respuesta debe tener al menos 2 caracteres")
        .max(100, "La respuesta no puede tener más de 100 caracteres")
        .refine((answer) => !answer.startsWith(' ') && !answer.endsWith(' '), { message: "La respuesta no puede comenzar ni terminar con espacios" })
        .refine(validateNoSQLInjection, "La respuesta contiene caracteres no permitidos")
        .refine(validateNoXSS, "La respuesta contiene caracteres no permitidos"),
    acceptTerms: z.boolean()
        .refine((val) => val === true, { message: "Debes aceptar los términos y condiciones para registrarte" })
}).refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"]
}).refine((data) => {
    if (data.questionType === 'custom') {
        return data.customQuestion && data.customQuestion.trim().length >= 5;
    }
    return true;
}, {
    message: "La pregunta personalizada debe tener al menos 5 caracteres",
    path: ["customQuestion"]
});

type FormData = z.infer<typeof schema>;

export default function RegistroScreen() {
    const navigate = useNavigate();
    const { register } = useAuth();
    const { 
        register: formRegister, 
        handleSubmit, 
        formState: { errors }, 
        setError, 
        watch,
        trigger
    } = useForm<FormData>({ 
        resolver: zodResolver(schema) 
    });
    
    // ESTADOS
    const [step, setStep] = useState(1);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [predefinedQuestions, setPredefinedQuestions] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    
    // ESTADO PARA SABER QUÉ INPUT ESTÁ SELECCIONADO (Foco)
    const [focusedField, setFocusedField] = useState<string | null>(null);

    const questionType = watch('questionType');
    const customQuestion = watch('customQuestion');
    const securityAnswer = watch('securityAnswer');

    useEffect(() => {
        const loadQuestions = async () => {
            try {
                const response = await securityQuestionAPI.getSecureQuestions();
                if (response.success) {
                    setPredefinedQuestions(response.data.questions);
                } else {
                    setPredefinedQuestions([
                        "¿Cuál era el nombre de tu primera mascota?",
                        "¿En qué ciudad conociste a tu mejor amigo/a?",
                        "¿Cuál es el nombre de tu profesor favorito de la primaria?",
                        "¿Cuál era tu comida favorita en la infancia?",
                        "¿Cuál es el nombre del hospital donde naciste?"
                    ]);
                }
            } catch (error) {
                console.error('Error cargando preguntas:', error);
                setPredefinedQuestions([
                    "¿Cuál era el nombre de tu primera mascota?",
                    "¿En qué ciudad conociste a tu mejor amigo/a?",
                    "¿Cuál es el nombre de tu profesor favorito de la primaria?",
                    "¿Cuál era tu comida favorita en la infancia?",
                    "¿Cuál es el nombre del hospital donde naciste?"
                ]);
            }
        };
        loadQuestions();
    }, []);

    const handleNombreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const cleanedValue = value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
        if (value !== cleanedValue) e.target.value = cleanedValue;
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const cleanedValue = value.replace(/\s/g, '');
        if (value !== cleanedValue) e.target.value = cleanedValue;
    };

    const handleSecurityAnswerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const cleanedValue = value.trimStart();
        if (value !== cleanedValue) e.target.value = cleanedValue;
    };

    const nextStep = async () => {
        const isStep1Valid = await trigger(['nombre', 'email', 'password', 'confirmPassword']);
        if (isStep1Valid) setStep(2);
    };

    const prevStep = () => {
        setStep(1);
    };

    const onSubmit = async (data: FormData) => {
        setLoading(true);
        try {
            await register(
                data.email, 
                data.password, 
                data.nombre, 
                data.questionType, 
                data.customQuestion || '', 
                data.securityAnswer
            );
            alert("✅ Usuario registrado correctamente. Revisa tu email para verificar tu cuenta antes de iniciar sesión.");
            navigate("/login");
        } catch (error: any) {
            setError('root', { type: 'manual', message: error.message });
        } finally {
            setLoading(false);
        }
    };

    // Desestructuramos los registros para poder combinar los eventos OnChange y OnBlur sin romper Zod
    const nombreReg = formRegister("nombre");
    const passwordReg = formRegister("password");
    const securityAnswerReg = formRegister("securityAnswer");

    return (
        <div className="register-page-wrapper">
            <PublicHeader />
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
                    
                    {/* --- VENTANA 1: DATOS PERSONALES Y CUENTA --- */}
                    {step === 1 && (
                        <div className="form-step-container">
                            <div className="step-indicator">Paso 1 de 2: Información de cuenta</div>
                            
                            <div className="register-form-group">
                                <label htmlFor="nombre">Nombre completo</label>
                                <input 
                                    id="nombre"
                                    type="text"
                                    placeholder="Tu nombre completo"
                                    className={`register-input ${errors.nombre ? 'error' : ''}`}
                                    maxLength={50}
                                    {...nombreReg}
                                    onFocus={() => setFocusedField('nombre')}
                                    onBlur={(e) => {
                                        nombreReg.onBlur(e);
                                        setFocusedField(null);
                                    }}
                                    onChange={(e) => {
                                        handleNombreChange(e);
                                        nombreReg.onChange(e);
                                    }}
                                />
                                {errors.nombre && <span className="register-error">{errors.nombre.message}</span>}
                                
                                {/* SE MUESTRA AL ENFOCAR O EN CASO DE ERROR */}
                                {(focusedField === 'nombre' || errors.nombre) && (
                                    <div className="field-requirements" style={{ animation: 'fadeInStep 0.3s ease' }}>
                                        <ul className="requirements-list">
                                            <li>Mínimo 3 caracteres y solo letras</li>
                                            <li>Se permiten espacios entre nombres</li>
                                        </ul>
                                    </div>
                                )}
                            </div>

                            <div className="register-form-group">
                                <label htmlFor="email">Correo electrónico</label>
                                <input 
                                    id="email"
                                    type="email"
                                    placeholder="tu@email.com"
                                    className={`register-input ${errors.email ? 'error' : ''}`}
                                    {...formRegister("email")} 
                                    maxLength={60}
                                />
                                {errors.email && <span className="register-error">{errors.email.message}</span>}
                            </div>

                            <div className="register-form-group">
                                <label htmlFor="password">Contraseña</label>
                                <div className="password-input-container">
                                    <input 
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Ej: Pass123"
                                        className={`register-input password-input ${errors.password ? 'error' : ''}`}
                                        maxLength={16}
                                        {...passwordReg}
                                        onFocus={() => setFocusedField('password')}
                                        onBlur={(e) => {
                                            passwordReg.onBlur(e);
                                            setFocusedField(null);
                                        }}
                                        onChange={(e) => {
                                            handlePasswordChange(e);
                                            passwordReg.onChange(e);
                                        }}
                                    />
                                    {/* 🔥 BOTÓN MODIFICADO CON preventDefault() 🔥 */}
                                    <button 
                                        type="button"
                                        className="password-toggle"
                                        onMouseDown={(e) => {
                                            e.preventDefault(); 
                                            setShowPassword(!showPassword);
                                        }}
                                    >
                                        {showPassword ? "🙈" : "👁️"}
                                    </button>
                                </div>
                                {errors.password && <span className="register-error">{errors.password.message}</span>}
                                
                                {/* SE MUESTRA AL ENFOCAR O EN CASO DE ERROR */}
                                {(focusedField === 'password' || errors.password) && (
                                    <div className="password-requirements" style={{ animation: 'fadeInStep 0.3s ease' }}>
                                        <strong>DEBE CUMPLIR ESTOS REQUISITOS:</strong>
                                        <ul className="requirements-list">
                                            <li>8-16 caracteres, sin espacios ni símbolos especiales</li>
                                            <li>Al menos 1 letra MAYÚSCULA, 1 minúscula y 1 número</li>
                                        </ul>
                                    </div>
                                )}
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
                                    {/* 🔥 BOTÓN MODIFICADO CON preventDefault() 🔥 */}
                                    <button 
                                        type="button"
                                        className="password-toggle"
                                        onMouseDown={(e) => {
                                            e.preventDefault(); 
                                            setShowConfirmPassword(!showConfirmPassword);
                                        }}
                                    >
                                        {showConfirmPassword ? "🙈" : "👁️"}
                                    </button>
                                </div>
                                {errors.confirmPassword && <span className="register-error">{errors.confirmPassword.message}</span>}
                            </div>

                            <button type="button" className="register-button" onClick={nextStep}>
                                Siguiente Paso ➜
                            </button>
                        </div>
                    )}

                    {/* --- VENTANA 2: PREGUNTA SECRETA Y TÉRMINOS --- */}
                    {step === 2 && (
                        <div className="form-step-container">
                            <div className="step-indicator">Paso 2 de 2: Seguridad y finalización</div>

                            <div className="security-question-section">
                                <h3>🔒 Pregunta Secreta</h3>
                                <p>Te ayudará a recuperar tu cuenta si olvidas tu contraseña</p>

                                <div className="register-form-group">
                                    <label htmlFor="questionType">Selecciona una pregunta:</label>
                                    <select 
                                        id="questionType"
                                        className={`register-input ${errors.questionType ? 'error' : ''}`}
                                        {...formRegister("questionType")}
                                    >
                                        <option value="">-- Selecciona una pregunta --</option>
                                        <option value="0">{predefinedQuestions[0] || 'Cargando...'}</option>
                                        <option value="1">{predefinedQuestions[1] || 'Cargando...'}</option>
                                        <option value="2">{predefinedQuestions[2] || 'Cargando...'}</option>
                                        <option value="3">{predefinedQuestions[3] || 'Cargando...'}</option>
                                        <option value="4">{predefinedQuestions[4] || 'Cargando...'}</option>
                                        <option value="custom">✏️ Definir pregunta personalizada</option>
                                    </select>
                                    {errors.questionType && <span className="register-error">{errors.questionType.message}</span>}
                                </div>

                                {questionType === 'custom' && (
                                    <div className="register-form-group">
                                        <input 
                                            id="customQuestion"
                                            type="text"
                                            placeholder="Escribe tu pregunta personalizada (mín. 5 caracteres)"
                                            className={`register-input ${errors.customQuestion ? 'error' : ''}`}
                                            {...formRegister("customQuestion")}
                                            maxLength={200}
                                        />
                                        {errors.customQuestion && <span className="register-error">{errors.customQuestion.message}</span>}
                                        <div className="character-count">{customQuestion?.length || 0}/200 caracteres</div>
                                    </div>
                                )}

                                <div className="register-form-group">
                                    <label htmlFor="securityAnswer">Tu respuesta:</label>
                                    <input 
                                        id="securityAnswer"
                                        type="text"
                                        placeholder="Escribe tu respuesta secreta"
                                        className={`register-input ${errors.securityAnswer ? 'error' : ''}`}
                                        maxLength={100}
                                        {...securityAnswerReg}
                                        onFocus={() => setFocusedField('securityAnswer')}
                                        onBlur={(e) => {
                                            securityAnswerReg.onBlur(e);
                                            setFocusedField(null);
                                        }}
                                        onChange={(e) => {
                                            handleSecurityAnswerChange(e);
                                            securityAnswerReg.onChange(e);
                                        }}
                                    />
                                    {errors.securityAnswer && <span className="register-error">{errors.securityAnswer.message}</span>}
                                    <div className="character-count">{securityAnswer?.length || 0}/100 caracteres</div>

                                    {/* SE MUESTRA AL ENFOCAR O EN CASO DE ERROR */}
                                    {(focusedField === 'securityAnswer' || errors.securityAnswer) && (
                                        <div className="security-tips" style={{ animation: 'fadeInStep 0.3s ease' }}>
                                            <p><strong>💡 Consejos para una respuesta segura:</strong></p>
                                            <ul>
                                                <li>Usa respuestas que solo tú conozcas y evita información pública.</li>
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* CAJA DE TÉRMINOS Y CONDICIONES COMPACTA CON SCROLL */}
                            <div className="terms-container">
                                <h4 style={{ color: '#ECB2C3', marginBottom: '10px' }}>Términos y Condiciones</h4>
                                <div style={{ 
                                    maxHeight: '90px', 
                                    overflowY: 'auto', 
                                    padding: '12px', 
                                    background: 'rgba(0,0,0,0.3)', 
                                    borderRadius: '8px',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    fontSize: '0.8rem',
                                    color: '#D9D9D9',
                                    marginBottom: '15px'
                                }}>
                                    <p style={{marginBottom: '5px'}}>Al registrarte en Joyería Diana Laura, aceptas:</p>
                                    <ul style={{ paddingLeft: '20px', margin: 0 }}>
                                        <li>Nuestros términos de servicio y políticas de privacidad.</li>
                                        <li>El tratamiento de tus datos personales según la ley aplicable.</li>
                                        <li>Recibir comunicaciones relacionadas con tu cuenta.</li>
                                        <li>Responsabilizarte por la seguridad de tu cuenta y contraseña.</li>
                                    </ul>
                                </div>

                                <label className="terms-checkbox">
                                    <input type="checkbox" {...formRegister("acceptTerms")} />
                                    <span className="checkmark"></span>
                                    Acepto los términos y condiciones
                                </label>
                                {errors.acceptTerms && <span className="register-error">{errors.acceptTerms.message}</span>}
                            </div>

                            <div className="step-actions">
                                <button type="button" className="back-button" onClick={prevStep}>
                                    ⬅ Volver
                                </button>
                                <button type="submit" className="register-button" disabled={loading} style={{ marginTop: '0' }}>
                                    {loading ? 'Registrando...' : 'Crear Cuenta'}
                                </button>
                            </div>
                        </div>
                    )}
                </form>

                <div className="register-links">
                    <Link to="/login" className="register-link">
                        ¿Ya tienes cuenta? Inicia sesión aquí
                    </Link>
                </div>
            </div>
            </div>
            <PublicFooter />
        </div>
    );
}