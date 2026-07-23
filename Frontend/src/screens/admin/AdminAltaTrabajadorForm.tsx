import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { workersAPI } from '../../services/api';
import { AiOutlineEye, AiOutlineEyeInvisible, AiOutlineUserAdd, AiOutlineCheckCircle, AiOutlineCopy } from 'react-icons/ai';
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

// ─── ESQUEMA DE VALIDACIÓN ZOD ───
const schema = z.object({
  nombre: z.string()
    .min(1, "El nombre completo es requerido")
    .min(3, "El nombre debe tener al menos 3 caracteres")
    .max(50, "El nombre no puede tener más de 50 caracteres")
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

const initials = (nombre: string) => {
  const partes = nombre.trim().split(/\s+/);
  return `${partes[0]?.[0] || ''}${partes[1]?.[0] || partes[0]?.[1] || ''}`.toUpperCase();
};

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copiado, setCopiado] = React.useState(false);
  const copiar = () => {
    navigator.clipboard.writeText(text);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };
  return (
    <button className={`altacod-copy${copiado ? ' altacod-copy--ok' : ''}`} onClick={copiar}>
      <AiOutlineCopy size={14} /> {copiado ? 'Copiado' : 'Copiar código'}
    </button>
  );
};

const AdminAltaTrabajadorForm: React.FC = () => {
  const navigate = useNavigate();
  const [codigoActivacion, setCodigoActivacion] = React.useState<{ codigo: string; nombre: string; email: string } | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onChange"
  });

  const [rolesEnum, setRolesEnum] = useState<string[]>([]);
  const [showPass, setShowPass] = useState(false);
  const [globalError, setGlobalError] = useState('');

  const currentNombre = watch("nombre", "");
  const currentEmail = watch("email", "");
  const currentRol = watch("rol", "");
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
        setCodigoActivacion({
          codigo: res.data?.codigoActivacion || '',
          nombre: res.data?.nombre || data.nombre,
          email: res.data?.email || data.email,
        });
      } else {
        setGlobalError(res.message || 'Error al registrar trabajador');
      }
    } catch (err: any) {
      setGlobalError(err.message || 'No se pudo conectar con el servidor');
    }
  };

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

  // ─── Modal código de activación ───
  if (codigoActivacion) {
    return (
      <div className="ae2-wrap ae2-wrap--center animate-in">
        <div className="altacod-modal">
          <div className="altacod-check"><AiOutlineCheckCircle size={28} /></div>

          <div className="altacod-head">
            <h2>Cuenta registrada</h2>
            <p><strong>{codigoActivacion.nombre}</strong> · {codigoActivacion.email}</p>
          </div>

          <p className="altacod-desc">
            Comparte el siguiente código con el usuario. Lo necesitará la primera vez que inicie sesión para activar su cuenta.
            <span className="altacod-once"> Solo se muestra una vez.</span>
          </p>

          <div className="altacod-box">
            <span className="altacod-label">Código de activación</span>
            <span className="altacod-value">{codigoActivacion.codigo}</span>
            <CopyButton text={codigoActivacion.codigo} />
          </div>

          <div className="altacod-steps">
            <div className="altacod-step"><span>1</span> El usuario inicia sesión con email y contraseña</div>
            <div className="altacod-step"><span>2</span> Ingresa este código de activación</div>
            <div className="altacod-step"><span>3</span> Recibe su código de acceso permanente y puede entrar al sistema</div>
          </div>

          <button className="ae2-btn-submit" style={{ width: '100%' }} onClick={() => navigate('/admin-trabajadores')}>
            Ir a la lista de personal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ae2-wrap animate-in">
      <div className="ae2-layout">
        {/* ── Panel de identidad: vista previa en vivo ── */}
        <aside className="ae2-identidad">
          <div className="ae2-identidad-avatar">{initials(currentNombre) || <AiOutlineUserAdd size={26} />}</div>
          <p className="ae2-identidad-nombre">{currentNombre || 'Nuevo trabajador'}</p>
          <p className="ae2-identidad-email">{currentEmail || 'sin-correo@ejemplo.com'}</p>
          {currentRol && (
            <span className="ae2-identidad-rol">{currentRol.charAt(0).toUpperCase() + currentRol.slice(1)}</span>
          )}
          <div className="ae2-identidad-nota">
            La cuenta se crea inactiva. Al registrar se genera un código de activación de un solo uso que deberás compartir con el usuario.
          </div>
        </aside>

        {/* ── Formulario en filas ── */}
        <div className="ae2-panel">
          <h1 className="ae2-titulo"><AiOutlineUserAdd size={22} /> Nuevo trabajador</h1>
          <p className="ae2-subtitulo">Da de alta una cuenta para el equipo</p>

          {globalError && <div className="ae2-error">{globalError}</div>}

          <form onSubmit={handleSubmit(onSubmit)} className="ae2-form" noValidate>
            <div className="ae2-fila">
              <label>Nombre completo <span className="ae2-req">*</span></label>
              <div>
                <input
                  type="text"
                  placeholder="Ej: María García"
                  maxLength={50}
                  {...nombreReg}
                  onChange={(e) => { handleNombreChange(e); nombreReg.onChange(e); }}
                />
                {errors.nombre && <small className="ae2-hint-err">{errors.nombre.message}</small>}
              </div>
            </div>

            <div className="ae2-fila">
              <label>Correo electrónico <span className="ae2-req">*</span></label>
              <div>
                <input
                  type="email"
                  placeholder="correo@joyeriadiana.com"
                  maxLength={60}
                  {...register("email")}
                />
                {errors.email && <small className="ae2-hint-err">{errors.email.message}</small>}
              </div>
            </div>

            <div className="ae2-fila">
              <label>Rol / Puesto <span className="ae2-req">*</span></label>
              <div>
                <select {...register("rol")}>
                  <option value="">— Selecciona un rol —</option>
                  {rolesEnum.map(rolStr => (
                    <option key={rolStr} value={rolStr}>
                      {rolStr.charAt(0).toUpperCase() + rolStr.slice(1)}
                    </option>
                  ))}
                </select>
                {errors.rol && <small className="ae2-hint-err">{errors.rol.message}</small>}
                {rolesEnum.length === 0 && !globalError && (
                  <small className="ae2-hint-err">No hay roles disponibles</small>
                )}
              </div>
            </div>

            <div className="ae2-fila">
              <label>Contraseña temporal <span className="ae2-req">*</span></label>
              <div>
                <div className="altacod-pass-wrap">
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder="Mínimo 8 caracteres"
                    maxLength={16}
                    {...passwordReg}
                    onChange={(e) => { handlePasswordChange(e); passwordReg.onChange(e); }}
                  />
                  <button
                    type="button"
                    className="altacod-pass-eye"
                    onClick={() => setShowPass(!showPass)}
                    tabIndex={-1}
                    aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPass ? <AiOutlineEyeInvisible size={18} /> : <AiOutlineEye size={18} />}
                  </button>
                </div>
                {errors.password && <small className="ae2-hint-err">{errors.password.message}</small>}
                {!errors.password && (
                  <small className="ae2-hint">8-16 caracteres, 1 mayúscula, 1 minúscula y 1 número.</small>
                )}
                {currentPassword && !errors.password && (
                  <div className="altacod-strength">
                    <div className="altacod-strength-bars">
                      {[1, 2, 3].map(n => (
                        <div key={n} className="altacod-strength-bar" style={{ background: n <= fuerza.n ? fuerza.color : 'rgba(255,255,255,0.1)' }} />
                      ))}
                    </div>
                    <span style={{ color: fuerza.color }}>{fuerza.label}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="ae2-acciones">
              <button type="button" className="ae2-btn-cancel" onClick={() => navigate('/admin-trabajadores')} disabled={isSubmitting}>
                Cancelar
              </button>
              <button type="submit" className="ae2-btn-submit" disabled={!isValid || isSubmitting}>
                {isSubmitting ? 'Creando cuenta...' : 'Confirmar alta'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminAltaTrabajadorForm;
