import React, { useState, useEffect, useRef } from 'react';
import { contentAPI } from '../../services/api';
import './AdminFAQManager.css';

interface FAQ {
  id: number;
  pregunta: string;
  respuesta: string;
  orden: number;
  activa: boolean;
}

const EMPTY_FORM = { pregunta: '', respuesta: '', orden: 0 };

const AdminFAQManager: React.FC = () => {
  const [faqs, setFaqs]           = useState<FAQ[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [toast, setToast]         = useState<{ msg: string; tipo: 'ok' | 'err' } | null>(null);
  const toastTimer                = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    setLoading(true);
    try {
      const res = await contentAPI.getFaqs();
      const arr = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      setFaqs(arr);
    } catch { mostrarToast('Error al cargar FAQs', 'err'); }
    finally { setLoading(false); }
  };

  const mostrarToast = (msg: string, tipo: 'ok' | 'err') => {
    clearTimeout(toastTimer.current);
    setToast({ msg, tipo });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  const abrirCrear = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, orden: faqs.length });
    setShowModal(true);
  };

  const abrirEditar = (f: FAQ) => {
    setEditingId(f.id);
    setForm({ pregunta: f.pregunta, respuesta: f.respuesta, orden: f.orden });
    setShowModal(true);
  };

  const cerrarModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: name === 'orden' ? Number(value) : value }));
  };

  const handleGuardar = async () => {
    if (!form.pregunta.trim()) { mostrarToast('La pregunta es obligatoria', 'err'); return; }
    if (!form.respuesta.trim()) { mostrarToast('La respuesta es obligatoria', 'err'); return; }
    setSaving(true);
    try {
      if (editingId !== null) {
        await contentAPI.updateFaq(editingId, form);
        mostrarToast('FAQ actualizada', 'ok');
      } else {
        await contentAPI.createFaq(form);
        mostrarToast('FAQ creada', 'ok');
      }
      cerrarModal();
      cargar();
    } catch { mostrarToast('Error al guardar', 'err'); }
    finally { setSaving(false); }
  };

  const handleToggle = async (f: FAQ) => {
    try {
      await contentAPI.toggleFaqStatus(f.id, !f.activa);
      mostrarToast(f.activa ? 'FAQ ocultada' : 'FAQ publicada', 'ok');
      cargar();
    } catch { mostrarToast('Error al cambiar estado', 'err'); }
  };

  const handleEliminar = async (id: number) => {
    if (!window.confirm('¿Eliminar esta pregunta permanentemente?')) return;
    try {
      await contentAPI.deleteFaq(id);
      mostrarToast('FAQ eliminada', 'ok');
      cargar();
    } catch { mostrarToast('Error al eliminar', 'err'); }
  };

  return (
    <div className="faq-admin-container">

      {toast && (
        <div className={`faq-toast faq-toast--${toast.tipo}`}>{toast.msg}</div>
      )}

      <div className="faq-admin-header">
        <div>
          <h1 className="faq-admin-title">Preguntas Frecuentes</h1>
          <p className="faq-admin-subtitle">Gestiona las FAQs que aparecen en la sección de Ayuda del sitio</p>
        </div>
        <button className="faq-btn-nueva" onClick={abrirCrear}>+ Nueva pregunta</button>
      </div>

      <div className="faq-admin-stats">
        <div className="faq-stat"><strong>{faqs.length}</strong><span>Total</span></div>
        <div className="faq-stat"><strong>{faqs.filter(f => f.activa).length}</strong><span>Visibles</span></div>
        <div className="faq-stat"><strong>{faqs.filter(f => !f.activa).length}</strong><span>Ocultas</span></div>
      </div>

      {loading ? (
        <div className="faq-admin-loading">Cargando preguntas frecuentes...</div>
      ) : faqs.length === 0 ? (
        <div className="faq-admin-empty">
          <p>No hay preguntas frecuentes aún.</p>
          <button className="faq-btn-nueva" onClick={abrirCrear}>Crear primera pregunta</button>
        </div>
      ) : (
        <div className="faq-admin-list">
          {faqs.map((f, i) => (
            <div key={f.id} className={`faq-admin-card${f.activa ? '' : ' faq-admin-card--oculta'}`}>
              <div className="faq-admin-num">{i + 1}</div>
              <div className="faq-admin-body">
                <div className="faq-admin-meta">
                  <span className={`faq-badge${f.activa ? ' faq-badge--activa' : ' faq-badge--oculta'}`}>
                    {f.activa ? 'Visible' : 'Oculta'}
                  </span>
                  <span className="faq-orden">Orden: {f.orden}</span>
                </div>
                <h3 className="faq-admin-pregunta">{f.pregunta}</h3>
                <p className="faq-admin-respuesta">
                  {f.respuesta.length > 200 ? f.respuesta.slice(0, 200) + '...' : f.respuesta}
                </p>
              </div>
              <div className="faq-admin-actions">
                <button className="faq-btn-action faq-btn-edit" onClick={() => abrirEditar(f)}>Editar</button>
                <button
                  className={`faq-btn-action ${f.activa ? 'faq-btn-hide' : 'faq-btn-show'}`}
                  onClick={() => handleToggle(f)}
                >
                  {f.activa ? 'Ocultar' : 'Publicar'}
                </button>
                <button className="faq-btn-action faq-btn-delete" onClick={() => handleEliminar(f.id)}>Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="faq-overlay" onClick={cerrarModal}>
          <div className="faq-modal" onClick={e => e.stopPropagation()}>
            <div className="faq-modal-header">
              <h2>{editingId !== null ? 'Editar pregunta' : 'Nueva pregunta'}</h2>
              <button className="faq-modal-close" onClick={cerrarModal}>✕</button>
            </div>
            <div className="faq-modal-body">
              <div className="faq-field">
                <label>Pregunta *</label>
                <input
                  type="text"
                  name="pregunta"
                  value={form.pregunta}
                  onChange={handleChange}
                  placeholder="Ej: ¿Cuál es el tiempo de entrega?"
                />
              </div>
              <div className="faq-field">
                <label>Respuesta *</label>
                <textarea
                  name="respuesta"
                  value={form.respuesta}
                  onChange={handleChange}
                  rows={5}
                  placeholder="Escribe la respuesta completa..."
                />
              </div>
              <div className="faq-field faq-field--inline">
                <label>Orden</label>
                <input
                  type="number"
                  name="orden"
                  value={form.orden}
                  onChange={handleChange}
                  min={0}
                  style={{ width: '80px' }}
                />
                <span className="faq-field-hint">Número más bajo = aparece primero</span>
              </div>
            </div>
            <div className="faq-modal-footer">
              <button className="faq-btn-cancel" onClick={cerrarModal} disabled={saving}>Cancelar</button>
              <button className="faq-btn-save" onClick={handleGuardar} disabled={saving}>
                {saving ? 'Guardando...' : editingId !== null ? 'Guardar cambios' : 'Crear pregunta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFAQManager;
