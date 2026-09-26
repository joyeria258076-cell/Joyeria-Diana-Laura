// Ruta: Frontend/src/components/SelectorTema.tsx
// Selector de tema: los 3 fijos (Negro · Rosa / Blanco · Rosa / Negro · Dorado)
// y, si el admin activó alguna, las temáticas de temporada (Halloween, Navidad…).
// La elección se guarda en el navegador del usuario (localStorage).
import React from 'react';
import { TEMAS, PALETAS, NOMBRES_TEMA, elegirTema, useTema, useTemasTemporada } from './ThemeConfigLoader';

export const ICONO_DECORACION: Record<string, string> = {
  calabazas: '🎃', corazones: '💘', nieve: '❄️', estrellas: '✨', flores: '🌸', ninguna: '✦',
};

const SelectorTema: React.FC<{ compacto?: boolean }> = ({ compacto = false }) => {
  const actual = useTema();
  const temporada = useTemasTemporada();

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
      {temporada.map(t => {
        const clave = `t-${t.clave}` as const;
        return (
          <button
            key={clave}
            type="button"
            role="radio"
            aria-checked={actual === clave}
            className="dl-tema-opcion dl-tema-opcion--temporada"
            onClick={() => elegirTema(clave)}
            title={`${t.nombre} · temática de temporada`}
          >
            <span className="dl-tema-muestra dl-tema-muestra--temporada" aria-hidden="true" style={{ background: t.color_fondo, borderColor: t.color_principal }}>
              {ICONO_DECORACION[t.decoracion] || '✦'}
            </span>
            <span className="dl-tema-nombre">{t.nombre}</span>
          </button>
        );
      })}
    </div>
  );
};

export default SelectorTema;
