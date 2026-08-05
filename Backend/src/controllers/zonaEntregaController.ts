import { Request, Response } from 'express';
import { ZonaEntregaModel } from '../models/zonaEntregaModel';

export const zonaEntregaController = {
    getZonasEntrega: async (req: Request, res: Response): Promise<void> => {
        try {
            const soloActivas = req.query.todas !== 'true';
            const zonas = await ZonaEntregaModel.getAll(soloActivas);
            res.json({ success: true, data: zonas });
        } catch (error) {
            console.error('Error en getZonasEntrega:', error);
            res.status(500).json({ success: false, message: 'Error al obtener zonas de entrega' });
        }
    },

    crearZonaEntrega: async (req: Request, res: Response): Promise<void> => {
        try {
            const { nombre } = req.body;
            if (!nombre || !nombre.trim()) {
                res.status(400).json({ success: false, message: 'El nombre de la zona es obligatorio' });
                return;
            }
            const zona = await ZonaEntregaModel.create(nombre.trim());
            res.status(201).json({ success: true, data: zona });
        } catch (error: any) {
            if (error.code === '23505') {
                res.status(409).json({ success: false, message: 'Esa zona de entrega ya existe' });
                return;
            }
            console.error('Error en crearZonaEntrega:', error);
            res.status(500).json({ success: false, message: 'Error al crear zona de entrega' });
        }
    },

    eliminarZonaEntrega: async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            await ZonaEntregaModel.remove(Number(id));
            res.json({ success: true, message: 'Zona de entrega eliminada' });
        } catch (error) {
            console.error('Error en eliminarZonaEntrega:', error);
            res.status(500).json({ success: false, message: 'Error al eliminar zona de entrega' });
        }
    }
};
