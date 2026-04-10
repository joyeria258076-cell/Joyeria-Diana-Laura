// Frontend/src/screens/admin/configuracion/AdminVariablesConfigScreen.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AiOutlineArrowLeft, AiOutlineSave, AiOutlineClose, AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai';
import { configAPI } from '../../../services/api';
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

const AdminVariablesConfigScreen: React.FC = () => {
  const navigate = useNavigate();
  const [variables, setVariables] = useState<VariableConfig[]>([]);
  const [grupos, setGrupos] = useState<GrupoConfig>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editMode, setEditMode] = useState<{ [key: string]: boolean }>({});
  const [editValues, setEditValues] = useState<{ [key: string]: string }>({});
  const [showSensitive, setShowSensitive] = useState<{ [key: string]: boolean }>({});

  // Cargar variables
  useEffect(() => {
    loadVariables();
  }, []);

  const loadVariables = async () => {
    try {
      setLoading(true);
      const response = await configAPI.getAll();
      
      if (response.success) {
        const variablesArray = Array.isArray(response.data) ? response.data : [];
        setVariables(variablesArray);
        
        // Agrupar por categoría
        const gruposTemp: GrupoConfig = {};
        variablesArray.forEach((variable: VariableConfig) => {
          const categoria = variable.categoria || 'General';
          if (!gruposTemp[categoria]) {
            gruposTemp[categoria] = [];
          }
          gruposTemp[categoria].push(variable);
        });
        
        setGrupos(gruposTemp);
      } else {
        setError('Error al cargar las variables de configuración');
      }
    } catch (err: any) {
      console.error('Error loading config:', err);
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

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await configAPI.update(clave, nuevoValor);
      
      if (response.success) {
        // Actualizar variables locales
        setVariables(variables.map(v => 
          v.clave === clave ? { ...v, valor: nuevoValor, fecha_actualizacion: new Date().toISOString() } : v
        ));
        
        // Reagrupar
        const gruposTemp: GrupoConfig = {};
        variables.map(v => 
          v.clave === clave ? { ...v, valor: nuevoValor } : v
        ).forEach((variable: VariableConfig) => {
          const categoria = variable.categoria || 'General';
          if (!gruposTemp[categoria]) {
            gruposTemp[categoria] = [];
          }
          gruposTemp[categoria].push(variable);
        });
        setGrupos(gruposTemp);
        
        setSuccess(`Variable "${clave}" actualizada correctamente`);
        handleCancel(clave);
        
        // Limpiar mensaje de éxito después de 3 segundos
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.message || 'Error al actualizar la variable');
      }
    } catch (err: any) {
      console.error('Error saving config:', err);
      setError(err.message || 'Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    const clavesEditadas = Object.keys(editValues);
    if (clavesEditadas.length === 0) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Crear array de configuraciones a actualizar
      const configuraciones = clavesEditadas.map(clave => ({
        clave,
        valor: editValues[clave]
      }));

      const response = await configAPI.updateMultiple(configuraciones);
      
      if (response.success) {
        // Actualizar variables locales
        let variablesActualizadas = [...variables];
        clavesEditadas.forEach(clave => {
          variablesActualizadas = variablesActualizadas.map(v => 
            v.clave === clave ? { ...v, valor: editValues[clave], fecha_actualizacion: new Date().toISOString() } : v
          );
        });
        setVariables(variablesActualizadas);
        
        // Reagrupar
        const gruposTemp: GrupoConfig = {};
        variablesActualizadas.forEach((variable: VariableConfig) => {
          const categoria = variable.categoria || 'General';
          if (!gruposTemp[categoria]) {
            gruposTemp[categoria] = [];
          }
          gruposTemp[categoria].push(variable);
        });
        setGrupos(gruposTemp);
        
        setSuccess(`${clavesEditadas.length} variable(s) actualizada(s) correctamente`);
        setEditMode({});
        setEditValues({});
        
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.message || 'Error al actualizar las variables');
      }
    } catch (err: any) {
      console.error('Error saving all config:', err);
      setError(err.message || 'Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  const toggleShowSensitive = (clave: string) => {
    setShowSensitive({
      ...showSensitive,
      [clave]: !showSensitive[clave]
    });
  };

  const formatTipoDato = (tipo: string): string => {
    const tipos: { [key: string]: string } = {
      'decimal': '🔢 Decimal',
      'integer': '🔢 Entero',
      'string': '📝 Texto',
      'boolean': '✓ Booleano'
    };
    return tipos[tipo] || tipo;
  };

  const formatFecha = (fecha: string): string => {
    return new Date(fecha).toLocaleString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
          <button 
            className="btn-save-all"
            onClick={handleSaveAll}
            disabled={saving}
          >
            <AiOutlineSave size={18} />
            {saving ? 'Guardando...' : `Guardar ${Object.keys(editValues).length} cambio(s)`}
          </button>
        )}
      </div>

      {/* Mensajes */}
      {error && (
        <div className="alert alert-error">
          <AiOutlineClose size={20} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <span>{success}</span>
        </div>
      )}

      {/* Variables por categoría */}
      <div className="variables-content">
        {categoriasOrdenadas.length === 0 ? (
          <div className="empty-state">
            <p>No hay variables de configuración disponibles</p>
          </div>
        ) : (
          categoriasOrdenadas.map(categoria => (
            <section key={categoria} className="categoria-section">
              <h2 className="categoria-titulo">
                {categoria === 'fiscal' && '💰 Configuración Fiscal'}
                {categoria === 'ventas' && '🛒 Configuración de Ventas'}
                {categoria === 'envios' && '📦 Configuración de Envíos'}
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
                        <button 
                          className="btn-toggle-sensitive"
                          onClick={() => toggleShowSensitive(variable.clave)}
                          title={showSensitive[variable.clave] ? 'Ocultar valor' : 'Mostrar valor'}
                        >
                          {showSensitive[variable.clave] ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
                        </button>
                      )}
                    </div>

                    <p className="variable-descripcion">{variable.descripcion}</p>
                    {editMode[variable.clave] ? (
                    <div className="variable-edit">
                        {variable.clave === 'unidad_expiracion_pago' ? (
                          <select
                            value={editValues[variable.clave] || variable.valor}
                            onChange={(e) => handleChange(variable.clave, e.target.value)}
                            className="variable-input"
                          >
                            <option value="minutos">Minutos</option>
                            <option value="horas">Horas</option>
                            <option value="dias">Días</option>
                          </select>
                        ) : variable.tipo_dato === 'boolean' ? (
                          <select
                            value={editValues[variable.clave] || variable.valor}
                            onChange={(e) => handleChange(variable.clave, e.target.value)}
                            className="variable-input"
                          >
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
                            className="variable-input"
                          />
                        )}
                        <div className="edit-actions">
                          <button 
                            className="btn-save-small"
                            onClick={() => handleSave(variable.clave)}
                            disabled={saving}
                          >
                            <AiOutlineSave size={16} />
                          </button>
                          <button 
                            className="btn-cancel-small"
                            onClick={() => handleCancel(variable.clave)}
                          >
                            <AiOutlineClose size={16} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="variable-valor-container">
                        <div 
                          className="variable-valor"
                          onClick={() => handleEdit(variable.clave, variable.valor)}
                        >
                          {variable.es_sensible && !showSensitive[variable.clave] ? (
                            <span className="valor-oculto">••••••••</span>
                          ) : (
                            <span className={`valor-actual ${variable.tipo_dato === 'decimal' || variable.tipo_dato === 'integer' ? 'valor-numerico' : ''}`}>
                              {variable.tipo_dato === 'boolean' ? (
                                variable.valor === 'true' ? '✓ Verdadero' : '✗ Falso'
                              ) : (
                                variable.valor
                              )}
                            </span>
                          )}
                          <span className="edit-hint">(clic para editar)</span>
                        </div>
                        <span className="fecha-actualizacion">
                          Actualizado: {formatFecha(variable.fecha_actualizacion)}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminVariablesConfigScreen;