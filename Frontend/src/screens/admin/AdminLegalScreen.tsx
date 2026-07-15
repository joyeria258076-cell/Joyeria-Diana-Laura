import React, { useState, useEffect } from 'react';
import { contentAPI } from '../../services/api';
import './AdminLegalScreen.css';

type Doc = 'terminos' | 'privacidad';

interface DocState { titulo: string; contenido: string; fecha: string; }

const LABELS: Record<Doc, { emoji: string; name: string }> = {
  terminos:   { emoji: '📋', name: 'Términos y Condiciones' },
  privacidad: { emoji: '🔒', name: 'Aviso de Privacidad' },
};

export default function AdminLegalScreen() {
  const [tab, setTab]           = useState<Doc>('terminos');
  const [docs, setDocs]         = useState<Record<Doc, DocState>>({
    terminos:   { titulo: '', contenido: '', fecha: '' },
    privacidad: { titulo: '', contenido: '', fecha: '' },
  });
  const [loading, setLoading]   = useState<Record<Doc, boolean>>({ terminos: true, privacidad: true });
  const [saving, setSaving]     = useState(false);
  const [preview, setPreview]   = useState(false);
  const [toast, setToast]       = useState<{ msg: string; ok: boolean } | null>(null);

  const fire = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const cargar = async (doc: Doc) => {
    try {
      const res = await contentAPI.getPageConfig(doc);
      if (res && res.contenido) {
        setDocs(prev => ({ ...prev, [doc]: { titulo: res.titulo || '', contenido: res.contenido, fecha: res.fecha || '' } }));
      }
    } catch { /**/ }
    finally { setLoading(prev => ({ ...prev, [doc]: false })); }
  };

  useEffect(() => { cargar('terminos'); cargar('privacidad'); }, []);

  const handleGuardar = async () => {
    const doc = docs[tab];
    if (!doc.titulo.trim() || !doc.contenido.trim()) { fire('Completa el título y el contenido', false); return; }
    setSaving(true);
    try {
      await contentAPI.updatePageConfig(tab, { titulo: doc.titulo, contenido: doc.contenido, imagen: '', fecha: new Date().toISOString() });
      fire(`${LABELS[tab].name} actualizado correctamente`, true);
      cargar(tab);
    } catch { fire('Error al guardar el documento', false); }
    finally { setSaving(false); }
  };

  const current = docs[tab];

  const renderPreview = (texto: string) => {
    return texto.split('\n').map((linea, i) => {
      const l = linea.trim();
      if (!l) return <br key={i} />;
      if (l.match(/^\d+\./)) return <h4 key={i} className="alegal-preview-h">{l}</h4>;
      if (l.startsWith('•') || l.startsWith('-')) return <li key={i} className="alegal-preview-li">{l.replace(/^[•\-]\s*/, '')}</li>;
      return <p key={i} className="alegal-preview-p">{l}</p>;
    });
  };

  return (
    <div className="alegal-wrap animate-in">

      {/* ── HEADER ── */}
      <div className="alegal-header">
        <div>
          <p className="alegal-eyebrow">Gestión de contenido legal</p>
          <h1 className="alegal-title">Documentos <span>Legales</span></h1>
          <p className="alegal-sub">Edita los términos y condiciones y el aviso de privacidad que se muestran en la página pública.</p>
        </div>
        <div className="alegal-header-actions">
          {toast && (
            <div className={`alegal-toast ${toast.ok ? 'alegal-toast--ok' : 'alegal-toast--err'}`}>
              {toast.ok ? '✓' : '✕'} {toast.msg}
            </div>
          )}
          <button className="alegal-btn-preview" onClick={() => setPreview(p => !p)}>
            {preview ? '✏️ Editar' : '👁 Vista previa'}
          </button>
          <button className="alegal-btn-save" onClick={handleGuardar} disabled={saving}>
            {saving ? 'Guardando…' : '💾 Guardar cambios'}
          </button>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="alegal-tabs">
        {(['terminos', 'privacidad'] as Doc[]).map(d => (
          <button
            key={d}
            className={`alegal-tab ${tab === d ? 'active' : ''}`}
            onClick={() => { setTab(d); setPreview(false); }}
          >
            <span>{LABELS[d].emoji}</span>
            {LABELS[d].name}
            <span className="alegal-tab-fecha">
              {docs[d].fecha ? new Date(docs[d].fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Sin fecha'}
            </span>
          </button>
        ))}
      </div>

      {/* ── EDITOR ── */}
      <div className="alegal-card">
        {loading[tab] ? (
          <div className="alegal-loading"><div className="alegal-spinner" /><p>Cargando documento…</p></div>
        ) : preview ? (
          <div className="alegal-preview">
            <h2 className="alegal-preview-title">{current.titulo}</h2>
            <div className="alegal-preview-body">{renderPreview(current.contenido)}</div>
          </div>
        ) : (
          <>
            <div className="alegal-field">
              <label className="alegal-label">Título del documento</label>
              <input
                className="alegal-input"
                type="text"
                value={current.titulo}
                onChange={e => setDocs(prev => ({ ...prev, [tab]: { ...prev[tab], titulo: e.target.value } }))}
                placeholder={LABELS[tab].name}
              />
            </div>
            <div className="alegal-field">
              <div className="alegal-label-row">
                <label className="alegal-label">Contenido</label>
                <span className="alegal-hint">{current.contenido.length} caracteres</span>
              </div>
              <textarea
                className="alegal-textarea"
                value={current.contenido}
                onChange={e => setDocs(prev => ({ ...prev, [tab]: { ...prev[tab], contenido: e.target.value } }))}
                placeholder="Escribe aquí el contenido completo del documento..."
                rows={30}
              />
              <div className="alegal-formato-tips">
                <span className="alegal-tip">💡 Formato:</span>
                <span className="alegal-tip-item">Línea con número (ej: <code>1. Título</code>) → sección</span>
                <span className="alegal-tip-item">Línea con • → lista</span>
                <span className="alegal-tip-item">Línea normal → párrafo</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── INFO ── */}
      <div className="alegal-info-row">
        <div className="alegal-info-card">
          <span className="alegal-info-icon">🌐</span>
          <div>
            <p className="alegal-info-title">Página pública</p>
            <p className="alegal-info-sub">Los cambios se reflejan inmediatamente en <code>/legal/{tab}</code></p>
          </div>
        </div>
        <div className="alegal-info-card">
          <span className="alegal-info-icon">📅</span>
          <div>
            <p className="alegal-info-title">Última actualización</p>
            <p className="alegal-info-sub">
              {current.fecha ? new Date(current.fecha).toLocaleString('es-MX') : 'Nunca guardado desde el sistema'}
            </p>
          </div>
        </div>
        <div className="alegal-info-card">
          <span className="alegal-info-icon">⚖️</span>
          <div>
            <p className="alegal-info-title">Marco legal</p>
            <p className="alegal-info-sub">Cumplimiento con LFPC y LFPDPPP — México</p>
          </div>
        </div>
      </div>
    </div>
  );
}
