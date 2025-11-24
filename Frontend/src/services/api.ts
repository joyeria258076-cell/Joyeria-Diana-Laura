// Ruta: Joyeria-Diana-Laura/Frontend/src/services/api.ts
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://joyeria-diana-laura-nqnq.onrender.com/api';

export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Error en la petición');
    }

    return data;
  } catch (error) {
    throw error;
  }
};

export const authAPI = {
  // 🎯 NUEVA FUNCIÓN: Verificar estado de bloqueo
  checkAccountLock: async (data: { email: string }) => {
    return apiRequest('/auth/check-account-lock', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // 🎯 LOGIN CON BACKEND
  login: async (email: string, password: string) => {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  // 🎯 VERIFICAR USUARIO EN FIREBASE
  checkFirebaseUser: async (email: string) => {
    return apiRequest('/auth/check-firebase-user', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  // 🎯 VALIDAR EMAIL
  validateEmail: async (email: string) => {
    return apiRequest('/auth/validate-email', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  // 🎯 SINCRONIZAR A POSTGRESQL
  syncUser: async (email: string, firebaseUID: string, nombre?: string) => {
    return apiRequest('/auth/sync-user', {
      method: 'POST',
      body: JSON.stringify({ email, firebaseUID, nombre }),
    });
  },

  // 🎯 RECUPERACIÓN DE CONTRASEÑA
  forgotPassword: async (email: string) => {
    return apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  // 🎯 RESET PASSWORD
  resetPassword: async (email: string, newPassword: string) => {
    return apiRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, newPassword }),
    });
  },

  // 🎯 TEST EMAIL DELIVERY
  testEmailDelivery: async (email: string) => {
    return apiRequest('/auth/test-email', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  // 🎯 NUEVA FUNCIÓN para resetear intentos después de cambio exitoso
  resetRecoveryAttempts: async (email: string) => {
    return apiRequest('/auth/reset-recovery-attempts', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  // 🎯 FUNCIÓN OPTIMIZADA: Update activity con manejo silencioso de errores
  updateActivity: async (email: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/update-activity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        // 🚫 No lanzar error - fallo silencioso
        console.log('⚠️ Activity update failed silently');
        return;
      }
      
      return await response.json();
    } catch (error) {
      // 🚫 No lanzar error - fallo silencioso
      console.log('🌐 Network error in activity update - failing silently');
    }
  },

  // 🆕 NUEVAS FUNCIONES PARA GESTIÓN DE SESIONES

  // Obtener sesiones activas del usuario
  getActiveSessions: async (userId: number) => {
    return apiRequest('/auth/sessions/active', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  },

  // Revocar una sesión específica
  revokeSession: async (sessionId: number, userId: number) => {
    return apiRequest('/auth/sessions/revoke', {
      method: 'POST',
      body: JSON.stringify({ sessionId, userId }),
    });
  },

  // Revocar todas las sesiones excepto la actual
  revokeAllOtherSessions: async (userId: number, currentSessionToken: string) => {
    return apiRequest('/auth/sessions/revoke-others', {
      method: 'POST',
      body: JSON.stringify({ userId, currentSessionToken }),
    });
  },

  // Revocar TODAS las sesiones (incluyendo actual)
  revokeAllSessions: async (userId: number) => {
    return apiRequest('/auth/sessions/revoke-all', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  },
};