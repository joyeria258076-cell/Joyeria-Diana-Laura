import { pool } from '../config/database';

export const VisitaSitioModel = {
    registrar: async (visitorId: string, ruta: string | null): Promise<void> => {
        await pool.query(
            'INSERT INTO visitas_sitio (visitor_id, ruta) VALUES ($1, $2)',
            [visitorId, ruta]
        );
    },

    getResumen: async () => {
        const unicos7dias = await pool.query(
            `SELECT COUNT(DISTINCT visitor_id) AS total
             FROM visitas_sitio WHERE creado_en >= NOW() - INTERVAL '7 days'`
        );
        const ahora = await pool.query(
            `SELECT COUNT(DISTINCT visitor_id) AS total
             FROM visitas_sitio WHERE creado_en >= NOW() - INTERVAL '5 minutes'`
        );
        const porDia = await pool.query(
            `SELECT DATE_TRUNC('day', creado_en) AS dia, COUNT(DISTINCT visitor_id) AS visitantes
             FROM visitas_sitio WHERE creado_en >= NOW() - INTERVAL '7 days'
             GROUP BY DATE_TRUNC('day', creado_en) ORDER BY dia ASC`
        );
        return {
            visitantes_7_dias: Number(unicos7dias.rows[0]?.total ?? 0),
            consultando_ahora: Number(ahora.rows[0]?.total ?? 0),
            serie: porDia.rows,
        };
    }
};
