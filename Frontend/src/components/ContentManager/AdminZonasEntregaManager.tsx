import React, { useState, useEffect, useRef } from 'react';
import { zonaEntregaAPI } from '../../services/api';
import './AdminFAQManager.css';

interface ZonaEntrega {
  id: number;
  nombre: string;
  activo: boolean;
}

const AdminZonasEntregaManager: React.FC = () => {
  const [zonas, setZonas]     = useState<ZonaEntrega[]>([]);
  const [loading, setLoading] = useState(true);
  const [nuevaZona, setNuevaZona] = useState('');
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState<{ msg: string; tipo: 'ok' | 'err' } | null>(null);
  const toastTimer            = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    setLoading(true);
    try {
      const res = await zonaEntregaAPI.getAll(true);
      const arr = Array.isArray(res) ? res : (Array.isArray((res as any)?.data) ? (res as any).data : []);
      setZonas(arr);
    } catch { mostrarToast('Error al cargar zonas de entrega', 'err'); }
    finally { setLoading(false); }
  };

  const mostrarToast = (msg: string, tipo: 'ok' | 'err') => {
    clearTimeout(toastTimer.current);
    setToast({ msg, tipo });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  const handleAgregar = async () => {
    const nombre = nuevaZona.trim();
    if (!nombre) return;
    setSaving(true);
    try {
      await zonaEntregaAPI.crear(nombre);
      mostrarToast('Zona de entrega agregada', 'ok');
      setNuevaZona('');
      cargar();
    } catch (e: any) {
      mostrarToast(e?.response?.data?.message || 'Error al agregar la zona', 'err');
    } finally { setSaving(false); }
  };

  const handleEliminar = async (id: number, nombre: string) => {
    if (!window.confirm(`¿Quitar "${nombre}" de las zonas de entrega?`)) return;
    try {
      await zonaEntregaAPI.eliminar(id);
      mostrarToast('Zona de entrega eliminada', 'ok');
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
          <h1 className="faq-admin-title">Zonas de Entrega</h1>
          <p className="faq-admin-subtitle">Lugares a donde el negocio entrega — visibles en el pie de página del sitio</p>
        </div>
      </div>

      <div className="faq-admin-stats">
        <div className="faq-stat"><strong>{zonas.length}</strong><span>Total</span></div>
      </div>

      <div className="faq-field faq-field--inline" style={{ marginBottom: '1.5rem' }}>
        <input
          type="text"
          value={nuevaZona}
          onChange={e => setNuevaZona(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAgregar(); } }}
          placeholder="Ej: Huejutla"
          style={{ flex: 1 }}
        />
        <button className="faq-btn-nueva" onClick={handleAgregar} disabled={saving || !nuevaZona.trim()}>
          + Agregar zona
        </button>
      </div>

      {loading ? (
        <div className="faq-admin-loading">Cargando zonas de entrega...</div>
      ) : zonas.length === 0 ? (
        <div className="faq-admin-empty">
          <p>No hay zonas de entrega registradas aún.</p>
        </div>
      ) : (
        <div className="faq-admin-list">
          {zonas.map((z, i) => (
            <div key={z.id} className="faq-admin-card">
              <div className="faq-admin-num">{i + 1}</div>
              <div className="faq-admin-body">
                <h3 className="faq-admin-pregunta">{z.nombre}</h3>
              </div>
              <div className="faq-admin-actions">
                <button className="faq-btn-action faq-btn-delete" onClick={() => handleEliminar(z.id, z.nombre)}>Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminZonasEntregaManager;
