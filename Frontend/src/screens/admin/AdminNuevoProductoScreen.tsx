// Frontend/src/screens/admin/AdminNuevoProductoScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  AiOutlinePlus, AiOutlineCheck, AiOutlineClose, AiOutlineUpload, AiOutlineDelete,
  AiOutlineBulb, AiOutlineFileText, AiOutlineLink, AiOutlineDollarCircle, AiOutlinePicture,
  AiOutlineInbox, AiOutlineStar, AiOutlineEye, AiOutlineBarChart, AiOutlineEnvironment, AiOutlineCheckCircle,
} from 'react-icons/ai';
import { useNavigate } from 'react-router-dom';
import { productsAPI, uploadAPI, precioSugeridoAPI } from '../../services/api';
import { UBICACIONES_SUGERIDAS, colorDeUbicacion } from '../../utils/ubicacionesEntrega';
import './AdminNuevoProductoScreen.css';

interface Category { id: number; nombre: string; }
interface Proveedor { id: number; nombre: string; }
interface Temporada { id: number; nombre: string; }
interface TipoProducto { id: number; nombre: string; }
interface Configuracion { id: number; clave: string; valor: string; tipo_dato: string; }

interface FormData {
  nombre: string;
  descripcion: string;
  categoria_id: number | null;
  proveedor_id: number | null;
  temporada_id: number | null;
  tipo_producto_id: number | null;
  material_principal: string;
  peso_gramos: number | null;
  precio_compra: number | null;
  precio_oferta: number | null;
  stock_actual: number;
  ubicacion_fisica: string;
  tiene_medidas: boolean;
  medidas: string;
  permite_personalizacion: boolean;
  precio_personalizacion: number;
  ubicaciones_entrega: string[];
  imagen_principal: string;
  imagen_public_id?: string;
  es_nuevo: boolean;
  es_destacado: boolean;
  activo: boolean;
  creado_por: number | null;
}

