// Ruta: Frontend/src/screens/admin/AdminOpcionesPersonalizacionScreen.tsx
// Opciones de personalización que eligen los clientes (Talla, Largo, Metal,
// Grabado…). Se dan de alta por categoría y cada producto las hereda; si un
// producto necesita algo distinto, se le crea su propio grupo con el mismo nombre.
import React, { useEffect, useMemo, useState } from 'react';
import {
  AiOutlinePlus, AiOutlineDelete, AiOutlineEdit, AiOutlineClose, AiOutlineSearch, AiOutlineAppstore, AiOutlineTag,
} from 'react-icons/ai';
import { opcionesPersonalizacionAPI, productsAPI, type GrupoPers, type OpcionPers } from '../../services/api';
import '../../styles/SelectorOpciones.css';
import './AdminOpcionesPersonalizacionScreen.css';
import AdminHero from '../../components/AdminHero';

type Destino = { tipo: 'categoria' | 'producto'; id: number; nombre: string; categoria_id?: number };
type Borrador = { id?: number; nombre: string; requerido: boolean; opciones: OpcionPers[] };

const PLANTILLAS: { nombre: string; grupo: Borrador }[] = [
  { nombre: 'Tallas de anillo', grupo: { nombre: 'Talla', requerido: true, opciones: ['5', '6', '7', '8', '9', '10'].map(t => ({ etiqueta: t, costo_extra: 0, pide_texto: false })) } },
  { nombre: 'Largo de cadena', grupo: { nombre: 'Largo', requerido: true, opciones: ['40 cm', '45 cm', '50 cm'].map(t => ({ etiqueta: t, costo_extra: 0, pide_texto: false })) } },
  { nombre: 'Color del metal', grupo: { nombre: 'Metal', requerido: false, opciones: ['Dorado', 'Plateado', 'Oro rosa'].map(t => ({ etiqueta: t, costo_extra: 0, pide_texto: false })) } },
  { nombre: 'Grabado', grupo: { nombre: 'Grabado', requerido: false, opciones: [
    { etiqueta: 'Nombre', costo_extra: 0, pide_texto: true, texto_ayuda: 'El nombre a grabar' },
    { etiqueta: 'Fecha', costo_extra: 0, pide_texto: true, texto_ayuda: 'La fecha a grabar' },
    { etiqueta: 'Iniciales', costo_extra: 0, pide_texto: true, texto_ayuda: 'Las iniciales' },
  ] } },
];

const dinero = (n: number) => `$${Number(n || 0).toLocaleString('es-MX', { maximumFractionDigits: 2 })}`;

/** Cómo lo verá el cliente (mismo estilo que el selector real). */
const VistaGrupo: React.FC<{ g: Borrador }> = ({ g }) => (
  <div className="sop sop--compacto">
    <div className="sop-grupo">
      <div className="sop-cabeza">
        <span className="sop-nombre">{g.nombre || 'Nombre del grupo'}{g.requerido && <b> *</b>}</span>
        {!g.requerido && <span className="sop-opcional">Opcional</span>}
      </div>
      <div className="sop-opciones">
        {g.opciones.filter(o => o.etiqueta.trim()).map((o, i) => (
          <span key={i} className={`sop-opcion${i === 0 ? ' activa' : ''}${o.etiqueta.length <= 3 ? ' sop-opcion--corta' : ''}`}>
            {o.etiqueta}{Number(o.costo_extra) > 0 && <small>+{dinero(Number(o.costo_extra))}</small>}
          </span>
        ))}
      </div>
      {g.opciones[0]?.pide_texto && <input className="sop-texto" disabled placeholder={g.opciones[0].texto_ayuda || 'Escribe aquí'} />}
    </div>
  </div>
);

