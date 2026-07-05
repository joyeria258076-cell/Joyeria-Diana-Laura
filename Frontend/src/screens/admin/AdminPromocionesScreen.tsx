import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { promocionesAPI } from '../../services/api';
import './AdminPromocionesScreen.css';

interface Promocion {
  id: number;
  nombre: string;
  tipo: 'porcentaje' | 'monto_fijo' | 'cupon' | '2x1' | 'envio_gratis';
  valor_descuento: number | null;
  fecha_inicio: string;
  fecha_fin: string;
  activo: boolean;
  codigo_cupon: string | null;
  aplica_productos: number[] | null;
  aplica_categorias: number[] | null;
  monto_minimo_compra: number | null;
  limite_usos_total: number | null;
  usos_actuales: number;
  creado_por_nombre?: string;
}

const TIPOS: { value: string; label: string }[] = [
  { value: 'porcentaje', label: 'Porcentaje (%)' },
  { value: 'monto_fijo', label: 'Monto fijo ($)' },
  { value: 'cupon', label: 'Cupón de descuento' },
  { value: '2x1', label: '2×1' },
  { value: 'envio_gratis', label: 'Envío gratis' },
];

const defaultForm = {
  nombre: '',
  tipo: 'porcentaje',
  valor_descuento: '',
  fecha_inicio: '',
  fecha_fin: '',
  codigo_cupon: '',
  monto_minimo_compra: '',
  limite_usos_total: '',
};

