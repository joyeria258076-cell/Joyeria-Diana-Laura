import { Router } from 'express';
import { getFavoritos, toggleFavorito, checkFavorito } from '../controllers/favoritos/favoritosController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authenticateToken, getFavoritos);
router.post('/toggle', authenticateToken, toggleFavorito);
router.get('/check/:producto_id', authenticateToken, checkFavorito);

export default router;
