// Frontend/src/screens/admin/AdminEditarProductoScreen.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  AiOutlineCheck, AiOutlineClose, AiOutlineUpload, AiOutlineDelete, AiOutlineEdit,
  AiOutlineFileText, AiOutlineLink, AiOutlineDollarCircle, AiOutlinePicture, AiOutlineInbox,
  AiOutlineStar, AiOutlineEye, AiOutlineCheckCircle, AiOutlineEnvironment, AiOutlineCamera,
} from 'react-icons/ai';
import { productsAPI, uploadAPI } from '../../services/api';
import { UBICACIONES_SUGERIDAS, colorDeUbicacion } from '../../utils/ubicacionesEntrega';
import './AdminEditarProductoScreen.css';

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
  dias_fabricacion: number;
  ubicaciones_entrega: string[];
  imagen_principal: string;
  imagen_public_id?: string;
  es_nuevo: boolean;
  es_destacado: boolean;
  activo: boolean;
}

const AdminEditarProductoScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
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

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentImagePublicId, setCurrentImagePublicId] = useState<string>('');

  const [formData, setFormData] = useState<FormData>({
    nombre: '', descripcion: '', categoria_id: null, proveedor_id: null, temporada_id: null,
    tipo_producto_id: null, material_principal: '', peso_gramos: null, precio_compra: null,
    precio_oferta: null, stock_actual: 0, ubicacion_fisica: '', tiene_medidas: false, medidas: '',
    permite_personalizacion: false, precio_personalizacion: 0, dias_fabricacion: 0,
    ubicaciones_entrega: [], imagen_principal: '', es_nuevo: false, es_destacado: false, activo: true
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
      if (!id) return;
      try {
        setLoadingData(true);
        const productResponse = await productsAPI.getById(Number.parseInt(id));
        if (!productResponse.success) {
          setError('No se pudo cargar el producto');
          return;
        }
        const producto = productResponse.data;
        setFormData({
          nombre: producto.nombre || '',
          descripcion: producto.descripcion || '',
          categoria_id: producto.categoria_id || null,
          proveedor_id: producto.proveedor_id || null,
          temporada_id: producto.temporada_id || null,
          tipo_producto_id: producto.tipo_producto_id || null,
          material_principal: producto.material_principal || '',
          peso_gramos: producto.peso_gramos || null,
          precio_compra: producto.precio_compra || null,
          precio_oferta: producto.precio_oferta || null,
          stock_actual: producto.stock_actual || 0,
          ubicacion_fisica: producto.ubicacion_fisica || '',
          tiene_medidas: producto.tiene_medidas || false,
          medidas: typeof producto.medidas === 'string' ? producto.medidas : JSON.stringify(producto.medidas) || '',
          permite_personalizacion: producto.permite_personalizacion || false,
          precio_personalizacion: producto.precio_personalizacion || 0,
          dias_fabricacion: producto.dias_fabricacion || 0,
          ubicaciones_entrega: Array.isArray(producto.ubicaciones_entrega) ? producto.ubicaciones_entrega : [],
          imagen_principal: producto.imagen_principal || '',
          es_nuevo: producto.es_nuevo || false,
          es_destacado: producto.es_destacado || false,
          activo: producto.activo !== false
        });

        if (producto.imagen_principal) setImagePreview(producto.imagen_principal);

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
          if (stockMinimo) setStockMinimoDefault(Number.parseInt(stockMinimo.valor));
          if (stockMaximo) setStockMaximoDefault(Number.parseInt(stockMaximo.valor));
        }
      } catch (err: any) {
        console.error('Error cargando datos:', err);
        setError(err.message || 'Error al cargar los datos');
      } finally {
        setLoadingData(false);
      }
    };
    loadData();
  }, [id]);

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
    } else if (type === 'number') {
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
      const response = currentImagePublicId
        ? await uploadAPI.updateImage(selectedFile, currentImagePublicId, 'joyeria/productos')
        : await uploadAPI.uploadImage(selectedFile, 'joyeria/productos');

      if (response.success) {
        setFormData(prev => ({ ...prev, imagen_principal: response.data.url, imagen_public_id: response.data.publicId }));
        setCurrentImagePublicId(response.data.publicId);
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
    if (!formData.categoria_id) { setError('Debe seleccionar una categoría'); return false; }
    if (!formData.precio_compra || formData.precio_compra <= 0) { setError('El precio de compra debe ser mayor a 0'); return false; }
    if (formData.stock_actual < 0) { setError('El stock no puede ser negativo'); return false; }
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
      const response = await productsAPI.update(Number.parseInt(id!), dataToSend);

      if (response.success) {
        setSuccess(true);
        alert('¡Producto actualizado exitosamente!');
        setTimeout(() => navigate(`/admin/producto/${id}`), 1000);
      } else {
        setError(response.message || 'Error al actualizar el producto');
      }
    } catch (err: any) {
      setError(err.message || 'Error al actualizar el producto');
    } finally {
      setLoading(false);
    }
  };

  const precioVentaCalculado = calcularPrecioVenta(formData.precio_compra);
  const categoriaNombre = categorias.find(c => c.id === formData.categoria_id)?.nombre;

  if (loadingData) {
    return (
      <div className="ep3-loading">
        <div className="ep3-spinner" />
        <p>Cargando producto...</p>
      </div>
    );
  }

  return (
    <div className="ep3-container">
      <div className="ep3-header">
        <h1><AiOutlineEdit size={22} /> Editar Producto</h1>
        <p>Actualiza la información del producto #{id}</p>
      </div>

      {error && (
        <div className="ep3-alert ep3-alert-error">
          <AiOutlineClose size={18} />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="ep3-alert ep3-alert-success">
          <AiOutlineCheckCircle size={18} />
          <span>¡Producto actualizado exitosamente!</span>
        </div>
      )}

      <div className="ep3-layout">
        <form onSubmit={handleSubmit} className="ep3-form">

          {/* Foto */}
          <div className="ep3-card">
            <div className="ep3-card-num">1</div>
            <div className="ep3-card-body">
              <h3><AiOutlineCamera size={16} /> Imagen del Producto</h3>

              <div className="ep3-photo-row">
                <div className="ep3-photo-preview">
                  {imagePreview ? <img src={imagePreview} alt="Vista previa" /> : <AiOutlinePicture size={26} />}
                </div>
                <div className="ep3-photo-actions">
                  <label className="ep3-photo-upload">
                    <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleImageChange} disabled={uploadingImage} hidden />
                    <AiOutlineUpload size={15} /> {imagePreview ? 'Cambiar imagen' : 'Subir imagen'}
                  </label>
                  {selectedFile && (
                    <button type="button" className="ep3-photo-confirm" onClick={handleUploadImage} disabled={uploadingImage}>
                      <AiOutlineCheck size={14} /> {uploadingImage ? 'Subiendo...' : 'Confirmar subida'}
                    </button>
                  )}
                  {imagePreview && (
                    <button type="button" className="ep3-photo-remove" onClick={handleRemoveImage}>
                      <AiOutlineDelete size={14} /> Quitar
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Información Básica */}
          <div className="ep3-card">
            <div className="ep3-card-num">2</div>
            <div className="ep3-card-body">
              <h3><AiOutlineFileText size={16} /> Información Básica</h3>

              <div className="ep3-field ep3-field-full">
                <label htmlFor="nombre">Nombre del Producto <span className="ep3-req">*</span></label>
                <input type="text" id="nombre" name="nombre" value={formData.nombre} onChange={handleInputChange} maxLength={200} required />
              </div>

              <div className="ep3-field ep3-field-full">
                <label htmlFor="descripcion">Descripción</label>
                <textarea id="descripcion" name="descripcion" value={formData.descripcion} onChange={handleInputChange} rows={3} />
              </div>

              <div className="ep3-row">
                <div className="ep3-field">
                  <label htmlFor="categoria_id">Categoría <span className="ep3-req">*</span></label>
                  <select id="categoria_id" name="categoria_id" value={formData.categoria_id || ''} onChange={handleInputChange} required>
                    <option value="">Seleccionar categoría</option>
                    {categorias.map(cat => <option key={cat.id} value={cat.id}>{cat.nombre}</option>)}
                  </select>
                </div>
                <div className="ep3-field">
                  <label htmlFor="tipo_producto_id">Tipo de Producto</label>
                  <select id="tipo_producto_id" name="tipo_producto_id" value={formData.tipo_producto_id || ''} onChange={handleInputChange}>
                    <option value="">Seleccionar tipo</option>
                    {tiposProducto.map(tipo => <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Referencias + Material */}
          <div className="ep3-card">
            <div className="ep3-card-num">3</div>
            <div className="ep3-card-body">
              <h3><AiOutlineLink size={16} /> Referencias y Material</h3>

              <div className="ep3-row">
                <div className="ep3-field">
                  <label htmlFor="proveedor_id">Proveedor</label>
                  <select id="proveedor_id" name="proveedor_id" value={formData.proveedor_id || ''} onChange={handleInputChange}>
                    <option value="">Seleccionar proveedor</option>
                    {proveedores.map(prov => <option key={prov.id} value={prov.id}>{prov.nombre}</option>)}
                  </select>
                </div>
                <div className="ep3-field">
                  <label htmlFor="temporada_id">Temporada</label>
                  <select id="temporada_id" name="temporada_id" value={formData.temporada_id || ''} onChange={handleInputChange}>
                    <option value="">Seleccionar temporada</option>
                    {temporadas.map(temp => <option key={temp.id} value={temp.id}>{temp.nombre}</option>)}
                  </select>
                </div>
              </div>

              <div className="ep3-row">
                <div className="ep3-field">
                  <label htmlFor="material_principal">Material Principal</label>
                  <select id="material_principal" name="material_principal" value={formData.material_principal} onChange={handleInputChange}>
                    <option value="">Seleccionar material</option>
                    <option value="Oro">Oro</option>
                    <option value="Plata">Plata</option>
                    <option value="Platino">Platino</option>
                    <option value="Acero">Acero Quirúrgico</option>
                    <option value="Bronce">Bronce</option>
                    <option value="Cobre">Cobre</option>
                    <option value="Otras">Otras</option>
                  </select>
                </div>
                <div className="ep3-field">
                  <label htmlFor="peso_gramos">Peso (gramos)</label>
                  <input type="number" id="peso_gramos" name="peso_gramos" step="0.01" min="0" value={formData.peso_gramos || ''} onChange={handleInputChange} />
                </div>
              </div>
            </div>
          </div>

          {/* Precios */}
          <div className="ep3-card">
            <div className="ep3-card-num">4</div>
            <div className="ep3-card-body">
              <h3><AiOutlineDollarCircle size={16} /> Precios</h3>
              <p className="ep3-nota">IVA: {ivaConfig}% · Margen: {margenConfig}%</p>

              <div className="ep3-row">
                <div className="ep3-field">
                  <label htmlFor="precio_compra">Precio de Compra <span className="ep3-req">*</span></label>
                  <input type="number" id="precio_compra" name="precio_compra" step="0.01" min="0" value={formData.precio_compra || ''} onChange={handleInputChange} required />
                </div>
                <div className="ep3-field">
                  <label>Precio de Venta (Calculado)</label>
                  <div className="ep3-readonly">${precioVentaCalculado.toFixed(2)}</div>
                </div>
              </div>

              <div className="ep3-field">
                <label htmlFor="precio_oferta">Precio en Oferta (opcional)</label>
                <input type="number" id="precio_oferta" name="precio_oferta" step="0.01" min="0" value={formData.precio_oferta || ''} onChange={handleInputChange} />
              </div>
            </div>
          </div>

          {/* Stock */}
          <div className="ep3-card">
            <div className="ep3-card-num">5</div>
            <div className="ep3-card-body">
              <h3><AiOutlineInbox size={16} /> Stock</h3>
              <p className="ep3-nota">Rango global: {stockMinimoDefault} – {stockMaximoDefault} unidades</p>

              <div className="ep3-row">
                <div className="ep3-field">
                  <label htmlFor="stock_actual">Stock Actual</label>
                  <input type="number" id="stock_actual" name="stock_actual" min="0" value={formData.stock_actual} onChange={handleInputChange} />
                </div>
                <div className="ep3-field">
                  <label htmlFor="ubicacion_fisica">Ubicación Física</label>
                  <input type="text" id="ubicacion_fisica" name="ubicacion_fisica" value={formData.ubicacion_fisica} onChange={handleInputChange} placeholder="Ej: Estante A-3" />
                </div>
              </div>
            </div>
          </div>

          {/* Características */}
          <div className="ep3-card">
            <div className="ep3-card-num">6</div>
            <div className="ep3-card-body">
              <h3><AiOutlineStar size={16} /> Características</h3>

              <div className="ep3-field">
                <label htmlFor="dias_fabricacion">Días de Fabricación</label>
                <input type="number" id="dias_fabricacion" name="dias_fabricacion" min="0" value={formData.dias_fabricacion} onChange={handleInputChange} />
              </div>

              <div className="ep3-toggle-row" onClick={() => toggleField('tiene_medidas')}>
                <span className={`ep3-toggle ${formData.tiene_medidas ? 'on' : ''}`}><span className="ep3-toggle-knob" /></span>
                <span className="ep3-toggle-text">Tiene medidas personalizables</span>
              </div>
              {formData.tiene_medidas && (
                <div className="ep3-field">
                  <label htmlFor="medidas">Especificaciones de Medidas</label>
                  <textarea id="medidas" name="medidas" value={formData.medidas} onChange={handleInputChange} rows={2} />
                </div>
              )}

              <div className="ep3-toggle-row" onClick={() => toggleField('permite_personalizacion')}>
                <span className={`ep3-toggle ${formData.permite_personalizacion ? 'on' : ''}`}><span className="ep3-toggle-knob" /></span>
                <span className="ep3-toggle-text">Permite personalización</span>
              </div>
              {formData.permite_personalizacion && (
                <div className="ep3-field">
                  <label htmlFor="precio_personalizacion">Cargo extra por personalización ($)</label>
                  <input type="number" id="precio_personalizacion" name="precio_personalizacion" step="0.01" min="0" value={formData.precio_personalizacion || ''} onChange={handleInputChange} placeholder="Ej: 150" />
                </div>
              )}
            </div>
          </div>

          {/* Lugares de entrega */}
          <div className="ep3-card">
            <div className="ep3-card-num">7</div>
            <div className="ep3-card-body">
              <h3><AiOutlineEnvironment size={16} /> Lugares de Entrega</h3>

              <div className="ep3-ubicaciones-sugeridas">
                {UBICACIONES_SUGERIDAS.filter(u => !formData.ubicaciones_entrega.includes(u)).map(u => (
                  <button type="button" key={u} className="ep3-ubicacion-sugerida" style={{ borderColor: colorDeUbicacion(u), color: colorDeUbicacion(u) }} onClick={() => agregarUbicacion(u)}>
                    + {u}
                  </button>
                ))}
              </div>
              <div className="ep3-ubicacion-input-row">
                <input
                  type="text"
                  value={nuevaUbicacion}
                  onChange={e => setNuevaUbicacion(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); agregarUbicacion(nuevaUbicacion); } }}
                  placeholder="Otra ubicación..."
                />
                <button type="button" className="ep3-btn-agregar-ubicacion" onClick={() => agregarUbicacion(nuevaUbicacion)}>Agregar</button>
              </div>
              {formData.ubicaciones_entrega.length > 0 && (
                <div className="ep3-ubicaciones-chips">
                  {formData.ubicaciones_entrega.map(u => (
                    <span key={u} className="ep3-ubicacion-chip" style={{ background: colorDeUbicacion(u) }}>
                      {u}
                      <button type="button" onClick={() => quitarUbicacion(u)}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Estado */}
          <div className="ep3-card">
            <div className="ep3-card-num">8</div>
            <div className="ep3-card-body">
              <h3><AiOutlineEye size={16} /> Estado y Visibilidad</h3>

              <div className="ep3-toggle-row" onClick={() => toggleField('es_nuevo')}>
                <span className={`ep3-toggle ${formData.es_nuevo ? 'on' : ''}`}><span className="ep3-toggle-knob" /></span>
                <span className="ep3-toggle-text">Marcar como nuevo</span>
              </div>
              <div className="ep3-toggle-row" onClick={() => toggleField('es_destacado')}>
                <span className={`ep3-toggle ${formData.es_destacado ? 'on' : ''}`}><span className="ep3-toggle-knob" /></span>
                <span className="ep3-toggle-text">Destacar en tienda</span>
              </div>
              <div className="ep3-toggle-row" onClick={() => toggleField('activo')}>
                <span className={`ep3-toggle ${formData.activo ? 'on' : ''}`}><span className="ep3-toggle-knob" /></span>
                <span className="ep3-toggle-text">Activo / Visible</span>
              </div>
            </div>
          </div>

          <div className="ep3-actions">
            <button type="button" className="ep3-btn-cancel" onClick={() => navigate(`/admin/producto/${id}`)}>
              Cancelar
            </button>
            <button type="submit" className="ep3-btn-save" disabled={loading || uploadingImage}>
              <AiOutlineCheck size={18} />
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>

        {/* Vista previa en vivo */}
        <aside className="ep3-preview">
          <div className="ep3-preview-sticky">
            <span className="ep3-preview-eyebrow">Vista previa</span>
            <div className="ep3-preview-card">
              <div className="ep3-preview-media">
                {imagePreview ? <img src={imagePreview} alt="" /> : <AiOutlinePicture size={26} />}
                {formData.es_nuevo && <span className="ep3-preview-badge new">Nuevo</span>}
                {formData.es_destacado && <span className="ep3-preview-badge featured">Destacado</span>}
              </div>

              <div className="ep3-preview-body">
                <span className={`ep3-preview-estado ${formData.activo ? 'on' : 'off'}`}>
                  {formData.activo ? 'Activo' : 'Inactivo'}
                </span>
                <h4>{formData.nombre || 'Nombre del producto'}</h4>
                {categoriaNombre && <p className="ep3-preview-categoria">{categoriaNombre}</p>}

                <div className="ep3-preview-precio">
                  {precioVentaCalculado > 0 ? `$${precioVentaCalculado.toFixed(2)}` : '$0.00'}
                  {formData.precio_oferta ? <span> · oferta ${Number(formData.precio_oferta).toFixed(2)}</span> : null}
                </div>

                <div className="ep3-preview-divider" />

                <div className="ep3-preview-item">
                  <AiOutlineInbox size={14} />
                  <span>{formData.stock_actual} unidades en stock</span>
                </div>
                {formData.ubicacion_fisica && (
                  <div className="ep3-preview-item">
                    <AiOutlineEnvironment size={14} />
                    <span>{formData.ubicacion_fisica}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default AdminEditarProductoScreen;
