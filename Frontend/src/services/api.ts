// Ruta: Joyeria-Diana-Laura/Frontend/src/services/api.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://joyeria-diana-laura-nqnq.onrender.com/api';
//const API_BASE_URL = 'http://localhost:5000/api';

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

  // 👇 MÉTODOS AÑADIDOS PARA EL GESTOR DE CONTENIDO
  async put(endpoint: string, data: any) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async patch(endpoint: string, data: any) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }
}

// 🆕 CREAR INSTANCIA MEJORADA
const enhancedApi = new EnhancedApiService(API_BASE_URL);

// ==========================================
// 📥 API PARA IMPORTACIÓN DE DATOS
// ==========================================
export const importAPI = {
  // Obtener todas las tablas disponibles
  getTables: async () => {
    return enhancedApi.get('/import/tables');
  },

  // Obtener información de una tabla específica
  getTableInfo: async (tableName: string) => {
    return enhancedApi.get(`/import/tables/${tableName}`);
  },

  // Subir y previsualizar CSV
  previewCSV: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    // Usamos fetch directamente para FormData
    const jwtToken = localStorage.getItem('diana_laura_user') 
      ? JSON.parse(localStorage.getItem('diana_laura_user')!).token 
      : null;
    const sessionToken = localStorage.getItem('diana_laura_session_token');

    const headers: Record<string, string> = {};
    if (jwtToken) headers['Authorization'] = `Bearer ${jwtToken}`;
    if (sessionToken) headers['X-Session-Token'] = sessionToken;

    const response = await fetch(`${API_BASE_URL}/import/preview`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al procesar el archivo');
    }

    return response.json();
  },

  // Importar datos a la base de datos
  importData: async (tableName: string, data: any[], columns: string[]) => {
    return enhancedApi.post('/import/import', {
      tableName,
      data,
      columns,
    });
  },

  // Validar datos sin importar
  validateImport: async (tableName: string, data: any[]) => {
    return enhancedApi.post('/import/validate', {
      tableName,
      data,
    });
  },
};

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

  // 🆕 Obtener productos recientes
  getRecent: async (limit: number = 10) => {
    return enhancedApi.get(`/products/recent?limit=${limit}`);
  },

  // 🆕 Obtener producto por ID
  getById: async (id: number) => {
    return enhancedApi.get(`/products/${id}`);
  },

  // 🆕 Buscar productos
  search: async (query: string) => {
    return enhancedApi.get(`/products/search?q=${encodeURIComponent(query)}`);
  },

  // 💎 Crear nuevo producto
  // (No necesitas cambiar el "data: any", porque ahora desde el formulario 
  // le estaremos enviando automáticamente el "categoria_id" en lugar del nombre)
  create: async (data: any) => {
    return enhancedApi.post('/products', data);
  },

  // 🆕 Actualizar producto
  update: async (id: number, data: any) => {
    return enhancedApi.put(`/products/${id}`, data);
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
  },

  // ========================================
  // 📦 PROVEEDORES
  // ========================================
  getProveedores: async () => {
    return enhancedApi.get('/products/proveedores');
  },

  getProveedorById: async (id: number) => {
    return enhancedApi.get(`/products/proveedores/${id}`);
  },

  // ========================================
  // 📅 TEMPORADAS
  // ========================================
  getTemporadas: async () => {
    return enhancedApi.get('/products/temporadas');
  },

  getTemporadaById: async (id: number) => {
    return enhancedApi.get(`/products/temporadas/${id}`);
  },

  // ========================================
  // 🏷️ TIPOS DE PRODUCTO
  // ========================================
  getTiposProducto: async () => {
    return enhancedApi.get('/products/tipos-producto');
  },

  getTipoProductoById: async (id: number) => {
    return enhancedApi.get(`/products/tipos-producto/${id}`);
  },

  // ========================================
  // ⚙️ CONFIGURACIÓN
  // ========================================
  getConfiguracion: async () => {
    return enhancedApi.get('/products/configuracion');
  },

  getConfiguracionByClave: async (clave: string) => {
    return enhancedApi.get(`/products/configuracion/clave/${clave}`);
  },

  getConfiguracionByCategoria: async (categoria: string) => {
    return enhancedApi.get(`/products/configuracion/categoria/${categoria}`);
  },

  // ========================================
  // 🔍 BÚSQUEDA Y FILTROS AVANZADOS (Pública)
  // ========================================
  searchAndFilter: async (filters: {
    nombre?: string;
    categoria_id?: number;
    tipo_producto_id?: number;
    material_principal?: string;
    precio_min?: number;
    precio_max?: number;
    limit?: number;
    offset?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters.nombre) params.append('nombre', filters.nombre);
    if (filters.categoria_id) params.append('categoria_id', filters.categoria_id.toString());
    if (filters.tipo_producto_id) params.append('tipo_producto_id', filters.tipo_producto_id.toString());
    if (filters.material_principal) params.append('material_principal', filters.material_principal);
    if (filters.precio_min) params.append('precio_min', filters.precio_min.toString());
    if (filters.precio_max) params.append('precio_max', filters.precio_max.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());

    return enhancedApi.get(`/products/filter?${params.toString()}`);
  },

  getProductsByCategories: async (limit: number = 4) => {
    return enhancedApi.get(`/products/por-categorias?limit=${limit}`);
  },

  getProductsByCategory: async (categoria_id: number, limit: number = 20) => {
    return enhancedApi.get(`/products/categorias/${categoria_id}/productos?limit=${limit}`);
  }
};

