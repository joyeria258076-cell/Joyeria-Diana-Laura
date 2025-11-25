// Ruta: Joyeria-Diana-Laura/Backend/src/routes/securityQuestionRoutes.ts
import express from 'express';
import { 
  setSecurityQuestion, 
  getSecurityQuestion, 
  verifySecurityAnswer,
  getSecureQuestionsList 
} from '../controllers/securityQuestionController';

const router = express.Router();

router.post('/set-security-question', setSecurityQuestion);
router.post('/get-security-question', getSecurityQuestion);
router.post('/verify-security-answer', verifySecurityAnswer);
router.get('/secure-questions', getSecureQuestionsList);

export default router;