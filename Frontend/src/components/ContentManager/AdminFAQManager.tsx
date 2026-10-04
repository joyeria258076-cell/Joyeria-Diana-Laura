import React, { useState, useEffect, useRef } from 'react';
import { contentAPI } from '../../services/api';
import AdminHero from '../AdminHero';
import { AiOutlineQuestionCircle, AiOutlinePlus, AiOutlineSearch, AiOutlineEdit, AiOutlineDelete, AiOutlineEye, AiOutlineEyeInvisible, AiOutlineDown, AiOutlineCheckCircle } from 'react-icons/ai';
import '../../styles/SitioSecciones.css';
import './AdminFAQManager.css';
import Loader from '../Loader';

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
  const [busqueda, setBusqueda]   = useState('');
  const [abierta, setAbierta]     = useState<number | null>(null);

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
    <div className="av-page faq-admin-container">

      {toast && (
        <div className={`faq-toast faq-toast--${toast.tipo}`}>{toast.msg}</div>
      )}

      <AdminHero icono={<AiOutlineQuestionCircle size={26} />} seccion="Contenido" titulo="Preguntas" resaltado="frecuentes"
        descripcion="Se muestran en el Centro de ayuda y el asistente las usa para responder a los clientes.">
        <button className="av-btn" onClick={abrirCrear}><AiOutlinePlus size={17} /> Nueva pregunta</button>
      </AdminHero>

      <div className="av-kpis">
        <div className="av-kpi"><span className="av-kpi-icono"><AiOutlineQuestionCircle size={20} /></span><span><strong>{faqs.length}</strong><small>Preguntas</small></span></div>
        <div className="av-kpi av-tono--ok"><span className="av-kpi-icono"><AiOutlineCheckCircle size={20} /></span><span><strong>{faqs.filter(f => f.activa).length}</strong><small>Visibles para clientes</small></span></div>
        <div className="av-kpi av-tono--apagado"><span className="av-kpi-icono"><AiOutlineEyeInvisible size={20} /></span><span><strong>{faqs.filter(f => !f.activa).length}</strong><small>Ocultas</small></span></div>
      </div>

      {faqs.length > 3 && (
        <div className="av-barra">
          <label className="av-buscar"><AiOutlineSearch size={18} />
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar en preguntas y respuestas" />
          </label>
        </div>
      )}

      {loading ? (
        <Loader texto="Cargando preguntas frecuentes..." />
      ) : faqs.length === 0 ? (
        <div className="av-vacio">
          <AiOutlineQuestionCircle size={40} />
          <strong>Aún no hay preguntas</strong>
          <span>Agrega las dudas que más te hacen tus clientas: envíos, tallas, pagos, garantías.</span>
          <button className="av-btn" onClick={abrirCrear}><AiOutlinePlus size={17} /> Crear la primera</button>
        </div>
      ) : (
        <div className="fq3-lista">
          {faqs.filter(f => !busqueda.trim() || `${f.pregunta} ${f.respuesta}`.toLowerCase().includes(busqueda.trim().toLowerCase())).map((f, i) => (
            <article key={f.id} className={`fq3-item${f.activa ? '' : ' oculta'}${abierta === f.id ? ' abierta' : ''}`}>
              <button className="fq3-cabeza" onClick={() => setAbierta(abierta === f.id ? null : f.id)} aria-expanded={abierta === f.id}>
                <span className="fq3-num">{i + 1}</span>
                <span className="fq3-pregunta">{f.pregunta}</span>
                <span className={`av-pill av-pill--punto ${f.activa ? 'av-tono--ok' : 'av-tono--apagado'}`}>{f.activa ? 'Visible' : 'Oculta'}</span>
                <AiOutlineDown size={16} className="fq3-flecha" />
              </button>
              {abierta === f.id && (
                <div className="fq3-cuerpo">
                  <p>{f.respuesta}</p>
                  <div className="fq3-acciones">
                    <small>Posición {f.orden}</small>
                    <button className="av-btn av-btn--sec" onClick={() => handleToggle(f)}>
                      {f.activa ? <><AiOutlineEyeInvisible size={16} /> Ocultar</> : <><AiOutlineEye size={16} /> Publicar</>}
                    </button>
                    <button className="av-btn av-btn--sec" onClick={() => abrirEditar(f)}><AiOutlineEdit size={16} /> Editar</button>
                    <button className="av-accion av-accion--peligro" onClick={() => handleEliminar(f.id)} title="Eliminar"><AiOutlineDelete size={16} /></button>
                  </div>
                </div>
              )}
            </article>
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
