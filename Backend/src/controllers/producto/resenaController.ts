// Ruta: Backend/src/controllers/producto/resenaController.ts
import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/authMiddleware';
import { ResenaModel } from '../../models/resenaModel';

const getUsuario = (req: Request) => {
    const user = (req as any).user;
    const id = user?.userId || user?.dbId || user?.id || null;
    return {
        id,
        nombre: user?.nombre || '',
        rol: user?.rol?.toLowerCase() || 'cliente'
    };
};

export const getResenasProducto = async (req: Request, res: Response) => {
    try {
        const producto_id = Number.parseInt(req.params.id);
        if (Number.isNaN(producto_id))
            return res.status(400).json({ success: false, message: 'ID de producto inválido' });

        const data = await ResenaModel.getByProducto(producto_id);

        let miResena = null;
        let puedeResenar = false;
        const usuario = getUsuario(req);
        if (usuario.id) {
            miResena = await ResenaModel.getMiResena(usuario.id, producto_id);
            puedeResenar = await ResenaModel.puedeResenar(usuario.id, producto_id);
        }

        res.json({ success: true, data: { ...data, miResena, puedeResenar } });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const crearResena = async (req: AuthRequest, res: Response) => {
    try {
        const usuario = getUsuario(req);
        if (!usuario.id) return res.status(401).json({ success: false, message: 'No autenticado' });

        const producto_id = Number.parseInt(req.params.id);
        if (Number.isNaN(producto_id))
            return res.status(400).json({ success: false, message: 'ID de producto inválido' });

        const { calificacion, comentario } = req.body;
        const calificacionNum = Number.parseInt(calificacion);
        if (!calificacionNum || calificacionNum < 1 || calificacionNum > 5)
            return res.status(400).json({ success: false, message: 'La calificación debe ser entre 1 y 5 estrellas' });

        const puede = await ResenaModel.puedeResenar(usuario.id, producto_id);
        if (!puede)
            return res.status(403).json({ success: false, message: 'Solo puedes reseñar productos que ya te hayan sido entregados' });

        const resena = await ResenaModel.upsert(
            usuario.id, producto_id, usuario.nombre || 'Cliente', calificacionNum, comentario?.trim() || undefined
        );

        res.status(201).json({ success: true, message: '¡Gracias por tu opinión!', data: resena });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
