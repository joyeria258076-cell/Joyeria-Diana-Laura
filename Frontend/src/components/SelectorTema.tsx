// Ruta: Frontend/src/components/SelectorTema.tsx
// Selector de tema (Negro · Rosa / Blanco · Rosa / Negro · Dorado).
// La elección se guarda en el navegador del usuario (localStorage).
import React from 'react';
import { TEMAS, PALETAS, NOMBRES_TEMA, elegirTema, useTema } from './ThemeConfigLoader';

const SelectorTema: React.FC<{ compacto?: boolean }> = ({ compacto = false }) => {
  const actual = useTema();

  return (
    <div className={`dl-temas${compacto ? ' dl-temas--compacto' : ''}`} role="radiogroup" aria-label="Tema de colores">
      {TEMAS.map(clave => {
        const p = PALETAS[clave];
        return (
          <button
            key={clave}
            type="button"
            role="radio"
            aria-checked={actual === clave}
            className="dl-tema-opcion"
            onClick={() => elegirTema(clave)}
            title={NOMBRES_TEMA[clave]}
          >
            <span className="dl-tema-muestra" aria-hidden="true">
              <i style={{ background: p['--color-bg'] }} />
              <i style={{ background: p['--color-rose-gold'] }} />
            </span>
            <span className="dl-tema-nombre">{NOMBRES_TEMA[clave]}</span>
          </button>
        );
      })}
    </div>
  );
};

export default SelectorTema;
