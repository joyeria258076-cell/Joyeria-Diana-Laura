// Ruta: Frontend/src/components/BotonAccesibilidad.tsx
// Control de tamaño de texto: un botón pequeño y fijo (abajo a la izquierda)
// que abre un panel compacto. Sin arrastre: no estorba ni se descompone.
import React, { useEffect, useRef, useState } from 'react';
import '../styles/BotonAccesibilidad.css';

const MIN = 12, MAX = 24, BASE = 16;

const BotonAccesibilidad: React.FC = () => {
  const [tam, setTam] = useState(() => {
    try { return Number.parseInt(localStorage.getItem('fontSize') || '') || BASE; } catch { return BASE; }
  });
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.style.fontSize = `${tam}px`;
    try { localStorage.setItem('fontSize', String(tam)); } catch { /* */ }
  }, [tam]);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent | TouchEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false); };
    document.addEventListener('mousedown', fuera);
    document.addEventListener('touchstart', fuera);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('touchstart', fuera); document.removeEventListener('keydown', esc); };
  }, [abierto]);

  const pct = Math.round((tam / BASE) * 100);

  return (
    <div className={`dl-a11y${abierto ? ' abierto' : ''}`} ref={ref}>
      {abierto && (
        <div className="dl-a11y-panel" role="dialog" aria-label="Tamaño del texto">
          <span className="dl-a11y-titulo">Tamaño del texto</span>
          <div className="dl-a11y-fila">
            <button onClick={() => setTam(t => Math.max(MIN, t - 2))} disabled={tam <= MIN} aria-label="Texto más pequeño">A−</button>
            <span className="dl-a11y-valor">{pct}%</span>
            <button onClick={() => setTam(t => Math.min(MAX, t + 2))} disabled={tam >= MAX} aria-label="Texto más grande">A+</button>
          </div>
          {tam !== BASE && <button className="dl-a11y-reset" onClick={() => setTam(BASE)}>Restablecer</button>}
        </div>
      )}
      <button
        className="dl-a11y-boton"
        onClick={() => setAbierto(a => !a)}
        aria-expanded={abierto}
        aria-label="Ajustar tamaño del texto"
        title="Tamaño del texto"
      >Aa</button>
    </div>
  );
};

export default BotonAccesibilidad;