export const workersAPI = {

  getRoles: async () => {
    return enhancedApi.get('/admin/roles'); // O la ruta de tu backend que devuelva los roles
  },

  // 🎯 Actualizado para usar el nuevo controlador de admin
  create: async (workerData: { nombre: string; email: string; rol: string; password: string }) => {
    return enhancedApi.post('/admin/workers', workerData); 
  },
  
  // 📋 Este se queda igual (obtiene la lista de usuarios)
  getAll: async () => {
    return enhancedApi.get('/users');
  },

  // 🔄 Activar/Desactivar cuenta
    toggleStatus: async (id: number, activo: boolean) => {
      return enhancedApi.patch(`/admin/workers/${id}/status`, { activo });
    },

    // 👇 Obtener un solo trabajador por ID (Para cargar el formulario de edición)
    getById: async (id: string | number) => {
      return enhancedApi.get(`/users/${id}`); 
    },

    // 👇 Actualizar nombre y rol del trabajador
    update: async (id: string | number, workerData: { nombre: string; rol: string; email: string }) => {
      return enhancedApi.put(`/admin/workers/${id}`, workerData);
    }
};

// ==========================================
// 📝 GESTOR DE CONTENIDO (PÁGINAS Y NOTICIAS)
// ==========================================
export const contentAPI = {
  // 1. Configuración global de la página (Banner, Título principal)
  getPageConfig: async (pageName: string) => {
    return enhancedApi.get(`/content/pages/${pageName}`);
  },
  updatePageConfig: async (pageName: string, data: { titulo: string; contenido: string; imagen: string; fecha: string }) => {
    return enhancedApi.put(`/content/pages/${pageName}`, data);
  },

  // 2. Gestión de artículos individuales (Noticias)
  getNoticias: async () => {
    return enhancedApi.get('/content/noticias');
  },
  createNoticia: async (data: any) => {
    return enhancedApi.post('/content/noticias', data);
  },
  toggleNoticiaStatus: async (id: string, activa: boolean) => {
    return enhancedApi.patch(`/content/noticias/${id}/status`, { activa });
  },
  deleteNoticia: async (id: string) => {
    return enhancedApi.delete(`/content/noticias/${id}`);
  }
};

// ==========================================
// GESTIÓN DE CARRUSEL Y PROMOCIONES (Inicio)
// ==========================================
export const carruselAPI = {
  // 👈 Agregamos /content/ antes de cada ruta
  getAll: async () => enhancedApi.get('/content/carrusel'),
  create: async (data: { titulo: string; descripcion: string; imagen: string; enlace?: string }) => enhancedApi.post('/content/carrusel', data),
  delete: async (id: string | number) => enhancedApi.delete(`/content/carrusel/${id}`)
};

