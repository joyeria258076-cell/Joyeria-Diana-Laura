import { Request, Response } from 'express';
import { VisitaSitioModel } from '../models/visitaSitioModel';

export const visitaSitioController = {
    registrarVisita: async (req: Request, res: Response): Promise<void> => {
        try {
            const { visitor_id, ruta } = req.body;
            if (!visitor_id || typeof visitor_id !== 'string' || visitor_id.length > 64) {
                res.status(400).json({ success: false, message: 'visitor_id inválido' });
                return;
            }
            await VisitaSitioModel.registrar(visitor_id, typeof ruta === 'string' ? ruta.slice(0, 255) : null);
            res.status(201).json({ success: true });
        } catch (error) {
            console.error('Error en registrarVisita:', error);
            res.status(500).json({ success: false, message: 'Error al registrar visita' });
        }
    },

    getResumen: async (req: Request, res: Response): Promise<void> => {
        try {
            const resumen = await VisitaSitioModel.getResumen();
            res.json({ success: true, data: resumen });
        } catch (error) {
            console.error('Error en getResumen (visitas):', error);
            res.status(500).json({ success: false, message: 'Error al obtener resumen de visitas' });
        }
    }
};
