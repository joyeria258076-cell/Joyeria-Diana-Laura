// Frontend/src/screens/admin/contenido/AdminPageContentInitialScreen.tsx
// "Contenido de inicio": editor del carrusel principal de la página de Inicio.
// Vista previa idéntica al carrusel público que se actualiza mientras se escribe,
// tira de diapositivas (ordenar / mostrar / ocultar / eliminar) y formulario con
// subida de imagen a Cloudinary por arrastre.
import React, { useEffect, useRef, useState } from 'react';
import {
  AiOutlinePlus, AiOutlineEye, AiOutlineEyeInvisible, AiOutlineDelete, AiOutlineLeft, AiOutlineRight,
  AiOutlineCloudUpload, AiOutlinePicture,
} from 'react-icons/ai';
import { paginasAPI, seccionesAPI, contenidosAPI, uploadAPI } from '../../../services/api';
import Loader from '../../../components/Loader';
import '../../../styles/SitioSecciones.css';
import './AdminPageContentInitialScreen.css';

interface Slide {
  id?: number;
  titulo: string;
  etiqueta: string;
  descripcion: string;
  imagen_url: string;
  enlace_url: string;
  enlace_nueva_ventana: boolean;
  orden: number;
  activo: boolean;
}

const VACIA: Slide = {
  titulo: '', etiqueta: '', descripcion: '', imagen_url: '', enlace_url: '/catalogo-publico',
  enlace_nueva_ventana: false, orden: 0, activo: true,
};

const DESTINOS = [
  { label: 'Catálogo', ruta: '/catalogo-publico' },
  { label: 'Blog', ruta: '/noticias' },
  { label: 'Contacto', ruta: '/contacto-publico' },
  { label: 'Ubicación', ruta: '/ubicacion-publica' },
  { label: 'Registro', ruta: '/registro' },
];

const aSlide = (c: any): Slide => ({
  id: c.id, titulo: c.titulo || '', etiqueta: c.etiqueta || '', descripcion: c.descripcion || '',
  imagen_url: c.imagen_url || '', enlace_url: c.enlace_url || '/catalogo-publico',
  enlace_nueva_ventana: !!c.enlace_nueva_ventana, orden: c.orden || 0, activo: c.activo !== false,
});

