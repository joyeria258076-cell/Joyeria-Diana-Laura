// Ruta:Joyeria-Diana-Laura/Frontend/src/contexts/AuthContext.tsx

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { authAPI } from '../services/api';
import { initializeApp } from 'firebase/app';
import { securityQuestionAPI } from '../services/securityQuestionAPI';

import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail as firebaseSendPasswordReset,
  applyActionCode,
  checkActionCode,
  updateProfile,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
auth.languageCode = 'es';

interface User {
  id: string; // Firebase UID
  email: string;
  nombre: string;
  dbId?: number; // 🆕 ID numérico de PostgreSQL
}

// 🆕 INTERFAZ para sesiones activas
interface ActiveSession {
  id: number;
  device_name: string;
  browser: string;
  os: string;
  ip_address: string;
  location: string;
  created_at: string;
  last_activity: string;
  is_current?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<any>;
  register: (email: string, password: string, nombre: string, questionType: string, customQuestion: string, securityAnswer: string) => Promise<void>; // 🆕 Actualizado
  logout: () => void;
  sendPasswordReset: (email: string) => Promise<{
    success: boolean;
    message: string;
    remainingAttempts?: number;
    blocked?: boolean;
    remainingTime?: number;
  }>;
  verifyEmail: (oobCode: string) => Promise<void>;
  // 🆕 NUEVAS FUNCIONES PARA GESTIÓN DE SESIONES (YA EXISTENTES - SIN CAMBIOS)
  getActiveSessions: () => Promise<ActiveSession[]>;
  revokeSession: (sessionId: number) => Promise<void>;
  revokeAllOtherSessions: () => Promise<{ revokedCount: number }>;
  revokeAllSessions: () => Promise<{ revokedCount: number }>;
  currentSessionToken: string | null; // 🆕 Token de sesión actual
  // 🆕 NUEVA FUNCIÓN OPCIONAL: Validar sesión
  validateSession?: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

// 🎯 VARIABLES GLOBALES PARA DEBOUNCING (CÓDIGO EXISTENTE)
let activityUpdateTimeout: NodeJS.Timeout | null = null;
let lastActivityUpdate = 0;
const UPDATE_INTERVAL = 30000; // 30 segundos entre updates reales
const DEBOUNCE_DELAY = 1000; // 1 segundo de debounce

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSessionToken, setCurrentSessionToken] = useState<string | null>(null); // 🆕 Token de sesión actual
  
  // 🎯 USAR useRef PARA TIMERS (no causan re-renders) - CÓDIGO EXISTENTE
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSettingUpRef = useRef<boolean>(false);

  // 🎯 CONFIGURACIÓN OPTIMIZADA de inactividad - CÓDIGO EXISTENTE
  const INACTIVITY_TIMEOUT = 1 * 60 * 1000; // 1 minuto para pruebas

  // 🎯 FUNCIÓN: Manejar logout automático - CÓDIGO EXISTENTE
  const handleAutoLogout = async () => {
    console.log('🔒 🔥 🔥 🔥 SESIÓN EXPIRADA - INACTIVIDAD DE 1 MINUTO 🔥 🔥 🔥');
    
    alert('Tu sesión ha expirada por inactividad. Por favor, inicia sesión nuevamente.');
    
    await auth.signOut();
    setUser(null);
    setCurrentSessionToken(null); // 🆕 Limpiar session token
    localStorage.removeItem('diana_laura_user');
    localStorage.removeItem('diana_laura_session_token'); // 🆕 Limpiar session token del localStorage
    
    window.location.href = '/login';
  };

  // 🎯 FUNCIÓN: Actualizar actividad en backend con debouncing - CÓDIGO EXISTENTE
  const updateBackendActivity = async () => {
    const now = Date.now();
    
    // 🚫 Si ya actualizamos hace menos de 30 segundos, IGNORAR
    if (now - lastActivityUpdate < UPDATE_INTERVAL) {
      return;
    }

    // 🧹 Limpiar timeout anterior si existe
    if (activityUpdateTimeout) {
      clearTimeout(activityUpdateTimeout);
    }

    // ⏰ Programar nuevo update con debounce
    activityUpdateTimeout = setTimeout(async () => {
      if (user && user.email) {
        try {
          await authAPI.updateActivity(user.email);
          lastActivityUpdate = Date.now();
          console.log('✅ Actividad actualizada en backend');
        } catch (error) {
          console.log('⚠️ Error silencioso en actividad:', error);
          // No reintentar - fallo silencioso
        }
      }
    }, DEBOUNCE_DELAY);
  };

  // 🎯 FUNCIÓN: Resetear timer de inactividad - CÓDIGO EXISTENTE
  const resetInactivityTimer = () => {
    // Limpiar timer anterior
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    if (user) {
      console.log('🔄 Reseteando timer de inactividad');
      inactivityTimerRef.current = setTimeout(() => {
        console.log('⏰ ⏰ ⏰ TIMER ACTIVADO - EJECUTANDO LOGOUT AUTOMÁTICO');
        handleAutoLogout();
      }, INACTIVITY_TIMEOUT);
    }
  };

  // 🎯 FUNCIÓN: Manejar actividad del usuario - CÓDIGO EXISTENTE
  const handleUserActivity = () => {
    resetInactivityTimer();
    updateBackendActivity();
  };