export const promocionesAPI = {
  // 👈 Agregamos /content/ antes de cada ruta
  getAll: async () => enhancedApi.get('/content/promociones'),
  create: async (data: { titulo: string; descripcion: string; descuento: number; activa?: boolean }) => enhancedApi.post('/content/promociones', data),
  toggleStatus: async (id: string | number, activa: boolean) => enhancedApi.patch(`/content/promociones/${id}/status`, { activa }),
  delete: async (id: string | number) => enhancedApi.delete(`/content/promociones/${id}`)
};

// ==========================================
// GESTIÓN DE PÁGINAS (CMS DINÁMICO)
// ==========================================
export const paginasAPI = {
  getAll: async () => enhancedApi.get('/content/paginas'),
  getById: async (id: string | number) => enhancedApi.get(`/content/paginas/${id}`),
  create: async (data: {
    nombre: string;
    slug: string;
    descripcion?: string;
    icono?: string;
    orden?: number;
    mostrar_en_menu?: boolean;
    mostrar_en_footer?: boolean;
    requiere_autenticacion?: boolean;
  }) => enhancedApi.post('/content/paginas', data),
  update: async (id: string | number, data: {
    nombre: string;
    slug: string;
    descripcion?: string;
    icono?: string;
    orden?: number;
    mostrar_en_menu?: boolean;
    mostrar_en_footer?: boolean;
    requiere_autenticacion?: boolean;
  }) => enhancedApi.put(`/content/paginas/${id}`, data),
  delete: async (id: string | number) => enhancedApi.delete(`/content/paginas/${id}`)
};

// ==========================================
// GESTIÓN DE SECCIONES (CMS DINÁMICO)
// ==========================================
export const seccionesAPI = {
  getByPagina: async (paginaId: string | number) => enhancedApi.get(`/content/secciones/pagina/${paginaId}`),
  getById: async (id: string | number) => enhancedApi.get(`/content/secciones/${id}`),
  create: async (data: {
    pagina_id: string | number;
    nombre: string;
    descripcion?: string;
    imagen_url?: string;
    color_fondo?: string;
    orden?: number;
  }) => enhancedApi.post('/content/secciones', data),
  update: async (id: string | number, data: {
    nombre: string;
    descripcion?: string;
    imagen_url?: string;
    color_fondo?: string;
    orden?: number;
  }) => enhancedApi.put(`/content/secciones/${id}`, data),
  delete: async (id: string | number) => enhancedApi.delete(`/content/secciones/${id}`)
};

// ==========================================
// GESTIÓN DE CONTENIDOS (CMS DINÁMICO)
// ==========================================
export const contenidosAPI = {
  getBySeccion: async (seccionId: string | number) => enhancedApi.get(`/content/contenidos/seccion/${seccionId}`),
  getById: async (id: string | number) => enhancedApi.get(`/content/contenidos/${id}`),
  create: async (data: {
    seccion_id: string | number;
    titulo: string;
    descripcion?: string;
    imagen_url?: string;
    enlace_url?: string;
    enlace_nueva_ventana?: boolean;
    orden?: number;
  }) => enhancedApi.post('/content/contenidos', data),
  update: async (id: string | number, data: {
    titulo: string;
    descripcion?: string;
    imagen_url?: string;
    enlace_url?: string;
    enlace_nueva_ventana?: boolean;
    orden?: number;
  }) => enhancedApi.put(`/content/contenidos/${id}`, data),
  delete: async (id: string | number) => enhancedApi.delete(`/content/contenidos/${id}`)
};

// 🗄️ GESTIÓN DE RESPALDOS (BACKUPS)
// ==========================================
export const backupsAPI = {
  // Obtener lista de todos los archivos .sql
  getAll: async () => {
    return enhancedApi.get('/backups');
  },

  // Generar un nuevo backup en el servidor
  create: async () => {
    return enhancedApi.post('/backups/create', {});
  },

  // Eliminar un archivo de respaldo
  delete: async (id: string) => {
    return enhancedApi.delete(`/backups/${id}`);
  }
};

