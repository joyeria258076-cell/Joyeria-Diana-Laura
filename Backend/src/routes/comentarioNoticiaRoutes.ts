import { Router } from 'express';
import { comentarioNoticiaController } from '../controllers/comentarioNoticiaController';
import { authenticateToken, requireCliente } from '../middleware/authMiddleware';

const router = Router();

router.get('/:noticiaId/comentarios', comentarioNoticiaController.getComentarios);
router.post('/:noticiaId/comentarios', authenticateToken, requireCliente, comentarioNoticiaController.crearComentario);
router.delete('/comentarios/:id', authenticateToken, requireCliente, comentarioNoticiaController.eliminarComentario);

export default router;
