// Ruta: Joyeria-Diana-Laura/Backend/src/models/securityQuestionModel.ts
import { pool } from '../config/database';
import bcrypt from 'bcryptjs';

export interface SecurityQuestion {
  id?: number;
  user_id: number;
  question_text: string;
  answer_hash: string;
  created_at?: Date;
  updated_at?: Date;
}

export class SecurityQuestionModel {
  /**
   * Crear pregunta secreta para un usuario
   */
  static async createSecurityQuestion(
    userId: number, 
    questionText: string, 
    answer: string
  ): Promise<boolean> {
    try {
      // Encriptar la respuesta (igual que las contraseñas)
      const saltRounds = 10;
      const answerHash = await bcrypt.hash(answer, saltRounds);
      
      const result = await pool.query(
        `INSERT INTO security_questions (user_id, question_text, answer_hash) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (user_id) 
         DO UPDATE SET 
           question_text = $2, 
           answer_hash = $3,
           updated_at = CURRENT_TIMESTAMP
         RETURNING id`,
        [userId, questionText, answerHash]
      );
      
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      console.error('Error creando pregunta secreta:', error);
      return false;
    }
  }

  /**
   * Verificar respuesta secreta
   */
  static async verifySecurityAnswer(
    userId: number, 
    answer: string
  ): Promise<{ valid: boolean; question?: string }> {
    try {
      const result = await pool.query(
        `SELECT question_text, answer_hash 
         FROM security_questions 
         WHERE user_id = $1`,
        [userId]
      );
      
      if (result.rows.length === 0) {
        return { valid: false };
      }
      
      const securityQuestion = result.rows[0];
      const isValid = await bcrypt.compare(answer, securityQuestion.answer_hash);
      
      return { 
        valid: isValid, 
        question: securityQuestion.question_text 
      };
    } catch (error) {
      console.error('Error verificando respuesta secreta:', error);
      return { valid: false };
    }
  }

  /**
   * Obtener pregunta secreta por user_id
   */
  static async getSecurityQuestionByUserId(userId: number): Promise<SecurityQuestion | null> {
    try {
      const result = await pool.query(
        `SELECT * FROM security_questions WHERE user_id = $1`,
        [userId]
      );
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error obteniendo pregunta secreta:', error);
      return null;
    }
  }

  /**
   * Obtener pregunta secreta por email
   */
  static async getSecurityQuestionByEmail(email: string): Promise<{ 
    question?: string; 
    userId?: number;
    exists: boolean 
  }> {
    try {
      const result = await pool.query(
        `SELECT sq.question_text, u.id as user_id
         FROM security_questions sq
         JOIN usuarios u ON sq.user_id = u.id
         WHERE u.email = $1 AND u.activo = true`,
        [email]
      );
      
      if (result.rows.length === 0) {
        return { exists: false };
      }
      
      return { 
        question: result.rows[0].question_text,
        userId: result.rows[0].user_id,
        exists: true 
      };
    } catch (error) {
      console.error('Error obteniendo pregunta por email:', error);
      return { exists: false };
    }
  }

  /**
   * Eliminar pregunta secreta (para desactivar esta característica)
   */
  static async deleteSecurityQuestion(userId: number): Promise<boolean> {
    try {
      const result = await pool.query(
        'DELETE FROM security_questions WHERE user_id = $1',
        [userId]
      );
      
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      console.error('Error eliminando pregunta secreta:', error);
      return false;
    }
  }
}