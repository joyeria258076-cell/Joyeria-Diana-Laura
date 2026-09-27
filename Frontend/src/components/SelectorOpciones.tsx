// Ruta: Frontend/src/components/SelectorOpciones.tsx
// Opciones de personalización que dio de alta el admin (Talla, Metal, Grabado…),
// como botones en píldora igual que las tallas del boceto de la app.
// Si una opción pide texto (p. ej. "Grabado: nombre"), aparece su campo.
import React, { useEffect, useMemo, useState } from 'react';
import { opcionesPersonalizacionAPI, type GrupoPers, type EleccionOpcion } from '../services/api';
import '../styles/SelectorOpciones.css';

export interface EstadoOpciones {
  /** Hay grupos de opciones para este producto. */
  hayOpciones: boolean;
  eleccion: EleccionOpcion[];
  costo: number;
  valido: boolean;
  /** Primer pendiente, para el mensaje del botón ("Elige tu talla"). */
  falta: string | null;
}

interface Props {
  productoId: number;
  onChange: (estado: EstadoOpciones) => void;
  /** Resaltar lo que falta (después de intentar agregar). */
  mostrarErrores?: boolean;
  compacto?: boolean;
}

const dinero = (n: number) => `$${Number(n || 0).toLocaleString('es-MX', { maximumFractionDigits: 2 })}`;

const SelectorOpciones: React.FC<Props> = ({ productoId, onChange, mostrarErrores = false, compacto = false }) => {
  const [grupos, setGrupos] = useState<GrupoPers[]>([]);
  const [elegidas, setElegidas] = useState<Record<number, number>>({});
  const [textos, setTextos] = useState<Record<number, string>>({});

  useEffect(() => {
    let vivo = true;
    setElegidas({}); setTextos({});
    opcionesPersonalizacionAPI.deProducto(productoId)
      .then((r: any) => { if (vivo) setGrupos(r?.success ? (r.data || []) : []); })
      .catch(() => { if (vivo) setGrupos([]); });
    return () => { vivo = false; };
  }, [productoId]);

  const estado = useMemo<EstadoOpciones>(() => {
    const eleccion: EleccionOpcion[] = [];
    let costo = 0;
    let falta: string | null = null;
    for (const g of grupos) {
      const oid = elegidas[g.id];
      const o = g.opciones.find(x => x.id === oid);
      if (!o) { if (g.requerido && !falta) falta = `Elige ${g.nombre.toLowerCase()}`; continue; }
      const texto = (textos[g.id] || '').trim();
      if (o.pide_texto && !texto && !falta) falta = `Escribe ${(o.texto_ayuda || 'el texto').toLowerCase()}`;
      eleccion.push({ grupo_id: g.id, opcion_id: o.id!, texto: o.pide_texto ? texto : undefined });
      costo += Number(o.costo_extra) || 0;
    }
    return { hayOpciones: grupos.length > 0, eleccion, costo, valido: !falta, falta };
  }, [grupos, elegidas, textos]);

  useEffect(() => { onChange(estado); }, [estado]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!grupos.length) return null;

  return (
    <div className={`sop${compacto ? ' sop--compacto' : ''}`}>
      {grupos.map(g => {
        const oid = elegidas[g.id];
        const sel = g.opciones.find(x => x.id === oid);
        const faltaAqui = mostrarErrores && ((g.requerido && !sel) || (sel?.pide_texto && !(textos[g.id] || '').trim()));
        return (
          <div key={g.id} className={`sop-grupo${faltaAqui ? ' sop-grupo--falta' : ''}`}>
            <div className="sop-cabeza">
              <span className="sop-nombre">{g.nombre}{g.requerido && <b aria-hidden="true"> *</b>}</span>
              {sel && Number(sel.costo_extra) > 0 && <span className="sop-extra">+{dinero(Number(sel.costo_extra))}</span>}
              {!g.requerido && <span className="sop-opcional">Opcional</span>}
            </div>
            <div className="sop-opciones" role="radiogroup" aria-label={g.nombre}>
              {g.opciones.map(o => {
                const activa = oid === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    role="radio"
                    aria-checked={activa}
                    className={`sop-opcion${activa ? ' activa' : ''}${o.etiqueta.length <= 3 ? ' sop-opcion--corta' : ''}`}
                    onClick={() => setElegidas(e => {
                      const n = { ...e };
                      if (activa && !g.requerido) delete n[g.id]; else n[g.id] = o.id!;
                      return n;
                    })}
                  >
                    {o.etiqueta}
                    {Number(o.costo_extra) > 0 && <small>+{dinero(Number(o.costo_extra))}</small>}
                  </button>
                );
              })}
            </div>
            {sel?.pide_texto && (
              <input
                className="sop-texto"
                type="text"
                maxLength={60}
                placeholder={sel.texto_ayuda || 'Escribe aquí'}
                value={textos[g.id] || ''}
                onChange={e => setTextos(t => ({ ...t, [g.id]: e.target.value }))}
                aria-label={sel.texto_ayuda || `Texto para ${sel.etiqueta}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default SelectorOpciones;
