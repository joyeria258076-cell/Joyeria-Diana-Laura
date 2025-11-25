// Ruta: Joyeria-Diana-Laura/Frontend/src/services/securityQuestionAPI.ts
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://joyeria-diana-laura-nqnq.onrender.com/api';

export const securityQuestionAPI = {
  // Obtener lista de preguntas predefinidas
  getSecureQuestions: async () => {
    const response = await fetch(`${API_BASE_URL}/security/secure-questions`);
    return await response.json();
  },

  // Configurar pregunta secreta
  setSecurityQuestion: async (email: string, questionType: string, customQuestion: string, answer: string) => {
    const response = await fetch(`${API_BASE_URL}/security/set-security-question`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        email, 
        questionType, 
        customQuestion, 
        answer 
      }),
    });
    return await response.json();
  },

  // Obtener pregunta secreta de un usuario
  getSecurityQuestion: async (email: string) => {
    const response = await fetch(`${API_BASE_URL}/security/get-security-question`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });
    return await response.json();
  },

  // Verificar respuesta secreta
  verifySecurityAnswer: async (userId: number, answer: string) => {
    const response = await fetch(`${API_BASE_URL}/security/verify-security-answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, answer }),
    });
    return await response.json();
  }
};