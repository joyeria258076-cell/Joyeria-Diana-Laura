import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { workersAPI } from '../../services/api';
import './AdminAltaTrabajadorForm.css';

// ─── FUNCIONES DE VALIDACIÓN PARA PREVENIR INYECCIONES ───
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

// ─── ESQUEMA DE VALIDACIÓN ZOD ───
const schema = z.object({
  nombre: z.string()
    .min(1, "El nombre completo es requerido")
    .min(3, "El nombre debe tener al menos 3 caracteres")
    .max(50, "El nombre no puede tener más de 50 caracteres")
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, "El nombre solo puede contener letras")
    .refine((nombre) => !/^\s+$/.test(nombre), { message: "El nombre no puede contener solo espacios" })
    .refine((nombre) => !nombre.startsWith(' ') && !nombre.endsWith(' '), { message: "Sin espacios al inicio o final" })
    .refine(validateNoSQLInjection, "Caracteres no permitidos detectados")
    .refine(validateNoXSS, "Caracteres no permitidos detectados"),
  
  email: z.string()
    .min(1, "El correo electrónico es requerido")
    .email("Correo electrónico inválido")
    .regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Formato de email inválido")
    .refine(validateNoSQLInjection, "Caracteres no permitidos detectados")
    .refine(validateNoXSS, "Caracteres no permitidos detectados"),
  
  rol: z.string()
    .min(1, "Debes seleccionar un rol para el trabajador"),
  
  password: z.string()
    .min(1, "La contraseña es requerida")
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(16, "La contraseña no puede tener más de 16 caracteres")
    .regex(/[A-Z]/, "Debe contener al menos una letra mayúscula")
    .regex(/[a-z]/, "Debe contener al menos una letra minúscula")
    .regex(/\d/, "Debe contener al menos un número")
    .regex(/^\S*$/, "La contraseña no puede contener espacios")
    .refine(validateNoXSS, "Caracteres no permitidos detectados"),
});

type FormData = z.infer<typeof schema>;

