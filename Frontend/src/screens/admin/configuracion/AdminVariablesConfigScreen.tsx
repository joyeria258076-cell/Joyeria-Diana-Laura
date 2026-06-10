// Frontend/src/screens/admin/configuracion/AdminVariablesConfigScreen.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AiOutlineArrowLeft, AiOutlineSave, AiOutlineClose, AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai';
import { configAPI, apartadoAPI } from '../../../services/api';
import './AdminVariablesConfigScreen.css';

interface VariableConfig {
  id: number;
  clave: string;
  valor: string;
  tipo_dato: string;
  descripcion: string;
  categoria: string;
  es_sensible: boolean;
  fecha_actualizacion: string;
}

interface GrupoConfig {
  [categoria: string]: VariableConfig[];
}

interface PlanAbono {
  id: number;
  nombre: string;
  intervalo_dias: number;
  porcentaje_abono: number;
  descripcion: string;
  activo: boolean;
}

const AdminVariablesConfigScreen: React.FC = () => {
  const navigate = useNavigate();
  const [variables, setVariables]   = useState<VariableConfig[]>([]);
  const [grupos, setGrupos]         = useState<GrupoConfig>({});
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');
  const [editMode, setEditMode]     = useState<{ [key: string]: boolean }>({});
  const [editValues, setEditValues] = useState<{ [key: string]: string }>({});
  const [showSensitive, setShowSensitive] = useState<{ [key: string]: boolean }>({});

  // ── Planes de abono ───────────────────────────────────────
  const [planes, setPlanes]               = useState<PlanAbono[]>([]);
  const [loadingPlanes, setLoadingPlanes] = useState(true);
  const [showFormPlan, setShowFormPlan]   = useState(false);
  const [editandoPlan, setEditandoPlan]   = useState<PlanAbono | null>(null);
  const [savingPlan, setSavingPlan]       = useState(false);
  const [errorPlan, setErrorPlan]         = useState('');
  const [formPlan, setFormPlan]           = useState({
    nombre: '', intervalo_dias: '', porcentaje_abono: '', descripcion: ''
  });

  useEffect(() => {
    loadVariables();
    loadPlanes();
  }, []);

  // ── Variables de config ───────────────────────────────────
  const loadVariables = async () => {
    try {
      setLoading(true);
      const response = await configAPI.getAll();
      if (response.success) {
        const variablesArray = Array.isArray(response.data) ? response.data : [];
        setVariables(variablesArray);
        const gruposTemp: GrupoConfig = {};
        variablesArray.forEach((variable: VariableConfig) => {
          const categoria = variable.categoria || 'General';
          if (!gruposTemp[categoria]) gruposTemp[categoria] = [];
          gruposTemp[categoria].push(variable);
        });
        setGrupos(gruposTemp);
      } else {
        setError('Error al cargar las variables de configuración');
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (clave: string, valorActual: string) => {
    setEditMode({ ...editMode, [clave]: true });
    setEditValues({ ...editValues, [clave]: valorActual });
  };

  const handleCancel = (clave: string) => {
    setEditMode({ ...editMode, [clave]: false });
    const newEditValues = { ...editValues };
    delete newEditValues[clave];
    setEditValues(newEditValues);
  };

  const handleChange = (clave: string, valor: string) => {
    setEditValues({ ...editValues, [clave]: valor });
  };

  const handleSave = async (clave: string) => {
    const nuevoValor = editValues[clave];
    if (nuevoValor === undefined) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      const response = await configAPI.update(clave, nuevoValor);
      if (response.success) {
        setVariables(variables.map(v =>
          v.clave === clave ? { ...v, valor: nuevoValor, fecha_actualizacion: new Date().toISOString() } : v
        ));
        const gruposTemp: GrupoConfig = {};
        variables.map(v => v.clave === clave ? { ...v, valor: nuevoValor } : v)
          .forEach((variable: VariableConfig) => {
            const categoria = variable.categoria || 'General';
            if (!gruposTemp[categoria]) gruposTemp[categoria] = [];
            gruposTemp[categoria].push(variable);
          });
        setGrupos(gruposTemp);
        setSuccess(`Variable "${clave}" actualizada correctamente`);
        handleCancel(clave);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.message || 'Error al actualizar la variable');
      }
    } catch (err: any) {
      setError(err.message || 'Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    const clavesEditadas = Object.keys(editValues);
    if (clavesEditadas.length === 0) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      const configuraciones = clavesEditadas.map(clave => ({ clave, valor: editValues[clave] }));
      const response = await configAPI.updateMultiple(configuraciones);
      if (response.success) {
        let variablesActualizadas = [...variables];
        clavesEditadas.forEach(clave => {
          variablesActualizadas = variablesActualizadas.map(v =>
            v.clave === clave ? { ...v, valor: editValues[clave], fecha_actualizacion: new Date().toISOString() } : v
          );
        });
        setVariables(variablesActualizadas);
        const gruposTemp: GrupoConfig = {};
        variablesActualizadas.forEach((variable: VariableConfig) => {
          const categoria = variable.categoria || 'General';
          if (!gruposTemp[categoria]) gruposTemp[categoria] = [];
          gruposTemp[categoria].push(variable);
        });
        setGrupos(gruposTemp);
        setSuccess(`${clavesEditadas.length} variable(s) actualizada(s) correctamente`);
        setEditMode({}); setEditValues({});
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.message || 'Error al actualizar las variables');
      }
    } catch (err: any) {
      setError(err.message || 'Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  const toggleShowSensitive = (clave: string) => {
    setShowSensitive({ ...showSensitive, [clave]: !showSensitive[clave] });
  };

  const formatTipoDato = (tipo: string): string => {
    const tipos: { [key: string]: string } = {
      'decimal': '🔢 Decimal', 'integer': '🔢 Entero',
      'string': '📝 Texto', 'boolean': '✓ Booleano'
    };
    return tipos[tipo] || tipo;
  };

  const formatFecha = (fecha: string): string => {
    return new Date(fecha).toLocaleString('es-CO', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  // ── Planes de abono ───────────────────────────────────────
  const loadPlanes = async () => {
    setLoadingPlanes(true);
    try {
      const res = await apartadoAPI.getPlanes();
      if (res.success) setPlanes(res.data);
    } catch { }
    finally { setLoadingPlanes(false); }
  };

  const abrirFormPlan = (plan?: PlanAbono) => {
    if (plan) {
      setEditandoPlan(plan);
      setFormPlan({
        nombre:          plan.nombre,
        intervalo_dias:  String(plan.intervalo_dias),
        porcentaje_abono: String(plan.porcentaje_abono),
        descripcion:     plan.descripcion || ''
      });
    } else {
      setEditandoPlan(null);
      setFormPlan({ nombre: '', intervalo_dias: '', porcentaje_abono: '', descripcion: '' });
    }
    setErrorPlan('');
    setShowFormPlan(true);
  };

  const cerrarFormPlan = () => {
    setShowFormPlan(false);
    setEditandoPlan(null);
    setErrorPlan('');
  };

  const handleGuardarPlan = async () => {
    if (!formPlan.nombre.trim()) { setErrorPlan('El nombre es requerido.'); return; }
    if (!formPlan.intervalo_dias || parseInt(formPlan.intervalo_dias) <= 0) {
      setErrorPlan('El intervalo de días debe ser mayor a 0.'); return;
    }
    if (!formPlan.porcentaje_abono || parseFloat(formPlan.porcentaje_abono) <= 0 || parseFloat(formPlan.porcentaje_abono) > 100) {
      setErrorPlan('El porcentaje debe estar entre 1 y 100.'); return;
    }

    setSavingPlan(true); setErrorPlan('');
    try {
      const data = {
        nombre:           formPlan.nombre.trim(),
        intervalo_dias:   parseInt(formPlan.intervalo_dias),
        porcentaje_abono: parseFloat(formPlan.porcentaje_abono),
        descripcion:      formPlan.descripcion.trim() || undefined
      };

      let res;
      if (editandoPlan) {
        res = await apartadoAPI.actualizarPlan(editandoPlan.id, data);
      } else {
        res = await apartadoAPI.crearPlan(data);
      }

      if (!res.success) throw new Error(res.message);
      await loadPlanes();
      cerrarFormPlan();
      setSuccess(editandoPlan ? 'Plan actualizado correctamente.' : 'Plan creado correctamente.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setErrorPlan(err.message || 'Error al guardar el plan.');
    } finally {
      setSavingPlan(false);
    }
  };

  const handleTogglePlan = async (plan: PlanAbono) => {
    try {
      await apartadoAPI.actualizarPlan(plan.id, { activo: !plan.activo });
      await loadPlanes();
    } catch { }
  };

  const handleEliminarPlan = async (id: number) => {
    if (!window.confirm('¿Desactivar este plan de abono?')) return;
    try {
      await apartadoAPI.eliminarPlan(id);
      await loadPlanes();
    } catch { }
  };

  // Calcular ejemplo de pagos para mostrar en la card del plan
  const calcularEjemploPagos = (plan: PlanAbono): string => {
    const totalEjemplo = 1000;
    const montoPorAbono = Math.round(totalEjemplo * (plan.porcentaje_abono / 100));
    const numPagos = Math.ceil(500 / montoPorAbono); // 500 = saldo tras 50% inicial
    return `Para un producto de $1,000: ${numPagos} pago${numPagos !== 1 ? 's' : ''} de $${montoPorAbono} cada ${plan.intervalo_dias} días`;
  };

  const categoriasOrdenadas = Object.keys(grupos).sort();

  if (loading) {
    return (
      <div className="variables-loading">
        <div className="spinner"></div>
        <p>Cargando configuración...</p>
      </div>
    );
  }

  return (
    <div className="variables-container">
      {/* Header */}
      <div className="variables-header">
        <button className="btn-back" onClick={() => navigate('/admin-dashboard')}>
          <AiOutlineArrowLeft size={20} />
          <span>Volver al Dashboard</span>
        </button>
        <h1>⚙️ Variables de Configuración</h1>
        {Object.keys(editValues).length > 0 && (
          <button className="btn-save-all" onClick={handleSaveAll} disabled={saving}>
            <AiOutlineSave size={18} />
            {saving ? 'Guardando...' : `Guardar ${Object.keys(editValues).length} cambio(s)`}
          </button>
        )}
      </div>

      {/* Mensajes */}
      {error && (
        <div className="alert alert-error">
          <AiOutlineClose size={20} /><span>{error}</span>
        </div>
      )}
      {success && <div className="alert alert-success"><span>{success}</span></div>}

      {/* Variables por categoría — sin cambios */}
      <div className="variables-content">
        {categoriasOrdenadas.length === 0 ? (
          <div className="empty-state"><p>No hay variables de configuración disponibles</p></div>
        ) : (
          categoriasOrdenadas.map(categoria => (
            <section key={categoria} className="categoria-section">
              <h2 className="categoria-titulo">
                {categoria === 'fiscal'     && '💰 Configuración Fiscal'}
                {categoria === 'ventas'     && '🛒 Configuración de Ventas'}
                {categoria === 'envios'     && '📦 Configuración de Envíos'}
                {categoria === 'inventario' && '📊 Configuración de Inventario'}
                {!['fiscal', 'ventas', 'envios', 'inventario'].includes(categoria) && categoria}
              </h2>
              <div className="variables-grid">
                {grupos[categoria].map(variable => (
                  <div key={variable.id} className="variable-card">
                    <div className="variable-header">
                      <div className="variable-titulo">
                        <h3>{variable.clave.replace(/_/g, ' ')}</h3>
                        <span className="variable-tipo">{formatTipoDato(variable.tipo_dato)}</span>
                      </div>
                      {variable.es_sensible && (
                        <button className="btn-toggle-sensitive" onClick={() => toggleShowSensitive(variable.clave)}>
                          {showSensitive[variable.clave] ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
                        </button>
                      )}
                    </div>
                    <p className="variable-descripcion">{variable.descripcion}</p>
                    {editMode[variable.clave] ? (
                      <div className="variable-edit">
                        {variable.clave === 'unidad_expiracion_pago' ? (
                          <select value={editValues[variable.clave] || variable.valor}
                            onChange={(e) => handleChange(variable.clave, e.target.value)}
                            className="variable-input">
                            <option value="minutos">Minutos</option>
                            <option value="horas">Horas</option>
                            <option value="dias">Días</option>
                          </select>
                        ) : variable.tipo_dato === 'boolean' ? (
                          <select value={editValues[variable.clave] || variable.valor}
                            onChange={(e) => handleChange(variable.clave, e.target.value)}
                            className="variable-input">
                            <option value="true">✓ Verdadero</option>
                            <option value="false">✗ Falso</option>
                          </select>
                        ) : (
                          <input
                            type={variable.es_sensible && !showSensitive[variable.clave] ? 'password' :
                              variable.tipo_dato === 'decimal' || variable.tipo_dato === 'integer' ? 'number' : 'text'}
                            step={variable.tipo_dato === 'decimal' ? '0.01' : '1'}
                            value={editValues[variable.clave] || variable.valor}
                            onChange={(e) => handleChange(variable.clave, e.target.value)}
                            className="variable-input" />
                        )}
                        <div className="edit-actions">
                          <button className="btn-save-small" onClick={() => handleSave(variable.clave)} disabled={saving}>
                            <AiOutlineSave size={16} />
                          </button>
                          <button className="btn-cancel-small" onClick={() => handleCancel(variable.clave)}>
                            <AiOutlineClose size={16} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="variable-valor-container">
                        <div className="variable-valor" onClick={() => handleEdit(variable.clave, variable.valor)}>
                          {variable.es_sensible && !showSensitive[variable.clave] ? (
                            <span className="valor-oculto">••••••••</span>
                          ) : (
                            <span className={`valor-actual ${variable.tipo_dato === 'decimal' || variable.tipo_dato === 'integer' ? 'valor-numerico' : ''}`}>
                              {variable.tipo_dato === 'boolean'
                                ? (variable.valor === 'true' ? '✓ Verdadero' : '✗ Falso')
                                : variable.valor}
                            </span>
                          )}
                          <span className="edit-hint">(clic para editar)</span>
                        </div>
                        <span className="fecha-actualizacion">Actualizado: {formatFecha(variable.fecha_actualizacion)}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))
        )}

        {/* ── SECCIÓN PLANES DE ABONO ─────────────────────── */}
        <section className="categoria-section planes-abono-section">
          <div className="planes-header">
            <h2 className="categoria-titulo">🔖 Planes de Abono (Apartados)</h2>
            <button className="btn-nuevo-plan" onClick={() => abrirFormPlan()}>
              + Nuevo plan
            </button>
          </div>
          <p className="planes-descripcion">
            Define los planes de pago disponibles para clientes que aparten productos.
            Cada plan especifica cada cuántos días se cobra y qué porcentaje del total.
          </p>

          {loadingPlanes ? (
            <div className="planes-loading">Cargando planes...</div>
          ) : planes.length === 0 ? (
            <div className="planes-vacio">
              No hay planes de abono. Crea el primero con el botón de arriba.
            </div>
          ) : (
            <div className="planes-grid">
              {planes.map(plan => (
                <div key={plan.id} className={`plan-card ${!plan.activo ? 'plan-inactivo' : ''}`}>
                  <div className="plan-card-header">
                    <div className="plan-info">
                      <h3>{plan.nombre}</h3>
                      <span className={`plan-estado-badge ${plan.activo ? 'activo' : 'inactivo'}`}>
                        {plan.activo ? '✅ Activo' : '⛔ Inactivo'}
                      </span>
                    </div>
                    <div className="plan-acciones">
                      <button className="plan-btn-editar" onClick={() => abrirFormPlan(plan)} title="Editar">✏️</button>
                      <button className="plan-btn-toggle" onClick={() => handleTogglePlan(plan)}
                        title={plan.activo ? 'Desactivar' : 'Activar'}>
                        {plan.activo ? '⛔' : '✅'}
                      </button>
                    </div>
                  </div>

                  <div className="plan-detalles">
                    <div className="plan-detalle-item">
                      <span className="plan-detalle-label">Intervalo</span>
                      <span className="plan-detalle-valor">Cada {plan.intervalo_dias} días</span>
                    </div>
                    <div className="plan-detalle-item">
                      <span className="plan-detalle-label">% por abono</span>
                      <span className="plan-detalle-valor">{plan.porcentaje_abono}% del total</span>
                    </div>
                  </div>

                  {plan.descripcion && (
                    <p className="plan-descripcion-texto">{plan.descripcion}</p>
                  )}

                  <div className="plan-ejemplo">
                    📊 {calcularEjemploPagos(plan)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Modal form plan */}
      {showFormPlan && (
        <div className="plan-modal-overlay" onClick={cerrarFormPlan}>
          <div className="plan-modal" onClick={e => e.stopPropagation()}>
            <div className="plan-modal-header">
              <h3>{editandoPlan ? '✏️ Editar plan' : '➕ Nuevo plan de abono'}</h3>
              <button className="plan-modal-close" onClick={cerrarFormPlan}>×</button>
            </div>
            <div className="plan-modal-body">

              <div className="plan-form-group">
                <label>Nombre del plan <span style={{ color: '#ecb2c3' }}>*</span></label>
                <input type="text" className="plan-input"
                  placeholder="Ej: Quincenal, Mensual, Semanal..."
                  value={formPlan.nombre}
                  onChange={e => setFormPlan({ ...formPlan, nombre: e.target.value })} />
              </div>

              <div className="plan-form-fila">
                <div className="plan-form-group">
                  <label>Intervalo (días) <span style={{ color: '#ecb2c3' }}>*</span></label>
                  <input type="number" className="plan-input" min={1} max={365}
                    placeholder="Ej: 15"
                    value={formPlan.intervalo_dias}
                    onChange={e => setFormPlan({ ...formPlan, intervalo_dias: e.target.value })} />
                  <small style={{ color: '#888', fontSize: '0.75rem' }}>Cada cuántos días debe abonar el cliente</small>
                </div>
                <div className="plan-form-group">
                  <label>% por abono <span style={{ color: '#ecb2c3' }}>*</span></label>
                  <input type="number" className="plan-input" min={1} max={100} step={0.01}
                    placeholder="Ej: 25"
                    value={formPlan.porcentaje_abono}
                    onChange={e => setFormPlan({ ...formPlan, porcentaje_abono: e.target.value })} />
                  <small style={{ color: '#888', fontSize: '0.75rem' }}>Porcentaje del total por cada abono</small>
                </div>
              </div>

              {/* Preview en tiempo real */}
              {formPlan.intervalo_dias && formPlan.porcentaje_abono && (
                <div className="plan-preview">
                  <p>📊 <strong>Vista previa para un producto de $1,000:</strong></p>
                  <p>Abono inicial (50%): <strong>$500</strong></p>
                  <p>Pagos de: <strong>${Math.round(1000 * (parseFloat(formPlan.porcentaje_abono) / 100))}</strong> cada <strong>{formPlan.intervalo_dias} días</strong></p>
                  <p>Pagos necesarios: <strong>
                    {Math.ceil(500 / Math.round(1000 * (parseFloat(formPlan.porcentaje_abono) / 100)))} pago(s)
                  </strong> para liquidar</p>
                </div>
              )}

              <div className="plan-form-group">
                <label>Descripción (opcional)</label>
                <textarea className="plan-textarea" rows={2}
                  placeholder="Ej: Pago cada quincena, ideal para artículos medianos..."
                  value={formPlan.descripcion}
                  onChange={e => setFormPlan({ ...formPlan, descripcion: e.target.value })} />
              </div>

              {errorPlan && (
                <div className="plan-error">⚠️ {errorPlan}</div>
              )}
            </div>
            <div className="plan-modal-footer">
              <button className="plan-btn-cancelar" onClick={cerrarFormPlan}>Cancelar</button>
              <button className="plan-btn-guardar" onClick={handleGuardarPlan} disabled={savingPlan}>
                {savingPlan ? '⏳ Guardando...' : editandoPlan ? '💾 Actualizar plan' : '✅ Crear plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminVariablesConfigScreen;