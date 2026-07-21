// Ruta: Frontend/src/utils/ubicacionesEntrega.ts
// Colores fijos para las ubicaciones de entrega más comunes; el resto obtiene
// un color consistente (mismo nombre → mismo color) de una paleta de respaldo.

export const UBICACIONES_SUGERIDAS = ['Huejutla', 'San Felipe', 'Jaltocan', 'Tampico', 'Tehuetlan'];

const COLORES_FIJOS: Record<string, string> = {
    'San Felipe': '#4caf50', // verde
    'Tampico':    '#2196f3', // azul
    'Tehuetlan':  '#ff9800', // naranja
    'Huejutla':   '#e91e63', // rosa fuerte
    'Jaltocan':   '#00bcd4', // turquesa
};

const PALETA_RESPALDO = ['#9c27b0', '#e91e63', '#009688', '#795548', '#3f51b5', '#607d8b'];

const hashString = (s: string): number => {
    let hash = 0;
    for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
    return hash;
};

export const colorDeUbicacion = (nombre: string): string => {
    if (COLORES_FIJOS[nombre]) return COLORES_FIJOS[nombre];
    return PALETA_RESPALDO[hashString(nombre) % PALETA_RESPALDO.length];
};