// 🎯 EFECTO OPTIMIZADO: Configurar sistema de inactividad (SOLO cuando user cambia) - CÓDIGO EXISTENTE
useEffect(() => {
  // Evitar configurar múltiples veces
  if (isSettingUpRef.current) return;
  if (!user) return;

  isSettingUpRef.current = true;
  
  console.log('🎯 🎯 🎯 INICIANDO SISTEMA DE INACTIVIDAD - 1 MINUTO 🎯 🎯 🎯');
  console.log('⏰ Timeout configurado:', INACTIVITY_TIMEOUT / 60000 + ' minutos');

  // ✅ SOLO eventos significativos - 🚫 EXCLUIR mousemove
  const activityEvents = [
    'click', 'keydown', 'scroll', 'mousedown', 
    'touchstart', 'focus'
  ];

  console.log('🎯 Configurando listeners optimizados para actividad');

// 🎯 NUEVO: Listener para eventos de navegación (flechas back/forward)
const handlePopState = () => {
  console.log('🔄 Evento de navegación detectado (flechas del navegador)');
  
  // Verificar si estamos en una ruta no autenticada
  const currentPath = window.location.pathname;
  const publicRoutes = ['/login', '/registro', '/olvide', '/reiniciar'];
  
  if (publicRoutes.includes(currentPath) && user) {
    console.log('🚨 Usuario navegó a ruta pública con sesión activa - DESACTIVANDO SISTEMA DE INACTIVIDAD');
    
    // 🎯 LIMPIAR TODO EL SISTEMA DE INACTIVIDAD
    // 1. Limpiar timers
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    if (activityUpdateTimeout) {
      clearTimeout(activityUpdateTimeout);
      activityUpdateTimeout = null;
    }
    
    // 2. Limpiar event listeners de actividad
    const activityEvents = [
      'click', 'keydown', 'scroll', 'mousedown', 
      'touchstart', 'focus'
    ];
    
    activityEvents.forEach(event => {
      document.removeEventListener(event, handleUserActivity);
    });
    
    // 3. Limpiar listener de navegación
    window.removeEventListener('popstate', handlePopState);
    
    // 4. Marcar como desactivado
    isSettingUpRef.current = false;
    
    console.log('✅ SISTEMA DE INACTIVIDAD COMPLETAMENTE DESACTIVADO POR NAVEGACIÓN');
  }
};

  // Agregar event listeners de actividad
  activityEvents.forEach(event => {
    document.addEventListener(event, handleUserActivity, { passive: true });
  });

  // 🎯 NUEVO: Agregar listener de navegación
  window.addEventListener('popstate', handlePopState);

  // Iniciar timer inicial
  resetInactivityTimer();
  
  // Hacer primer update de actividad después de 1 segundo
  setTimeout(() => {
    updateBackendActivity();
  }, 1000);

  return () => {
    console.log('🧹 Limpiando sistema de inactividad');
    isSettingUpRef.current = false;
    
    // Limpiar event listeners de actividad
    activityEvents.forEach(event => {
      document.removeEventListener(event, handleUserActivity);
    });
    
    // 🎯 NUEVO: Remover listener de navegación
    window.removeEventListener('popstate', handlePopState);
    
    // Limpiar timers
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    if (activityUpdateTimeout) {
      clearTimeout(activityUpdateTimeout);
      activityUpdateTimeout = null;
    }
  };
}, [user]); // 🎯 SOLO depende de user

