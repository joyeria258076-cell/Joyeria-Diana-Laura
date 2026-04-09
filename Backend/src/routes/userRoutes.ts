import express from 'express';
// 👇 CORRECCIÓN: Agregamos '/usuario/' a la ruta porque movimos el archivo ahí
import {
  getUserProfile,
  updateUserProfile,
  deleteUserProfile,
  getAllUsers,
  createWorkerAccount
} from '../controllers/usuario/userController';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware';

const router = express.Router();
router.use(authenticateToken);
router.use(requireAdmin);

// Rutas de usuarios
router.get('/', getAllUsers);           // Obtener todos los usuarios
router.get('/:id', getUserProfile);     // Obtener usuario por ID
router.put('/:id', updateUserProfile);  // Actualizar usuario
router.delete('/:id', deleteUserProfile); // Eliminar usuario
router.post('/workers', createWorkerAccount); // Crear cuenta de trabajador

export default router;