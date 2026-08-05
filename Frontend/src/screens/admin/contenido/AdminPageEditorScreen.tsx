import React, { useState, useEffect, useCallback } from 'react';
import { paginasAPI, seccionesAPI, contenidosAPI } from '../../../services/api';
import Loader from '../../../components/Loader';
import './AdminPageEditorScreen.css';

interface Pagina {
  id: number;
  nombre: string;
  slug: string;
}

interface Contenido {
  id: number;
  seccion_id: number;
  titulo: string;
  descripcion?: string;
  imagen_url?: string;
  enlace_url?: string;
  enlace_nueva_ventana?: boolean;
  orden: number;
  activo: boolean;
}

interface Seccion {
  id: number;
  pagina_id: number;
  nombre: string;
  descripcion?: string;
  imagen_url?: string;
  color_fondo?: string;
  orden: number;
  activo: boolean;
  contenidos: Contenido[];
}

const PALETAS_PRESET = [
  { nombre: 'Rosa Champagne', color: '#f6e4e9' },
  { nombre: 'Oro Rosa', color: '#e8789a' },
  { nombre: 'Negro Elegante', color: '#0a0a0b' },
  { nombre: 'Crema', color: '#faf6f2' },
  { nombre: 'Vino', color: '#5a2440' },
  { nombre: 'Blanco', color: '#ffffff' },
];

const SECCION_VACIA = { nombre: '', descripcion: '', imagen_url: '', color_fondo: '#ffffff', orden: 0 };
const CONTENIDO_VACIO = { titulo: '', descripcion: '', imagen_url: '', enlace_url: '', enlace_nueva_ventana: false, orden: 0 };