useEffect(() => {
  if (!user || !currentSessionToken) {
    console.log('⏸️ Validación de sesión desactivada (no hay usuario o token)');
    return;
  }

  console.log('🔄 Iniciando verificación periódica de sesión revocada (cada 15 seg)');

  const checkSessionInterval = setInterval(async () => {
    try {
      console.log('🔍 [Validación] Verificando estado de sesión...');
      
      const response = await authAPI.validateSession();
      
      if (!response.success) {
        console.error('❌ [Validación] SESIÓN REVOCADA REMOTAMENTE');
        
        clearInterval(checkSessionInterval);
        
        alert('⚠️ Tu sesión ha sido cerrada desde otro dispositivo. Serás redirigido al inicio de sesión.');
        
        await auth.signOut();
        setUser(null);
        setCurrentSessionToken(null);
        localStorage.removeItem('diana_laura_user');
        localStorage.removeItem('diana_laura_session_token');
        
        window.location.href = '/login';
      } else {
        console.log('✅ [Validación] Sesión válida');
      }
      
    } catch (error: any) {
      console.log('⚠️ [Validación] Error verificando sesión:', error.message);
      
      if (error.message && (
        error.message.includes('Sesión revocada') || 
        error.message.includes('Sesión expirada') ||
        error.message.includes('SESSION_EXPIRED') ||
        error.message.includes('403')
      )) {
        console.error('❌ [Validación] SESIÓN REVOCADA/EXPIRADA DETECTADA');
        
        clearInterval(checkSessionInterval);
        
        alert('⚠️ Tu sesión ha sido cerrada. Serás redirigido al inicio de sesión.');
        
        await auth.signOut();
        setUser(null);
        setCurrentSessionToken(null);
        localStorage.removeItem('diana_laura_user');
        localStorage.removeItem('diana_laura_session_token');
        
        window.location.href = '/login';
      }
    }
  }, 15000); // 15 segundos

  return () => {
    console.log('🧹 Limpiando verificación de sesión periódica');
    clearInterval(checkSessionInterval);
  };
}, [user, currentSessionToken]);

  // 🎯 Cargar usuario desde localStorage - CÓDIGO EXISTENTE
  useEffect(() => {
    const savedUser = localStorage.getItem('diana_laura_user');
    const savedSessionToken = localStorage.getItem('diana_laura_session_token'); // 🆕 Cargar session token
    
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    if (savedSessionToken) {
      setCurrentSessionToken(savedSessionToken);
    }
    setLoading(false);
  }, []);

  // 🆕 FUNCIONES PARA GESTIÓN DE SESIONES - CÓDIGO EXISTENTE (SIN CAMBIOS)
  const getActiveSessions = async (): Promise<ActiveSession[]> => {
    if (!user || !user.dbId) throw new Error('Usuario no autenticado o sin ID de base de datos');
    
    try {
      const response = await authAPI.getActiveSessions(user.dbId);
      if (response.success) {
        return response.data.sessions;
      } else {
        throw new Error(response.message || 'Error obteniendo sesiones activas');
      }
    } catch (error: any) {
      console.error('❌ Error obteniendo sesiones activas:', error);
      throw new Error('No se pudieron cargar las sesiones activas: ' + error.message);
    }
  };

  const revokeSession = async (sessionId: number): Promise<void> => {
    if (!user || !user.dbId) throw new Error('Usuario no autenticado o sin ID de base de datos');
    
    try {
      const response = await authAPI.revokeSession(sessionId, user.dbId);
      if (!response.success) {
        throw new Error(response.message || 'Error revocando sesión');
      }
    } catch (error: any) {
      console.error('❌ Error revocando sesión:', error);
      throw new Error('No se pudo cerrar la sesión: ' + error.message);
    }
  };

  const revokeAllOtherSessions = async (): Promise<{ revokedCount: number }> => {
    if (!user || !user.dbId || !currentSessionToken) throw new Error('Usuario no autenticado o sin ID de base de datos');
    
    try {
      const response = await authAPI.revokeAllOtherSessions(user.dbId, currentSessionToken);
      if (response.success) {
        return { revokedCount: response.data.revokedCount };
      } else {
        throw new Error(response.message || 'Error revocando otras sesiones');
      }
    } catch (error: any) {
      console.error('❌ Error revocando otras sesiones:', error);
      throw new Error('No se pudieron cerrar las otras sesiones: ' + error.message);
    }
  };

  const revokeAllSessions = async (): Promise<{ revokedCount: number }> => {
    if (!user || !user.dbId) throw new Error('Usuario no autenticado o sin ID de base de datos');
    
    try {
      const response = await authAPI.revokeAllSessions(user.dbId);
      if (response.success) {
        // 🆕 Forzar logout local ya que se revocó la sesión actual
        await logout();
        return { revokedCount: response.data.revokedCount };
      } else {
        throw new Error(response.message || 'Error revocando todas las sesiones');
      }
    } catch (error: any) {
      console.error('❌ Error revocando todas las sesiones:', error);
      throw new Error('No se pudieron cerrar todas las sesiones: ' + error.message);
    }
  };

  // 🆕 FUNCIÓN OPCIONAL: Validar sesión (NUEVA - PERO OPCIONAL)
  const validateSession = async (): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const response = await authAPI.validateSession();
      return response.success;
    } catch (error: any) {
      console.log('❌ Sesión inválida:', error.message);
      
      // Si es error de sesión expirada, hacer logout automático
      if (error.message.includes('SESSION_EXPIRED') || error.message.includes('Sesión revocada')) {
        console.log('🔐 Sesión expirada - haciendo logout automático');
        await logout();
      }
      
      return false;
    }
  };

  const verifyEmail = async (oobCode: string) => {
    try {
      console.log('📧 Verificando email con código...');
      await checkActionCode(auth, oobCode);
      console.log('✅ Código de verificación válido');
      await applyActionCode(auth, oobCode);
      console.log('✅ Email verificado exitosamente');
    } catch (error: any) {
      console.error('❌ Error verificando email:', error);
      if (error.code === 'auth/invalid-action-code') {
        throw new Error('El enlace de verificación es inválido o ha expirado.');
      }
      if (error.code === 'auth/expired-action-code') {
        throw new Error('El enlace de verificación ha expirado.');
      }
      throw new Error('Error al verificar el email: ' + error.message);
    }
  };

