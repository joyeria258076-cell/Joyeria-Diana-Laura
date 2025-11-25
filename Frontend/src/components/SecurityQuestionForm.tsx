// Ruta: Joyeria-Diana-Laura/Frontend/src/components/SecurityQuestionForm.tsx
import React, { useState, useEffect } from 'react';
import { securityQuestionAPI } from '../services/securityQuestionAPI';
import '../styles/SecurityQuestionForm.css';

interface SecurityQuestionFormProps {
  email: string;
  onQuestionSet: (success: boolean) => void;
}

const SecurityQuestionForm: React.FC<SecurityQuestionFormProps> = ({ email, onQuestionSet }) => {
  const [questionType, setQuestionType] = useState<string>('0');
  const [customQuestion, setCustomQuestion] = useState<string>('');
  const [answer, setAnswer] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [predefinedQuestions, setPredefinedQuestions] = useState<string[]>([]);

  // Cargar preguntas predefinidas
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const response = await securityQuestionAPI.getSecureQuestions();
        if (response.success) {
          setPredefinedQuestions(response.data.questions);
        }
      } catch (error) {
        console.error('Error cargando preguntas:', error);
      }
    };
    loadQuestions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    // Validaciones
    if (!answer.trim()) {
      setMessage('La respuesta es requerida');
      setMessageType('error');
      setLoading(false);
      return;
    }

    if (questionType === 'custom' && !customQuestion.trim()) {
      setMessage('La pregunta personalizada es requerida');
      setMessageType('error');
      setLoading(false);
      return;
    }

    if (answer.trim().length < 2) {
      setMessage('La respuesta debe tener al menos 2 caracteres');
      setMessageType('error');
      setLoading(false);
      return;
    }

    try {
      const response = await securityQuestionAPI.setSecurityQuestion(
        email,
        questionType,
        customQuestion,
        answer
      );

      if (response.success) {
        setMessage('✅ Pregunta secreta configurada correctamente');
        setMessageType('success');
        onQuestionSet(true);
        
        // Limpiar formulario
        setQuestionType('0');
        setCustomQuestion('');
        setAnswer('');
      } else {
        setMessage(`❌ ${response.message}`);
        setMessageType('error');
        onQuestionSet(false);
      }
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`);
      setMessageType('error');
      onQuestionSet(false);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Limitar a 100 caracteres
    if (value.length <= 100) {
      setAnswer(value);
    }
  };

  const handleCustomQuestionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Limitar a 200 caracteres
    if (value.length <= 200) {
      setCustomQuestion(value);
    }
  };

  return (
    <div className="security-question-form">
      <div className="form-header">
        <h3>🔒 Configurar Pregunta Secreta</h3>
        <p>Esta pregunta te ayudará a recuperar tu cuenta si olvidas tu contraseña</p>
      </div>

      {message && (
        <div className={`security-message ${messageType}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="security-form">
        <div className="form-group">
          <label htmlFor="questionType">Selecciona una pregunta:</label>
          <select 
            id="questionType"
            value={questionType} 
            onChange={(e) => setQuestionType(e.target.value)}
            className="security-select"
          >
            <option value="0">{predefinedQuestions[0] || 'Cargando...'}</option>
            <option value="1">{predefinedQuestions[1] || 'Cargando...'}</option>
            <option value="2">{predefinedQuestions[2] || 'Cargando...'}</option>
            <option value="3">{predefinedQuestions[3] || 'Cargando...'}</option>
            <option value="4">{predefinedQuestions[4] || 'Cargando...'}</option>
            <option value="custom">✏️ Definir pregunta personalizada</option>
          </select>
        </div>

        {questionType === 'custom' && (
          <div className="form-group">
            <label htmlFor="customQuestion">Tu pregunta personalizada:</label>
            <input
              id="customQuestion"
              type="text"
              value={customQuestion}
              onChange={handleCustomQuestionChange}
              placeholder="Escribe tu pregunta personalizada (mín. 5 caracteres)"
              className="security-input"
              maxLength={200}
            />
            <div className="character-count">
              {customQuestion.length}/200 caracteres
            </div>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="securityAnswer">Tu respuesta:</label>
          <input
            id="securityAnswer"
            type="text"
            value={answer}
            onChange={handleAnswerChange}
            placeholder="Escribe tu respuesta (mín. 2 caracteres)"
            className="security-input"
            maxLength={100}
          />
          <div className="character-count">
            {answer.length}/100 caracteres
          </div>
          <div className="security-tips">
            <p><strong>💡 Consejos para una respuesta segura:</strong></p>
            <ul>
              <li>Usa respuestas que solo tú conozcas</li>
              <li>Evita información pública o fácil de adivinar</li>
              <li>Puedes usar abreviaturas o combinaciones</li>
            </ul>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="security-submit-btn"
        >
          {loading ? 'Guardando...' : '✅ Guardar Pregunta Secreta'}
        </button>
      </form>

      <div className="security-info">
        <p><strong>ℹ️ Información importante:</strong></p>
        <ul>
          <li>Tu respuesta será encriptada para mayor seguridad</li>
          <li>Esta pregunta se usará para verificar tu identidad</li>
          <li>Puedes cambiar tu pregunta después en la configuración</li>
        </ul>
      </div>
    </div>
  );
};

export default SecurityQuestionForm;