const AdminNuevoProductoScreen: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [categorias, setCategorias] = useState<Category[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [temporadas, setTemporadas] = useState<Temporada[]>([]);
  const [tiposProducto, setTiposProducto] = useState<TipoProducto[]>([]);

  const [ivaConfig, setIvaConfig] = useState<number>(16);
  const [margenConfig, setMargenConfig] = useState<number>(40);
  const [stockMinimoDefault, setStockMinimoDefault] = useState<number>(5);
  const [stockMaximoDefault, setStockMaximoDefault] = useState<number>(999);

  const [precioSugerido, setPrecioSugerido] = useState<{ precio_sugerido: number; rango_min: number; rango_max: number; comparativa?: { nombre: string; precio: number }[] } | null>(null);
  const [loadingSugerido, setLoadingSugerido] = useState(false);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [formData, setFormData] = useState<FormData>({
    nombre: '', descripcion: '', categoria_id: null, proveedor_id: null, temporada_id: null,
    tipo_producto_id: null, material_principal: '', peso_gramos: null, precio_compra: null,
    precio_oferta: null, stock_actual: 0, ubicacion_fisica: '', tiene_medidas: false, medidas: '',
    permite_personalizacion: false, precio_personalizacion: 0,
    ubicaciones_entrega: [], imagen_principal: '', es_nuevo: false, es_destacado: false,
    activo: true, creado_por: null
  });

  const [nuevaUbicacion, setNuevaUbicacion] = useState('');

  const agregarUbicacion = (nombre: string) => {
    const limpio = nombre.trim();
    if (!limpio || formData.ubicaciones_entrega.includes(limpio)) return;
    setFormData(prev => ({ ...prev, ubicaciones_entrega: [...prev.ubicaciones_entrega, limpio] }));
    setNuevaUbicacion('');
  };

  const quitarUbicacion = (nombre: string) => {
    setFormData(prev => ({ ...prev, ubicaciones_entrega: prev.ubicaciones_entrega.filter(u => u !== nombre) }));
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [categoriasRes, proveedoresRes, temporadasRes, tiposRes, configRes] = await Promise.all([
          productsAPI.getCategories(),
          productsAPI.getProveedores(),
          productsAPI.getTemporadas(),
          productsAPI.getTiposProducto(),
          productsAPI.getConfiguracion()
        ]);

        if (categoriasRes.success) setCategorias(Array.isArray(categoriasRes.data) ? categoriasRes.data : categoriasRes.data || []);
        if (proveedoresRes.success) setProveedores(Array.isArray(proveedoresRes.data) ? proveedoresRes.data : []);
        if (temporadasRes.success) setTemporadas(Array.isArray(temporadasRes.data) ? temporadasRes.data : []);
        if (tiposRes.success) setTiposProducto(Array.isArray(tiposRes.data) ? tiposRes.data : []);
        if (configRes.success) {
          const configs = Array.isArray(configRes.data) ? configRes.data : [];
          const iva = configs.find((c: Configuracion) => c.clave === 'iva_porcentaje');
          const margen = configs.find((c: Configuracion) => c.clave === 'margen_ganancia_default');
          const stockMinimo = configs.find((c: Configuracion) => c.clave === 'stock_minimo_default');
          const stockMaximo = configs.find((c: Configuracion) => c.clave === 'stock_maximo_default');
          if (iva) setIvaConfig(Number.parseFloat(iva.valor));
          if (margen) setMargenConfig(Number.parseFloat(margen.valor));
          if (stockMinimo) {
            setStockMinimoDefault(Number.parseInt(stockMinimo.valor));
            setFormData(prev => ({ ...prev, stock_actual: Number.parseInt(stockMinimo.valor) }));
          }
          if (stockMaximo) setStockMaximoDefault(Number.parseInt(stockMaximo.valor));
        }
      } catch (err: any) {
        console.error('Error cargando datos:', err);
      }
    };
    loadData();
  }, []);

  const calcularPrecioVenta = (precioCompra: number | null): number => {
    if (!precioCompra || precioCompra <= 0) return 0;
    const precioConMargen = precioCompra * (1 + margenConfig / 100);
    const precioConIva = precioConMargen * (1 + ivaConfig / 100);
    return Number.parseFloat(precioConIva.toFixed(2));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else if (type === 'number' || name.endsWith('_id')) {
      const numValue = value === '' ? null : Number.parseFloat(value);
      setFormData(prev => ({ ...prev, [name]: numValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const toggleField = (name: keyof FormData) => {
    setFormData(prev => ({ ...prev, [name]: !prev[name] } as FormData));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleUploadImage = async () => {
    if (!selectedFile) {
      setError('Selecciona una imagen primero');
      return false;
    }
    setUploadingImage(true);
    setError('');
    try {
      const response = await uploadAPI.uploadImage(selectedFile, 'joyeria/productos');
      if (response.success) {
        setFormData(prev => ({ ...prev, imagen_principal: response.data.url, imagen_public_id: response.data.publicId }));
        return true;
      }
      setError(response.message || 'Error al subir la imagen');
      return false;
    } catch (err: any) {
      console.error('Error uploading image:', err);
      setError(err.message || 'Error al subir la imagen');
      return false;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setFormData(prev => ({ ...prev, imagen_principal: '', imagen_public_id: undefined }));
  };

  const validateForm = (): boolean => {
    if (!formData.nombre.trim()) { setError('El nombre del producto es requerido'); return false; }
    if (formData.nombre.length > 200) { setError('El nombre no puede exceder 200 caracteres'); return false; }
    if (!formData.categoria_id) { setError('Debe seleccionar una categoría'); return false; }
    if (!formData.precio_compra || formData.precio_compra <= 0) { setError('El precio de compra debe ser mayor a 0'); return false; }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validateForm()) return;

    if (selectedFile && !formData.imagen_principal) {
      const uploaded = await handleUploadImage();
      if (!uploaded) return;
    }

    setLoading(true);
    try {
      const precioVenta = calcularPrecioVenta(formData.precio_compra);
      const dataToSend = { ...formData, precio_venta: precioVenta, margen_ganancia: margenConfig, stock_minimo: stockMinimoDefault, stock_maximo: stockMaximoDefault };
      const response = await productsAPI.create(dataToSend);

      if (response.success) {
        setSuccess(true);
        alert('¡Producto registrado exitosamente!');
        setTimeout(() => {
          setFormData({
            nombre: '', descripcion: '', categoria_id: null, proveedor_id: null, temporada_id: null,
            tipo_producto_id: null, material_principal: '', peso_gramos: null, precio_compra: null,
            precio_oferta: null, stock_actual: stockMinimoDefault, ubicacion_fisica: '', tiene_medidas: false,
            medidas: '', permite_personalizacion: false, precio_personalizacion: 0,
            ubicaciones_entrega: [], imagen_principal: '', es_nuevo: false, es_destacado: false,
            activo: true, creado_por: null
          });
          setSelectedFile(null);
          setImagePreview(null);
          setSuccess(false);
        }, 500);
      } else {
        setError(response.message || 'Error al crear el producto');
      }
    } catch (err: any) {
      setError(err.message || 'Error al crear el producto');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const categoriaNombre = categorias.find(c => c.id === formData.categoria_id)?.nombre || '';
    if (!formData.material_principal || !categoriaNombre || !formData.peso_gramos) {
      setPrecioSugerido(null);
      return;
    }
    const timer = setTimeout(async () => {
      setLoadingSugerido(true);
      const resultado = await precioSugeridoAPI.predecir({
        material_principal: formData.material_principal,
        categoria_nombre: categoriaNombre,
        peso_gramos: formData.peso_gramos!,
        permite_personalizacion: formData.permite_personalizacion,
      });
      setPrecioSugerido(resultado);
      setLoadingSugerido(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [formData.material_principal, formData.categoria_id, formData.peso_gramos, formData.permite_personalizacion, categorias]);

  const precioVentaCalculado = calcularPrecioVenta(formData.precio_compra);
  const categoriaNombre = categorias.find(c => c.id === formData.categoria_id)?.nombre;

  return (
    <div className="np3-container">
      <div className="np3-header">
        <h1><AiOutlinePlus size={22} /> Agregar Nuevo Producto</h1>
        <p>Registra una nueva pieza para tu catálogo de joyería</p>
      </div>

      {error && (
        <div className="np3-alert np3-alert-error">
          <AiOutlineClose size={18} />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="np3-alert np3-alert-success">
          <AiOutlineCheckCircle size={18} />
          <span>¡Producto creado exitosamente!</span>
        </div>
      )}

      <div className="np3-layout">
        <form onSubmit={handleSubmit} className="np3-form">

          {/* Imagen */}
          <div className="np3-card">
            <div className="np3-card-num">1</div>
            <div className="np3-card-body">
              <h3><AiOutlinePicture size={16} /> Imagen del Producto</h3>

              <div className="np3-photo-row">
                <div className="np3-photo-preview">
                  {imagePreview ? <img src={imagePreview} alt="Vista previa" /> : <AiOutlinePicture size={26} />}
                </div>
                <div className="np3-photo-actions">
                  <label className="np3-photo-upload">
                    <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleImageChange} disabled={uploadingImage} hidden />
                    <AiOutlineUpload size={15} /> {imagePreview ? 'Cambiar imagen' : 'Subir imagen'}
                  </label>
                  {selectedFile && !formData.imagen_principal && (
                    <button type="button" className="np3-photo-confirm" onClick={handleUploadImage} disabled={uploadingImage}>
                      <AiOutlineCheck size={14} /> {uploadingImage ? 'Subiendo...' : 'Confirmar subida'}
                    </button>
                  )}
                  {imagePreview && (
                    <button type="button" className="np3-photo-remove" onClick={handleRemoveImage}>
                      <AiOutlineDelete size={14} /> Quitar
                    </button>
                  )}
                </div>
              </div>
              <small className="np3-hint">JPG, PNG, GIF o WEBP · máx. 10MB</small>
            </div>
          </div>

          {/* Datos para sugerencia de precio */}
          <div className="np3-card np3-card-ia">
            <div className="np3-card-num">2</div>
            <div className="np3-card-body">
              <h3><AiOutlineBulb size={16} /> Datos para Sugerencia de Precio</h3>
              <p className="np3-nota">
                Categoría, Material y Peso son obligatorios para calcular el precio sugerido. Personalización también ajusta la sugerencia si la activas.
              </p>

              <div className="np3-row">
                <div className="np3-field">
                  <label htmlFor="categoria_id">Categoría <span className="np3-req">*</span></label>
                  <select id="categoria_id" name="categoria_id" value={formData.categoria_id || ''} onChange={handleInputChange} required>
                    <option value="">Seleccionar categoría</option>
                    {categorias.map(cat => <option key={cat.id} value={cat.id}>{cat.nombre}</option>)}
                  </select>
                </div>
                <div className="np3-field">
                  <label htmlFor="material_principal">Material Principal <span className="np3-req">*</span></label>
                  <select id="material_principal" name="material_principal" value={formData.material_principal} onChange={handleInputChange}>
                    <option value="">Seleccionar material</option>
                    <option value="Plata">Plata</option>
                    <option value="Plata ley .925">Plata ley .925</option>
                    <option value="Chapa de oro">Chapa de oro</option>
                    <option value="Laminado de oro">Laminado de oro</option>
                    <option value="Baño en rodio">Baño en rodio</option>
                    <option value="Acero/cuentas plásticas (bisutería)">Acero/cuentas plásticas (bisutería)</option>
                  </select>
                </div>
                <div className="np3-field">
                  <label htmlFor="peso_gramos">Peso (gramos) <span className="np3-req">*</span></label>
                  <input type="number" id="peso_gramos" name="peso_gramos" step="0.01" min="0" value={formData.peso_gramos || ''} onChange={handleInputChange} placeholder="Ej: 2.5" />
                </div>
              </div>

              <div className="np3-toggle-row" onClick={() => toggleField('permite_personalizacion')}>
                <span className={`np3-toggle ${formData.permite_personalizacion ? 'on' : ''}`}><span className="np3-toggle-knob" /></span>
                <span className="np3-toggle-text">Permite personalización</span>
              </div>
              {formData.permite_personalizacion && (
                <div className="np3-field">
                  <label htmlFor="precio_personalizacion">Cargo extra por personalización ($)</label>
                  <input type="number" id="precio_personalizacion" name="precio_personalizacion" step="0.01" min="0" value={formData.precio_personalizacion || ''} onChange={handleInputChange} placeholder="Ej: 150" />
                </div>
              )}
            </div>
          </div>

          {/* Información Básica */}
          <div className="np3-card">
            <div className="np3-card-num">3</div>
            <div className="np3-card-body">
              <h3><AiOutlineFileText size={16} /> Información Básica</h3>

              <div className="np3-field np3-field-full">
                <label htmlFor="nombre">Nombre del Producto <span className="np3-req">*</span></label>
                <input type="text" id="nombre" name="nombre" value={formData.nombre} onChange={handleInputChange} maxLength={200} placeholder="Ej: Pulsera de Oro Blanco" required />
                <small>{formData.nombre.length}/200</small>
              </div>

              <div className="np3-field np3-field-full">
                <label htmlFor="descripcion">Descripción</label>
                <textarea id="descripcion" name="descripcion" value={formData.descripcion} onChange={handleInputChange} placeholder="Describe las características principales del producto" rows={3} />
              </div>

              <div className="np3-field">
                <label htmlFor="tipo_producto_id">Tipo de Producto</label>
                <select id="tipo_producto_id" name="tipo_producto_id" value={formData.tipo_producto_id || ''} onChange={handleInputChange}>
                  <option value="">Seleccionar tipo</option>
                  {tiposProducto.map(tipo => <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Referencias */}
          <div className="np3-card">
            <div className="np3-card-num">4</div>
            <div className="np3-card-body">
              <h3><AiOutlineLink size={16} /> Referencias</h3>
              <div className="np3-row">
                <div className="np3-field">
                  <label htmlFor="proveedor_id">Proveedor</label>
                  <select id="proveedor_id" name="proveedor_id" value={formData.proveedor_id || ''} onChange={handleInputChange}>
                    <option value="">Seleccionar proveedor</option>
                    {proveedores.map(prov => <option key={prov.id} value={prov.id}>{prov.nombre}</option>)}
                  </select>
                </div>
                <div className="np3-field">
                  <label htmlFor="temporada_id">Temporada</label>
                  <select id="temporada_id" name="temporada_id" value={formData.temporada_id || ''} onChange={handleInputChange}>
                    <option value="">Seleccionar temporada</option>
                    {temporadas.map(temp => <option key={temp.id} value={temp.id}>{temp.nombre}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Precios */}
          <div className="np3-card">
            <div className="np3-card-num">5</div>
            <div className="np3-card-body">
              <h3><AiOutlineDollarCircle size={16} /> Precios</h3>
              <p className="np3-nota">IVA: {ivaConfig}% · Margen: {margenConfig}%</p>

              <div className="np3-row">
                <div className="np3-field">
                  <label htmlFor="precio_compra">Precio de Compra <span className="np3-req">*</span></label>
                  <input type="number" id="precio_compra" name="precio_compra" step="0.01" min="0" value={formData.precio_compra || ''} onChange={handleInputChange} placeholder="Ej: 100.00" required />
                </div>
                <div className="np3-field">
                  <label>Precio de Venta (Calculado)</label>
                  <div className="np3-readonly">${precioVentaCalculado.toFixed(2)}</div>
                </div>
              </div>

              <div className="np3-field">
                <label htmlFor="precio_oferta">Precio en Oferta (opcional)</label>
                <input type="number" id="precio_oferta" name="precio_oferta" step="0.01" min="0" value={formData.precio_oferta || ''} onChange={handleInputChange} placeholder="Ej: 80.00" />
              </div>
            </div>
          </div>

          {/* Stock */}
          <div className="np3-card">
            <div className="np3-card-num">6</div>
            <div className="np3-card-body">
              <h3><AiOutlineInbox size={16} /> Stock</h3>
              <p className="np3-nota">Rango global: {stockMinimoDefault} – {stockMaximoDefault} unidades</p>

              <div className="np3-row">
                <div className="np3-field">
                  <label htmlFor="stock_actual">Stock Inicial</label>
                  <input type="number" id="stock_actual" name="stock_actual" min="0" max={stockMaximoDefault} value={formData.stock_actual} onChange={handleInputChange} placeholder={stockMinimoDefault.toString()} />
                </div>
                <div className="np3-field">
                  <label htmlFor="ubicacion_fisica">Ubicación Física</label>
                  <input type="text" id="ubicacion_fisica" name="ubicacion_fisica" placeholder="Ej: Estante A-3" value={formData.ubicacion_fisica} onChange={handleInputChange} />
                </div>
              </div>
            </div>
          </div>

          {/* Características */}
          <div className="np3-card">
            <div className="np3-card-num">7</div>
            <div className="np3-card-body">
              <h3><AiOutlineStar size={16} /> Características Especiales</h3>

              <div className="np3-toggle-row" onClick={() => toggleField('tiene_medidas')}>
                <span className={`np3-toggle ${formData.tiene_medidas ? 'on' : ''}`}><span className="np3-toggle-knob" /></span>
                <span className="np3-toggle-text">Tiene medidas personalizables</span>
              </div>
              {formData.tiene_medidas && (
                <div className="np3-field">
                  <label htmlFor="medidas">Especificaciones de Medidas</label>
                  <textarea id="medidas" name="medidas" value={formData.medidas} onChange={handleInputChange} placeholder="Ej: Largo 15cm, Ancho 2cm | Talla: XS a XL" rows={2} />
                </div>
              )}
            </div>
          </div>

          {/* Lugares de entrega */}
          <div className="np3-card">
            <div className="np3-card-num">8</div>
            <div className="np3-card-body">
              <h3><AiOutlineEnvironment size={16} /> Lugares de Entrega</h3>

              <div className="np3-ubicaciones-sugeridas">
                {UBICACIONES_SUGERIDAS.filter(u => !formData.ubicaciones_entrega.includes(u)).map(u => (
                  <button type="button" key={u} className="np3-ubicacion-sugerida" style={{ borderColor: colorDeUbicacion(u), color: colorDeUbicacion(u) }} onClick={() => agregarUbicacion(u)}>
                    + {u}
                  </button>
                ))}
              </div>
              <div className="np3-ubicacion-input-row">
                <input
                  type="text"
                  value={nuevaUbicacion}
                  onChange={e => setNuevaUbicacion(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); agregarUbicacion(nuevaUbicacion); } }}
                  placeholder="Otra ubicación..."
                />
                <button type="button" className="np3-btn-agregar-ubicacion" onClick={() => agregarUbicacion(nuevaUbicacion)}>Agregar</button>
              </div>
              {formData.ubicaciones_entrega.length > 0 && (
                <div className="np3-ubicaciones-chips">
                  {formData.ubicaciones_entrega.map(u => (
                    <span key={u} className="np3-ubicacion-chip" style={{ background: colorDeUbicacion(u) }}>
                      {u}
                      <button type="button" onClick={() => quitarUbicacion(u)}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Estado */}
          <div className="np3-card">
            <div className="np3-card-num">9</div>
            <div className="np3-card-body">
              <h3><AiOutlineEye size={16} /> Estado y Visibilidad</h3>

              <div className="np3-toggle-row" onClick={() => toggleField('es_nuevo')}>
                <span className={`np3-toggle ${formData.es_nuevo ? 'on' : ''}`}><span className="np3-toggle-knob" /></span>
                <span className="np3-toggle-text">Marcar como nuevo</span>
              </div>
              <div className="np3-toggle-row" onClick={() => toggleField('es_destacado')}>
                <span className={`np3-toggle ${formData.es_destacado ? 'on' : ''}`}><span className="np3-toggle-knob" /></span>
                <span className="np3-toggle-text">Destacar en tienda</span>
              </div>
              <div className="np3-toggle-row" onClick={() => toggleField('activo')}>
                <span className={`np3-toggle ${formData.activo ? 'on' : ''}`}><span className="np3-toggle-knob" /></span>
                <span className="np3-toggle-text">Activo / Visible</span>
              </div>
            </div>
          </div>

          <div className="np3-actions">
            <button type="button" className="np3-btn-cancel" onClick={() => navigate('/admin-dashboard')}>
              Cancelar
            </button>
            <button type="submit" className="np3-btn-save" disabled={loading || uploadingImage}>
              <AiOutlineCheck size={18} />
              {loading ? 'Guardando...' : 'Guardar Producto'}
            </button>
          </div>
        </form>

        {/* Sidebar: precio sugerido + vista previa */}
        <aside className="np3-sidebar">
          <div className="np3-sidebar-sticky">

            <span className="np3-preview-eyebrow">Precio sugerido</span>
            {!loadingSugerido && !precioSugerido && (
              <div className="np3-ia-placeholder">
                <AiOutlineBulb size={26} />
                <p>Completa material, categoría y peso para calcular el precio ideal automáticamente</p>
              </div>
            )}
            {loadingSugerido && (
              <div className="np3-ia-widget">
                <div className="np3-ia-calculando">
                  <div className="np3-ia-dots"><span /><span /><span /></div>
                  <span>Calculando precio óptimo...</span>
                </div>
              </div>
            )}
            {!loadingSugerido && precioSugerido && (
              <div className="np3-ia-widget">
                <div className="np3-ia-precio">
                  <span>$</span>{precioSugerido.precio_sugerido.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  <small>MXN</small>
                </div>
                <div className="np3-ia-rango">
                  Rango: <strong>${precioSugerido.rango_min.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong> – <strong>${precioSugerido.rango_max.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                </div>
              </div>
            )}
            {precioSugerido?.comparativa && precioSugerido.comparativa.length > 0 && (
              <div className="np3-comparativa">
                <p><AiOutlineBarChart size={14} /> Comparativa con productos similares</p>
                <div className="np3-comparativa-barras">
                  {(() => {
                    const max = Math.max(...precioSugerido.comparativa!.map(p => p.precio));
                    return precioSugerido.comparativa!.map((p, i) => (
                      <div key={i} className="np3-barra-item">
                        <div className="np3-barra-wrap">
                          <div className="np3-barra" style={{ height: `${Math.max(20, (p.precio / max) * 90)}px` }} />
                        </div>
                        <span className="np3-barra-valor">${p.precio.toFixed(0)}</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}

            <span className="np3-preview-eyebrow np3-preview-eyebrow-2">Vista previa</span>
            <div className="np3-preview-card">
              <div className="np3-preview-media">
                {imagePreview ? <img src={imagePreview} alt="" /> : <AiOutlinePicture size={24} />}
                {formData.es_nuevo && <span className="np3-preview-badge new">Nuevo</span>}
                {formData.es_destacado && <span className="np3-preview-badge featured">Destacado</span>}
              </div>
              <div className="np3-preview-body">
                <h4>{formData.nombre || 'Nombre del producto'}</h4>
                {categoriaNombre && <p className="np3-preview-categoria">{categoriaNombre}</p>}
                <div className="np3-preview-precio">
                  {precioVentaCalculado > 0 ? `$${precioVentaCalculado.toFixed(2)}` : '$0.00'}
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default AdminNuevoProductoScreen;