// En AuthContext.tsx - REEMPLAZAR la función sendPasswordReset completa: - CÓDIGO EXISTENTE

const sendPasswordReset = async (email: string): Promise<{
  success: boolean;
  message: string;
  remainingAttempts?: number;
  blocked?: boolean;
  remainingTime?: number;
}> => {
  try {
    console.log('📧 Iniciando proceso de recuperación para:', email);
    
    // 🎯 PRIMERO: Verificar si el usuario existe en nuestro backend
    try {
      console.log('🔍 Verificando usuario en el sistema...');
      const userCheck = await authAPI.checkFirebaseUser(email);
      
      if (!userCheck.exists) {
        console.log('❌ Usuario no encontrado en el sistema');
        return {
          success: false,
          message: 'Este email no está registrado en nuestro sistema. Verifica tu dirección o regístrate primero.',
          remainingAttempts: 0
        };
      }
      
      console.log('✅ Usuario verificado en el sistema');
    } catch (checkError: any) {
      console.log('⚠️ Error verificando usuario:', checkError.message);
    }

    // 🎯 VERIFICAR LÍMITES CON BACKEND
    console.log('🔄 Verificando límites de recuperación...');
    
    const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://joyeria-diana-laura-nqnq.onrender.com/api';
    
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    // 🚫 SI ESTÁ BLOQUEADO POR NUESTRO SISTEMA
    if (response.status === 429) {
      const data = await response.json();
      console.log('🚫 Bloqueado por nuestro sistema:', data);
      return {
        success: false,
        message: data.message,
        blocked: true,
        remainingTime: data.remainingTime,
        remainingAttempts: 0
      };
    }

    const data = await response.json();
    
    if (!response.ok) {
      console.log('❌ Error del backend:', data);
      return {
        success: false,
        message: data.message || 'Error en la verificación de límites'
      };
    }

    console.log('✅ Límites verificados:', data);
    
    // 🎯 CORRECCIÓN: Usar sendPasswordResetEmail normal pero con URL personalizada
    console.log('🚀 Enviando email de recuperación con Firebase...');
    
    const actionCodeSettings = {
      url: `${window.location.origin}/reiniciar`,
      handleCodeInApp: false
    };
    
    console.log('🔗 URL de redirección:', actionCodeSettings.url);
    
    await firebaseSendPasswordReset(auth, email, actionCodeSettings);
    
    console.log('✅ Email de recuperación enviado por Firebase');
    
    return {
      success: true,
      message: 'Se ha enviado un enlace de recuperación a tu email. Revisa tu bandeja de entrada y carpeta de spam.',
      remainingAttempts: data.remainingAttempts
    };
    
  } catch (error: any) {
    console.error('❌ Error en sendPasswordReset:', error);
    
    if (error.code === 'auth/user-not-found') {
      return {
        success: false,
        message: 'Este email no está registrado en nuestro sistema. Verifica tu dirección o regístrate primero.'
      };
    } else if (error.code === 'auth/invalid-email') {
      return {
        success: false,
        message: 'El formato del email es inválido. Por favor, verifica tu dirección de correo.'
      };
    } else if (error.code === 'auth/too-many-requests') {
      return {
        success: false,
        message: 'No se pudo enviar el email en este momento. Por favor, intenta nuevamente.',
        blocked: false
      };
    } else if (error.message.includes('network') || error.message.includes('conexión')) {
      return {
        success: false,
        message: 'Error de conexión. Verifica tu internet e intenta nuevamente.'
      };
    }
    
    return {
      success: false,
      message: 'Error al enviar el email de recuperación: ' + error.message
    };
  }
};

