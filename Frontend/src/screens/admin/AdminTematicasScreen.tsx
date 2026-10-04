// Ruta: Frontend/src/screens/admin/AdminTematicasScreen.tsx
// Temáticas de temporada: el admin las da de alta (Halloween, San Valentín,
// Navidad…), elige colores y decoración, las prueba en toda la página y las
// activa. Los usuarios ven las activas en su selector de tema y deciden si las usan.
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AiOutlinePlus, AiOutlineEdit, AiOutlineDelete, AiOutlineEye, AiOutlineClose, AiOutlineCalendar,
} from 'react-icons/ai';
import { temasTemporadaAPI, type TemaTemporada } from '../../services/api';
import { previsualizarTemporada, actualizarTemporada } from '../../components/ThemeConfigLoader';
import { ICONO_DECORACION } from '../../components/SelectorTema';
import './AdminTematicasScreen.css';
import { AiOutlineGift } from 'react-icons/ai';
import AdminHero from '../../components/AdminHero';
import Loader from '../../components/Loader';

type Form = Omit<TemaTemporada, 'id' | 'clave'> & { id?: number; clave?: string };

const VACIO: Form = {
  nombre: '', descripcion: '', modo: 'oscuro',
  color_fondo: '#0D080C', color_superficie: '#191116', color_superficie_2: '#261C22',
  color_principal: '#E9AFC7', color_principal_fuerte: '#CF819F', color_acento: '#A792C2',
  color_texto: '#FFF4FA', color_texto_suave: '#C7A7BB',
  decoracion: 'ninguna', activo: false, fecha_inicio: '', fecha_fin: '',
};

const CAMPOS_COLOR: { clave: keyof Form; etiqueta: string }[] = [
  { clave: 'color_fondo', etiqueta: 'Fondo' },
  { clave: 'color_superficie', etiqueta: 'Tarjetas' },
  { clave: 'color_superficie_2', etiqueta: 'Tarjetas 2' },
  { clave: 'color_principal', etiqueta: 'Principal' },
  { clave: 'color_principal_fuerte', etiqueta: 'Principal fuerte' },
  { clave: 'color_acento', etiqueta: 'Acento' },
  { clave: 'color_texto', etiqueta: 'Texto' },
  { clave: 'color_texto_suave', etiqueta: 'Texto suave' },
];

const DECORACIONES: { valor: TemaTemporada['decoracion']; etiqueta: string }[] = [
  { valor: 'ninguna', etiqueta: 'Sin decoración' },
  { valor: 'calabazas', etiqueta: 'Calabazas' },
  { valor: 'corazones', etiqueta: 'Corazones' },
  { valor: 'nieve', etiqueta: 'Copos de nieve' },
  { valor: 'estrellas', etiqueta: 'Estrellas' },
  { valor: 'flores', etiqueta: 'Flores' },
];