const AdminPageEditorScreen: React.FC = () => {
  const [paginas, setPaginas] = useState<Pagina[]>([]);
  const [paginaId, setPaginaId] = useState<number | null>(null);
  const [secciones, setSecciones] = useState<Seccion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [seccionModal, setSeccionModal] = useState<{ editId: number | null; data: typeof SECCION_VACIA } | null>(null);
  const [contenidoModal, setContenidoModal] = useState<{ seccionId: number; editId: number | null; data: typeof CONTENIDO_VACIO } | null>(null);

  const dragSeccion = React.useRef<number | null>(null);
  const dragContenido = React.useRef<{ seccionId: number; id: number } | null>(null);

  useEffect(() => {
    paginasAPI.getAll().then((res: any) => {
      const arr = Array.isArray(res) ? res : (res?.data || []);
      setPaginas(arr);
      if (arr.length > 0) setPaginaId(arr[0].id);
    }).catch(() => setError('No se pudieron cargar las páginas'));
  }, []);

  const cargarSecciones = useCallback(async () => {
    if (!paginaId) return;
    setLoading(true);
    setError(null);
    try {
      const seccionesRes: any = await seccionesAPI.getByPagina(paginaId);
      const seccionesArr: Seccion[] = Array.isArray(seccionesRes) ? seccionesRes : (seccionesRes?.data || []);
      const conContenidos = await Promise.all(
        seccionesArr
          .sort((a, b) => a.orden - b.orden)
          .map(async (s) => {
            try {
              const cRes: any = await contenidosAPI.getBySeccion(s.id);
              const cArr: Contenido[] = Array.isArray(cRes) ? cRes : (cRes?.data || []);
              return { ...s, contenidos: cArr.filter(c => c.activo !== false).sort((a, b) => a.orden - b.orden) };
            } catch { return { ...s, contenidos: [] }; }
          })
      );
      setSecciones(conContenidos);
    } catch {
      setError('No se pudieron cargar las secciones de esta página');
    } finally {
      setLoading(false);
    }
  }, [paginaId]);

  useEffect(() => { cargarSecciones(); }, [cargarSecciones]);

  const avisar = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  // ── SECCIONES: CRUD ──
  const guardarSeccion = async () => {
    if (!seccionModal || !paginaId) return;
    if (!seccionModal.data.nombre.trim()) { setError('El nombre de la sección es obligatorio'); return; }
    try {
      if (seccionModal.editId) {
        await seccionesAPI.update(seccionModal.editId, seccionModal.data);
        avisar('Sección actualizada');
      } else {
        await seccionesAPI.create({ pagina_id: paginaId, ...seccionModal.data, orden: secciones.length });
        avisar('Sección creada');
      }
      setSeccionModal(null);
      cargarSecciones();
    } catch { setError('Error al guardar la sección'); }
  };

  const eliminarSeccion = async (id: number) => {
    if (!window.confirm('¿Eliminar esta sección y todo su contenido?')) return;
    try {
      await seccionesAPI.delete(id);
      avisar('Sección eliminada');
      cargarSecciones();
    } catch { setError('Error al eliminar la sección'); }
  };

  // ── SECCIONES: reordenar (drag & drop) ──
  const onDropSeccion = async (destinoId: number) => {
    const origenId = dragSeccion.current;
    dragSeccion.current = null;
    if (!origenId || origenId === destinoId) return;

    const ordenActual = [...secciones];
    const iOrigen = ordenActual.findIndex(s => s.id === origenId);
    const iDestino = ordenActual.findIndex(s => s.id === destinoId);
    if (iOrigen === -1 || iDestino === -1) return;

    const [movida] = ordenActual.splice(iOrigen, 1);
    ordenActual.splice(iDestino, 0, movida);
    setSecciones(ordenActual);

    try {
      await Promise.all(ordenActual.map((s, i) =>
        seccionesAPI.update(s.id, { nombre: s.nombre, descripcion: s.descripcion, imagen_url: s.imagen_url, color_fondo: s.color_fondo, orden: i })
      ));
      avisar('Orden actualizado');
    } catch {
      setError('No se pudo guardar el nuevo orden');
      cargarSecciones();
    }
  };

  // ── CONTENIDOS: CRUD ──
  const guardarContenido = async () => {
    if (!contenidoModal) return;
    if (!contenidoModal.data.titulo.trim()) { setError('El título es obligatorio'); return; }
    try {
      if (contenidoModal.editId) {
        await contenidosAPI.update(contenidoModal.editId, contenidoModal.data);
        avisar('Contenido actualizado');
      } else {
        const seccion = secciones.find(s => s.id === contenidoModal.seccionId);
        await contenidosAPI.create({ seccion_id: contenidoModal.seccionId, ...contenidoModal.data, orden: seccion?.contenidos.length ?? 0 });
        avisar('Contenido agregado');
      }
      setContenidoModal(null);
      cargarSecciones();
    } catch { setError('Error al guardar el contenido'); }
  };

  const eliminarContenido = async (id: number) => {
    if (!window.confirm('¿Eliminar este contenido?')) return;
    try {
      await contenidosAPI.delete(id);
      avisar('Contenido eliminado');
      cargarSecciones();
    } catch { setError('Error al eliminar el contenido'); }
  };

  // ── CONTENIDOS: reordenar dentro de su sección ──
  const onDropContenido = async (seccionId: number, destinoId: number) => {
    const origen = dragContenido.current;
    dragContenido.current = null;
    if (!origen || origen.seccionId !== seccionId || origen.id === destinoId) return;

    const seccion = secciones.find(s => s.id === seccionId);
    if (!seccion) return;
    const lista = [...seccion.contenidos];
    const iOrigen = lista.findIndex(c => c.id === origen.id);
    const iDestino = lista.findIndex(c => c.id === destinoId);
    if (iOrigen === -1 || iDestino === -1) return;

    const [movido] = lista.splice(iOrigen, 1);
    lista.splice(iDestino, 0, movido);
    setSecciones(prev => prev.map(s => s.id === seccionId ? { ...s, contenidos: lista } : s));

    try {
      await Promise.all(lista.map((c, i) =>
        contenidosAPI.update(c.id, { titulo: c.titulo, descripcion: c.descripcion, imagen_url: c.imagen_url, enlace_url: c.enlace_url, enlace_nueva_ventana: c.enlace_nueva_ventana, orden: i })
      ));
      avisar('Orden actualizado');
    } catch {
      setError('No se pudo guardar el nuevo orden');
      cargarSecciones();
    }
  };

  const paginaActual = paginas.find(p => p.id === paginaId);

  return (
    <div className="pve-container">
      <div className="pve-header">
        <h1><span className="pve-icon">🎨</span> Editor Visual de Páginas</h1>
        <p>Edita secciones y contenido con vista previa en vivo, arrastra para reordenar, y usa paletas predefinidas.</p>
      </div>

      {toast && <div className="pve-toast">{toast}</div>}
      {error && <div className="pve-error" onClick={() => setError(null)}>❌ {error}</div>}

      <div className="pve-page-selector">
        <label>Página a editar:</label>
        <select value={paginaId ?? ''} onChange={e => setPaginaId(Number(e.target.value))}>
          {paginas.map(p => <option key={p.id} value={p.id}>{p.nombre} (/{p.slug})</option>)}
        </select>
        <button className="pve-btn-add" onClick={() => setSeccionModal({ editId: null, data: { ...SECCION_VACIA, orden: secciones.length } })}>
          + Nueva sección
        </button>
      </div>

      {loading ? (
        <Loader texto="Cargando secciones..." />
      ) : (
        <div className="pve-layout">
          {/* ── EDITOR ── */}
          <div className="pve-editor">
            {secciones.length === 0 ? (
              <div className="pve-empty">No hay secciones en esta página todavía. Crea la primera arriba.</div>
            ) : (
              secciones.map(seccion => (
                <div
                  key={seccion.id}
                  className="pve-seccion-card"
                  draggable
                  onDragStart={() => { dragSeccion.current = seccion.id; }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => onDropSeccion(seccion.id)}
                >
                  <div className="pve-seccion-head">
                    <span className="pve-drag-handle" title="Arrastra para reordenar">⠿</span>
                    <span className="pve-seccion-swatch" style={{ background: seccion.color_fondo || '#fff' }} />
                    <h3>{seccion.nombre}</h3>
                    <div className="pve-seccion-actions">
                      <button onClick={() => setSeccionModal({ editId: seccion.id, data: { nombre: seccion.nombre, descripcion: seccion.descripcion || '', imagen_url: seccion.imagen_url || '', color_fondo: seccion.color_fondo || '#ffffff', orden: seccion.orden } })}>✏️</button>
                      <button onClick={() => eliminarSeccion(seccion.id)} className="pve-btn-danger">🗑️</button>
                    </div>
                  </div>

                  <div className="pve-contenidos-list">
                    {seccion.contenidos.map(c => (
                      <div
                        key={c.id}
                        className="pve-contenido-item"
                        draggable
                        onDragStart={() => { dragContenido.current = { seccionId: seccion.id, id: c.id }; }}
                        onDragOver={e => e.preventDefault()}
                        onDrop={() => onDropContenido(seccion.id, c.id)}
                      >
                        <span className="pve-drag-handle" title="Arrastra para reordenar">⠿</span>
                        {c.imagen_url && <img src={c.imagen_url} alt={c.titulo} />}
                        <span className="pve-contenido-titulo">{c.titulo}</span>
                        <div className="pve-contenido-actions">
                          <button onClick={() => setContenidoModal({ seccionId: seccion.id, editId: c.id, data: { titulo: c.titulo, descripcion: c.descripcion || '', imagen_url: c.imagen_url || '', enlace_url: c.enlace_url || '', enlace_nueva_ventana: c.enlace_nueva_ventana || false, orden: c.orden } })}>✏️</button>
                          <button onClick={() => eliminarContenido(c.id)} className="pve-btn-danger">🗑️</button>
                        </div>
                      </div>
                    ))}
                    <button className="pve-btn-add-contenido" onClick={() => setContenidoModal({ seccionId: seccion.id, editId: null, data: { ...CONTENIDO_VACIO, orden: seccion.contenidos.length } })}>
                      + Agregar contenido
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ── VISTA PREVIA EN VIVO ── */}
          <div className="pve-preview-panel">
            <span className="pve-preview-label">Vista previa — {paginaActual?.nombre}</span>
            <div className="pve-preview-frame">
              {secciones.length === 0 ? (
                <div className="pve-preview-empty">Sin secciones aún</div>
              ) : (
                secciones.map(seccion => (
                  <div
                    key={seccion.id}
                    className="pve-preview-seccion"
                    style={{
                      background: seccion.color_fondo || '#fff',
                      backgroundImage: seccion.imagen_url ? `linear-gradient(rgba(0,0,0,.35),rgba(0,0,0,.35)), url(${seccion.imagen_url})` : undefined,
                    }}
                  >
                    <span className="pve-preview-seccion-nombre">{seccion.nombre}</span>
                    <div className="pve-preview-contenidos">
                      {seccion.contenidos.slice(0, 4).map(c => (
                        <div key={c.id} className="pve-preview-card">
                          {c.imagen_url && <img src={c.imagen_url} alt={c.titulo} />}
                          <span>{c.titulo}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL SECCIÓN ── */}
      {seccionModal && (
        <div className="pve-overlay" onClick={() => setSeccionModal(null)}>
          <div className="pve-modal" onClick={e => e.stopPropagation()}>
            <h2>{seccionModal.editId ? 'Editar sección' : 'Nueva sección'}</h2>

            <div className="pve-field">
              <label>Nombre *</label>
              <input value={seccionModal.data.nombre} onChange={e => setSeccionModal(m => m && { ...m, data: { ...m.data, nombre: e.target.value } })} placeholder="Ej: Nuestros Servicios" />
            </div>
            <div className="pve-field">
              <label>Descripción</label>
              <textarea value={seccionModal.data.descripcion} onChange={e => setSeccionModal(m => m && { ...m, data: { ...m.data, descripcion: e.target.value } })} rows={3} />
            </div>
            <div className="pve-field">
              <label>Imagen de fondo (URL)</label>
              <input value={seccionModal.data.imagen_url} onChange={e => setSeccionModal(m => m && { ...m, data: { ...m.data, imagen_url: e.target.value } })} placeholder="https://..." />
            </div>
            <div className="pve-field">
              <label>Color de fondo</label>
              <div className="pve-color-row">
                <input type="color" value={seccionModal.data.color_fondo} onChange={e => setSeccionModal(m => m && { ...m, data: { ...m.data, color_fondo: e.target.value } })} />
                <input type="text" value={seccionModal.data.color_fondo} onChange={e => setSeccionModal(m => m && { ...m, data: { ...m.data, color_fondo: e.target.value } })} />
              </div>
              <div className="pve-paletas">
                {PALETAS_PRESET.map(p => (
                  <button
                    key={p.color}
                    type="button"
                    className="pve-paleta-swatch"
                    style={{ background: p.color }}
                    title={p.nombre}
                    onClick={() => setSeccionModal(m => m && { ...m, data: { ...m.data, color_fondo: p.color } })}
                  />
                ))}
              </div>
            </div>

            <div className="pve-modal-actions">
              <button className="pve-btn-cancel" onClick={() => setSeccionModal(null)}>Cancelar</button>
              <button className="pve-btn-save" onClick={guardarSeccion}>{seccionModal.editId ? 'Guardar cambios' : 'Crear sección'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CONTENIDO ── */}
      {contenidoModal && (
        <div className="pve-overlay" onClick={() => setContenidoModal(null)}>
          <div className="pve-modal" onClick={e => e.stopPropagation()}>
            <h2>{contenidoModal.editId ? 'Editar contenido' : 'Nuevo contenido'}</h2>

            <div className="pve-field">
              <label>Título *</label>
              <input value={contenidoModal.data.titulo} onChange={e => setContenidoModal(m => m && { ...m, data: { ...m.data, titulo: e.target.value } })} />
            </div>
            <div className="pve-field">
              <label>Descripción</label>
              <textarea value={contenidoModal.data.descripcion} onChange={e => setContenidoModal(m => m && { ...m, data: { ...m.data, descripcion: e.target.value } })} rows={3} />
            </div>
            <div className="pve-field">
              <label>Imagen (URL)</label>
              <input value={contenidoModal.data.imagen_url} onChange={e => setContenidoModal(m => m && { ...m, data: { ...m.data, imagen_url: e.target.value } })} placeholder="https://..." />
            </div>
            <div className="pve-field">
              <label>Enlace (URL)</label>
              <input value={contenidoModal.data.enlace_url} onChange={e => setContenidoModal(m => m && { ...m, data: { ...m.data, enlace_url: e.target.value } })} placeholder="https://..." />
            </div>
            <label className="pve-checkbox">
              <input type="checkbox" checked={contenidoModal.data.enlace_nueva_ventana} onChange={e => setContenidoModal(m => m && { ...m, data: { ...m.data, enlace_nueva_ventana: e.target.checked } })} />
              Abrir enlace en nueva ventana
            </label>

            <div className="pve-modal-actions">
              <button className="pve-btn-cancel" onClick={() => setContenidoModal(null)}>Cancelar</button>
              <button className="pve-btn-save" onClick={guardarContenido}>{contenidoModal.editId ? 'Guardar cambios' : 'Agregar contenido'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPageEditorScreen;