const AdminPromocionesScreen: React.FC = () => {
  const navigate = useNavigate();
  const [promociones, setPromociones] = useState<Promocion[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Promocion | null>(null);
  const [form, setForm] = useState({ ...defaultForm });
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<Promocion | null>(null);

  const cargar = async () => {
    setLoading(true);
    try {
      const res = await promocionesAPI.getAll();
      setPromociones(Array.isArray(res) ? res : res.data || []);
    } catch {
      setError('Error al cargar promociones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const abrirCrear = () => {
    setEditando(null);
    setForm({ ...defaultForm });
    setError('');
    setModalOpen(true);
  };

  const abrirEditar = (p: Promocion) => {
    setEditando(p);
    setForm({
      nombre: p.nombre,
      tipo: p.tipo,
      valor_descuento: p.valor_descuento?.toString() ?? '',
      fecha_inicio: p.fecha_inicio?.slice(0, 10) ?? '',
      fecha_fin: p.fecha_fin?.slice(0, 10) ?? '',
      codigo_cupon: p.codigo_cupon ?? '',
      monto_minimo_compra: p.monto_minimo_compra?.toString() ?? '',
      limite_usos_total: p.limite_usos_total?.toString() ?? '',
    });
    setError('');
    setModalOpen(true);
  };

  const cerrarModal = () => { setModalOpen(false); setEditando(null); };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleGuardar = async () => {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return; }
    if (!form.fecha_inicio || !form.fecha_fin) { setError('Las fechas son obligatorias'); return; }
    if (form.fecha_fin < form.fecha_inicio) { setError('La fecha de fin debe ser posterior a la de inicio'); return; }
    if (['porcentaje', 'monto_fijo', 'cupon'].includes(form.tipo) && !form.valor_descuento) {
      setError('Indica el valor de descuento'); return;
    }

    const payload: any = {
      nombre: form.nombre.trim(),
      tipo: form.tipo,
      fecha_inicio: form.fecha_inicio,
      fecha_fin: form.fecha_fin,
      valor_descuento: form.valor_descuento ? parseFloat(form.valor_descuento) : null,
      codigo_cupon: form.codigo_cupon.trim() || null,
      monto_minimo_compra: form.monto_minimo_compra ? parseFloat(form.monto_minimo_compra) : null,
      limite_usos_total: form.limite_usos_total ? parseInt(form.limite_usos_total) : null,
    };

    setSaving(true);
    setError('');
    try {
      if (editando) {
        await promocionesAPI.update(editando.id, payload);
      } else {
        await promocionesAPI.create(payload);
      }
      cerrarModal();
      cargar();
    } catch {
      setError('Error al guardar la promoción');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (p: Promocion) => {
    try {
      await promocionesAPI.toggleStatus(p.id, !p.activo);
      cargar();
    } catch {
      alert('Error al cambiar estado');
    }
  };

  const handleEliminar = async () => {
    if (!confirmDelete) return;
    try {
      await promocionesAPI.delete(confirmDelete.id);
      setConfirmDelete(null);
      cargar();
    } catch {
      alert('Error al eliminar');
    }
  };

  const ahora = new Date().toISOString().slice(0, 10);
  const esVigente = (p: Promocion) => p.activo && p.fecha_inicio <= ahora && p.fecha_fin >= ahora;

  const tipoLabel = (tipo: string) => TIPOS.find(t => t.value === tipo)?.label ?? tipo;

  const valorLabel = (p: Promocion) => {
    if (p.tipo === 'porcentaje') return `${p.valor_descuento}%`;
    if (p.tipo === 'monto_fijo') return `$${p.valor_descuento}`;
    if (p.tipo === 'cupon') return `${p.valor_descuento}% — Cupón: ${p.codigo_cupon ?? '—'}`;
    if (p.tipo === '2x1') return '2×1';
    if (p.tipo === 'envio_gratis') return 'Envío gratis';
    return '—';
  };

  return (
    <div className="ap-container">
      <div className="ap-header">
        <button className="ap-back" onClick={() => navigate(-1)}>← Volver</button>
        <div>
          <h1 className="ap-title">Promociones</h1>
          <p className="ap-subtitle">Gestiona descuentos, cupones y ofertas especiales</p>
        </div>
        <button className="ap-btn-primary" onClick={abrirCrear}>+ Nueva promoción</button>
      </div>

      {loading ? (
        <div className="ap-loading">Cargando...</div>
      ) : (
        <div className="ap-table-wrap">
          {promociones.length === 0 ? (
            <div className="ap-empty">No hay promociones registradas. ¡Crea la primera!</div>
          ) : (
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Descuento</th>
                  <th>Vigencia</th>
                  <th>Estado</th>
                  <th>Usos</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {promociones.map(p => (
                  <tr key={p.id} className={esVigente(p) ? 'ap-row-vigente' : ''}>
                    <td className="ap-nombre">{p.nombre}</td>
                    <td><span className="ap-chip ap-chip-tipo">{tipoLabel(p.tipo)}</span></td>
                    <td className="ap-valor">{valorLabel(p)}</td>
                    <td className="ap-fechas">
                      {p.fecha_inicio?.slice(0, 10)} — {p.fecha_fin?.slice(0, 10)}
                    </td>
                    <td>
                      <span className={`ap-chip ${esVigente(p) ? 'ap-chip-activo' : p.activo ? 'ap-chip-inactivo' : 'ap-chip-desactivado'}`}>
                        {esVigente(p) ? 'Vigente' : p.activo ? (p.fecha_inicio > ahora ? 'Próxima' : 'Expirada') : 'Desactivada'}
                      </span>
                    </td>
                    <td className="ap-usos">{p.usos_actuales ?? 0}{p.limite_usos_total ? ` / ${p.limite_usos_total}` : ''}</td>
                    <td className="ap-acciones">
                      <button className="ap-btn-icon" title="Editar" onClick={() => abrirEditar(p)}>✏️</button>
                      <button className="ap-btn-icon" title={p.activo ? 'Desactivar' : 'Activar'} onClick={() => handleToggle(p)}>
                        {p.activo ? '🔴' : '🟢'}
                      </button>
                      <button className="ap-btn-icon ap-btn-del" title="Eliminar" onClick={() => setConfirmDelete(p)}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* MODAL CREAR / EDITAR */}
      {modalOpen && (
        <div className="ap-overlay" onClick={cerrarModal}>
          <div className="ap-modal" onClick={e => e.stopPropagation()}>
            <h2>{editando ? 'Editar promoción' : 'Nueva promoción'}</h2>

            <div className="ap-form-grid">
              <div className="ap-field ap-full">
                <label>Nombre *</label>
                <input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Ej. Descuento verano 20%" />
              </div>

              <div className="ap-field">
                <label>Tipo *</label>
                <select name="tipo" value={form.tipo} onChange={handleChange}>
                  {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              {['porcentaje', 'monto_fijo', 'cupon'].includes(form.tipo) && (
                <div className="ap-field">
                  <label>{form.tipo === 'monto_fijo' ? 'Monto fijo ($) *' : 'Porcentaje (%) *'}</label>
                  <input name="valor_descuento" type="number" min="0" value={form.valor_descuento} onChange={handleChange} placeholder={form.tipo === 'monto_fijo' ? '50' : '20'} />
                </div>
              )}

              {form.tipo === 'cupon' && (
                <div className="ap-field ap-full">
                  <label>Código de cupón</label>
                  <input name="codigo_cupon" value={form.codigo_cupon} onChange={handleChange} placeholder="VERANO2025" style={{ textTransform: 'uppercase' }} />
                </div>
              )}

              <div className="ap-field">
                <label>Fecha inicio *</label>
                <input name="fecha_inicio" type="date" value={form.fecha_inicio} onChange={handleChange} />
              </div>

              <div className="ap-field">
                <label>Fecha fin *</label>
                <input name="fecha_fin" type="date" value={form.fecha_fin} onChange={handleChange} />
              </div>

              <div className="ap-field">
                <label>Compra mínima ($)</label>
                <input name="monto_minimo_compra" type="number" min="0" value={form.monto_minimo_compra} onChange={handleChange} placeholder="0 = sin mínimo" />
              </div>

              <div className="ap-field">
                <label>Límite de usos</label>
                <input name="limite_usos_total" type="number" min="0" value={form.limite_usos_total} onChange={handleChange} placeholder="Vacío = ilimitado" />
              </div>
            </div>

            {error && <p className="ap-error">{error}</p>}

            <div className="ap-modal-footer">
              <button className="ap-btn-secondary" onClick={cerrarModal}>Cancelar</button>
              <button className="ap-btn-primary" onClick={handleGuardar} disabled={saving}>
                {saving ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear promoción'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE */}
      {confirmDelete && (
        <div className="ap-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="ap-modal ap-modal-sm" onClick={e => e.stopPropagation()}>
            <h2>¿Eliminar promoción?</h2>
            <p>Se eliminará <strong>{confirmDelete.nombre}</strong> de forma permanente.</p>
            <div className="ap-modal-footer">
              <button className="ap-btn-secondary" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="ap-btn-danger" onClick={handleEliminar}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPromocionesScreen;
