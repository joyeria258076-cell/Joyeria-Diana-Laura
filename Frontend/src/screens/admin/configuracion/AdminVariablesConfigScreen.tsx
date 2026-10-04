// Frontend/src/screens/admin/configuracion/AdminVariablesConfigScreen.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Loader from '../../../components/Loader';
import {
  AiOutlineSave, AiOutlineClose, AiOutlineEye, AiOutlineEyeInvisible, AiOutlineSetting,
  AiOutlineDollarCircle, AiOutlineShoppingCart, AiOutlineInbox, AiOutlineBarChart,
  AiOutlineTag, AiOutlinePlus, AiOutlineEdit, AiOutlineCheckCircle, AiOutlineStop, AiOutlineBgColors, AiOutlineShopping, AiOutlineFileText, AiOutlineArrowRight } from 'react-icons/ai';
import { configAPI, apartadoAPI } from '../../../services/api';
import './AdminVariablesConfigScreen.css';
import AdminHero from '../../../components/AdminHero';

const ICONOS_CATEGORIA: Record<string, React.ComponentType<{size?:number}>> = {
  fiscal: AiOutlineDollarCircle,
  ventas: AiOutlineShoppingCart,
  envios: AiOutlineInbox,
  inventario: AiOutlineBarChart,
  apariencia: AiOutlineBgColors,
  pedidos: AiOutlineShopping,
  personalizacion: AiOutlineEdit,
  contenido: AiOutlineFileText,
};

// Nombres legibles de las variables más comunes
const NOMBRES_VARIABLE: Record<string, string> = {
  costo_envio_default: 'Costo de envío', envio_gratis_desde: 'Envío gratis desde',
  iva_porcentaje: 'IVA (%)', stock_minimo_default: 'Stock mínimo por defecto',
  dias_entrega_default: 'Días de entrega', dias_expiracion_pago: 'Aviso de pago vencido',
  dias_expiracion_pedido: 'Expirar pedidos sin atender', unidad_expiracion_pago: 'Unidad del aviso de pago',
  dias_verificacion_personalizacion: 'Días para revisar personalizaciones',
  dias_cancelacion: 'Horas para cancelar sin penalización', margen_ganancia_default: 'Margen de ganancia (%)',
  secciones_ocultas: 'Secciones ocultas', secciones_orden: 'Orden de secciones',
  sitio_fondo_url: 'Imagen de fondo del sitio', sitio_paleta: 'Paleta de colores',
  sitio_mision_vision_valores: 'Misión, visión y valores',
};

// Ajustes que se editan en otra pantalla (se muestra un acceso directo)
const ENLACE_VARIABLE: Record<string, { ruta: string; texto: string }> = {
  secciones_ocultas: { ruta: '/admin-contenido/paginas', texto: 'Abrir Gestión de páginas' },
  secciones_orden: { ruta: '/admin-contenido/paginas', texto: 'Abrir Gestión de páginas' },
  sitio_fondo_url: { ruta: '/admin/personalizacion-visual', texto: 'Cambiar en Personalización visual' },
  sitio_paleta: { ruta: '/admin/personalizacion-visual', texto: 'Cambiar en Personalización visual' },
  sitio_mision_vision_valores: { ruta: '/admin-contenido/mision', texto: 'Editar misión, visión y valores' },
};

