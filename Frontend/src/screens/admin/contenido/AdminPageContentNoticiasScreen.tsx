import React, { useState, useEffect, useRef, useCallback } from 'react';
import { contentAPI } from '../../../services/api';

const API_BASE = import.meta.env.VITE_API_URL || 'https://joyeria-diana-laura-nqnq.onrender.com/api';
import './AdminPageContentNoticiasScreen.css';

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

      console.log('🔑 [Upload] jwtToken:', jwtToken ? jwtToken.substring(0, 30) + '...' : 'NULL');
      console.log('🔑 [Upload] sessionToken:', sessionToken ? sessionToken.substring(0, 30) + '...' : 'NULL');
      console.log('🔑 [Upload] todas las keys de localStorage:', Object.keys(localStorage));

      const headers: Record<string, string> = {};
      if (jwtToken)     headers['Authorization']   = `Bearer ${jwtToken}`;
      if (sessionToken) headers['x-session-token'] = sessionToken;
      console.log('📤 [Upload] headers enviados:', headers);

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
    <div className="an-container">

      {/* Toast */}
      {toast && (
        <div className={`an-toast an-toast--${toast.tipo}`}>{toast.msg}</div>
      )}

      {/* Header */}
      <div className="an-header">
        <div>
          <h1 className="an-title">Novedades</h1>
          <p className="an-subtitle">Publica artículos que aparecen en la sección de novedades del sitio</p>
        </div>
        <button className="an-btn-nueva" onClick={abrirCrear}>
          + Nueva novedad
        </button>
      </div>

      {/* Stats rápidas */}
      <div className="an-stats">
        <div className="an-stat">
          <strong>{noticias.length}</strong>
          <span>Total</span>
        </div>
        <div className="an-stat">
          <strong>{noticias.filter(n => n.activa).length}</strong>
          <span>Publicadas</span>
        </div>
        <div className="an-stat">
          <strong>{noticias.filter(n => !n.activa).length}</strong>
          <span>Ocultas</span>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="an-loading">Cargando novedades...</div>
      ) : noticias.length === 0 ? (
        <div className="an-empty">
          <p>No hay novedades publicadas aún.</p>
          <button className="an-btn-nueva" onClick={abrirCrear}>Crear primera novedad</button>
        </div>
      ) : (
        <div className="an-list">
          {noticias.map(n => (
            <div key={n.id} className={`an-card${n.activa ? '' : ' an-card--oculta'}`}>
              {n.imagen && (
                <div className="an-card-img">
                  <img src={n.imagen} alt={n.titulo}
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>
              )}
              <div className="an-card-body">
                <div className="an-card-meta">
                  <span className="an-card-fecha">{formatFecha(n.fecha)}</span>
                  <span className={`an-badge${n.activa ? ' an-badge--activa' : ' an-badge--oculta'}`}>
                    {n.activa ? 'Publicada' : 'Oculta'}
                  </span>
                </div>
                <h3 className="an-card-titulo">{n.titulo}</h3>
                <p className="an-card-contenido">
                  {n.contenido.length > 160 ? n.contenido.slice(0, 160) + '...' : n.contenido}
                </p>
              </div>
              <div className="an-card-actions">
                <button className="an-btn-action an-btn-edit" onClick={() => abrirEditar(n)}>
                  Editar
                </button>
                <button
                  className={`an-btn-action ${n.activa ? 'an-btn-hide' : 'an-btn-show'}`}
                  onClick={() => handleToggle(n)}
                >
                  {n.activa ? 'Ocultar' : 'Publicar'}
                </button>
                <button className="an-btn-action an-btn-delete" onClick={() => handleEliminar(n.id)}>
                  Eliminar
                </button>
              </div>
            </div>
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