const AdminAltaTrabajadorForm: React.FC = () => {
  const navigate = useNavigate();

  // ─── CONFIGURACIÓN DE REACT-HOOK-FORM + ZOD ───
  const { 
    register, 
    handleSubmit, 
    watch, 
    formState: { errors }, 
    setError 
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onChange" // Valida en tiempo real
  });

  const [rolesEnum, setRolesEnum] = useState<string[]>([]);
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Observamos la contraseña para la barra de fortaleza
  const currentPassword = watch("password", "");

  // ─── CARGAR ROLES DE LA BD ───
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const data = await workersAPI.getRoles(); 
        if (Array.isArray(data)) {
          setRolesEnum(data);
        } else if (data && data.roles) {
          setRolesEnum(data.roles);
        }
      } catch (err) {
        console.error("Error al cargar roles:", err);
        setGlobalError("Aún no hay roles disponibles en el servidor.");
      }
    };
    fetchRoles();
  }, []);

  // ─── HANDLERS DE SANITIZACIÓN ───
  const handleNombreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cleanedValue = value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
    if (value !== cleanedValue) e.target.value = cleanedValue;
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cleanedValue = value.replace(/\s/g, ''); // Sin espacios
    if (value !== cleanedValue) e.target.value = cleanedValue;
  };

  // ─── SUBMIT AL BACKEND ───
  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    setGlobalError('');
    try {
      const res = await workersAPI.create({
        nombre:   data.nombre,
        email:    data.email,
        rol:   data.rol, 
        password: data.password,
      });
      if (res.success) {
        navigate('/admin-trabajadores');
      } else {
        setGlobalError(res.message || 'Error al registrar trabajador');
      }
    } catch (err: any) {
      setGlobalError(err.message || 'No se pudo conectar con el servidor');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── HELPER DE FORTALEZA DE CONTRASEÑA ───
  const passwordFortaleza = () => {
    if (!currentPassword) return { n: 0, label: '', color: '' };
    let score = 0;
    if (currentPassword.length >= 8)  score++;
    if (/[A-Z]/.test(currentPassword)) score++;
    if (/[0-9]/.test(currentPassword)) score++;
    if (/[^A-Za-z0-9]/.test(currentPassword)) score++;
    
    if (score <= 1) return { n: 1, label: 'Débil',    color: '#f87171' };
    if (score <= 2) return { n: 2, label: 'Regular',  color: '#fbbf24' };
    return             { n: 3, label: 'Fuerte',   color: '#86efac' };
  };
  const fuerza = passwordFortaleza();

  // Extraemos funciones del register para combinarlas con nuestros sanitizadores
  const nombreReg = register("nombre");
  const passwordReg = register("password");

  return (
    <div className="alta-wrap animate-in">
      <div className="alta-breadcrumb">
        <button className="alta-back-btn" onClick={() => navigate('/admin-trabajadores')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Panel de Personal
        </button>
        <span className="alta-breadcrumb-sep">›</span>
        <span className="alta-breadcrumb-current">Nuevo Trabajador</span>
      </div>

      <div className="alta-card">
        <div className="alta-card-header">
          <div className="alta-card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="26" height="26">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><path d="M16 11l2 2 4-4" strokeWidth="2"/>
            </svg>
          </div>
          <div className="alta-card-titles">
            <h2 className="alta-card-title">Registro de Personal</h2>
            <p className="alta-card-sub">Acceso Seguro con Validación Anti-Inyección</p>
          </div>
        </div>

        {globalError && (
          <div className="alta-global-error">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>{globalError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="alta-form" noValidate>
          
          <div className="alta-form-grid">
            
            {/* NOMBRE COMPLETO */}
            <div className={`alta-field ${errors.nombre ? 'has-error' : ''}`}>
              <label className="alta-label">Nombre Completo <span className="req">*</span></label>
              <input 
                type="text" 
                className="alta-input" 
                placeholder="Ej: María García" 
                maxLength={50}
                {...nombreReg}
                onFocus={() => setFocusedField('nombre')}
                onBlur={(e) => { nombreReg.onBlur(e); setFocusedField(null); }}
                onChange={(e) => {
                  handleNombreChange(e);
                  nombreReg.onChange(e);
                }}
              />
              {errors.nombre && <span className="alta-field-err">{errors.nombre.message}</span>}
              {focusedField === 'nombre' && !errors.nombre && (
                <span style={{ fontSize: '0.7rem', color: 'var(--gold)', marginLeft: '0.2rem' }}>Solo letras, sin números ni símbolos.</span>
              )}
            </div>

            {/* EMAIL */}
            <div className={`alta-field ${errors.email ? 'has-error' : ''}`}>
              <label className="alta-label">Correo Electrónico <span className="req">*</span></label>
              <input 
                type="email" 
                className="alta-input" 
                placeholder="correo@joyeriadiana.com" 
                maxLength={60}
                {...register("email")}
              />
              {errors.email && <span className="alta-field-err">{errors.email.message}</span>}
            </div>

            {/* ROL / PUESTO */}
            <div className={`alta-field ${errors.rol ? 'has-error' : ''}`}>
              <label className="alta-label">Rol / Puesto <span className="req">*</span></label>
              <select className="alta-input alta-select" {...register("rol")}>
                <option value="">— Selecciona un rol —</option>
                {rolesEnum.map(rolStr => (
                  <option key={rolStr} value={rolStr}>
                    {rolStr.charAt(0).toUpperCase() + rolStr.slice(1)}
                  </option>
                ))}
              </select>
              {errors.rol && <span className="alta-field-err">{errors.rol.message}</span>}
            </div>

            {/* CONTRASEÑA */}
            <div className={`alta-field ${errors.password ? 'has-error' : ''}`}>
              <label className="alta-label">Contraseña Temporal <span className="req">*</span></label>
              <div className="alta-pass-wrap">
                <input 
                  type={showPass ? 'text' : 'password'} 
                  className="alta-input" 
                  placeholder="Mínimo 8 caracteres" 
                  maxLength={16}
                  {...passwordReg}
                  onFocus={() => setFocusedField('password')}
                  onBlur={(e) => { passwordReg.onBlur(e); setFocusedField(null); }}
                  onChange={(e) => {
                    handlePasswordChange(e);
                    passwordReg.onChange(e);
                  }}
                />
                <button 
                  type="button" 
                  className="alta-pass-eye" 
                  onMouseDown={(e) => { e.preventDefault(); setShowPass(!showPass); }}
                  tabIndex={-1}
                >
                  {showPass ? "🙈" : "👁️"}
                </button>
              </div>

              {/* Indicador de requisitos al hacer focus */}
              {(focusedField === 'password' || errors.password) && (
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '0.2rem', marginTop: '0.3rem', lineHeight: '1.4' }}>
                  <strong>Requiere:</strong> 8-16 chars, 1 Mayúscula, 1 Minúscula y 1 Número.
                </div>
              )}

              {/* Barra de fortaleza */}
              {currentPassword && !errors.password && (
                <div className="alta-strength">
                  <div className="alta-strength-bars">
                    {[1, 2, 3].map(n => (
                      <div key={n} className="alta-strength-bar" style={{ background: n <= fuerza.n ? fuerza.color : 'rgba(255,255,255,0.1)', transition: 'background 0.3s ease' }} />
                    ))}
                  </div>
                  <span className="alta-strength-label" style={{ color: fuerza.color }}>{fuerza.label}</span>
                </div>
              )}
            </div>

          </div>

          <div className="alta-actions">
            <button type="button" className="alta-btn-cancel" onClick={() => navigate('/admin-trabajadores')} disabled={submitting}>
              Cancelar
            </button>
            <button type="submit" className="alta-btn-submit" disabled={submitting}>
              {submitting ? <><span className="alta-spin" /> Creando cuenta...</> : 'Confirmar Alta Segura'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default AdminAltaTrabajadorForm;