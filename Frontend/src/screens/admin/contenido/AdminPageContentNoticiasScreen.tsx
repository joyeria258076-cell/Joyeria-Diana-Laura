import React, { useState, useEffect, useRef, useCallback } from 'react';
import { contentAPI } from '../../../services/api';

const API_BASE = import.meta.env.VITE_API_URL || 'https://joyeria-diana-laura-nqnq.onrender.com/api';
import '../../../styles/SitioSecciones.css';
import './AdminPageContentNoticiasScreen.css';
import AdminHero from '../../../components/AdminHero';
import { AiOutlineRead, AiOutlinePlus, AiOutlineEdit, AiOutlineDelete, AiOutlineEye, AiOutlineEyeInvisible, AiOutlineCheckCircle, AiOutlineCalendar, AiOutlinePicture } from 'react-icons/ai';

interface Noticia {
  id: number;
  titulo: string;
  contenido: string;
  imagen?: string;
  fecha: string;
  activa: boolean;
}

const EMPTY_FORM = { titulo: '', contenido: '', imagen: '' };

const AdminPageContentNoticiasScreen: React.FC = () => {
  const [noticias, setNoticias]       = useState<Noticia[]>([]);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [showModal, setShowModal]     = useState(false);
  const [editingId, setEditingId]     = useState<number | null>(null);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [previewImg, setPreviewImg]   = useState('');
  const [uploading, setUploading]     = useState(false);
  const [dragging, setDragging]       = useState(false);
  const [toast, setToast]             = useState<{ msg: string; tipo: 'ok' | 'err' } | null>(null);
  const toastTimer                    = useRef<ReturnType<typeof setTimeout>>();
  const dropRef                       = useRef<HTMLDivElement>(null);
  const [filtro, setFiltro]           = useState<'todas' | 'publicadas' | 'ocultas'>('todas');

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    setLoading(true);
    try {
      const res = await contentAPI.getNoticias();
      const arr = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      setNoticias(arr.sort((a: Noticia, b: Noticia) =>
        new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      ));
    } catch { mostrarToast('Error al cargar novedades', 'err'); }
    finally { setLoading(false); }
  };

  const mostrarToast = (msg: string, tipo: 'ok' | 'err') => {
    clearTimeout(toastTimer.current);
    setToast({ msg, tipo });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  const abrirCrear = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setPreviewImg('');
    setShowModal(true);
  };

  const abrirEditar = (n: Noticia) => {
    setEditingId(n.id);
    setForm({ titulo: n.titulo, contenido: n.contenido, imagen: n.imagen || '' });
    setPreviewImg(n.imagen || '');
    setShowModal(true);
  };

  const cerrarModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setPreviewImg('');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (name === 'imagen') setPreviewImg(value);
  };

  const subirArchivoCloudinary = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) { mostrarToast('Solo se permiten imágenes', 'err'); return; }
    setUploading(true);
    try {
      let jwtToken: string | null = null;
      let sessionToken: string | null = localStorage.getItem('diana_laura_session_token');
      try {
        const u = localStorage.getItem('diana_laura_user');
        if (u) jwtToken = JSON.parse(u).token || null;
      } catch { /**/ }


      const headers: Record<string, string> = {};
      if (jwtToken)     headers['Authorization']   = `Bearer ${jwtToken}`;
      if (sessionToken) headers['x-session-token'] = sessionToken;

      const fd = new FormData();
      fd.append('imagen', file);
      fd.append('folder', 'joyeria/noticias');
      const res = await fetch(`${API_BASE}/upload/image`, {
        method: 'POST',
        headers,
        body: fd,
      });
      const data = await res.json();
      if (data.success && data.data?.url) {
        setForm(prev => ({ ...prev, imagen: data.data.url }));
        setPreviewImg(data.data.url);
        mostrarToast('Imagen subida a Cloudinary', 'ok');
      } else {
        mostrarToast(data.message || 'Error al subir imagen', 'err');
      }
    } catch { mostrarToast('Error de conexión al subir imagen', 'err'); }
    finally { setUploading(false); }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) subirArchivoCloudinary(file);
  }, [subirArchivoCloudinary]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) subirArchivoCloudinary(file);
  };

  const handleGuardar = async () => {
    if (!form.titulo.trim()) { mostrarToast('El título es obligatorio', 'err'); return; }
    if (!form.contenido.trim()) { mostrarToast('El contenido es obligatorio', 'err'); return; }
    setSaving(true);
    try {
      if (editingId) {
        // No hay endpoint PUT en el backend, usamos toggle + workaround:
        // Como el backend solo tiene toggle de status y delete, re-creamos si editamos
        await contentAPI.deleteNoticia(String(editingId));
        await contentAPI.createNoticia({ ...form, activa: true });
        mostrarToast('Novedad actualizada', 'ok');
      } else {
        await contentAPI.createNoticia({ ...form, activa: true });
        mostrarToast('Novedad publicada', 'ok');
      }
      cerrarModal();
      cargar();
    } catch { mostrarToast('Error al guardar', 'err'); }
    finally { setSaving(false); }
  };

  const handleToggle = async (n: Noticia) => {
    try {
      await contentAPI.toggleNoticiaStatus(String(n.id), !n.activa);
      mostrarToast(n.activa ? 'Novedad ocultada' : 'Novedad publicada', 'ok');
      cargar();
    } catch { mostrarToast('Error al cambiar estado', 'err'); }
  };

  const handleEliminar = async (id: number) => {
    if (!window.confirm('¿Eliminar esta novedad permanentemente?')) return;
    try {
      await contentAPI.deleteNoticia(String(id));
      mostrarToast('Novedad eliminada', 'ok');
      cargar();
    } catch { mostrarToast('Error al eliminar', 'err'); }
  };

  const formatFecha = (f: string) => {
    try { return new Date(f).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }); }
    catch { return f; }
  };

  return (
    <div className="av-page an-container">

      {toast && (
        <div className={`an-toast an-toast--${toast.tipo}`}>{toast.msg}</div>
      )}

      <AdminHero icono={<AiOutlineRead size={26} />} seccion="Contenido" titulo="Blog y" resaltado="novedades"
        descripcion="Publica artículos para el blog y la sección de novedades del inicio. Los clientes pueden comentarlos.">
        <button className="av-btn" onClick={abrirCrear}><AiOutlinePlus size={17} /> Nuevo artículo</button>
      </AdminHero>

      <div className="av-kpis">
        {([
          { id: 'todas', n: noticias.length, label: 'Artículos', icono: <AiOutlineRead size={20} />, tono: '' },
          { id: 'publicadas', n: noticias.filter(n => n.activa).length, label: 'Publicados', icono: <AiOutlineCheckCircle size={20} />, tono: 'ok' },
          { id: 'ocultas', n: noticias.filter(n => !n.activa).length, label: 'Ocultos', icono: <AiOutlineEyeInvisible size={20} />, tono: 'apagado' },
        ] as const).map(k => (
          <button key={k.id} className={`av-kpi ${k.tono ? `av-tono--${k.tono}` : ''} ${filtro === k.id && k.id !== 'todas' ? 'activo' : ''}`} onClick={() => setFiltro(filtro === k.id ? 'todas' : k.id)}>
            <span className="av-kpi-icono">{k.icono}</span>
            <span><strong>{k.n}</strong><small>{k.label}</small></span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="av-vacio">Cargando novedades...</div>
      ) : noticias.length === 0 ? (
        <div className="av-vacio">
          <AiOutlineRead size={40} />
          <strong>Aún no hay artículos</strong>
          <span>Cuenta novedades: piezas nuevas, promociones, cuidados de joyería o eventos de la tienda.</span>
          <button className="av-btn" onClick={abrirCrear}><AiOutlinePlus size={17} /> Escribir el primero</button>
        </div>
      ) : (
        <div className="bl3-grid">
          {noticias.filter(n => filtro === 'todas' || (filtro === 'publicadas' ? n.activa : !n.activa)).map(n => (
            <article key={n.id} className={`bl3-card${n.activa ? '' : ' oculta'}`}>
              <div className="bl3-img">
                {n.imagen
                  ? <img src={n.imagen} alt="" loading="lazy" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  : <span className="bl3-sinimg"><AiOutlinePicture size={30} /></span>}
                <span className={`av-pill av-pill--punto ${n.activa ? 'av-tono--ok' : 'av-tono--apagado'} bl3-estado`}>{n.activa ? 'Publicado' : 'Oculto'}</span>
              </div>
              <div className="bl3-cuerpo">
                <span className="bl3-fecha"><AiOutlineCalendar size={13} /> {formatFecha(n.fecha)}</span>
                <h3>{n.titulo}</h3>
                <p>{n.contenido.length > 140 ? n.contenido.slice(0, 140) + '…' : n.contenido}</p>
                <div className="bl3-acciones">
                  <button className="inv3-editar" onClick={() => abrirEditar(n)}><AiOutlineEdit size={16} /> Editar</button>
                  <button className="av-accion" onClick={() => handleToggle(n)} title={n.activa ? 'Ocultar' : 'Publicar'}>
                    {n.activa ? <AiOutlineEyeInvisible size={16} /> : <AiOutlineEye size={16} />}
                  </button>
                  <button className="av-accion av-accion--peligro" onClick={() => handleEliminar(n.id)} title="Eliminar"><AiOutlineDelete size={16} /></button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="an-overlay" onClick={cerrarModal}>
          <div className="an-modal" onClick={e => e.stopPropagation()}>
            <div className="an-modal-header">
              <h2>{editingId ? 'Editar novedad' : 'Nueva novedad'}</h2>
              <button className="an-modal-close" onClick={cerrarModal}>✕</button>
            </div>

            <div className="an-modal-body">
              <div className="an-field">
                <label>Título *</label>
                <input
                  type="text"
                  name="titulo"
                  value={form.titulo}
                  onChange={handleChange}
                  placeholder="Ej: Nueva colección de anillos primavera 2025"
                />
              </div>

              <div className="an-field">
                <label>Contenido *</label>
                <textarea
                  name="contenido"
                  value={form.contenido}
                  onChange={handleChange}
                  rows={5}
                  placeholder="Describe la novedad, nuevos diseños, eventos, cuidados de joyería..."
                />
              </div>

              <div className="an-field">
                <label>Imagen</label>
                {/* Zona drag & drop */}
                <div
                  ref={dropRef}
                  className={`an-dropzone${dragging ? ' an-dropzone--over' : ''}${uploading ? ' an-dropzone--loading' : ''}`}
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('an-file-input')?.click()}
                >
                  {uploading ? (
                    <span className="an-dz-text">Subiendo a Cloudinary...</span>
                  ) : previewImg ? (
                    <img src={previewImg} alt="preview" className="an-dz-preview"
                      onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
                  ) : (
                    <>
                      <span className="an-dz-icon">☁</span>
                      <span className="an-dz-text">Arrastra tu imagen aquí</span>
                      <span className="an-dz-sub">o haz clic para seleccionar · se sube a Cloudinary/noticias</span>
                    </>
                  )}
                </div>
                <input id="an-file-input" type="file" accept="image/*"
                  style={{ display: 'none' }} onChange={handleFileInput} />
                {/* O pega URL manual */}
                <input
                  type="url"
                  name="imagen"
                  value={form.imagen}
                  onChange={handleChange}
                  placeholder="O pega una URL de imagen directamente"
                  className="an-url-input"
                />
              </div>
            </div>

            <div className="an-modal-footer">
              <button className="an-btn-cancel" onClick={cerrarModal} disabled={saving}>
                Cancelar
              </button>
              <button className="an-btn-save" onClick={handleGuardar} disabled={saving}>
                {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Publicar novedad'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPageContentNoticiasScreen;