const login = async (email: string, password: string) => {
  try {
    console.log('🔐 Iniciando proceso de login...');

    // 🎯 PRIMERO: Verificar con nuestro backend si la cuenta está bloqueada
    console.log('🛡️ Verificando estado de bloqueo en nuestro backend...');
    const lockCheckResponse = await authAPI.checkAccountLock({ email });
    
    if (lockCheckResponse.data.locked) {
      const lockedUntil = new Date(lockCheckResponse.data.lockedUntil);
      const remainingTime = Math.ceil((lockedUntil.getTime() - Date.now()) / 60000);
      
      console.log(`🚫 Cuenta bloqueada. Tiempo restante: ${remainingTime} minutos`);
      throw new Error(`🔒 Cuenta temporalmente bloqueada. Demasiados intentos fallidos. Intenta nuevamente en ${remainingTime} minutos.`);
    }

    // 🎯 SEGUNDO: Si no está bloqueada, intentar login con Firebase
    console.log('🔥 Intentando login con Firebase...');
    await auth.signOut();
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    console.log('✅ Login Firebase exitoso');
    console.log('📧 Estado de verificación:', firebaseUser.emailVerified);
    
    if (!firebaseUser.emailVerified) {
      console.log('❌ Email no verificado');
      await firebaseUser.reload();
      const updatedUser = auth.currentUser;
      
      if (updatedUser && !updatedUser.emailVerified) {
        // 🎯 Registrar intento fallido por email no verificado
        await authAPI.login(email, 'wrong_password_to_trigger_failure');
        throw new Error('📧 Tu email no está verificado. Revisa tu bandeja de entrada y haz clic en el enlace de verificación.');
      }
    }

    console.log('✅ Email verificado, completando login...');
    
    // 🎯 TERCERO: Login exitoso en nuestro backend
    const backendResponse = await authAPI.login(email, password);

    // 🆕 CAMBIO CLAVE: RETORNAR LA RESPUESTA COMPLETA
    if (backendResponse.success) {
      const userData = backendResponse.data.user;
      const token = backendResponse.data.token;
      const sessionToken = backendResponse.data.sessionToken;
      
      // 🆕 OBTENER EL USUARIO DE POSTGRESQL PARA EL ID NUMÉRICO
      try {
        console.log('🔍 Obteniendo ID numérico de PostgreSQL...');
        const dbUserResponse = await authAPI.checkFirebaseUser(email);
        if (dbUserResponse.exists && dbUserResponse.data) {
          userData.dbId = dbUserResponse.data.id;
          console.log(`✅ ID numérico obtenido: ${userData.dbId}`);
        }
      } catch (dbError) {
        console.warn('⚠️ No se pudo obtener el ID numérico:', dbError);
      }
      
      const userWithToken = {
        ...userData,
        token: token
      };
      
      setUser(userWithToken);
      setCurrentSessionToken(sessionToken);
      
      localStorage.setItem('diana_laura_user', JSON.stringify(userWithToken));
      localStorage.setItem('diana_laura_session_token', sessionToken);
      
      console.log('✅ Login completo exitoso - SESIÓN INICIADA CON JWT');
      
      handleUserActivity();

      // 🆕 RETORNAR LA RESPUESTA COMPLETA PARA MFA
      return backendResponse;
    } else {
      // 🆕 SI HAY MFA REQUERIDO, RETORNAR LA RESPUESTA
      if (backendResponse.mfaRequired) {
        return backendResponse;
      }
      throw new Error(backendResponse.message);
    }
    
  } catch (error: any) {
    console.error('❌ Error en login:', error);
    
    // 🎯 MANEJAR ERRORES DE CREDENCIALES - Registrar intento fallido
    if (error.code === 'auth/invalid-credential' || 
        error.code === 'auth/wrong-password' ||
        error.code === 'auth/user-not-found') {
      
      try {
        console.log('📝 Registrando intento fallido en nuestro sistema...');
        const failureResponse = await authAPI.login(email, 'wrong_password_to_trigger_failure');
        
        if (!failureResponse.success && failureResponse.remainingAttempts !== undefined) {
          const errorWithAttempts = new Error('Email o contraseña incorrectos.');
          (errorWithAttempts as any).remainingAttempts = failureResponse.remainingAttempts;
          (errorWithAttempts as any).attempts = failureResponse.attempts;
          (errorWithAttempts as any).maxAttempts = failureResponse.maxAttempts;
          throw errorWithAttempts;
        }
      } catch (backendError: any) {
        console.log('⚠️ Error registrando intento fallido:', backendError);
      }
      
      // Mensaje por defecto si no hay información de intentos
      if (error.code === 'auth/user-not-found') {
        throw new Error('Esta cuenta no existe. Por favor, regístrate primero.');
      } else {
        throw new Error('Email o contraseña incorrectos.');
      }
    }
    
    // 🎯 PROPAGAR ERRORES DE BLOQUEO E INTENTOS
    if (error.message.includes('bloqueada') || error.locked) {
      throw error;
    }
    if (error.remainingAttempts !== undefined) {
      throw error;
    }
    
    if (error.code === 'auth/too-many-requests') {
      throw new Error('⏳ Cuenta temporalmente bloqueada por Firebase. Espera 15 minutos e intenta nuevamente.');
    }
    if (error.code === 'auth/network-request-failed') {
      throw new Error('🌐 Error de conexión. Verifica tu internet.');
    }
    if (error.code === 'auth/invalid-email') {
      throw new Error('📧 El formato del email es inválido.');
    }
    
    throw new Error(error.message || 'Error al iniciar sesión');
  }
};

