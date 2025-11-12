const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://joyeria-diana-laura.onrender.com/api';

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
  login: async (email: string, password: string) => {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  register: async (email: string, password: string, nombre: string) => {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, nombre }),
    });
  },

  forgotPassword: async (email: string) => {
    return apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  resetPassword: async (email: string, newPassword: string) => {
    return apiRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, newPassword }),
    });
  }
};