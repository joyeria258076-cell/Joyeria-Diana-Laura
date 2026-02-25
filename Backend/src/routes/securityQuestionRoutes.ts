import express from 'express';
// 👇 CORRECCIÓN: Apuntamos a la carpeta 'seguridad'
import { 
  setSecurityQuestion, 
  getSecurityQuestion, 
  verifySecurityAnswer,
  getSecureQuestionsList,
  resetPasswordWithSecurityQuestion
} from '../controllers/seguridad/securityQuestionController';

const router = express.Router();

router.post('/set-security-question', setSecurityQuestion);
router.post('/get-security-question', getSecurityQuestion);
router.post('/verify-security-answer', verifySecurityAnswer);
router.get('/secure-questions', getSecureQuestionsList);
router.post('/reset-password-with-question', resetPasswordWithSecurityQuestion);

export default router;