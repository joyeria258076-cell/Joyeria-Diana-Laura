import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asistenteController } from '../controllers/asistenteController';
import { optionalAuth } from '../middleware/authMiddleware';

const router = Router();

// Tope por IP para que nadie sature la BD con el chat
const limiteAsistente = rateLimit({ windowMs: 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Demasiadas preguntas seguidas, espera un momento.' } });

router.post('/', limiteAsistente, optionalAuth, asistenteController.preguntar);

export default router;