const fechaCorta = (f?: string | null) =>
  f ? new Date(`${String(f).slice(0, 10)}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : '';

/** Tarjeta que dibuja la temática con sus propios colores. */
const Miniatura: React.FC<{ t: Form; grande?: boolean }> = ({ t, grande }) => (
  <div className={`tm-mini${grande ? ' tm-mini--grande' : ''}`} style={{ background: t.color_fondo, color: t.color_texto }}>
    <div className="tm-mini-deco" aria-hidden="true">{t.decoracion !== 'ninguna' ? ICONO_DECORACION[t.decoracion] : ''}</div>
    <div className="tm-mini-top">
      <span className="tm-mini-logo" style={{ background: t.color_principal, color: t.color_fondo }}>DL</span>
      <span className="tm-mini-marca">Joyería <b style={{ color: t.color_principal }}>Diana Laura</b></span>
    </div>
    <p className="tm-mini-eyebrow" style={{ color: t.color_principal }}>{t.nombre || 'Nueva temática'}</p>
    <p className="tm-mini-titulo">Encuentra tu <i style={{ color: t.color_principal }}>brillo</i></p>
    <div className="tm-mini-card" style={{ background: t.color_superficie, borderColor: `${t.color_texto}1f` }}>
      <span className="tm-mini-foto" style={{ background: t.color_superficie_2 }} />
      <span className="tm-mini-lineas">
        <b>Anillo corazón</b>
        <small style={{ color: t.color_texto_suave }}>Plata .925</small>
        <strong style={{ color: t.color_principal }}>$1,250</strong>
      </span>
    </div>
    <span className="tm-mini-boton" style={{ background: `linear-gradient(135deg, ${t.color_principal}, ${t.color_principal_fuerte} 55%, ${t.color_acento})` }}>Agregar</span>
  </div>
);

const AdminTematicasScreen: React.FC = () => {
  const [temas, setTemas] = useState<TemaTemporada[]>([]);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState<Form | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [probando, setProbando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const cargar = async () => {
    setCargando(true);
    try {
      const res: any = await temasTemporadaAPI.getTodas();
      const lista: TemaTemporada[] = res?.data || [];
      setTemas(lista);
    } catch (e: any) {
      setAviso({ tipo: 'error', texto: e?.message || 'No se pudieron cargar las temáticas' });
    } finally {
      setCargando(false);
    }
  };

  /** Refresca las temáticas que ven los usuarios (selector de tema). */
  const refrescarPublicas = async () => {
    try { const r: any = await temasTemporadaAPI.getActivas(); if (r?.success) actualizarTemporada(r.data || []); } catch { /* */ }
  };

  useEffect(() => { cargar(); }, []);
  // Al salir de la pantalla se quita cualquier vista previa
  useEffect(() => () => previsualizarTemporada(null), []);

  const mostrar = (tipo: 'ok' | 'error', texto: string) => {
    setAviso({ tipo, texto });
    window.setTimeout(() => setAviso(null), 4000);
  };

  const abrir = (t?: TemaTemporada) => {
    setForm(t ? { ...t, fecha_inicio: t.fecha_inicio?.slice(0, 10) || '', fecha_fin: t.fecha_fin?.slice(0, 10) || '' } : { ...VACIO });
    if (probando) { previsualizarTemporada(null); setProbando(false); }
  };

  const cerrar = () => {
    setForm(null);
    if (probando) { previsualizarTemporada(null); setProbando(false); }
  };

  const cambiar = (campo: keyof Form, valor: any) => {
    setForm(f => {
      if (!f) return f;
      const nuevo = { ...f, [campo]: valor };
      if (probando) previsualizarTemporada({ ...(nuevo as any), id: 0, clave: 'vista-previa' });
      return nuevo;
    });
  };

  const alternarPrueba = () => {
    if (!form) return;
    if (probando) { previsualizarTemporada(null); setProbando(false); }
    else { previsualizarTemporada({ ...(form as any), id: 0, clave: 'vista-previa' }); setProbando(true); }
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    if (!form.nombre.trim()) { mostrar('error', 'Escribe un nombre para la temática'); return; }
    setGuardando(true);
    try {
      const datos = { ...form, fecha_inicio: form.fecha_inicio || null, fecha_fin: form.fecha_fin || null };
      const res: any = form.id ? await temasTemporadaAPI.actualizar(form.id, datos) : await temasTemporadaAPI.crear(datos);
      if (res?.success === false) throw new Error(res.message);
      mostrar('ok', form.id ? 'Temática actualizada' : 'Temática creada');
      cerrar();
      await cargar();
      await refrescarPublicas();
    } catch (err: any) {
      mostrar('error', err?.message || 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  };

  const alternarActivo = async (t: TemaTemporada) => {
    try {
      const res: any = await temasTemporadaAPI.cambiarActivo(t.id, !t.activo);
      if (res?.success === false) throw new Error(res.message);
      setTemas(ts => ts.map(x => x.id === t.id ? { ...x, activo: !t.activo } : x));
      mostrar('ok', !t.activo ? `${t.nombre} ya está disponible para los usuarios` : `${t.nombre} se ocultó a los usuarios`);
      await refrescarPublicas();
    } catch (err: any) {
      mostrar('error', err?.message || 'No se pudo cambiar');
    }
  };

  const eliminar = async (t: TemaTemporada) => {
    if (!window.confirm(`¿Eliminar la temática "${t.nombre}"? Los usuarios que la usaban volverán a su tema normal.`)) return;
    try {
      const res: any = await temasTemporadaAPI.eliminar(t.id);
      if (res?.success === false) throw new Error(res.message);
      mostrar('ok', 'Temática eliminada');
      await cargar();
      await refrescarPublicas();
    } catch (err: any) {
      mostrar('error', err?.message || 'No se pudo eliminar');
    }
  };

  const activas = temas.filter(t => t.activo).length;

  return (
    <div className="tm-page">
      <header className="av-hero">
        <div>
          <span className="av-hero-icono"><AiOutlineGift size={26} /></span>
          <span className="av-eyebrow">Apariencia</span>
          <h1 className="av-titulo">Temáticas de <em>temporada</em></h1>
          <p className="tm-sub">
            Crea estilos para fechas especiales. Al activarlas aparecen en el selector de tema de todos los usuarios
            y cada quien decide si la usa. {activas > 0 ? `${activas} activa${activas === 1 ? '' : 's'} ahora.` : 'Ninguna activa ahora.'}
          </p>
        </div>
        <button className="tm-btn-primario" onClick={() => abrir()}><AiOutlinePlus size={16} /> Nueva temática</button>
      </header>

      {aviso && <div className={`tm-aviso tm-aviso--${aviso.tipo}`} role="status">{aviso.texto}</div>}

      {cargando ? (
        <Loader texto="Cargando temáticas…" />
      ) : temas.length === 0 ? (
        <div className="tm-vacio"><p>Aún no hay temáticas. Crea la primera con “Nueva temática”.</p></div>
      ) : (
        <div className="tm-grid">
          {temas.map(t => (
            <article key={t.id} className={`tm-card${t.activo ? ' tm-card--activa' : ''}`}>
              <Miniatura t={t} />
              <div className="tm-card-info">
                <div className="tm-card-fila">
                  <h3>{ICONO_DECORACION[t.decoracion]} {t.nombre}</h3>
                  <label className="tm-switch" title={t.activo ? 'Ocultar a los usuarios' : 'Mostrar a los usuarios'}>
                    <input type="checkbox" checked={t.activo} onChange={() => alternarActivo(t)} />
                    <span />
                  </label>
                </div>
                {t.descripcion && <p className="tm-card-desc">{t.descripcion}</p>}
                <div className="tm-card-etiquetas">
                  <span className={`tm-etq ${t.activo ? 'tm-etq--ok' : ''}`}>{t.activo ? 'Visible para usuarios' : 'Oculta'}</span>
                  <span className="tm-etq">{t.modo === 'claro' ? 'Claro' : 'Oscuro'}</span>
                  {(t.fecha_inicio || t.fecha_fin) && (
                    <span className="tm-etq"><AiOutlineCalendar size={12} /> {fechaCorta(t.fecha_inicio) || '…'} – {fechaCorta(t.fecha_fin) || '…'}</span>
                  )}
                </div>
                <div className="tm-card-acciones">
                  <button className="tm-btn-sec" onClick={() => abrir(t)}><AiOutlineEdit size={15} /> Editar</button>
                  <button className="tm-btn-icono" onClick={() => eliminar(t)} aria-label={`Eliminar ${t.nombre}`}><AiOutlineDelete size={16} /></button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {form && createPortal(
        <div className="tm-overlay" onClick={cerrar}>
          <form className="tm-panel" onClick={e => e.stopPropagation()} onSubmit={guardar}>
            <div className="tm-panel-head">
              <h2>{form.id ? `Editar ${form.nombre}` : 'Nueva temática'}</h2>
              <button type="button" className="tm-btn-icono" onClick={cerrar} aria-label="Cerrar"><AiOutlineClose size={16} /></button>
            </div>

            <div className="tm-panel-cuerpo">
              <div className="tm-panel-campos">
                <label className="tm-campo">
                  <span>Nombre *</span>
                  <input value={form.nombre} maxLength={60} placeholder="Ej. Día de las madres" onChange={e => cambiar('nombre', e.target.value)} />
                </label>
                <label className="tm-campo">
                  <span>Descripción</span>
                  <input value={form.descripcion || ''} maxLength={160} placeholder="Frase corta que la describa" onChange={e => cambiar('descripcion', e.target.value)} />
                </label>

                <div className="tm-fila2">
                  <label className="tm-campo">
                    <span>Modo</span>
                    <select value={form.modo} onChange={e => cambiar('modo', e.target.value)}>
                      <option value="oscuro">Oscuro</option>
                      <option value="claro">Claro</option>
                    </select>
                  </label>
                  <label className="tm-campo">
                    <span>Decoración</span>
                    <select value={form.decoracion} onChange={e => cambiar('decoracion', e.target.value)}>
                      {DECORACIONES.map(d => <option key={d.valor} value={d.valor}>{ICONO_DECORACION[d.valor]} {d.etiqueta}</option>)}
                    </select>
                  </label>
                </div>

                <p className="tm-grupo">Colores</p>
                <div className="tm-colores">
                  {CAMPOS_COLOR.map(c => (
                    <label key={c.clave} className="tm-color">
                      <input type="color" value={String(form[c.clave])} onChange={e => cambiar(c.clave, e.target.value)} />
                      <span>{c.etiqueta}<small>{String(form[c.clave]).toUpperCase()}</small></span>
                    </label>
                  ))}
                </div>

                <p className="tm-grupo">Periodo (opcional)</p>
                <div className="tm-fila2">
                  <label className="tm-campo">
                    <span>Desde</span>
                    <input type="date" value={form.fecha_inicio || ''} onChange={e => cambiar('fecha_inicio', e.target.value)} />
                  </label>
                  <label className="tm-campo">
                    <span>Hasta</span>
                    <input type="date" value={form.fecha_fin || ''} onChange={e => cambiar('fecha_fin', e.target.value)} />
                  </label>
                </div>
                <p className="tm-ayuda">Con fechas, la temática solo se ofrece a los usuarios dentro de ese periodo (si además está activa).</p>

                <label className="tm-check">
                  <input type="checkbox" checked={form.activo} onChange={e => cambiar('activo', e.target.checked)} />
                  <span>Mostrarla a los usuarios al guardar</span>
                </label>
              </div>

              <div className="tm-panel-vista">
                <p className="tm-grupo">Vista previa</p>
                <Miniatura t={form} grande />
                <button type="button" className={`tm-btn-sec tm-btn-probar${probando ? ' activo' : ''}`} onClick={alternarPrueba}>
                  <AiOutlineEye size={15} /> {probando ? 'Quitar prueba de la página' : 'Probar en toda la página'}
                </button>
                <p className="tm-ayuda">La prueba solo la ves tú, hasta que guardes y la actives.</p>
              </div>
            </div>

            <div className="tm-panel-pie">
              <button type="button" className="tm-btn-sec" onClick={cerrar}>Cancelar</button>
              <button type="submit" className="tm-btn-primario" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar temática'}</button>
            </div>
          </form>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AdminTematicasScreen;
