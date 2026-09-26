// Ruta: Frontend/src/components/DecoracionTemporada.tsx
// Decoración de la temática de temporada que eligió el usuario: unos cuantos
// elementos (calabazas, corazones, copos…) que caen despacio detrás de todo.
// No captura clics y no se muestra si el sistema pide reducir animaciones.
import React, { useMemo } from 'react';
import { useTema, useTemasTemporada } from './ThemeConfigLoader';
import { ICONO_DECORACION } from './SelectorTema';
import '../styles/decoracionTemporada.css';

const CANTIDAD = 14;

const DecoracionTemporada: React.FC = () => {
  const tema = useTema();
  const temporada = useTemasTemporada();

  const deco = tema.startsWith('t-')
    ? (typeof document !== 'undefined' ? document.documentElement.dataset.deco : undefined)
    : undefined;
  void temporada; // se relee cuando cambian las temáticas disponibles

  // Posiciones y tiempos fijos por render para que no "salten" al re-renderizar
  const piezas = useMemo(() => Array.from({ length: CANTIDAD }, (_, i) => ({
    left: (i * 71) % 100,
    delay: -((i * 3.7) % 18),
    dur: 14 + ((i * 5) % 10),
    size: 14 + ((i * 7) % 12),
    giro: (i % 2 ? 1 : -1) * (20 + (i * 13) % 40),
  })), []);

  if (!deco || deco === 'ninguna') return null;
  const icono = ICONO_DECORACION[deco] || '✦';

  return (
    <div className={`dl-deco dl-deco--${deco}`} aria-hidden="true">
      {piezas.map((p, i) => (
        <span
          key={i}
          className="dl-deco-pieza"
          style={{
            left: `${p.left}%`,
            fontSize: `${p.size}px`,
            animationDuration: `${p.dur}s`,
            animationDelay: `${p.delay}s`,
            ['--giro' as any]: `${p.giro}deg`,
          }}
        >{icono}</span>
      ))}
    </div>
  );
};

export default DecoracionTemporada;
