import React, { useState, useEffect } from 'react';
import { promocionesAPI } from '../../services/api';
import {
  AiOutlinePlus, AiOutlineEdit, AiOutlineDelete, AiOutlineTag, AiOutlineClose, AiOutlineCheck,
  AiOutlinePercentage, AiOutlineGift, AiOutlineCar, AiOutlineDollarCircle, AiOutlineFire,
} from 'react-icons/ai';
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

const TIPOS: { value: string; label: string; ayuda: string }[] = [
  { value: 'porcentaje', label: 'Porcentaje (%)', ayuda: 'Descuenta un % del precio total. Ej: 20% de descuento en toda la compra.' },
  { value: 'monto_fijo', label: 'Monto fijo ($)', ayuda: 'Descuenta una cantidad exacta en pesos. Ej: $50 de descuento, sin importar el precio.' },
  { value: 'cupon', label: 'Cupón de descuento', ayuda: 'Como el porcentaje, pero el cliente debe escribir un código en el carrito para activarlo.' },
  { value: '2x1', label: '2×1', ayuda: 'El cliente paga un producto y se lleva otro igual o de menor precio gratis.' },
  { value: 'envio_gratis', label: 'Envío gratis', ayuda: 'Elimina el costo de envío del pedido, sin afectar el precio de los productos.' },
];