const register = async (email: string, password: string, nombre: string, questionType: string, customQuestion: string, securityAnswer: string) => {
    try {
        console.log('🚀 Iniciando proceso de registro...');

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;
        
        console.log('✅ Usuario creado en Firebase');

        try {
            console.log('👤 Actualizando perfil con nombre...');
            await updateProfile(firebaseUser, {
                displayName: nombre
            });
            console.log('✅ Nombre actualizado en Firebase');
        } catch (profileError: any) {
            console.log('⚠️ Error actualizando perfil:', profileError.message);
        }

        console.log('📧 Enviando email de verificación...');
        const verificationActionCodeSettings = {
            url: `${window.location.origin}/login?verified=true&email=${encodeURIComponent(email)}`,
            handleCodeInApp: false
        };
        
        await sendEmailVerification(firebaseUser, verificationActionCodeSettings);
        console.log('✅ Email de verificación enviado por Firebase');

        try {
            console.log('💾 Intentando sincronizar con PostgreSQL...');
            await authAPI.syncUser(email, firebaseUser.uid, nombre);
            console.log('✅ Usuario sincronizado con PostgreSQL');

            // 🆕 CONFIGURAR PREGUNTA SECRETA
            console.log('🔐 Configurando pregunta secreta...');
            const questionResponse = await securityQuestionAPI.setSecurityQuestion(
                email,
                questionType,
                customQuestion,
                securityAnswer
            );

            if (questionResponse.success) {
                console.log('✅ Pregunta secreta configurada correctamente');
            } else {
                console.log('⚠️ Usuario registrado pero pregunta secreta no configurada:', questionResponse.message);
            }

        } catch (syncError: any) {
            console.log('⚠️ Usuario en Firebase pero error en PostgreSQL/pregunta secreta:', syncError.message);
        }

        console.log('🔒 Cerrando sesión...');
        await auth.signOut();
        console.log('✅ Sesión cerrada exitosamente');

        console.log('🎉 REGISTRO COMPLETADO EXITOSAMENTE');

    } catch (error: any) {
        console.error('❌ ERROR EN REGISTRO:', error);
        
        if (error.code === 'auth/email-already-in-use') {
            throw new Error('El email ya está registrado en el sistema. Si es tu cuenta, intenta recuperar tu contraseña.');
        }
        
        if (error.code === 'auth/invalid-email') {
            throw new Error('El formato del email es inválido. Por favor, verifica tu dirección de correo.');
        }
        
        if (error.code === 'auth/weak-password') {
            throw new Error('La contraseña es demasiado débil. Debe tener al menos 6 caracteres.');
        }
        
        throw new Error(error.message || 'Error inesperado al registrar usuario. Por favor, intenta nuevamente.');
    }
};

  const logout = async () => {
    // 🎯 Limpiar timers al hacer logout manual - CÓDIGO EXISTENTE
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    if (activityUpdateTimeout) {
      clearTimeout(activityUpdateTimeout);
      activityUpdateTimeout = null;
    }
    
    // 🆕 OPCIONAL: Llamar al endpoint de logout del backend
    try {
      await authAPI.logout(); // Esto es opcional, no afecta si falla
    } catch (error) {
      console.log('⚠️ Error en logout del backend (no crítico):', error);
    }
    
    await auth.signOut();
    setUser(null);
    setCurrentSessionToken(null); // 🆕 Limpiar session token
    localStorage.removeItem('diana_laura_user');
    localStorage.removeItem('diana_laura_session_token'); // 🆕 Limpiar session token
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    sendPasswordReset,
    verifyEmail,
    // 🆕 AGREGAR LAS NUEVAS FUNCIONES (TODAS EXISTENTES)
    getActiveSessions,
    revokeSession,
    revokeAllOtherSessions,
    revokeAllSessions,
    currentSessionToken,
    // 🆕 AGREGAR FUNCIÓN OPCIONAL
    validateSession
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};