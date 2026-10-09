// Ruta: Joyeria-Diana-Laura/Frontend/src/components/UbicacionGPS.tsx
//
// Sensor de ubicación (GPS del navegador, navigator.geolocation). Con un botón
// el cliente comparte su ubicación y la app le dice:
//   - en qué localidad está (OpenStreetMap / Nominatim, gratuito y sin clave),
//   - a cuántos km está de la tienda (fórmula de Haversine, sin servicios),
//   - si su localidad está en las zonas de entrega dadas de alta por el admin,
//   - y le ofrece abrir la ruta en Google Maps (enlace normal, sin API de pago).
// La ubicación solo se pide al presionar el botón, nunca al abrir la página.

import { useState } from 'react';
import '../styles/UbicacionGPS.css';

// Ubicación de la tienda (Huejutla de Reyes, Hgo.). Aproximada al centro de
// Huejutla: OpenStreetMap no tiene registrada la calle exacta del local.
const TIENDA = { lat: 21.1401103, lon: -98.4152209 };

const norm = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// Distancia en km entre dos coordenadas (Haversine)
const distanciaKm = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
  const R = 6371, rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

interface Resultado { localidad: string; km: number; precision: number; dentro: boolean | null; lat: number; lon: number; }

interface Props { zonas: string[]; compacto?: boolean; }

function UbicacionGPS({ zonas, compacto = false }: Props): React.JSX.Element {
  const [estado, setEstado] = useState<'inicio' | 'buscando' | 'listo' | 'error'>('inicio');
  const [res, setRes] = useState<Resultado | null>(null);
  const [error, setError] = useState('');

  const enZona = (textos: string[]) => {
    if (!zonas.length) return null;
    const donde = norm(textos.filter(Boolean).join(' '));
    return zonas.some(z => { const n = norm(z); return n && donde.includes(n); });
  };

  const ubicar = () => {
    if (!('geolocation' in navigator)) {
      setEstado('error'); setError('Tu navegador no permite obtener la ubicación.'); return;
    }
    setEstado('buscando'); setError('');
    navigator.geolocation.getCurrentPosition(async pos => {
      const { latitude: lat, longitude: lon, accuracy } = pos.coords;
      const km = distanciaKm({ lat, lon }, TIENDA);
      let localidad = '';
      let partes: string[] = [];
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=12&accept-language=es`);
        const j = await r.json();
        const a = j?.address || {};
        const lugar = a.city || a.town || a.village || a.municipality || '';
        const municipio = a.county || '';
        // p. ej. "Orizaltlán, San Felipe Orizatlán" o solo "Huejutla de Reyes"
        localidad = lugar && municipio && norm(lugar) !== norm(municipio) ? `${lugar}, ${municipio}` : (lugar || municipio);
        partes = [a.city, a.town, a.village, a.municipality, a.county, a.suburb, a.state];
      } catch { /* sin nombre de localidad: se usa solo la distancia */ }
      // Si no se pudo saber la localidad, se toma como dentro si está cerca (≤ 5 km)
      const dentro = partes.length ? enZona(partes) : (km <= 5 ? true : null);
      setRes({ localidad, km, precision: accuracy, dentro, lat, lon });
      setEstado('listo');
    }, e => {
      setEstado('error');
      setError(e.code === e.PERMISSION_DENIED
        ? 'No diste permiso para usar tu ubicación. Puedes revisar la lista de zonas de entrega.'
        : 'No se pudo obtener tu ubicación. Revisa que la ubicación del dispositivo esté activada.');
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
  };

  const ruta = res
    ? `https://www.google.com/maps/dir/?api=1&origin=${res.lat},${res.lon}&destination=${TIENDA.lat},${TIENDA.lon}`
    : `https://www.google.com/maps/dir/?api=1&destination=${TIENDA.lat},${TIENDA.lon}`;

  return (
    <div className={`gps${compacto ? ' gps--compacto' : ''}`}>
      {estado !== 'listo' && (
        <button type="button" className="gps-btn" onClick={ubicar} disabled={estado === 'buscando'}>
          📍 {estado === 'buscando' ? 'Buscando tu ubicación…' : '¿Entregamos en tu zona? Usar mi ubicación'}
        </button>
      )}

      {estado === 'error' && (
        <p className="gps-msg gps-msg--aviso">
          {error}{zonas.length ? ` Entregamos en: ${zonas.join(', ')}.` : ''}
        </p>
      )}

      {estado === 'listo' && res && (
        <div className="gps-res" role="status">
          <p className="gps-donde">
            Estás en <strong>{res.localidad || 'tu ubicación actual'}</strong>, a <strong>{res.km < 1 ? `${Math.round(res.km * 1000)} m` : `${res.km.toFixed(1)} km`}</strong> de la tienda.
          </p>
          {res.dentro === true && <p className="gps-msg gps-msg--ok">✅ Sí hacemos entregas en tu zona.</p>}
          {res.dentro === false && (
            <p className="gps-msg gps-msg--aviso">
              Tu localidad está fuera de nuestras zonas habituales{zonas.length ? ` (${zonas.join(', ')})` : ''}. Podemos enviarlo por paquetería o puedes recogerlo en tienda.
            </p>
          )}
          {res.precision > 1000 && (
            <p className="gps-nota">Ubicación aproximada (±{(res.precision / 1000).toFixed(1)} km). En el celular el resultado es más preciso.</p>
          )}
          <div className="gps-acciones">
            <a className="gps-btn gps-btn--sec" href={ruta} target="_blank" rel="noopener noreferrer">🧭 Cómo llegar</a>
            <button type="button" className="gps-btn gps-btn--sec" onClick={ubicar}>↻ Actualizar</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default UbicacionGPS;