// ==========================================
// 📤 API PARA UPLOAD DE IMÁGENES
// ==========================================
export const uploadAPI = {
  // Subir imagen general
  uploadImage: async (file: File, folder?: string) => {
    const formData = new FormData();
    formData.append('imagen', file);
    if (folder) formData.append('folder', folder);

    const jwtToken = localStorage.getItem('diana_laura_user') 
      ? JSON.parse(localStorage.getItem('diana_laura_user')!).token 
      : null;
    const sessionToken = localStorage.getItem('diana_laura_session_token');

    const headers: Record<string, string> = {};
    if (jwtToken) headers['Authorization'] = `Bearer ${jwtToken}`;
    if (sessionToken) headers['X-Session-Token'] = sessionToken;

    const response = await fetch(`${API_BASE_URL}/upload/image`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al subir la imagen');
    }

    return response.json();
  },

  // Subir imagen para producto (con o sin ID)
  uploadProductImage: async (file: File, productoId?: number | string, esPrincipal?: boolean) => {
    const formData = new FormData();
    formData.append('imagen', file);
    if (esPrincipal) formData.append('esPrincipal', 'true');

    let url = '/upload/productos/imagen';
    if (productoId) {
      url = `/upload/productos/${productoId}/imagen`;
    }

    const jwtToken = localStorage.getItem('diana_laura_user') 
      ? JSON.parse(localStorage.getItem('diana_laura_user')!).token 
      : null;
    const sessionToken = localStorage.getItem('diana_laura_session_token');

    const headers: Record<string, string> = {};
    if (jwtToken) headers['Authorization'] = `Bearer ${jwtToken}`;
    if (sessionToken) headers['X-Session-Token'] = sessionToken;

    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al subir la imagen del producto');
    }

    return response.json();
  },

  // Subir imagen para categoría
  uploadCategoryImage: async (file: File, categoriaId?: number | string) => {
    const formData = new FormData();
    formData.append('imagen', file);

    let url = '/upload/categorias/imagen';
    if (categoriaId) {
      url = `/upload/categorias/${categoriaId}/imagen`;
    }

    const jwtToken = localStorage.getItem('diana_laura_user') 
      ? JSON.parse(localStorage.getItem('diana_laura_user')!).token 
      : null;
    const sessionToken = localStorage.getItem('diana_laura_session_token');

    const headers: Record<string, string> = {};
    if (jwtToken) headers['Authorization'] = `Bearer ${jwtToken}`;
    if (sessionToken) headers['X-Session-Token'] = sessionToken;

    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al subir la imagen de la categoría');
    }

    return response.json();
  },

  // Actualizar imagen (eliminar anterior y subir nueva)
  updateImage: async (file: File, oldPublicId: string, folder?: string) => {
    const formData = new FormData();
    formData.append('imagen', file);
    formData.append('oldPublicId', oldPublicId);
    if (folder) formData.append('folder', folder);

    const jwtToken = localStorage.getItem('diana_laura_user') 
      ? JSON.parse(localStorage.getItem('diana_laura_user')!).token 
      : null;
    const sessionToken = localStorage.getItem('diana_laura_session_token');

    const headers: Record<string, string> = {};
    if (jwtToken) headers['Authorization'] = `Bearer ${jwtToken}`;
    if (sessionToken) headers['X-Session-Token'] = sessionToken;

    const response = await fetch(`${API_BASE_URL}/upload/image`, {
      method: 'PUT',
      headers,
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al actualizar la imagen');
    }

    return response.json();
  },

  // Eliminar imagen por publicId
  deleteImage: async (publicId: string) => {
    const jwtToken = localStorage.getItem('diana_laura_user') 
      ? JSON.parse(localStorage.getItem('diana_laura_user')!).token 
      : null;
    const sessionToken = localStorage.getItem('diana_laura_session_token');

    const headers: Record<string, string> = {};
    if (jwtToken) headers['Authorization'] = `Bearer ${jwtToken}`;
    if (sessionToken) headers['X-Session-Token'] = sessionToken;

    const response = await fetch(`${API_BASE_URL}/upload/image/${publicId}`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al eliminar la imagen');
    }

    return response.json();
  }
};

// ==========================================
// 📥 EXPORTACIÓN DE API (opcional, para tener todo en un solo objeto)
// ==========================================
export const api = {
  auth: authAPI,
  products: productsAPI,
  workers: workersAPI,
  content: contentAPI,
  carrusel: carruselAPI,
  promociones: promocionesAPI,
  paginas: paginasAPI,
  secciones: seccionesAPI,
  contenidos: contenidosAPI,
  import: importAPI, // ✅ NUEVO
};

export default api;
