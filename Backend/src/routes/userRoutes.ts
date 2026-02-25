import express from 'express';
// 👇 CORRECCIÓN: Agregamos '/usuario/' a la ruta porque movimos el archivo ahí
import {
  getUserProfile,
  updateUserProfile,
  deleteUserProfile,
  getAllUsers
} from '../controllers/usuario/userController';

const router = express.Router();

// Rutas de usuarios
router.get('/', getAllUsers);           // Obtener todos los usuarios
router.get('/:id', getUserProfile);     // Obtener usuario por ID
router.put('/:id', updateUserProfile);  // Actualizar usuario
router.delete('/:id', deleteUserProfile); // Eliminar usuario

export default router;