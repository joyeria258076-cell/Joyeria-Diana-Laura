// Ruta:Joyeria-Diana-Laura/Frontend/src/contexts/AuthContext.tsx

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authAPI } from '../services/api';
import { initializeApp } from 'firebase/app';
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
  id: string;
  email: string;
  nombre: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, nombre: string) => Promise<void>;
  logout: () => void;
  sendPasswordReset: (email: string) => Promise<{
    success: boolean;
    message: string;
    remainingAttempts?: number;
    blocked?: boolean;
    remainingTime?: number;
  }>;
  verifyEmail: (oobCode: string) => Promise<void>;
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

// 🎯 VARIABLES GLOBALES PARA DEBOUNCING
let activityUpdateTimeout: NodeJS.Timeout | null = null;
let lastActivityUpdate = 0;
const UPDATE_INTERVAL = 30000; // 30 segundos entre updates reales
const DEBOUNCE_DELAY = 1000; // 1 segundo de debounce

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [inactivityTimer, setInactivityTimer] = useState<NodeJS.Timeout | null>(null);

  // 🎯 CONFIGURACIÓN OPTIMIZADA de inactividad
  const INACTIVITY_TIMEOUT = 1 * 60 * 1000; // 1 minutos para producción

  // 🎯 FUNCIÓN OPTIMIZADA: Actualizar actividad en backend con debouncing
  const updateBackendActivity = useCallback(async () => {
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
  }, [user]);

  // 🎯 FUNCIÓN: Resetear timer de inactividad (SOLO FRONTEND - RÁPIDO)
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
    }

    if (user) {
      const timer = setTimeout(() => {
        console.log('🕒 Sesión expirada por inactividad automáticamente');
        handleAutoLogout();
      }, INACTIVITY_TIMEOUT);
      
      setInactivityTimer(timer);
    }
  }, [user, inactivityTimer]);

  // 🎯 FUNCIÓN OPTIMIZADA: Manejar actividad del usuario
  const handleUserActivity = useCallback(() => {
    resetInactivityTimer(); // Esto sigue siendo rápido (solo frontend)
    updateBackendActivity(); // Esto tiene debouncing de 30 segundos
  }, [resetInactivityTimer, updateBackendActivity]);

  // 🎯 FUNCIÓN: Manejar logout automático
  const handleAutoLogout = useCallback(async () => {
    console.log('🔒 Cerrando sesión automáticamente por inactividad');
    
    alert('Tu sesión ha expirado por inactividad. Por favor, inicia sesión nuevamente.');
    
    await auth.signOut();
    setUser(null);
    localStorage.removeItem('diana_laura_user');
    
    window.location.href = '/login';
  }, []);

  // 🎯 EFECTO OPTIMIZADO: Detectar actividad del usuario
  useEffect(() => {
    if (!user) return;

    // ✅ SOLO eventos significativos - 🚫 EXCLUIR mousemove
    const activityEvents = [
      'click', 'keydown', 'scroll', 'mousedown', 
      'touchstart', 'focus'
    ];

    console.log('🎯 Configurando listeners optimizados para actividad');

    activityEvents.forEach(event => {
      document.addEventListener(event, handleUserActivity, { passive: true });
    });

    // Iniciar timers
    resetInactivityTimer();
    
    // Hacer primer update de actividad después de 1 segundo
    const initialTimer = setTimeout(() => {
      updateBackendActivity();
    }, 1000);

    return () => {
      // Limpiar event listeners
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleUserActivity);
      });
      
      // Limpiar timers
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }
      if (activityUpdateTimeout) {
        clearTimeout(activityUpdateTimeout);
      }
      clearTimeout(initialTimer);
    };
  }, [user, handleUserActivity, resetInactivityTimer, inactivityTimer, updateBackendActivity]);

  // 🎯 Cargar usuario desde localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('diana_laura_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

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

      // 🎯 USAR SOLO EL BACKEND PARA LA RECUPERACIÓN
      console.log('🔄 Enviando solicitud al backend...');
      
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://joyeria-diana-laura-nqnq.onrender.com/api';
      
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 429) {
          return {
            success: false,
            message: data.message,
            blocked: true,
            remainingTime: data.remainingTime,
            remainingAttempts: 0
          };
        }
        return {
          success: false,
          message: data.message || 'Error en la petición'
        };
      }

      console.log('✅ Respuesta del backend:', data);
      
      // 🎯 Configurar URL de redirección
      const actionCodeSettings = {
        url: `${window.location.origin}/login?reset=success&email=${encodeURIComponent(email)}`,
        handleCodeInApp: false
      };
      
      console.log('🔗 URL de redirección configurada:', actionCodeSettings.url);
      
      // 🎯 Enviar email de recuperación con Firebase
      console.log('🚀 Enviando email de recuperación con Firebase...');
      await firebaseSendPasswordReset(auth, email, actionCodeSettings);
      console.log('✅ Email de recuperación enviado por Firebase');
      
      return {
        success: data.success,
        message: data.message,
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
          message: 'Has solicitado demasiados reseteos. Espera unos minutos e intenta nuevamente.',
          blocked: true,
          remainingTime: 15
        };
      } else if (error.message.includes('network') || error.message.includes('conexión')) {
        return {
          success: false,
          message: 'Error de conexión. Verifica tu internet e intenta nuevamente.'
        };
      }
      
      return {
        success: true,
        message: 'Si el email está registrado, recibirás un enlace de recuperación'
      };
    }
  };

  const login = async (email: string, password: string) => {
    try {
      console.log('🔐 Iniciando login con Firebase...');
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
          throw new Error('Tu email no está verificado. Revisa tu bandeja de entrada y haz clic en el enlace de verificación.');
        }
      }

      console.log('✅ Email verificado, creando sesión...');
      
      const response = await authAPI.login(email, password);
      
      if (response.success) {
        const userData = response.data.user;
        setUser(userData);
        localStorage.setItem('diana_laura_user', JSON.stringify(userData));
        console.log('✅ Login completo exitoso - SESIÓN INICIADA');
        
        // 🎯 INICIAR sistema de actividad después del login
        handleUserActivity();
      } else {
        throw new Error(response.message);
      }
      
    } catch (error: any) {
      console.error('❌ Error en login:', error);
      
      if (error.code === 'auth/invalid-credential') {
        throw new Error('Email o contraseña incorrectos. Si no tienes cuenta, regístrate primero.');
      }
      if (error.code === 'auth/user-not-found') {
        throw new Error('❌ Esta cuenta no existe. Por favor, regístrate primero.');
      }
      if (error.code === 'auth/wrong-password') {
        throw new Error('❌ Contraseña incorrecta. Por favor, intenta nuevamente.');
      }
      if (error.code === 'auth/too-many-requests') {
        throw new Error('⏳ Cuenta temporalmente bloqueada. Espera 15 minutos e intenta nuevamente.');
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

  const register = async (email: string, password: string, nombre: string) => {
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
      } catch (syncError: any) {
        console.log('⚠️ Usuario en Firebase pero no en PostgreSQL:', syncError.message);
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
    // 🎯 Limpiar timers al hacer logout manual
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
    }
    if (activityUpdateTimeout) {
      clearTimeout(activityUpdateTimeout);
    }
    
    await auth.signOut();
    setUser(null);
    localStorage.removeItem('diana_laura_user');
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    sendPasswordReset,
    verifyEmail,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};