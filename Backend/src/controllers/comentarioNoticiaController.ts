import { Request, Response } from 'express';
import { ComentarioNoticiaModel } from '../models/comentarioNoticiaModel';

export const comentarioNoticiaController = {
    getComentarios: async (req: Request, res: Response): Promise<void> => {
        try {
            const { noticiaId } = req.params;
            const comentarios = await ComentarioNoticiaModel.getByNoticia(Number(noticiaId));
            res.json({ success: true, data: comentarios });
        } catch (error) {
            console.error('Error en getComentarios:', error);
            res.status(500).json({ success: false, message: 'Error al obtener comentarios' });
        }
    },

    crearComentario: async (req: Request, res: Response): Promise<void> => {
        try {
            const { noticiaId } = req.params;
            const { comentario } = req.body;
            const usuarioId = (req as any).user?.userId;

            if (!comentario || !comentario.trim()) {
                res.status(400).json({ success: false, message: 'El comentario no puede estar vacío' });
                return;
            }

            const nuevo = await ComentarioNoticiaModel.create(Number(noticiaId), usuarioId, comentario.trim());
            res.status(201).json({ success: true, data: nuevo });
        } catch (error) {
            console.error('Error en crearComentario:', error);
            res.status(500).json({ success: false, message: 'Error al publicar comentario' });
        }
    },

    eliminarComentario: async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const usuarioId = (req as any).user?.userId;
            const eliminado = await ComentarioNoticiaModel.remove(Number(id), usuarioId);
            if (!eliminado) {
                res.status(404).json({ success: false, message: 'Comentario no encontrado' });
                return;
            }
            res.json({ success: true, message: 'Comentario eliminado' });
        } catch (error) {
            console.error('Error en eliminarComentario:', error);
            res.status(500).json({ success: false, message: 'Error al eliminar comentario' });
        }
    }
};
