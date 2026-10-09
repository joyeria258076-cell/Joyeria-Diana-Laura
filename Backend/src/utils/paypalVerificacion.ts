// Ruta: Backend/src/utils/paypalVerificacion.ts
//
// Antes de capturar una orden de PayPal se revisa que la orden sea la que el
// servidor creó para ESE pedido/apartado/abono (reference_id) y que el monto
// coincida. Sin esto, una orden barata podía usarse para marcar como pagado
// otro pedido más caro, solo cambiando el venta_id que manda el navegador.

const ppBase = () => process.env.PAYPAL_MODE === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

export const tokenPayPal = async (): Promise<string> => {
    const id = process.env.PAYPAL_CLIENT_ID;
    const secret = process.env.PAYPAL_CLIENT_SECRET;
    if (!id || !secret) throw new Error('PayPal no configurado');
    const r = await fetch(`${ppBase()}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`
        },
        body: 'grant_type=client_credentials'
    });
    const d = await r.json();
    if (!d.access_token) throw new Error('No se pudo autenticar con PayPal');
    return d.access_token;
};

/**
 * Verifica la orden y, si corresponde, la captura.
 * Devuelve { ok: true } solo si la orden es la esperada y quedó COMPLETED.
 */
export const verificarYCapturarPayPal = async (
    order_id: string,
    referenciaEsperada: string,
    montoEsperado: number
): Promise<{ ok: boolean; mensaje?: string }> => {
    if (!order_id || typeof order_id !== 'string' || !/^[A-Z0-9]+$/i.test(order_id))
        return { ok: false, mensaje: 'Orden de PayPal inválida.' };

    const token = await tokenPayPal();
    const ordenRes = await fetch(`${ppBase()}/v2/checkout/orders/${order_id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!ordenRes.ok) return { ok: false, mensaje: 'No se encontró la orden de PayPal.' };
    const orden = await ordenRes.json();

    const unidad = orden.purchase_units?.[0];
    if (!unidad || unidad.reference_id !== referenciaEsperada)
        return { ok: false, mensaje: 'La orden de PayPal no corresponde a este pago.' };
    const monto = Number.parseFloat(unidad.amount?.value || '0');
    if (unidad.amount?.currency_code !== 'MXN' || Math.abs(monto - montoEsperado) > 0.01)
        return { ok: false, mensaje: 'El monto de la orden de PayPal no coincide.' };

    if (orden.status !== 'COMPLETED') {
        const cap = await fetch(`${ppBase()}/v2/checkout/orders/${order_id}/capture`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
        });
        const capData = await cap.json();
        if (capData.status !== 'COMPLETED') return { ok: false, mensaje: 'El pago no fue completado.' };
    }
    return { ok: true };
};