const iconoTipo = (tipo: string) => {
  switch (tipo) {
    case 'porcentaje': return AiOutlinePercentage;
    case 'monto_fijo': return AiOutlineDollarCircle;
    case 'cupon': return AiOutlineTag;
    case '2x1': return AiOutlineFire;
    case 'envio_gratis': return AiOutlineCar;
    default: return AiOutlineGift;
  }
};

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
  const [promociones, setPromociones] = useState<Promocion[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Promocion | null>(null);
  const [form, setForm] = useState({ ...defaultForm });
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<Promocion | null>(null);
  const [filtro, setFiltro] = useState<'todas' | 'vigentes' | 'proximas' | 'expiradas'>('todas');

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
  const esProxima = (p: Promocion) => p.activo && p.fecha_inicio > ahora;
  const esExpirada = (p: Promocion) => !esVigente(p) && !esProxima(p);

  const tipoLabel = (tipo: string) => TIPOS.find(t => t.value === tipo)?.label ?? tipo;

  const valorGrande = (p: Promocion) => {
    if (p.tipo === 'porcentaje' || p.tipo === 'cupon') return `${p.valor_descuento}%`;
    if (p.tipo === 'monto_fijo') return `$${p.valor_descuento}`;
    if (p.tipo === '2x1') return '2×1';
    if (p.tipo === 'envio_gratis') return 'GRATIS';
    return '—';
  };

  const totalVigentes = promociones.filter(esVigente).length;
  const totalProximas = promociones.filter(esProxima).length;
  const totalExpiradas = promociones.filter(esExpirada).length;

  const valorGrandeForm = () => {
    if (form.tipo === 'porcentaje' || form.tipo === 'cupon') return form.valor_descuento ? `${form.valor_descuento}%` : '—%';
    if (form.tipo === 'monto_fijo') return form.valor_descuento ? `$${form.valor_descuento}` : '$—';
    if (form.tipo === '2x1') return '2×1';
    if (form.tipo === 'envio_gratis') return 'GRATIS';
    return '—';
  };

  const IconoForm = iconoTipo(form.tipo);

  const promosFiltradas = promociones.filter(p => {
    if (filtro === 'vigentes') return esVigente(p);
    if (filtro === 'proximas') return esProxima(p);
    if (filtro === 'expiradas') return esExpirada(p);
    return true;
  });

  return (
    <div className="ap3-container">
      <div className="ap3-header">
        <h1><AiOutlineTag size={22} /> Promociones</h1>
        <button className="ap3-btn-nuevo" onClick={abrirCrear}>
          <AiOutlinePlus size={18} /> Nueva Promoción
        </button>
      </div>

      <div className="ap3-stats">
        <div className="ap3-stat">
          <span className="ap3-stat-num">{promociones.length}</span>
          <span className="ap3-stat-label">Total</span>
        </div>
        <div className="ap3-stat ap3-stat-ok">
          <span className="ap3-stat-num">{totalVigentes}</span>
          <span className="ap3-stat-label">Vigentes</span>
        </div>
        <div className="ap3-stat">
          <span className="ap3-stat-num">{totalProximas}</span>
          <span className="ap3-stat-label">Próximas</span>
        </div>
        <div className="ap3-stat ap3-stat-off">
          <span className="ap3-stat-num">{totalExpiradas}</span>
          <span className="ap3-stat-label">Expiradas</span>
        </div>
      </div>

      <div className="ap3-toolbar">
        {(['todas', 'vigentes', 'proximas', 'expiradas'] as const).map(f => (
          <button key={f} className={`ap3-filtro-btn ${filtro === f ? 'active' : ''}`} onClick={() => setFiltro(f)}>
            {f === 'todas' ? 'Todas' : f === 'vigentes' ? 'Vigentes' : f === 'proximas' ? 'Próximas' : 'Expiradas'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="ap3-loading">
          <div className="ap3-spinner" />
          <p>Cargando promociones...</p>
        </div>
      ) : promosFiltradas.length === 0 ? (
        <div className="ap3-empty">
          <AiOutlineTag size={36} />
          <p>No hay promociones{filtro !== 'todas' ? ' en este filtro' : ''}. ¡Crea la primera!</p>
        </div>
      ) : (
        <div className="ap3-grid">
          {promosFiltradas.map(p => {
            const Icono = iconoTipo(p.tipo);
            const vigente = esVigente(p);
            const proxima = esProxima(p);
            const usoPct = p.limite_usos_total ? Math.min(100, Math.round((p.usos_actuales / p.limite_usos_total) * 100)) : null;
            return (
              <div key={p.id} className={`ap3-card ${!p.activo ? 'ap3-card-inactiva' : ''}`}>
                <div className="ap3-card-ticket">
                  <div className="ap3-card-icono"><Icono size={18} /></div>
                  <div className="ap3-card-valor">{valorGrande(p)}</div>
                  <span className={`ap3-card-estado ${vigente ? 'on' : proxima ? 'soon' : 'off'}`}>
                    {vigente ? 'Vigente' : proxima ? 'Próxima' : p.activo ? 'Expirada' : 'Desactivada'}
                  </span>
                </div>

                <div className="ap3-card-body">
                  <h3>{p.nombre}</h3>
                  <p className="ap3-card-tipo">{tipoLabel(p.tipo)}</p>
                  {p.codigo_cupon && <div className="ap3-card-cupon">{p.codigo_cupon}</div>}

                  <div className="ap3-card-fechas">
                    {p.fecha_inicio?.slice(0, 10)} → {p.fecha_fin?.slice(0, 10)}
                  </div>

                  {p.limite_usos_total ? (
                    <div className="ap3-card-usos">
                      <div className="ap3-card-usos-top">
                        <span>Usos</span>
                        <span>{p.usos_actuales} / {p.limite_usos_total}</span>
                      </div>
                      <div className="ap3-card-usos-bar">
                        <div className="ap3-card-usos-fill" style={{ width: `${usoPct}%` }} />
                      </div>
                    </div>
                  ) : (
                    <div className="ap3-card-usos-simple">{p.usos_actuales ?? 0} usos · sin límite</div>
                  )}

                  <div className="ap3-card-actions">
                    <button onClick={() => abrirEditar(p)} title="Editar">
                      <AiOutlineEdit size={15} />
                    </button>
                    <button onClick={() => handleToggle(p)} title={p.activo ? 'Desactivar' : 'Activar'}>
                      {p.activo ? <AiOutlineClose size={15} /> : <AiOutlineCheck size={15} />}
                    </button>
                    <button className="danger" onClick={() => setConfirmDelete(p)} title="Eliminar">
                      <AiOutlineDelete size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL CREAR / EDITAR */}
      {modalOpen && (
        <div className="ap3-overlay" onClick={cerrarModal}>
          <div className="ap3-modal ap3-modal-wide" onClick={e => e.stopPropagation()}>
            <div className="ap3-modal-header">
              <h2>{editando ? 'Editar Promoción' : 'Nueva Promoción'}</h2>
              <button className="ap3-modal-close" onClick={cerrarModal}><AiOutlineClose size={20} /></button>
            </div>

            <div className="ap3-modal-split">
              <div className="ap3-modal-body">
                <div className="ap3-field ap3-field-full">
                  <label>Nombre <span className="ap3-req">*</span></label>
                  <input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Ej. Descuento verano 20%" />
                </div>

                <div className="ap3-field ap3-field-full">
                  <label>Tipo <span className="ap3-req">*</span></label>
                  <select name="tipo" value={form.tipo} onChange={handleChange}>
                    {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <p className="ap3-field-ayuda">{TIPOS.find(t => t.value === form.tipo)?.ayuda}</p>
                </div>

                {['porcentaje', 'monto_fijo', 'cupon'].includes(form.tipo) && (
                  <div className="ap3-field">
                    <label>{form.tipo === 'monto_fijo' ? 'Monto fijo ($)' : 'Porcentaje (%)'} <span className="ap3-req">*</span></label>
                    <input name="valor_descuento" type="number" min="0" value={form.valor_descuento} onChange={handleChange} placeholder={form.tipo === 'monto_fijo' ? '50' : '20'} />
                  </div>
                )}

                {form.tipo === 'cupon' && (
                  <div className="ap3-field ap3-field-full">
                    <label>Código de cupón</label>
                    <input name="codigo_cupon" value={form.codigo_cupon} onChange={handleChange} placeholder="VERANO2025" style={{ textTransform: 'uppercase' }} />
                    <small className="ap3-field-hint">El cliente deberá escribir este código exacto al pagar para recibir el descuento.</small>
                  </div>
                )}

                <div className="ap3-row">
                  <div className="ap3-field">
                    <label>Fecha inicio <span className="ap3-req">*</span></label>
                    <input name="fecha_inicio" type="date" value={form.fecha_inicio} onChange={handleChange} />
                  </div>
                  <div className="ap3-field">
                    <label>Fecha fin <span className="ap3-req">*</span></label>
                    <input name="fecha_fin" type="date" value={form.fecha_fin} onChange={handleChange} />
                  </div>
                </div>

                <div className="ap3-row">
                  <div className="ap3-field">
                    <label>Compra mínima ($)</label>
                    <input name="monto_minimo_compra" type="number" min="0" value={form.monto_minimo_compra} onChange={handleChange} placeholder="0 = sin mínimo" />
                    <small className="ap3-field-hint">El carrito debe sumar al menos este monto para que la promoción aplique.</small>
                  </div>
                  <div className="ap3-field">
                    <label>Límite de usos</label>
                    <input name="limite_usos_total" type="number" min="0" value={form.limite_usos_total} onChange={handleChange} placeholder="Vacío = ilimitado" />
                    <small className="ap3-field-hint">Cuántas veces en total se puede usar esta promoción (entre todos los clientes).</small>
                  </div>
                </div>

                {error && <p className="ap3-error">{error}</p>}
              </div>

              {/* Vista previa en vivo del ticket */}
              <div className="ap3-modal-preview">
                <span className="ap3-preview-eyebrow">Vista previa</span>
                <div className="ap3-preview-ticket">
                  <div className="ap3-preview-ticket-top">
                    <div className="ap3-preview-icono"><IconoForm size={18} /></div>
                    <div className="ap3-preview-valor">{valorGrandeForm()}</div>
                    <span className="ap3-preview-estado">
                      {form.fecha_inicio && form.fecha_fin ? 'Vigente' : 'Sin fechas'}
                    </span>
                  </div>
                  <div className="ap3-preview-ticket-body">
                    <h4>{form.nombre || 'Nombre de la promoción'}</h4>
                    <p>{tipoLabel(form.tipo)}</p>
                    {form.tipo === 'cupon' && form.codigo_cupon && (
                      <div className="ap3-preview-cupon">{form.codigo_cupon.toUpperCase()}</div>
                    )}
                    <div className="ap3-preview-fechas">
                      {form.fecha_inicio || '—'} → {form.fecha_fin || '—'}
                    </div>
                    {form.limite_usos_total && (
                      <div className="ap3-preview-usos">Límite: {form.limite_usos_total} usos</div>
                    )}
                    {form.monto_minimo_compra && (
                      <div className="ap3-preview-usos">Compra mínima: ${form.monto_minimo_compra}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="ap3-modal-footer">
              <button className="ap3-btn-cancel" onClick={cerrarModal}>Cancelar</button>
              <button className="ap3-btn-save" onClick={handleGuardar} disabled={saving}>
                <AiOutlineCheck size={16} />
                {saving ? 'Guardando...' : editando ? 'Guardar Cambios' : 'Crear Promoción'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE */}
      {confirmDelete && (
        <div className="ap3-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="ap3-modal ap3-modal-sm" onClick={e => e.stopPropagation()}>
            <div className="ap3-modal-header">
              <h2>¿Eliminar promoción?</h2>
              <button className="ap3-modal-close" onClick={() => setConfirmDelete(null)}><AiOutlineClose size={20} /></button>
            </div>
            <div className="ap3-modal-body">
              <p>Se eliminará <strong>{confirmDelete.nombre}</strong> de forma permanente.</p>
            </div>
            <div className="ap3-modal-footer">
              <button className="ap3-btn-cancel" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="ap3-btn-danger" onClick={handleEliminar}>
                <AiOutlineDelete size={16} /> Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPromocionesScreen;
