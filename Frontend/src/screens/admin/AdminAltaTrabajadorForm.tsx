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
    /;\s*(?:DROP|DELETE|TRUNCATE|UPDATE|INSERT)\b/i,
    /('\s*OR\s*'.*'='|'\s*OR\s*1\s*=\s*1)/i,
    /"\s*OR\s*"\s*=\s*"/i,
    /(`|%27|%23)/i,
  ];
  return !sqlInjectionPatterns.some(p => p.test(value));
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
  return !xssPatterns.some(p => p.test(value));
};

// ─── ESQUEMA DE VALIDACIÓN ZOD (Ajustado a 50 caracteres) ───
const schema = z.object({
  nombre: z.string()
    .min(1, "El nombre completo es requerido")
    .min(3, "El nombre debe tener al menos 3 caracteres")
    .max(50, "El nombre no puede tener más de 50 caracteres") // ← Coincide con backend
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, "El nombre solo puede contener letras")
    .refine(val => !/^\s+$/.test(val), "El nombre no puede contener solo espacios")
    .refine(val => !val.startsWith(' ') && !val.endsWith(' '), "Sin espacios al inicio o final")
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

  const { 
    register, 
    handleSubmit, 
    watch, 
    formState: { errors, isValid, isSubmitting }, 
    setError 
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onChange"
  });

  const [rolesEnum, setRolesEnum] = useState<string[]>([]);
  const [showPass, setShowPass] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const currentPassword = watch("password", "");

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const data = await workersAPI.getRoles(); 
        const roles = Array.isArray(data) ? data : data?.roles || [];
        setRolesEnum(roles);
        if (roles.length === 0) {
          setGlobalError("No hay roles disponibles. Contacte al administrador.");
        }
      } catch (err) {
        console.error("Error al cargar roles:", err);
        setGlobalError("Error al cargar los roles. Intente de nuevo.");
      }
    };
    fetchRoles();
  }, []);

  // Handlers de sanitización
  const handleNombreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
    if (cleaned !== e.target.value) e.target.value = cleaned;
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/\s/g, '');
    if (cleaned !== e.target.value) e.target.value = cleaned;
  };

  const onSubmit = async (data: FormData) => {
    setGlobalError('');
    try {
      const res = await workersAPI.create({
        nombre: data.nombre,
        email: data.email,
        rol: data.rol, 
        password: data.password,
      });
      if (res.success) {
        navigate('/admin-trabajadores');
      } else {
        setGlobalError(res.message || 'Error al registrar trabajador');
      }
    } catch (err: any) {
      setGlobalError(err.message || 'No se pudo conectar con el servidor');
    }
  };

  // Fortaleza de contraseña
  const passwordStrength = () => {
    if (!currentPassword) return { n: 0, label: '', color: '' };
    let score = 0;
    if (currentPassword.length >= 8) score++;
    if (/[A-Z]/.test(currentPassword)) score++;
    if (/[0-9]/.test(currentPassword)) score++;
    if (/[^A-Za-z0-9]/.test(currentPassword)) score++;
    
    if (score <= 1) return { n: 1, label: 'Débil', color: '#f87171' };
    if (score <= 2) return { n: 2, label: 'Regular', color: '#fbbf24' };
    return { n: 3, label: 'Fuerte', color: '#86efac' };
  };
  const fuerza = passwordStrength();

  const nombreReg = register("nombre");
  const passwordReg = register("password");

  // Íconos SVG para el ojo
  const EyeIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
  const EyeOffIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );

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
              {rolesEnum.length === 0 && !globalError && (
                <span className="alta-field-err">No hay roles disponibles</span>
              )}
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
                  onClick={() => setShowPass(!showPass)}
                  tabIndex={-1}
                  aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPass ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>

              {(focusedField === 'password' || errors.password) && (
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '0.2rem', marginTop: '0.3rem', lineHeight: '1.4' }}>
                  <strong>Requiere:</strong> 8-16 chars, 1 Mayúscula, 1 Minúscula y 1 Número.
                </div>
              )}

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
            <button type="button" className="alta-btn-cancel" onClick={() => navigate('/admin-trabajadores')} disabled={isSubmitting}>
              Cancelar
            </button>
            <button type="submit" className="alta-btn-submit" disabled={!isValid || isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="alta-spin" />
                  Creando cuenta...
                </>
              ) : (
                'Confirmar Alta Segura'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminAltaTrabajadorForm;