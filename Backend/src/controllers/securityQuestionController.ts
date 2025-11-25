// Ruta: Joyeria-Diana-Laura/Backend/src/controllers/securityQuestionController.ts
import { Request, Response } from 'express';
import { SecurityQuestionModel } from '../models/securityQuestionModel';
import { getUserByEmail, updatePassword } from '../models/userModel'; // 🆕 Agregar updatePassword
import admin from '../config/firebase'; // 🆕 Agregar import de Firebase
import { RecoverySecurityService } from '../services/recoverySecurityService'; // 🆕 Agregar import

// Lista de 5 preguntas seguras predefinidas
const SECURE_QUESTIONS = [
  "¿Cuál era el nombre de tu primera mascota?",
  "¿En qué ciudad conociste a tu mejor amigo/a?",
  "¿Cuál es el nombre de tu profesor favorito de la primaria?",
  "¿Cuál era tu comida favorita en la infancia?",
  "¿Cuál es el nombre del hospital donde naciste?"
];

export const setSecurityQuestion = async (req: Request, res: Response) => {
  try {
    const { email, questionType, customQuestion, answer } = req.body;

    if (!email || !questionType || !answer) {
      return res.status(400).json({
        success: false,
        message: 'Email, tipo de pregunta y respuesta son requeridos'
      });
    }

    // Determinar el texto de la pregunta
    let questionText = '';
    
    if (questionType === 'custom' && customQuestion) {
      // Validar pregunta personalizada
      const trimmedCustomQuestion = customQuestion.trim();
      if (trimmedCustomQuestion.length < 5) {
        return res.status(400).json({
          success: false,
          message: 'La pregunta personalizada debe tener al menos 5 caracteres'
        });
      }
      if (trimmedCustomQuestion.length > 200) {
        return res.status(400).json({
          success: false,
          message: 'La pregunta personalizada no puede tener más de 200 caracteres'
        });
      }
      questionText = trimmedCustomQuestion;
    } else if (questionType !== 'custom' && SECURE_QUESTIONS[parseInt(questionType)]) {
      // Usar pregunta predefinida
      questionText = SECURE_QUESTIONS[parseInt(questionType)];
    } else {
      return res.status(400).json({
        success: false,
        message: 'Tipo de pregunta no válido'
      });
    }

    // Validar respuesta
    const trimmedAnswer = answer.trim();
    if (trimmedAnswer.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'La respuesta debe tener al menos 2 caracteres'
      });
    }

    if (trimmedAnswer.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'La respuesta no puede tener más de 100 caracteres'
      });
    }

    // Obtener usuario
    const user = await getUserByEmail(email);
    if (!user || !user.id) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Crear pregunta secreta
    const success = await SecurityQuestionModel.createSecurityQuestion(
      user.id,
      questionText,
      trimmedAnswer
    );

    if (success) {
      res.json({
        success: true,
        message: 'Pregunta secreta configurada correctamente'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Error al configurar la pregunta secreta'
      });
    }

  } catch (error: any) {
    console.error('Error en setSecurityQuestion:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor: ' + error.message
    });
  }
};

export const getSecurityQuestion = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email es requerido'
      });
    }

    const questionData = await SecurityQuestionModel.getSecurityQuestionByEmail(email);

    if (!questionData.exists || !questionData.question) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró pregunta secreta para este usuario'
      });
    }

    res.json({
      success: true,
      data: {
        question: questionData.question,
        userId: questionData.userId
      }
    });

  } catch (error: any) {
    console.error('Error en getSecurityQuestion:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor: ' + error.message
    });
  }
};

export const verifySecurityAnswer = async (req: Request, res: Response) => {
  try {
    const { userId, answer } = req.body;

    if (!userId || !answer) {
      return res.status(400).json({
        success: false,
        message: 'User ID y respuesta son requeridos'
      });
    }

    const verification = await SecurityQuestionModel.verifySecurityAnswer(userId, answer.trim());

    if (!verification.valid) {
      return res.status(401).json({
        success: false,
        message: 'Respuesta incorrecta'
      });
    }

    res.json({
      success: true,
      message: 'Respuesta correcta',
      data: {
        verified: true,
        question: verification.question
      }
    });

  } catch (error: any) {
    console.error('Error en verifySecurityAnswer:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor: ' + error.message
    });
  }
};

export const getSecureQuestionsList = async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: {
        questions: SECURE_QUESTIONS
      }
    });
  } catch (error: any) {
    console.error('Error en getSecureQuestionsList:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

export const resetPasswordWithSecurityQuestion = async (req: Request, res: Response) => {
  try {
    const { email, securityAnswer, newPassword } = req.body;

    if (!email || !securityAnswer || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, respuesta secreta y nueva contraseña son requeridos'
      });
    }

    // Validar nueva contraseña
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener al menos 8 caracteres'
      });
    }

    // Obtener usuario
    const user = await getUserByEmail(email);
    if (!user || !user.id) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Verificar respuesta secreta
    const verification = await SecurityQuestionModel.verifySecurityAnswer(user.id, securityAnswer);
    
    if (!verification.valid) {
      return res.status(401).json({
        success: false,
        message: 'Respuesta secreta incorrecta'
      });
    }

    // Actualizar contraseña en Firebase
    try {
      console.log('🔄 Actualizando contraseña en Firebase para:', email);
      const userRecord = await admin.auth().getUserByEmail(email);
      await admin.auth().updateUser(userRecord.uid, {
        password: newPassword
      });
      console.log('✅ Contraseña actualizada en Firebase');
    } catch (firebaseError: any) {
      console.error('Error actualizando contraseña en Firebase:', firebaseError);
      return res.status(400).json({
        success: false,
        message: 'Error al actualizar la contraseña en Firebase: ' + firebaseError.message
      });
    }

    // Actualizar contraseña en PostgreSQL
    console.log('🔄 Actualizando contraseña en PostgreSQL para usuario ID:', user.id);
    const passwordUpdated = await updatePassword(user.id, newPassword);
    
    if (!passwordUpdated) {
      console.error('❌ Error actualizando contraseña en PostgreSQL');
      // No retornamos error porque Firebase ya se actualizó
    } else {
      console.log('✅ Contraseña actualizada en PostgreSQL');
    }

    // Resetear intentos de recuperación
    console.log('🔄 Reseteando intentos de recuperación para:', email);
    await RecoverySecurityService.resetAfterSuccessfulRecovery(email);
    console.log('✅ Intentos de recuperación reseteados');

    res.json({
      success: true,
      message: 'Contraseña actualizada correctamente'
    });

  } catch (error: any) {
    console.error('Error en resetPasswordWithSecurityQuestion:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor: ' + error.message
    });
  }
};