const AdminOpcionesPersonalizacionScreen: React.FC = () => {
  const [grupos, setGrupos] = useState<GrupoPers[]>([]);
  const [categorias, setCategorias] = useState<{ id: number; nombre: string }[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [modo, setModo] = useState<'categoria' | 'producto'>('categoria');
  const [destino, setDestino] = useState<Destino | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const cargarGrupos = async () => {
    try { const r: any = await opcionesPersonalizacionAPI.listar(); setGrupos(r?.data || []); }
    catch (e: any) { setAviso({ tipo: 'error', texto: e?.message || 'No se pudieron cargar las opciones' }); }
  };

  useEffect(() => {
    cargarGrupos();
    productsAPI.getCategories().then((r: any) => {
      const cats = (r?.data || r || []).filter((c: any) => c.activo !== false);
      setCategorias(cats);
      if (cats.length) setDestino({ tipo: 'categoria', id: cats[0].id, nombre: cats[0].nombre });
    }).catch(() => {});
    productsAPI.getAll().then((r: any) => setProductos(Array.isArray(r?.data) ? r.data : [])).catch(() => {});
  }, []);

  const mostrar = (tipo: 'ok' | 'error', texto: string) => { setAviso({ tipo, texto }); window.setTimeout(() => setAviso(null), 3500); };

  const gruposDestino = useMemo(() => !destino ? [] : grupos.filter(g =>
    destino.tipo === 'categoria' ? g.categoria_id === destino.id : g.producto_id === destino.id), [grupos, destino]);

  const heredados = useMemo(() => {
    if (!destino || destino.tipo !== 'producto' || !destino.categoria_id) return [];
    const propios = new Set(gruposDestino.map(g => g.nombre.trim().toLowerCase()));
    return grupos.filter(g => g.categoria_id === destino.categoria_id && !propios.has(g.nombre.trim().toLowerCase()));
  }, [grupos, destino, gruposDestino]);

  const cuentaCategoria = (id: number) => grupos.filter(g => g.categoria_id === id).length;

  const productosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const base = q ? productos.filter(p => String(p.nombre).toLowerCase().includes(q)) : productos.filter(p => p.permite_personalizacion);
    return base.slice(0, 40);
  }, [productos, busqueda]);

  const guardar = async () => {
    if (!borrador || !destino) return;
    if (!borrador.nombre.trim()) { mostrar('error', 'Escribe el nombre del grupo (por ejemplo, Talla)'); return; }
    if (!borrador.opciones.some(o => o.etiqueta.trim())) { mostrar('error', 'Agrega al menos una opción'); return; }
    setGuardando(true);
    try {
      const datos: Partial<GrupoPers> = {
        nombre: borrador.nombre.trim(), requerido: borrador.requerido, opciones: borrador.opciones,
        categoria_id: destino.tipo === 'categoria' ? destino.id : null,
        producto_id: destino.tipo === 'producto' ? destino.id : null,
      };
      const r: any = borrador.id ? await opcionesPersonalizacionAPI.actualizar(borrador.id, datos) : await opcionesPersonalizacionAPI.crear(datos);
      if (r?.success === false) throw new Error(r.message);
      mostrar('ok', borrador.id ? 'Opciones actualizadas' : 'Opciones creadas');
      setBorrador(null);
      await cargarGrupos();
    } catch (e: any) { mostrar('error', e?.message || 'No se pudo guardar'); }
    finally { setGuardando(false); }
  };

  const eliminar = async (g: GrupoPers) => {
    if (!window.confirm(`¿Eliminar "${g.nombre}"? Los clientes dejarán de verlo en ${destino?.nombre}.`)) return;
    try { await opcionesPersonalizacionAPI.eliminar(g.id); mostrar('ok', 'Grupo eliminado'); await cargarGrupos(); }
    catch (e: any) { mostrar('error', e?.message || 'No se pudo eliminar'); }
  };

  const editarOpcion = (i: number, cambios: Partial<OpcionPers>) =>
    setBorrador(b => b && ({ ...b, opciones: b.opciones.map((o, k) => k === i ? { ...o, ...cambios } : o) }));

  return (
    <div className="aop-page">
      <AdminHero icono={<AiOutlineEdit size={26} />} seccion="Gestión de catálogo" titulo="Opciones de" resaltado="personalización"
        descripcion="Lo que el cliente elige con botones al comprar: talla, largo, metal, grabado… Dalas de alta por categoría y todos sus productos las heredan." />

      {aviso && <div className={`aop-aviso aop-aviso--${aviso.tipo}`} role="status">{aviso.texto}</div>}

      <div className="aop-layout">
        {/* Selector de destino */}
        <aside className="aop-lateral">
          <div className="aop-modos" role="tablist">
            <button role="tab" aria-selected={modo === 'categoria'} className={modo === 'categoria' ? 'activo' : ''} onClick={() => { setModo('categoria'); setBorrador(null); }}><AiOutlineAppstore size={15} /> Categorías</button>
            <button role="tab" aria-selected={modo === 'producto'} className={modo === 'producto' ? 'activo' : ''} onClick={() => { setModo('producto'); setBorrador(null); }}><AiOutlineTag size={15} /> Productos</button>
          </div>
          {modo === 'categoria' ? (
            <ul className="aop-lista">
              {categorias.map(c => (
                <li key={c.id}>
                  <button className={destino?.tipo === 'categoria' && destino.id === c.id ? 'activo' : ''}
                    onClick={() => { setDestino({ tipo: 'categoria', id: c.id, nombre: c.nombre }); setBorrador(null); }}>
                    <span>{c.nombre}</span>{cuentaCategoria(c.id) > 0 && <small>{cuentaCategoria(c.id)}</small>}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <>
              <label className="aop-buscar"><AiOutlineSearch size={16} /><input placeholder="Buscar producto…" value={busqueda} onChange={e => setBusqueda(e.target.value)} /></label>
              {!busqueda && <p className="aop-nota">Mostrando los productos marcados como personalizables.</p>}
              <ul className="aop-lista">
                {productosFiltrados.map(p => (
                  <li key={p.id}>
                    <button className={destino?.tipo === 'producto' && destino.id === p.id ? 'activo' : ''}
                      onClick={() => { setDestino({ tipo: 'producto', id: p.id, nombre: p.nombre, categoria_id: p.categoria_id }); setBorrador(null); }}>
                      <span>{p.nombre}</span>{grupos.some(g => g.producto_id === p.id) && <small>propias</small>}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </aside>

        {/* Grupos del destino */}
        <section className="aop-principal">
          {!destino ? <p className="aop-nota">Elige una categoría o un producto.</p> : (
            <>
              <div className="aop-principal-head">
                <div>
                  <span className="aop-eyebrow">{destino.tipo === 'categoria' ? 'Categoría' : 'Producto'}</span>
                  <h2>{destino.nombre}</h2>
                </div>
                {!borrador && <button className="aop-btn" onClick={() => setBorrador({ nombre: '', requerido: false, opciones: [{ etiqueta: '', costo_extra: 0, pide_texto: false }] })}><AiOutlinePlus size={16} /> Nuevo grupo</button>}
              </div>

              {!borrador && gruposDestino.length === 0 && heredados.length === 0 && (
                <div className="aop-vacio">
                  <p>Aún no hay opciones aquí. Empieza con una plantilla:</p>
                  <div className="aop-plantillas">
                    {PLANTILLAS.map(p => <button key={p.nombre} onClick={() => setBorrador(JSON.parse(JSON.stringify(p.grupo)))}>{p.nombre}</button>)}
                  </div>
                </div>
              )}

              {!borrador && gruposDestino.map(g => (
                <article key={g.id} className="aop-grupo">
                  <VistaGrupo g={g} />
                  <div className="aop-grupo-acciones">
                    <button className="aop-btn-sec" onClick={() => setBorrador({ id: g.id, nombre: g.nombre, requerido: g.requerido, opciones: g.opciones.map(o => ({ ...o })) })}><AiOutlineEdit size={15} /> Editar</button>
                    <button className="aop-icono" onClick={() => eliminar(g)} aria-label={`Eliminar ${g.nombre}`}><AiOutlineDelete size={16} /></button>
                  </div>
                </article>
              ))}

              {!borrador && heredados.length > 0 && (
                <>
                  <p className="aop-subtitulo">Heredadas de su categoría</p>
                  {heredados.map(g => (
                    <article key={g.id} className="aop-grupo aop-grupo--heredado">
                      <VistaGrupo g={g} />
                      <div className="aop-grupo-acciones">
                        <button className="aop-btn-sec" title="Crea una copia solo para este producto"
                          onClick={() => setBorrador({ nombre: g.nombre, requerido: g.requerido, opciones: g.opciones.map(o => ({ ...o, id: undefined })) })}>
                          <AiOutlineEdit size={15} /> Cambiar solo para este producto
                        </button>
                      </div>
                    </article>
                  ))}
                </>
              )}

              {!borrador && gruposDestino.length > 0 && (
                <div className="aop-plantillas aop-plantillas--pie">
                  <span>Agregar desde plantilla:</span>
                  {PLANTILLAS.filter(p => !gruposDestino.some(g => g.nombre.toLowerCase() === p.grupo.nombre.toLowerCase()))
                    .map(p => <button key={p.nombre} onClick={() => setBorrador(JSON.parse(JSON.stringify(p.grupo)))}>{p.nombre}</button>)}
                </div>
              )}

              {/* Editor */}
              {borrador && (
                <div className="aop-editor">
                  <div className="aop-editor-head">
                    <h3>{borrador.id ? 'Editar grupo' : 'Nuevo grupo'}</h3>
                    <button className="aop-icono" onClick={() => setBorrador(null)} aria-label="Cerrar"><AiOutlineClose size={16} /></button>
                  </div>
                  <div className="aop-editor-cuerpo">
                    <div className="aop-editor-campos">
                      <div className="aop-fila2">
                        <label className="aop-campo"><span>Nombre del grupo</span>
                          <input value={borrador.nombre} maxLength={60} placeholder="Ej. Talla" onChange={e => setBorrador({ ...borrador, nombre: e.target.value })} />
                        </label>
                        <label className="aop-check"><input type="checkbox" checked={borrador.requerido} onChange={e => setBorrador({ ...borrador, requerido: e.target.checked })} /> Obligatorio</label>
                      </div>
                      <p className="aop-subtitulo">Opciones</p>
                      {borrador.opciones.map((o, i) => (
                        <div key={i} className="aop-opcion">
                          <input className="aop-opcion-nombre" value={o.etiqueta} maxLength={60} placeholder={`Opción ${i + 1}`} onChange={e => editarOpcion(i, { etiqueta: e.target.value })} />
                          <label className="aop-costo"><span>+$</span><input type="number" min={0} step="0.01" value={o.costo_extra ?? 0} onChange={e => editarOpcion(i, { costo_extra: Number(e.target.value) })} aria-label="Costo extra" /></label>
                          <label className="aop-check aop-check--mini"><input type="checkbox" checked={!!o.pide_texto} onChange={e => editarOpcion(i, { pide_texto: e.target.checked })} /> Pide texto</label>
                          <button className="aop-icono" onClick={() => setBorrador({ ...borrador, opciones: borrador.opciones.filter((_, k) => k !== i) })} aria-label="Quitar opción" disabled={borrador.opciones.length === 1}><AiOutlineDelete size={15} /></button>
                          {o.pide_texto && (
                            <input className="aop-opcion-ayuda" value={o.texto_ayuda || ''} maxLength={80} placeholder="¿Qué debe escribir el cliente? Ej. El nombre a grabar" onChange={e => editarOpcion(i, { texto_ayuda: e.target.value })} />
                          )}
                        </div>
                      ))}
                      <button className="aop-btn-sec aop-agregar" onClick={() => setBorrador({ ...borrador, opciones: [...borrador.opciones, { etiqueta: '', costo_extra: 0, pide_texto: false }] })}><AiOutlinePlus size={15} /> Agregar opción</button>
                    </div>
                    <div className="aop-editor-vista">
                      <p className="aop-subtitulo">Así lo verá el cliente</p>
                      <div className="aop-vista-caja"><VistaGrupo g={borrador} /></div>
                      <p className="aop-nota">"Pide texto" muestra un campo para escribir (nombre, fecha…). El costo extra se suma al precio de la pieza.</p>
                    </div>
                  </div>
                  <div className="aop-editor-pie">
                    <button className="aop-btn-sec" onClick={() => setBorrador(null)}>Cancelar</button>
                    <button className="aop-btn" onClick={guardar} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminOpcionesPersonalizacionScreen;
