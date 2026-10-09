// Ruta: Backend/src/utils/pagoApp.ts
import { Request, Response } from 'express';

// App móvil (HU-12): Mercado Pago solo regresa a direcciones web, así que cuando el pago
// lo inicia la app vuelve a esta ruta del backend, que abre la app con joyeriadl://pago.
// El sitio web no la usa: sus pagos siguen regresando a /pedidos y /mis-apartados.
const PAQUETE_APP = 'com.joyeriadianalaura.joyeria_diana_laura';
const RESULTADOS = ['exitoso', 'fallido', 'pendiente'];
const TIPOS = ['pedido', 'apartado'];

export const urlsRegresoApp = (tipo: 'pedido' | 'apartado', id: number) => {
    const base = `${process.env.BACKEND_URL}/api/carrito/pago/volver-app?tipo=${tipo}&id=${id}`;
    return {
        success: `${base}&pago=exitoso`,
        failure: `${base}&pago=fallido`,
        pending: `${base}&pago=pendiente`,
    };
};

export const paginaVolverApp = (req: Request, res: Response) => {
    const tipo = String(req.query.tipo || '');
    const id = String(req.query.id || '');
    const pago = String(req.query.pago || '');
    if (!TIPOS.includes(tipo) || !/^\d+$/.test(id) || !RESULTADOS.includes(pago))
        return res.status(400).send('Enlace de pago no válido.');

    const consulta = `tipo=${tipo}&id=${id}&pago=${pago}`;
    // intent:// abre la app en Android aunque el navegador no siga enlaces de otros esquemas solo.
    const intent = `intent://pago?${consulta}#Intent;scheme=joyeriadl;package=${PAQUETE_APP};end`;
    const mensaje = pago === 'exitoso' ? 'Recibimos tu pago.' : pago === 'pendiente' ? 'Tu pago está en proceso.' : 'El pago no se completó.';

    res.set('Content-Type', 'text/html; charset=utf-8').send(`<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Joyería Diana Laura</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#140b14;color:#f5e9f0;font-family:Arial,sans-serif;text-align:center}
main{padding:24px}a{display:inline-block;margin-top:16px;padding:14px 28px;border-radius:999px;background:#e8a6c4;color:#2a1020;text-decoration:none;font-weight:bold}</style>
</head><body><main><p>${mensaje}</p><p>Regresando a la app de Joyería Diana Laura…</p>
<a href="${intent}">Volver a la app</a></main>
<script>location.href=${JSON.stringify(intent)};</script></body></html>`);
};
