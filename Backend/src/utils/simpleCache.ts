// Caché en memoria muy simple, pensado solo para endpoints públicos de
// SOLO LECTURA que se piden en cada visita (carrusel, zonas de entrega,
// noticias, colecciones, etc.). No reemplaza ninguna lógica de negocio ni
// cambia ningún dato — solo evita repetir la misma consulta a la base de
// datos dentro de una ventana corta de tiempo, para que el backend (Render
// free tier) responda más rápido en visitas consecutivas.
//
// Se invalida sola por tiempo (TTL). Si el proceso se reinicia (deploy,
// reinicio de Render), el caché arranca vacío otra vez — no hay nada que
// persistir ni limpiar manualmente.

interface CacheEntry<T> {
    data: T;
    expiresAt: number;
}

const cache = new Map<string, CacheEntry<any>>();

export async function getOrSetCache<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const entry = cache.get(key);
    if (entry && entry.expiresAt > now) {
        return entry.data;
    }
    const data = await fetcher();
    cache.set(key, { data, expiresAt: now + ttlMs });
    return data;
}

// Para endpoints que sí tienen un panel admin con alta/baja: borra la
// entrada de inmediato tras un cambio, en vez de esperar a que expire el
// TTL, para que el propio admin vea el resultado actualizado al toque.
export function invalidateCache(key: string): void {
    cache.delete(key);
}