const AdminPageContentInitialScreen: React.FC = () => {
  const [seccionId, setSeccionId] = useState<number | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [sel, setSel] = useState<number>(0);           // índice seleccionado; -1 = nueva
  const [form, setForm] = useState<Slide>(VACIA);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [previewImg, setPreviewImg] = useState('');
  const [arrastrando, setArrastrando] = useState(false);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const cargar = async (seleccionarId?: number) => {
    try {
      const paginas: any = await paginasAPI.getAll();
      const lista = Array.isArray(paginas) ? paginas : paginas?.data || [];
      const inicio = lista.find((p: any) => p.slug === 'inicio');
      if (!inicio) throw new Error('No existe la página "Inicio".');

      const secRes: any = await seccionesAPI.getByPagina(inicio.id);
      const secs = Array.isArray(secRes) ? secRes : secRes?.data || [];
      let carrusel = secs.find((s: any) => /carrusel|carousel/i.test(s.nombre));
      if (!carrusel) {
        const creada: any = await seccionesAPI.create({ pagina_id: inicio.id, nombre: 'Carrusel principal', orden: 0 } as any);
        carrusel = creada?.data || creada;
      }
      setSeccionId(carrusel.id);

      const cRes: any = await contenidosAPI.getBySeccion(carrusel.id, true);
      const arr: Slide[] = (Array.isArray(cRes) ? cRes : cRes?.data || []).map(aSlide)
        .sort((a: Slide, b: Slide) => a.orden - b.orden);
      setSlides(arr);

      const idx = seleccionarId ? Math.max(0, arr.findIndex(s => s.id === seleccionarId)) : 0;
      if (arr.length) elegir(idx, arr); else nueva();
    } catch (err: any) {
      setMsg({ tipo: 'error', texto: err?.message || 'No se pudo cargar el carrusel.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const elegir = (i: number, lista = slides) => {
    setSel(i);
    setForm({ ...lista[i] });
    setArchivo(null);
    setPreviewImg(lista[i]?.imagen_url || '');
    setMsg(null);
  };

  const nueva = () => {
    setSel(-1);
    setForm({ ...VACIA, orden: slides.length });
    setArchivo(null);
    setPreviewImg('');
    setMsg(null);
  };

  const campo = (k: keyof Slide, v: any) => setForm(f => ({ ...f, [k]: v }));

  const tomarArchivo = (f?: File | null) => {
    if (!f || !f.type.startsWith('image/')) return;
    setArchivo(f);
    setPreviewImg(URL.createObjectURL(f));
  };

  const original = sel >= 0 ? slides[sel] : null;
  const hayCambios = !!archivo || !original || JSON.stringify(original) !== JSON.stringify(form);

  const guardar = async () => {
    if (!form.titulo.trim()) { setMsg({ tipo: 'error', texto: 'El título es obligatorio.' }); return; }
    if (!archivo && !form.imagen_url) { setMsg({ tipo: 'error', texto: 'Agrega una imagen para la diapositiva.' }); return; }
    setGuardando(true);
    setMsg(null);
    try {
      let imagen_url = form.imagen_url;
      if (archivo) {
        const up: any = await uploadAPI.uploadImage(archivo, 'joyeria/carrusel');
        if (!up?.success) throw new Error(up?.message || 'No se pudo subir la imagen.');
        imagen_url = up.data.url;
      }
      const datos = {
        titulo: form.titulo.trim(), etiqueta: form.etiqueta.trim(), descripcion: form.descripcion.trim(),
        imagen_url, enlace_url: form.enlace_url, enlace_nueva_ventana: form.enlace_nueva_ventana,
        orden: form.orden, activo: form.activo,
      };
      let id = form.id;
      if (id) await contenidosAPI.update(id, datos);
      else {
        const r: any = await contenidosAPI.create({ seccion_id: seccionId!, ...datos });
        id = (r?.data || r)?.id;
      }
      await cargar(id);
      setMsg({ tipo: 'ok', texto: 'Diapositiva guardada. Ya se ve en el inicio.' });
    } catch (err: any) {
      setMsg({ tipo: 'error', texto: err?.message || 'No se pudo guardar.' });
    } finally {
      setGuardando(false);
    }
  };

  const payload = (s: Slide, extra: Partial<Slide> = {}) => ({
    titulo: s.titulo, etiqueta: s.etiqueta, descripcion: s.descripcion, imagen_url: s.imagen_url,
    enlace_url: s.enlace_url, enlace_nueva_ventana: s.enlace_nueva_ventana, orden: s.orden, activo: s.activo, ...extra,
  });

  const alternarVisible = async (s: Slide) => {
    await contenidosAPI.update(s.id!, payload(s, { activo: !s.activo }));
    await cargar(s.id);
  };

  const mover = async (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= slides.length) return;
    const a = slides[i], b = slides[j];
    // Se renumera toda la lista para evitar órdenes repetidos
    const nuevaLista = [...slides];
    nuevaLista[i] = b; nuevaLista[j] = a;
    await Promise.all(nuevaLista.map((s, k) => s.orden !== k ? contenidosAPI.update(s.id!, payload(s, { orden: k })) : null));
    await cargar(a.id);
  };

  const eliminar = async (s: Slide) => {
    if (!window.confirm(`¿Eliminar la diapositiva "${s.titulo}"? No se puede deshacer.`)) return;
    await contenidosAPI.delete(s.id!);
    await cargar();
  };

  if (loading) return <Loader texto="Cargando carrusel..." />;

  const visibles = slides.filter(s => s.activo).length;
  const destinoActual = DESTINOS.find(d => d.ruta === form.enlace_url);

  return (
    <main className="apci-page">
      <header className="sx-head" style={{ marginBottom: '1.75rem' }}>
        <div className="sx-eyebrow">Contenido de inicio</div>
        <h1 className="sx-title">Carrusel <span>principal</span></h1>
        <p className="sx-subtitle">
          Las imágenes grandes con las que abre la página de inicio. Edita una diapositiva y verás
          el resultado aquí mismo antes de guardar.
        </p>
      </header>

      {/* ── Vista previa (misma composición que el carrusel público) ── */}
      <section className="apci-preview" aria-label="Vista previa de la diapositiva">
        {previewImg
          ? <img src={previewImg} alt="" className="apci-preview-img" />
          : <div className="apci-preview-vacia"><AiOutlinePicture size={42} /><span>Sin imagen</span></div>}
        <div className="apci-preview-velo" />
        <div className="apci-preview-texto">
          <span className="apci-preview-tag">{form.etiqueta || 'Exclusivo'}</span>
          <h2>{form.titulo || 'Título de la diapositiva'}</h2>
          <p>{form.descripcion || 'Una frase corta que invite a ver la colección.'}</p>
          <div className="apci-preview-btns">
            <span className="apci-preview-btn">Explorar colección</span>
            <span className="apci-preview-btn apci-preview-btn--ghost">Ver catálogo completo</span>
          </div>
        </div>
        {!form.activo && <span className="apci-preview-oculta">Oculta en el sitio</span>}
      </section>

      {/* ── Tira de diapositivas ── */}
      <section className="apci-tira">
        <div className="apci-tira-head">
          <span>{slides.length} diapositivas · {visibles} visibles</span>
          <button className="sx-btn sx-btn--ghost apci-btn-sm" onClick={nueva}><AiOutlinePlus size={14} /> Nueva</button>
        </div>
        <div className="apci-tira-lista">
          {slides.map((s, i) => (
            <div key={s.id} className={`apci-mini${sel === i ? ' activa' : ''}${!s.activo ? ' oculta' : ''}`}>
              <button className="apci-mini-img" onClick={() => elegir(i)} title={`Editar "${s.titulo}"`}>
                {s.imagen_url ? <img src={s.imagen_url} alt="" /> : <AiOutlinePicture size={22} />}
                <span className="apci-mini-num">{i + 1}</span>
              </button>
              <span className="apci-mini-titulo">{s.titulo}</span>
              <div className="apci-mini-acc">
                <button onClick={() => mover(i, -1)} disabled={i === 0} title="Mover a la izquierda" aria-label="Mover a la izquierda"><AiOutlineLeft size={13} /></button>
                <button onClick={() => alternarVisible(s)} title={s.activo ? 'Ocultar' : 'Mostrar'} aria-label={s.activo ? 'Ocultar' : 'Mostrar'}>
                  {s.activo ? <AiOutlineEye size={14} /> : <AiOutlineEyeInvisible size={14} />}
                </button>
                <button onClick={() => mover(i, 1)} disabled={i === slides.length - 1} title="Mover a la derecha" aria-label="Mover a la derecha"><AiOutlineRight size={13} /></button>
                <button onClick={() => eliminar(s)} className="apci-del" title="Eliminar" aria-label="Eliminar"><AiOutlineDelete size={14} /></button>
              </div>
            </div>
          ))}
          {sel === -1 && (
            <div className="apci-mini activa">
              <div className="apci-mini-img apci-mini-img--nueva"><AiOutlinePlus size={22} /></div>
              <span className="apci-mini-titulo">Nueva diapositiva</span>
            </div>
          )}
        </div>
      </section>

      {/* ── Formulario ── */}
      <section className="sx-card sx-card--static apci-form">
        <h2 className="apci-form-titulo">{sel === -1 ? 'Nueva diapositiva' : `Editando diapositiva ${sel + 1}`}</h2>

        <div className="apci-grid">
          <div
            className={`apci-drop${arrastrando ? ' arrastrando' : ''}`}
            onDragOver={e => { e.preventDefault(); setArrastrando(true); }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={e => { e.preventDefault(); setArrastrando(false); tomarArchivo(e.dataTransfer.files?.[0]); }}
            onClick={() => fileRef.current?.click()}
            role="button" tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter') fileRef.current?.click(); }}
          >
            {previewImg ? <img src={previewImg} alt="" /> : null}
            <div className="apci-drop-txt">
              <AiOutlineCloudUpload size={24} />
              <span>{previewImg ? 'Cambiar imagen' : 'Arrastra una imagen o haz clic'}</span>
              <small>Horizontal, idealmente 1920 × 1080</small>
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => tomarArchivo(e.target.files?.[0])} />
          </div>

          <div className="apci-campos">
            <label>Etiqueta
              <input value={form.etiqueta} maxLength={40} placeholder="Ej. Nueva colección" onChange={e => campo('etiqueta', e.target.value)} />
            </label>
            <label>Título *
              <input value={form.titulo} maxLength={80} placeholder="Ej. Colección de oro" onChange={e => campo('titulo', e.target.value)} />
            </label>
            <label>Descripción
              <textarea rows={2} maxLength={160} value={form.descripcion} placeholder="Una frase corta" onChange={e => campo('descripcion', e.target.value)} />
            </label>
            <div className="apci-destino">
              <span className="apci-label">El botón lleva a</span>
              <div className="apci-chips">
                {DESTINOS.map(d => (
                  <button key={d.ruta} type="button" className={`apci-chip${form.enlace_url === d.ruta ? ' activa' : ''}`} onClick={() => campo('enlace_url', d.ruta)}>
                    {d.label}
                  </button>
                ))}
                <button type="button" className={`apci-chip${!destinoActual ? ' activa' : ''}`}
                  onClick={() => { if (destinoActual) campo('enlace_url', ''); }}>Otro enlace</button>
              </div>
              {!destinoActual && (
                <input value={form.enlace_url} placeholder="/producto-publico/14 o https://…" onChange={e => campo('enlace_url', e.target.value)} />
              )}
            </div>
            <label className="apci-check">
              <input type="checkbox" checked={form.activo} onChange={e => campo('activo', e.target.checked)} />
              Mostrar esta diapositiva en el sitio
            </label>
          </div>
        </div>

        {msg && <div className={`apci-msg apci-msg--${msg.tipo}`}>{msg.texto}</div>}

        <div className="apci-acciones">
          {hayCambios && sel !== -1 && (
            <button className="sx-btn sx-btn--ghost" onClick={() => elegir(sel)} disabled={guardando}>Descartar</button>
          )}
          {sel === -1 && slides.length > 0 && (
            <button className="sx-btn sx-btn--ghost" onClick={() => elegir(0)} disabled={guardando}>Cancelar</button>
          )}
          <button className="sx-btn" onClick={guardar} disabled={guardando || !hayCambios}>
            {guardando ? (archivo ? 'Subiendo imagen…' : 'Guardando…') : sel === -1 ? 'Agregar diapositiva' : 'Guardar cambios'}
          </button>
        </div>
      </section>
    </main>
  );
};

export default AdminPageContentInitialScreen;
