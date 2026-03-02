// Ruta: Joyeria-Diana-Laura/Frontend/src/services/api.ts
//const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://joyeria-diana-laura-nqnq.onrender.com/api';
const API_BASE_URL = 'http://localhost:5000/api';

// 🎯 MANTENER TU FUNCIÓN ORIGINAL EXACTA
export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
        credentials: 'include',
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
    // 🆕 OBTENER TOKEN JWT Y SESSION TOKEN
    let jwtToken = null;
    let sessionToken = null;
    
    try {
      // 1. Intentar obtener JWT del user
      const userData = localStorage.getItem('diana_laura_user');
      if (userData) {
        const user = JSON.parse(userData);
        jwtToken = user.token || null;
      }
      
      // 2. SIEMPRE obtener sessionToken directamente
      sessionToken = localStorage.getItem('diana_laura_session_token');
      
      console.log('🔐 Tokens disponibles:', {
        jwt: jwtToken ? jwtToken.substring(0, 15) + '...' : 'NO',
        session: sessionToken ? sessionToken.substring(0, 15) + '...' : 'NO'
      });
      
    } catch (error) {
      console.error('❌ Error obteniendo tokens:', error);
    }

    // 🆕 CONSTRUIR HEADERS CON AMBOS TOKENS
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Agregar JWT si existe (Authorization Bearer)
    if (jwtToken) {
      headers['Authorization'] = `Bearer ${jwtToken}`;
    }
    
    // Agregar sessionToken si existe (X-Session-Token)
    if (sessionToken) {
      headers['X-Session-Token'] = sessionToken;
    }

    const config: RequestInit = {
      credentials: 'include', 
      headers: {
        ...headers,
        ...options.headers,
      },
      ...options,
    };

    try {
      console.log(`📡 Enviando ${options.method || 'GET'} a ${endpoint}`);
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      
      if (!response.ok) {
        try {
          const errorData = await response.json();
          console.error('❌ Error del servidor:', errorData);
          throw new Error(errorData.message || `Error ${response.status}`);
        } catch {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
      }
      
      const data = await response.json();
      console.log('✅ Respuesta exitosa:', endpoint);
      return data;
      
    } catch (error) {
      console.error('❌ Error en request:', error);
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

  async delete(endpoint: string) {
    return this.request(endpoint, {
      method: 'DELETE',
    });
  }

  async put(endpoint: string, data: any) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
}

// 🆕 CREAR INSTANCIA MEJORADA
const enhancedApi = new EnhancedApiService(API_BASE_URL);

// 🎯 MANTENER TU authAPI EXISTENTE EXACTA
export const authAPI = {

    // 🎯 NUEVA FUNCIÓN: Obtener información del token JWT
  getJWTInfo: async () => {
    return enhancedApi.get('/jwt-info');
  },

  // 🎯 NUEVA FUNCIÓN: Verificar configuración JWT
  getJWTConfig: async () => {
    return enhancedApi.get('/jwt-config');
  },
  
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
        credentials: 'include',
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

  setupMFA: async (userId: number, email: string) => {
    return enhancedApi.post('/auth/mfa/setup', { userId, email });
  },

  verifyAndEnableMFA: async (userId: number, token: string) => {
    return enhancedApi.post('/auth/mfa/verify-enable', { userId, token });
  },

  verifyLoginMFA: async (userId: number, token: string) => {
    return enhancedApi.post('/auth/mfa/verify-login', { userId, token });
  },

  disableMFA: async (userId: number) => {
    return enhancedApi.post('/auth/mfa/disable', { userId });
  },

  checkMFAStatus: async (userId: number) => {
    return enhancedApi.post('/auth/mfa/status', { userId });
  }
};

export const productsAPI = {
  // 📦 Obtener catálogo completo
  getAll: async () => {
    return enhancedApi.get('/products');
  },

  // 💎 Crear nuevo producto
  // (No necesitas cambiar el "data: any", porque ahora desde el formulario 
  // le estaremos enviando automáticamente el "categoria_id" en lugar del nombre)
  create: async (data: any) => {
    return enhancedApi.post('/products', data);
  },

  // 🗑️ Eliminar producto 
  delete: async (id: number | string) => {
    return enhancedApi.delete(`/products/${id}`);
  },

  // 📂 Obtener todas las categorías
  getCategories: async () => {
    return enhancedApi.get('/products/categorias');
  },

  // 📂 Obtener una categoría por ID
  getCategoryById: async (id: number) => {
    return enhancedApi.get(`/products/categorias/${id}`);
  },

  // 📂 Obtener subcategorías de una categoría padre
  getSubcategorias: async (id: number) => {
    return enhancedApi.get(`/products/categorias/${id}/subcategorias`);
  },

  // ➕ Crear nueva categoría con todos los campos
  createCategory: async (data: {
    nombre: string;
    descripcion?: string;
    categoria_padre_id?: number | null;
    imagen_url?: string;
    orden?: number;
    creado_por?: number;
  }) => {
    return enhancedApi.post('/products/categorias', data);
  },

  // ✏️ Actualizar categoría
  updateCategory: async (id: number, data: {
    nombre?: string;
    descripcion?: string;
    categoria_padre_id?: number | null;
    imagen_url?: string;
    orden?: number;
    activo?: boolean;
  }) => {
    return enhancedApi.put(`/products/categorias/${id}`, data);
  },

  // 🔄 Cambiar estado de categoría (Activo / Inactivo)
  toggleCategoryStatus: async (id: number, activo: boolean) => {
    return enhancedApi.post(`/products/categorias/${id}/status`, { activo });
  },

  // 🗑️ Eliminar categoría definitivamente
  deleteCategory: async (id: number) => {
    return enhancedApi.delete(`/products/categorias/${id}`);
  }
};

export const workersAPI = {
  // 🎯 Actualizado para usar el nuevo controlador de admin
  create: async (workerData: { nombre: string; email: string; puesto: string; password: string }) => {
    return enhancedApi.post('/admin/workers', workerData); // ✅ Ruta nueva
  },
  
  // 📋 Este se queda igual (obtiene la lista de usuarios)
  getAll: async () => {
    return enhancedApi.get('/users');
  }
};