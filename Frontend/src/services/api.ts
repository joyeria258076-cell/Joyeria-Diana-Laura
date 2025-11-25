// Ruta: Joyeria-Diana-Laura/Frontend/src/services/api.ts
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://joyeria-diana-laura-nqnq.onrender.com/api';

// 🎯 MANTENER TU FUNCIÓN ORIGINAL EXACTA
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

class EnhancedApiService {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    // 🆕 MEJORAR: Obtener token de localStorage directamente
    let token = null;
    try {
      const userData = localStorage.getItem('diana_laura_user');
      if (userData) {
        const user = JSON.parse(userData);
        token = user.token || null;
      }
    } catch (error) {
      token = null;
    }

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      
      // 🆕 MEJORAR: Manejar respuesta antes de parsear JSON
      if (!response.ok) {
        // Si es error 401/403, intentar parsear el error
        try {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Error en la petición');
        } catch {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
      }
      
      const data = await response.json();
      return data;
      
    } catch (error) {
      throw error;
    }
  }

  async post(endpoint: string, data: any) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async get(endpoint: string) {
    return this.request(endpoint, {
      method: 'GET',
    });
  }
}

// 🆕 CREAR INSTANCIA MEJORADA
const enhancedApi = new EnhancedApiService(API_BASE_URL);

// 🎯 MANTENER TU authAPI EXISTENTE EXACTA
export const authAPI = {
  // 🎯 NUEVA FUNCIÓN: Verificar estado de bloqueo
  checkAccountLock: async (data: { email: string }) => {
    return apiRequest('/auth/check-account-lock', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // 🎯 LOGIN CON BACKEND
  login: async (email: string, password: string, deviceInfo?: string) => {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, deviceInfo }),
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
  // Estas USAN enhancedApi para tener interceptors

  // Obtener sesiones activas del usuario
  getActiveSessions: async (userId: number) => {
    return enhancedApi.post('/auth/sessions/active', { userId });
  },

  // Revocar una sesión específica
  revokeSession: async (sessionId: number, userId: number) => {
    return enhancedApi.post('/auth/sessions/revoke', { sessionId, userId });
  },

  // Revocar todas las sesiones excepto la actual
  revokeAllOtherSessions: async (userId: number, currentSessionToken: string) => {
    return enhancedApi.post('/auth/sessions/revoke-others', { userId, currentSessionToken });
  },

  // Revocar TODAS las sesiones (incluyendo actual)
  revokeAllSessions: async (userId: number) => {
    return enhancedApi.post('/auth/sessions/revoke-all', { userId });
  },

  // 🆕 VALIDAR SESIÓN
  validateSession: async () => {
    return enhancedApi.get('/auth/validate-session');
  },

  // 🆕 LOGOUT MEJORADO
  logout: async () => {
    return enhancedApi.post('/auth/logout', {});
  },
};

// 🆕 EXPORTAR enhancedApi POR SI SE NECESITA EN OTROS LUGARES
export { enhancedApi };