// Unidad que acompaña al valor de cada ajuste
const unidadDe = (clave: string, todas: { clave: string; valor: string }[]): { antes?: string; despues?: string } => {
  if (['costo_envio_default', 'envio_gratis_desde'].includes(clave)) return { antes: '$', despues: 'MXN' };
  if (['iva_porcentaje', 'margen_ganancia_default'].includes(clave)) return { despues: '%' };
  if (clave === 'dias_cancelacion') return { despues: 'horas' };
  if (clave === 'stock_minimo_default') return { despues: 'piezas' };
  if (clave === 'dias_expiracion_pago') {
    const u = todas.find(v => v.clave === 'unidad_expiracion_pago')?.valor || 'dias';
    return { despues: u === 'dias' ? 'días' : u };
  }
  if (clave.startsWith('dias_')) return { despues: 'días' };
  return {};
};

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
    return `Pieza de $1,000: anticipo de $500 y después ${numPagos} pago${numPagos !== 1 ? 's' : ''} de $${montoPorAbono} cada ${plan.intervalo_dias} días`;
  };

  const categoriasOrdenadas = Object.keys(grupos).sort();
  const [seccionActiva, setSeccionActiva] = useState<string>('__primera__');
  const seccionReal = seccionActiva === '__primera__' ? (categoriasOrdenadas[0] || 'planes') : seccionActiva;

  const nombreCategoria = (categoria: string) => {
    const nombres: Record<string,string> = {
      fiscal: 'Impuestos', ventas: 'Ventas',
      envios: 'Envíos', inventario: 'Inventario', apariencia: 'Apariencia del sitio',
      contenido: 'Contenido', pedidos: 'Pedidos', personalizacion: 'Personalización', planes: 'Planes de abono',
    };
    return nombres[categoria] || categoria;
  };

  if (loading) {
    return (
      <Loader texto="Cargando configuración..." />
    );
  }

  return (
    <div className="variables-container">
      {/* Header */}
      <AdminHero icono={<AiOutlineSetting size={26} />} seccion="Configuración" titulo="Ajustes de la" resaltado="tienda"
        descripcion="Planes de abono, tiempos y reglas que usa el sistema. Los cambios aplican de inmediato.">
        {Object.keys(editValues).length > 0 && (
          <button className="av-btn" onClick={handleSaveAll} disabled={saving}>
            <AiOutlineSave size={18} />
            {saving ? 'Guardando...' : `Guardar ${Object.keys(editValues).length} cambio(s)`}
          </button>
        )}
      </AdminHero>

      {/* Mensajes */}
      {error && (
        <div className="alert alert-error">
          <AiOutlineClose size={20} /><span>{error}</span>
        </div>
      )}
      {success && <div className="alert alert-success"><span>{success}</span></div>}

      {/* Panel de ajustes: rail de secciones + lista de la sección activa */}
      <div className="vc-layout">
        <nav className="vc-rail">
          {categoriasOrdenadas.map(categoria => {
            const Icono = ICONOS_CATEGORIA[categoria] || AiOutlineTag;
            return (
              <button
                key={categoria}
                className={`vc-rail-item ${seccionReal === categoria ? 'active' : ''}`}
                onClick={() => setSeccionActiva(categoria)}
              >
                <Icono size={16} /> {nombreCategoria(categoria)}
                <span className="vc-rail-count">{grupos[categoria].length}</span>
              </button>
            );
          })}
          <button
            className={`vc-rail-item ${seccionReal === 'planes' ? 'active' : ''}`}
            onClick={() => setSeccionActiva('planes')}
          >
            <AiOutlineTag size={16} /> Planes de abono
            <span className="vc-rail-count">{planes.length}</span>
          </button>
        </nav>

        <div className="vc-panel">
          {categoriasOrdenadas.length === 0 && seccionReal !== 'planes' ? (
            <div className="empty-state"><p>No hay variables de configuración disponibles</p></div>
          ) : seccionReal !== 'planes' ? (
            <section className="cf4">
              <h2 className="vc-panel-title">
                {React.createElement(ICONOS_CATEGORIA[seccionReal] || AiOutlineTag, { size: 18 })}
                {nombreCategoria(seccionReal)}
                <small className="cf4-cuenta">{(grupos[seccionReal] || []).length} ajuste{(grupos[seccionReal] || []).length === 1 ? '' : 's'}</small>
              </h2>
              <div className="cf4-grid">
              {(grupos[seccionReal] || []).map(variable => {
                const clave = variable.clave;
                const nombre = NOMBRES_VARIABLE[clave] || (clave.charAt(0).toUpperCase() + clave.slice(1).replace(/_/g, ' '));
                const enlace = ENLACE_VARIABLE[clave];
                const actual = editValues[clave] ?? variable.valor;
                const cambiado = editValues[clave] !== undefined && editValues[clave] !== variable.valor;
                const esNumero = variable.tipo_dato === 'decimal' || variable.tipo_dato === 'integer' || variable.tipo_dato === 'numero';
                const unidad = unidadDe(clave, variables);
                const actualizado = formatFecha(variable.fecha_actualizacion);
                if (enlace) {
                  return (
                    <article key={variable.id} className="cf4-card cf4-card--enlace">
                      <div className="cf4-cabeza"><strong>{nombre}</strong></div>
                      <p className="cf4-desc">{variable.descripcion}</p>
                      {clave === 'sitio_fondo_url' && variable.valor && <img className="cf4-miniatura" src={variable.valor} alt="" />}
                      {clave === 'sitio_paleta' && <span className="cf4-chip">{variable.valor}</span>}
                      <button className="cf4-ir" onClick={() => navigate(enlace.ruta)}>{enlace.texto} <AiOutlineArrowRight size={15} /></button>
                    </article>
                  );
                }
                return (
                  <article key={variable.id} className={`cf4-card${cambiado ? ' cambiado' : ''}`}>
                    <div className="cf4-cabeza">
                      <strong>{nombre}</strong>
                      {variable.es_sensible && (
                        <button className="av-accion" onClick={() => toggleShowSensitive(clave)} title="Mostrar u ocultar">
                          {showSensitive[clave] ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
                        </button>
                      )}
                    </div>
                    <p className="cf4-desc">{variable.descripcion}</p>
                    <div className="cf4-control">
                      {clave === 'unidad_expiracion_pago' ? (
                        <div className="av-segmento cf4-segmento">
                          {['minutos', 'horas', 'dias'].map(u => (
                            <button key={u} className={actual === u ? 'activo' : ''} onClick={() => handleChange(clave, u)}>{u === 'dias' ? 'días' : u}</button>
                          ))}
                        </div>
                      ) : variable.tipo_dato === 'boolean' ? (
                        <button className={`cf4-switch${actual === 'true' ? ' on' : ''}`} role="switch" aria-checked={actual === 'true'}
                          onClick={() => handleChange(clave, actual === 'true' ? 'false' : 'true')}><i /></button>
                      ) : (
                        <label className="cf4-campo">
                          {unidad.antes && <span>{unidad.antes}</span>}
                          <input
                            type={variable.es_sensible && !showSensitive[clave] ? 'password' : esNumero ? 'number' : 'text'}
                            step={variable.tipo_dato === 'decimal' ? '0.01' : '1'}
                            value={actual}
                            onChange={e => handleChange(clave, e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && cambiado) handleSave(clave); if (e.key === 'Escape') handleCancel(clave); }} />
                          {unidad.despues && <span>{unidad.despues}</span>}
                        </label>
                      )}
                    </div>
                    <div className="cf4-pie">
                      {cambiado ? (
                        <>
                          <button className="av-btn av-btn--sec" onClick={() => handleCancel(clave)}>Deshacer</button>
                          <button className="av-btn" onClick={() => handleSave(clave)} disabled={saving}><AiOutlineSave size={16} /> {saving ? 'Guardando…' : 'Guardar'}</button>
                        </>
                      ) : (
                        <small>Actualizado {actualizado}</small>
                      )}
                    </div>
                  </article>
                );
              })}
              </div>
            </section>
          ) : (
        /* ── SECCIÓN PLANES DE ABONO ─────────────────────── */
        <section className="categoria-section planes-abono-section">
          <div className="planes-header">
            <h2 className="categoria-titulo"><AiOutlineTag size={18}/> Planes de abono (apartados)</h2>
            <button className="btn-nuevo-plan" onClick={() => abrirFormPlan()}>
              <AiOutlinePlus size={14}/> Nuevo plan
            </button>
          </div>
          <p className="planes-descripcion">
            Define los planes de pago disponibles para clientes que aparten productos.
            Cada plan especifica cada cuántos días se cobra y qué porcentaje del total.
          </p>

          {loadingPlanes ? (
            <Loader texto="Cargando planes..." />
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
                        {plan.activo ? <><AiOutlineCheckCircle size={12}/> Activo</> : <><AiOutlineStop size={12}/> Inactivo</>}
                      </span>
                    </div>
                    <div className="plan-acciones">
                      <button className="plan-btn-editar" onClick={() => abrirFormPlan(plan)} title="Editar"><AiOutlineEdit size={15}/></button>
                      <button className="plan-btn-toggle" onClick={() => handleTogglePlan(plan)}
                        title={plan.activo ? 'Desactivar' : 'Activar'}>
                        {plan.activo ? <AiOutlineStop size={15}/> : <AiOutlineCheckCircle size={15}/>}
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
          )}
        </div>
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