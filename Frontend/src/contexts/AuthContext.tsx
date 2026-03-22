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
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
auth.languageCode = 'es';

interface User {
  id: string;
  email: string;
  nombre: string;
  dbId?: number;
  rol?: 'admin' | 'trabajador' | 'cliente';
}

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
  register: (email: string, password: string, nombre: string, questionType: string, customQuestion: string, securityAnswer: string) => Promise<void>;
  logout: () => void;
  sendPasswordReset: (email: string) => Promise<{
    success: boolean;
    message: string;
    remainingAttempts?: number;
    blocked?: boolean;
    remainingTime?: number;
  }>;
  verifyEmail: (oobCode: string) => Promise<void>;
  getActiveSessions: () => Promise<ActiveSession[]>;
  revokeSession: (sessionId: number) => Promise<void>;
  revokeAllOtherSessions: () => Promise<{ revokedCount: number }>;
  revokeAllSessions: () => Promise<{ revokedCount: number }>;
  currentSessionToken: string | null;
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

let activityUpdateTimeout: NodeJS.Timeout | null = null;
let lastActivityUpdate = 0;
const UPDATE_INTERVAL = 30000;
const DEBOUNCE_DELAY = 1000;

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSessionToken, setCurrentSessionToken] = useState<string | null>(null);
  
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSettingUpRef = useRef<boolean>(false);

  // ─── ÚNICO CAMBIO: cliente → 1 hora (antes era 24 horas) ─────────────────
  const getTimeoutByRole = () => {
    if (!user) return 60 * 60 * 1000; // Por defecto 1h si no hay user

    if (user.rol === 'admin' || user.rol === 'trabajador') {
      return 15 * 60 * 1000; // 🔒 15 minutos para personal
    }

    return 60 * 60 * 1000; // ✅ 1 hora para clientes
  };
  // ─────────────────────────────────────────────────────────────────────────

  const handleAutoLogout = async () => {
    console.log('🔒 🔥 🔥 🔥 SESIÓN EXPIRADA POR INACTIVIDAD 🔥 🔥 🔥');
    alert('Tu sesión ha expirada por inactividad. Por favor, inicia sesión nuevamente.');
    await auth.signOut();
    setUser(null);
    setCurrentSessionToken(null);
    localStorage.removeItem('diana_laura_user');
    localStorage.removeItem('diana_laura_session_token');
    window.location.href = '/login';
  };

  const updateBackendActivity = async () => {
    const now = Date.now();
    if (now - lastActivityUpdate < UPDATE_INTERVAL) return;

    if (activityUpdateTimeout) clearTimeout(activityUpdateTimeout);

    activityUpdateTimeout = setTimeout(async () => {
      if (user && user.email) {
        try {
          await authAPI.updateActivity(user.email);
          lastActivityUpdate = Date.now();
          console.log('✅ Actividad actualizada en backend');
        } catch (error) {
          console.log('⚠️ Error silencioso en actividad:', error);
        }
      }
    }, DEBOUNCE_DELAY);
  };

  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);

    if (user) {
      const timeout = getTimeoutByRole();
      inactivityTimerRef.current = setTimeout(() => {
        console.log('⏰ TIMER ACTIVADO - LOGOUT POR INACTIVIDAD');
        handleAutoLogout();
      }, timeout);
    }
  };

  const handleUserActivity = () => {
    resetInactivityTimer();
    updateBackendActivity();
  };

  useEffect(() => {
    if (isSettingUpRef.current) return;
    if (!user) return;

    isSettingUpRef.current = true;
    console.log('🎯 🎯 🎯 INICIANDO SISTEMA DE INACTIVIDAD 🎯 🎯 🎯');

    const activityEvents = ['click', 'keydown', 'scroll', 'mousedown', 'touchstart', 'focus'];

    const handlePopState = () => {
      console.log('🔄 Evento de navegación detectado (flechas del navegador)');
      const currentPath = window.location.pathname;
      const publicRoutes = ['/login', '/registro', '/olvide', '/reiniciar'];
      
      if (publicRoutes.includes(currentPath) && user) {
        console.log('🚨 Usuario navegó a ruta pública - DESACTIVANDO SISTEMA DE INACTIVIDAD');
        if (inactivityTimerRef.current) { clearTimeout(inactivityTimerRef.current); inactivityTimerRef.current = null; }
        if (activityUpdateTimeout) { clearTimeout(activityUpdateTimeout); activityUpdateTimeout = null; }
        activityEvents.forEach(event => document.removeEventListener(event, handleUserActivity));
        window.removeEventListener('popstate', handlePopState);
        isSettingUpRef.current = false;
        console.log('✅ SISTEMA DE INACTIVIDAD COMPLETAMENTE DESACTIVADO POR NAVEGACIÓN');
      }
    };

    activityEvents.forEach(event => document.addEventListener(event, handleUserActivity, { passive: true }));
    window.addEventListener('popstate', handlePopState);
    resetInactivityTimer();
    setTimeout(() => updateBackendActivity(), 1000);

    return () => {
      console.log('🧹 Limpiando sistema de inactividad');
      isSettingUpRef.current = false;
      activityEvents.forEach(event => document.removeEventListener(event, handleUserActivity));
      window.removeEventListener('popstate', handlePopState);
      if (inactivityTimerRef.current) { clearTimeout(inactivityTimerRef.current); inactivityTimerRef.current = null; }
      if (activityUpdateTimeout) { clearTimeout(activityUpdateTimeout); activityUpdateTimeout = null; }
    };
  }, [user]);

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
    }, 15000);

    return () => {
      console.log('🧹 Limpiando verificación de sesión periódica');
      clearInterval(checkSessionInterval);
    };
  }, [user, currentSessionToken]);

  useEffect(() => {
    const savedUser = localStorage.getItem('diana_laura_user');
    const savedSessionToken = localStorage.getItem('diana_laura_session_token');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      console.log('📦 Usuario restaurado del localStorage:', parsedUser);
      console.log('🎭 Rol del usuario restaurado:', parsedUser.rol);
      setUser(parsedUser);
    }
    if (savedSessionToken) setCurrentSessionToken(savedSessionToken);
    setLoading(false);
  }, []);

  const getActiveSessions = async (): Promise<ActiveSession[]> => {
    if (!user || !user.dbId) throw new Error('Usuario no autenticado o sin ID de base de datos');
    try {
      const response = await authAPI.getActiveSessions(user.dbId);
      if (response.success) return response.data.sessions;
      throw new Error(response.message || 'Error obteniendo sesiones activas');
    } catch (error: any) {
      console.error('❌ Error obteniendo sesiones activas:', error);
      throw new Error('No se pudieron cargar las sesiones activas: ' + error.message);
    }
  };

  const revokeSession = async (sessionId: number): Promise<void> => {
    if (!user || !user.dbId) throw new Error('Usuario no autenticado o sin ID de base de datos');
    try {
      const response = await authAPI.revokeSession(sessionId, user.dbId);
      if (!response.success) throw new Error(response.message || 'Error revocando sesión');
    } catch (error: any) {
      console.error('❌ Error revocando sesión:', error);
      throw new Error('No se pudo cerrar la sesión: ' + error.message);
    }
  };

  const revokeAllOtherSessions = async (): Promise<{ revokedCount: number }> => {
    if (!user || !user.dbId || !currentSessionToken) throw new Error('Usuario no autenticado o sin ID de base de datos');
    try {
      const response = await authAPI.revokeAllOtherSessions(user.dbId, currentSessionToken);
      if (response.success) return { revokedCount: response.data.revokedCount };
      throw new Error(response.message || 'Error revocando otras sesiones');
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
        await logout();
        return { revokedCount: response.data.revokedCount };
      }
      throw new Error(response.message || 'Error revocando todas las sesiones');
    } catch (error: any) {
      console.error('❌ Error revocando todas las sesiones:', error);
      throw new Error('No se pudieron cerrar todas las sesiones: ' + error.message);
    }
  };

  const validateSession = async (): Promise<boolean> => {
    if (!user) return false;
    try {
      const response = await authAPI.validateSession();
      return response.success;
    } catch (error: any) {
      console.log('❌ Sesión inválida:', error.message);
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
      await applyActionCode(auth, oobCode);
      console.log('✅ Email verificado exitosamente');
    } catch (error: any) {
      console.error('❌ Error verificando email:', error);
      if (error.code === 'auth/invalid-action-code') throw new Error('El enlace de verificación es inválido o ha expirado.');
      if (error.code === 'auth/expired-action-code') throw new Error('El enlace de verificación ha expirado.');
      throw new Error('Error al verificar el email: ' + error.message);
    }
  };

  const sendPasswordReset = async (email: string): Promise<{
    success: boolean; message: string; remainingAttempts?: number; blocked?: boolean; remainingTime?: number;
  }> => {
    try {
      console.log('📧 Iniciando proceso de recuperación para:', email);
      try {
        const userCheck = await authAPI.checkFirebaseUser(email);
        if (!userCheck.exists) return { success: false, message: 'Este email no está registrado en nuestro sistema. Verifica tu dirección o regístrate primero.', remainingAttempts: 0 };
      } catch (checkError: any) { console.log('⚠️ Error verificando usuario:', checkError.message); }

      const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://joyeria-diana-laura-nqnq.onrender.com/api';
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
      });

      if (response.status === 429) {
        const data = await response.json();
        return { success: false, message: data.message, blocked: true, remainingTime: data.remainingTime, remainingAttempts: 0 };
      }

      const data = await response.json();
      if (!response.ok) return { success: false, message: data.message || 'Error en la verificación de límites' };

      if (data.success && data.remainingAttempts > 0) {
        const actionCodeSettings = { url: `${window.location.origin}/reiniciar`, handleCodeInApp: false };
        await firebaseSendPasswordReset(auth, email, actionCodeSettings);
        return { success: true, message: 'Se ha enviado un enlace de recuperación a tu email. Revisa tu bandeja de entrada y carpeta de spam.', remainingAttempts: data.remainingAttempts };
      }
      return { success: false, message: 'No se pudo enviar el email. Límite de intentos alcanzado.', remainingAttempts: 0 };
    } catch (error: any) {
      console.error('❌ Error en sendPasswordReset:', error);
      if (error.code === 'auth/user-not-found') return { success: false, message: 'Este email no está registrado en nuestro sistema.' };
      if (error.code === 'auth/invalid-email') return { success: false, message: 'El formato del email es inválido.' };
      if (error.code === 'auth/too-many-requests') return { success: false, message: 'No se pudo enviar el email en este momento.', blocked: false };
      if (error.message.includes('network') || error.message.includes('conexión')) return { success: false, message: 'Error de conexión. Verifica tu internet e intenta nuevamente.' };
      return { success: false, message: 'Error al enviar el email de recuperación: ' + error.message };
    }
  };

  const login = async (email: string, password: string) => {
    try {
      console.log('🔐 Iniciando proceso de login...');
      const lockCheckResponse = await authAPI.checkAccountLock({ email });
      if (lockCheckResponse.data.locked) {
        const lockedUntil = new Date(lockCheckResponse.data.lockedUntil);
        const remainingTime = Math.ceil((lockedUntil.getTime() - Date.now()) / 60000);
        throw new Error(`🔒 Cuenta temporalmente bloqueada. Demasiados intentos fallidos. Intenta nuevamente en ${remainingTime} minutos.`);
      }

      await auth.signOut();
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      console.log('✅ Login Firebase exitoso');

      if (!firebaseUser.emailVerified) {
        await firebaseUser.reload();
        const updatedUser = auth.currentUser;
        if (updatedUser && !updatedUser.emailVerified) {
          await authAPI.login(email, 'wrong_password_to_trigger_failure');
          throw new Error('📧 Tu email no está verificado. Revisa tu bandeja de entrada y haz clic en el enlace de verificación.');
        }
      }

      const backendResponse = await authAPI.login(email, password);

      if (backendResponse.mfaRequired || backendResponse.requiresMFA) {
        const mfaError = new Error('Se requiere código MFA');
        (mfaError as any).mfaRequired = true;
        (mfaError as any).userId = backendResponse.userId;
        (mfaError as any).email = email;
        throw mfaError;
      }
      
      if (backendResponse.success) {
        const userData = backendResponse.data.user;
        const token = backendResponse.data.token;
        const sessionToken = backendResponse.data.sessionToken;
        
        try {
          const dbUserResponse = await authAPI.checkFirebaseUser(email);
          if (dbUserResponse.exists && dbUserResponse.data) userData.dbId = dbUserResponse.data.id;
        } catch (dbError) { console.warn('⚠️ No se pudo obtener el ID numérico:', dbError); }
        
        const userWithToken = { ...userData, token, rol: userData.rol || 'cliente' };
        console.log('🎭 Rol que se va a guardar:', userWithToken.rol);
        
        setUser(userWithToken);
        setCurrentSessionToken(sessionToken);
        localStorage.setItem('diana_laura_user', JSON.stringify(userWithToken));
        localStorage.setItem('diana_laura_session_token', sessionToken);
        console.log('✅ Login completo exitoso - SESIÓN INICIADA CON JWT');
        handleUserActivity();
        return backendResponse;
      } else {
        throw new Error(backendResponse.message);
      }
    } catch (error: any) {
      console.error('❌ Error en login:', error);
      if (error.mfaRequired) throw error;
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        try {
          const failureResponse = await authAPI.login(email, 'wrong_password_to_trigger_failure');
          if (!failureResponse.success && failureResponse.remainingAttempts !== undefined) {
            const errorWithAttempts = new Error('Email o contraseña incorrectos.');
            (errorWithAttempts as any).remainingAttempts = failureResponse.remainingAttempts;
            (errorWithAttempts as any).attempts = failureResponse.attempts;
            (errorWithAttempts as any).maxAttempts = failureResponse.maxAttempts;
            throw errorWithAttempts;
          }
        } catch (backendError: any) { console.log('⚠️ Error registrando intento fallido:', backendError); }
        if (error.code === 'auth/user-not-found') throw new Error('Esta cuenta no existe. Por favor, regístrate primero.');
        throw new Error('Email o contraseña incorrectos.');
      }
      if (error.message.includes('bloqueada') || error.locked) throw error;
      if (error.remainingAttempts !== undefined) throw error;
      if (error.code === 'auth/too-many-requests') throw new Error('⏳ Cuenta temporalmente bloqueada por Firebase. Espera 15 minutos e intenta nuevamente.');
      if (error.code === 'auth/network-request-failed') throw new Error('🌐 Error de conexión. Verifica tu internet.');
      if (error.code === 'auth/invalid-email') throw new Error('📧 El formato del email es inválido.');
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
        await updateProfile(firebaseUser, { displayName: nombre });
        console.log('✅ Nombre actualizado en Firebase');
      } catch (profileError: any) { console.log('⚠️ Error actualizando perfil:', profileError.message); }

      const verificationActionCodeSettings = {
        url: `${window.location.origin}/login?verified=true&email=${encodeURIComponent(email)}`,
        handleCodeInApp: false
      };
      await sendEmailVerification(firebaseUser, verificationActionCodeSettings);
      console.log('✅ Email de verificación enviado por Firebase');

      try {
        await authAPI.syncUser(email, firebaseUser.uid, nombre);
        console.log('✅ Usuario sincronizado con PostgreSQL');
        const questionResponse = await securityQuestionAPI.setSecurityQuestion(email, questionType, customQuestion, securityAnswer);
        if (questionResponse.success) console.log('✅ Pregunta secreta configurada correctamente');
        else console.log('⚠️ Pregunta secreta no configurada:', questionResponse.message);
      } catch (syncError: any) { console.log('⚠️ Error en PostgreSQL/pregunta secreta:', syncError.message); }

      await auth.signOut();
      console.log('🎉 REGISTRO COMPLETADO EXITOSAMENTE');
    } catch (error: any) {
      console.error('❌ ERROR EN REGISTRO:', error);
      if (error.code === 'auth/email-already-in-use') throw new Error('El email ya está registrado en el sistema. Si es tu cuenta, intenta recuperar tu contraseña.');
      if (error.code === 'auth/invalid-email') throw new Error('El formato del email es inválido. Por favor, verifica tu dirección de correo.');
      if (error.code === 'auth/weak-password') throw new Error('La contraseña es demasiado débil. Debe tener al menos 6 caracteres.');
      throw new Error(error.message || 'Error inesperado al registrar usuario. Por favor, intenta nuevamente.');
    }
  };

  const logout = async () => {
    if (inactivityTimerRef.current) { clearTimeout(inactivityTimerRef.current); inactivityTimerRef.current = null; }
    if (activityUpdateTimeout) { clearTimeout(activityUpdateTimeout); activityUpdateTimeout = null; }
    try { await authAPI.logout(); } catch (error) { console.log('⚠️ Error en logout del backend (no crítico):', error); }
    await auth.signOut();
    setUser(null);
    setCurrentSessionToken(null);
    localStorage.removeItem('diana_laura_user');
    localStorage.removeItem('diana_laura_session_token');
  };

  const value: AuthContextType = {
    user, loading, login, register, logout, sendPasswordReset, verifyEmail,
    getActiveSessions, revokeSession, revokeAllOtherSessions, revokeAllSessions,
    currentSessionToken, validateSession
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};