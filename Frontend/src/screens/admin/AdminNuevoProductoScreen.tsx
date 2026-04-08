// Frontend/src/screens/admin/AdminNuevoProductoScreen.tsx
import React, { useState, useEffect } from 'react';
import { AiOutlineArrowLeft, AiOutlineCheck, AiOutlineClose, AiOutlineForm, AiOutlineUpload, AiOutlineDelete } from 'react-icons/ai';
import { useNavigate } from 'react-router-dom';
import { productsAPI, uploadAPI } from '../../services/api';
import './AdminNuevoProductoScreen.css';

interface Category {
  id: number;
  nombre: string;
}

interface Proveedor {
  id: number;
  nombre: string;
}

interface Temporada {
  id: number;
  nombre: string;
}

interface TipoProducto {
  id: number;
  nombre: string;
}

interface Configuracion {
  id: number;
  clave: string;
  valor: string;
  tipo_dato: string;
}

interface FormData {
  // Información básica
  nombre: string;
  descripcion: string;
  categoria_id: number | null;
  
  // Referencias a otras tablas
  proveedor_id: number | null;
  temporada_id: number | null;
  tipo_producto_id: number | null;
  
  // Material e información física
  material_principal: string;
  peso_gramos: number | null;
  
  // Precios (solo precio_compra, precio_venta se calcula)
  precio_compra: number | null;
  precio_oferta: number | null;
  
  // Stock (usaremos valores de configuración)
  stock_actual: number;
  
  // Ubicación y características
  ubicacion_fisica: string;
  tiene_medidas: boolean;
  medidas: string;
  permite_personalizacion: boolean;
  dias_fabricacion: number;
  
  // Imagen
  imagen_principal: string;
  imagen_public_id?: string; // Para Cloudinary
  
  // Estado
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
  
  // Datos de referencia
  const [categorias, setCategorias] = useState<Category[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [temporadas, setTemporadas] = useState<Temporada[]>([]);
  const [tiposProducto, setTiposProducto] = useState<TipoProducto[]>([]);
  
  // Configuración
  const [ivaConfig, setIvaConfig] = useState<number>(16);
  const [margenConfig, setMargenConfig] = useState<number>(40);
  const [stockMinimoDefault, setStockMinimoDefault] = useState<number>(5);
  const [stockMaximoDefault, setStockMaximoDefault] = useState<number>(999);
  
  // Vista previa de imagen
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Formulario
  const [formData, setFormData] = useState<FormData>({
    nombre: '',
    descripcion: '',
    categoria_id: null,
    proveedor_id: null,
    temporada_id: null,
    tipo_producto_id: null,
    material_principal: '',
    peso_gramos: null,
    precio_compra: null,
    precio_oferta: null,
    stock_actual: 0,
    ubicacion_fisica: '',
    tiene_medidas: false,
    medidas: '',
    permite_personalizacion: false,
    dias_fabricacion: 0,
    imagen_principal: '',
    es_nuevo: false,
    es_destacado: false,
    activo: true,
    creado_por: null
  });

  // Cargar datos de referencia
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
        
        if (categoriasRes.success) {
          setCategorias(Array.isArray(categoriasRes.data) ? categoriasRes.data : categoriasRes.data || []);
        }
        if (proveedoresRes.success) {
          setProveedores(Array.isArray(proveedoresRes.data) ? proveedoresRes.data : []);
        }
        if (temporadasRes.success) {
          setTemporadas(Array.isArray(temporadasRes.data) ? temporadasRes.data : []);
        }
        if (tiposRes.success) {
          setTiposProducto(Array.isArray(tiposRes.data) ? tiposRes.data : []);
        }
        if (configRes.success) {
          const configs = Array.isArray(configRes.data) ? configRes.data : [];
          
          // Configuración de precios
          const iva = configs.find((c: Configuracion) => c.clave === 'iva_porcentaje');
          const margen = configs.find((c: Configuracion) => c.clave === 'margen_ganancia_default');
          
          // Configuración de stock
          const stockMinimo = configs.find((c: Configuracion) => c.clave === 'stock_minimo_default');
          const stockMaximo = configs.find((c: Configuracion) => c.clave === 'stock_maximo_default');
          
          if (iva) setIvaConfig(parseFloat(iva.valor));
          if (margen) setMargenConfig(parseFloat(margen.valor));
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

  // Calcular precio de venta automáticamente
  const calcularPrecioVenta = (precioCompra: number | null): number => {
    if (!precioCompra || precioCompra <= 0) return 0;
    
    const precioConMargen = precioCompra * (1 + margenConfig / 100);
    const precioConIva = precioConMargen * (1 + ivaConfig / 100);
    
    return parseFloat(precioConIva.toFixed(2));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked
      }));
    } else if (type === 'number') {
      const numValue = value === '' ? null : parseFloat(value);
      setFormData(prev => ({
        ...prev,
        [name]: numValue
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Manejar selección de imagen
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      // Crear vista previa
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Subir imagen a Cloudinary
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
        setFormData(prev => ({
          ...prev,
          imagen_principal: response.data.url,
          imagen_public_id: response.data.publicId
        }));
        return true;
      } else {
        setError(response.message || 'Error al subir la imagen');
        return false;
      }
    } catch (err: any) {
      console.error('Error uploading image:', err);
      setError(err.message || 'Error al subir la imagen');
      return false;
    } finally {
      setUploadingImage(false);
    }
  };

  // Eliminar imagen seleccionada
  const handleRemoveImage = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setFormData(prev => ({
      ...prev,
      imagen_principal: '',
      imagen_public_id: undefined
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.nombre.trim()) {
      setError('El nombre del producto es requerido');
      return false;
    }

    if (formData.nombre.length > 200) {
      setError('El nombre no puede exceder 200 caracteres');
      return false;
    }

    if (!formData.categoria_id) {
      setError('Debe seleccionar una categoría');
      return false;
    }

    if (!formData.precio_compra || formData.precio_compra <= 0) {
      setError('El precio de compra debe ser mayor a 0');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    // Si hay imagen pendiente por subir, subirla primero
    if (selectedFile && !formData.imagen_principal) {
      const uploaded = await handleUploadImage();
      if (!uploaded) return;
    }

    setLoading(true);

    try {
      const precioVenta = calcularPrecioVenta(formData.precio_compra);
      
      const dataToSend = {
        ...formData,
        precio_venta: precioVenta,
        margen_ganancia: margenConfig,
        stock_minimo: stockMinimoDefault,
        stock_maximo: stockMaximoDefault
      };

      const response = await productsAPI.create(dataToSend);

      if (response.success) {
        setSuccess(true);
        alert('¡Producto registrado exitosamente!');
        
        setTimeout(() => {
          setFormData({
            nombre: '',
            descripcion: '',
            categoria_id: null,
            proveedor_id: null,
            temporada_id: null,
            tipo_producto_id: null,
            material_principal: '',
            peso_gramos: null,
            precio_compra: null,
            precio_oferta: null,
            stock_actual: stockMinimoDefault,
            ubicacion_fisica: '',
            tiene_medidas: false,
            medidas: '',
            permite_personalizacion: false,
            dias_fabricacion: 0,
            imagen_principal: '',
            es_nuevo: false,
            es_destacado: false,
            activo: true,
            creado_por: null
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

  const precioVentaCalculado = calcularPrecioVenta(formData.precio_compra);

  return (
    <div className="admin-nuevo-producto-container">
      <div className="producto-form-wrapper">
        {/* Header */}
        <div className="producto-form-header">
          <button 
            className="btn-back"
            onClick={() => navigate('/admin-dashboard')}
          >
            <AiOutlineArrowLeft size={20} />
            <span>Volver</span>
          </button>
          <h1>
            <AiOutlineForm size={28} />
            Agregar Nuevo Producto
          </h1>
        </div>

        {/* Alerts */}
        {error && (
          <div className="alert alert-error">
            <AiOutlineClose size={20} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            <AiOutlineCheck size={20} />
            <span>¡Producto creado exitosamente!</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="producto-form">

          {/* SECCIÓN 1: INFORMACIÓN BÁSICA */}
          <fieldset className="form-section">
            <legend>📋 Información Básica</legend>
            
            <div className="form-row">
              <div className="form-group full">
                <label htmlFor="nombre">Nombre del Producto *</label>
                <input
                  type="text"
                  id="nombre"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  maxLength={200}
                  placeholder="Ej: Pulsera de Oro Blanco"
                  required
                />
                <small>{formData.nombre.length}/200</small>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group full">
                <label htmlFor="descripcion">Descripción</label>
                <textarea
                  id="descripcion"
                  name="descripcion"
                  value={formData.descripcion}
                  onChange={handleInputChange}
                  placeholder="Describe las características principales del producto"
                  rows={4}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="categoria_id">Categoría *</label>
                <select
                  id="categoria_id"
                  name="categoria_id"
                  value={formData.categoria_id || ''}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Seleccionar categoría</option>
                  {categorias.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="tipo_producto_id">Tipo de Producto</label>
                <select
                  id="tipo_producto_id"
                  name="tipo_producto_id"
                  value={formData.tipo_producto_id || ''}
                  onChange={handleInputChange}
                >
                  <option value="">Seleccionar tipo</option>
                  {tiposProducto.map(tipo => (
                    <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
          </fieldset>

          {/* SECCIÓN 2: REFERENCIAS */}
          <fieldset className="form-section">
            <legend>🔗 Referencias</legend>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="proveedor_id">Proveedor</label>
                <select
                  id="proveedor_id"
                  name="proveedor_id"
                  value={formData.proveedor_id || ''}
                  onChange={handleInputChange}
                >
                  <option value="">Seleccionar proveedor</option>
                  {proveedores.map(prov => (
                    <option key={prov.id} value={prov.id}>{prov.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="temporada_id">Temporada</label>
                <select
                  id="temporada_id"
                  name="temporada_id"
                  value={formData.temporada_id || ''}
                  onChange={handleInputChange}
                >
                  <option value="">Seleccionar temporada</option>
                  {temporadas.map(temp => (
                    <option key={temp.id} value={temp.id}>{temp.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
          </fieldset>

          {/* SECCIÓN 3: MATERIAL E INFORMACIÓN FÍSICA */}
          <fieldset className="form-section">
            <legend>💎 Material e Información Física</legend>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="material_principal">Material Principal</label>
                <select
                  id="material_principal"
                  name="material_principal"
                  value={formData.material_principal}
                  onChange={handleInputChange}
                >
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

              <div className="form-group">
                <label htmlFor="peso_gramos">Peso (gramos)</label>
                <input
                  type="number"
                  id="peso_gramos"
                  name="peso_gramos"
                  step="0.01"
                  min="0"
                  value={formData.peso_gramos || ''}
                  onChange={handleInputChange}
                  placeholder="Ej: 2.5"
                />
              </div>
            </div>
          </fieldset>

          {/* SECCIÓN 4: PRECIOS CON CÁLCULO AUTOMÁTICO */}
          <fieldset className="form-section">
            <legend>💰 Precios (Cálculo Automático)</legend>
            
            <div className="precio-info">
              <p><strong>Configuración de cálculo:</strong> IVA: {ivaConfig}% | Margen Ganancia: {margenConfig}%</p>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="precio_compra">Precio de Compra * (Base para cálculo)</label>
                <input
                  type="number"
                  id="precio_compra"
                  name="precio_compra"
                  step="0.01"
                  min="0"
                  value={formData.precio_compra || ''}
                  onChange={handleInputChange}
                  placeholder="Ej: 100.00"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Precio de Venta (Calculado)</label>
                <div className="readonly-field">
                  <strong>${precioVentaCalculado.toFixed(2)}</strong>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="precio_oferta">Precio en Oferta (Opcional)</label>
                <input
                  type="number"
                  id="precio_oferta"
                  name="precio_oferta"
                  step="0.01"
                  min="0"
                  value={formData.precio_oferta || ''}
                  onChange={handleInputChange}
                  placeholder="Ej: 80.00"
                />
              </div>
            </div>
          </fieldset>

          {/* SECCIÓN 5: IMAGEN DEL PRODUCTO */}
          <fieldset className="form-section">
            <legend>🖼️ Imagen del Producto</legend>
            
            <div className="form-row">
              <div className="form-group full">
                <label>Seleccionar imagen</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleImageChange}
                  className="file-input"
                  disabled={uploadingImage}
                />
                <small>Formatos: JPG, PNG, GIF, WEBP | Máx: 10MB</small>
              </div>
            </div>

            {imagePreview && (
              <div className="image-preview-container">
                <img src={imagePreview} alt="Vista previa" className="image-preview" />
                <div className="image-preview-actions">
                  {!formData.imagen_principal && (
                    <button
                      type="button"
                      className="btn-upload"
                      onClick={handleUploadImage}
                      disabled={uploadingImage}
                    >
                      <AiOutlineUpload size={18} />
                      {uploadingImage ? 'Subiendo...' : 'Subir Imagen'}
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-remove-image"
                    onClick={handleRemoveImage}
                  >
                    <AiOutlineDelete size={18} />
                    Eliminar
                  </button>
                </div>
              </div>
            )}

            {formData.imagen_principal && !imagePreview && (
              <div className="image-preview-container">
                <img src={formData.imagen_principal} alt="Producto" className="image-preview" />
                <div className="image-preview-actions">
                  <span className="badge-uploaded">✓ Imagen subida</span>
                </div>
              </div>
            )}
          </fieldset>

          {/* SECCIÓN 6: STOCK */}
          <fieldset className="form-section">
            <legend>📦 Stock (Configuración Global)</legend>
            
            <div className="stock-info">
              <p><strong>Stock Mínimo Global:</strong> {stockMinimoDefault} unidades</p>
              <p><strong>Stock Máximo Global:</strong> {stockMaximoDefault} unidades</p>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="stock_actual">Stock Inicial</label>
                <input
                  type="number"
                  id="stock_actual"
                  name="stock_actual"
                  min="0"
                  max={stockMaximoDefault}
                  value={formData.stock_actual}
                  onChange={handleInputChange}
                  placeholder={stockMinimoDefault.toString()}
                />
                <small>Mínimo sugerido: {stockMinimoDefault}</small>
              </div>

              <div className="form-group">
                <label htmlFor="ubicacion_fisica">Ubicación Física</label>
                <input
                  type="text"
                  id="ubicacion_fisica"
                  name="ubicacion_fisica"
                  placeholder="Ej: Estante A-3"
                  value={formData.ubicacion_fisica}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </fieldset>

          {/* SECCIÓN 7: CARACTERÍSTICAS ESPECIALES */}
          <fieldset className="form-section">
            <legend>✨ Características Especiales</legend>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="dias_fabricacion">Días de Fabricación</label>
                <input
                  type="number"
                  id="dias_fabricacion"
                  name="dias_fabricacion"
                  min="0"
                  value={formData.dias_fabricacion}
                  onChange={handleInputChange}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="form-row checkbox-group">
              <div className="form-group checkbox">
                <input
                  type="checkbox"
                  id="tiene_medidas"
                  name="tiene_medidas"
                  checked={formData.tiene_medidas}
                  onChange={handleInputChange}
                />
                <label htmlFor="tiene_medidas">Tiene Medidas Personalizables</label>
              </div>

              <div className="form-group checkbox">
                <input
                  type="checkbox"
                  id="permite_personalizacion"
                  name="permite_personalizacion"
                  checked={formData.permite_personalizacion}
                  onChange={handleInputChange}
                />
                <label htmlFor="permite_personalizacion">Permite Personalización</label>
              </div>
            </div>

            {formData.tiene_medidas && (
              <div className="form-row">
                <div className="form-group full">
                  <label htmlFor="medidas">Especificaciones de Medidas</label>
                  <textarea
                    id="medidas"
                    name="medidas"
                    value={formData.medidas}
                    onChange={handleInputChange}
                    placeholder="Ej: Largo 15cm, Ancho 2cm | Talla: XS a XL"
                    rows={3}
                  />
                </div>
              </div>
            )}
          </fieldset>

          {/* SECCIÓN 8: ESTADO Y VISIBILIDAD */}
          <fieldset className="form-section">
            <legend>👁️ Estado y Visibilidad</legend>
            
            <div className="form-row checkbox-group">
              <div className="form-group checkbox">
                <input
                  type="checkbox"
                  id="es_nuevo"
                  name="es_nuevo"
                  checked={formData.es_nuevo}
                  onChange={handleInputChange}
                />
                <label htmlFor="es_nuevo">Marcar como Nuevo</label>
              </div>

              <div className="form-group checkbox">
                <input
                  type="checkbox"
                  id="es_destacado"
                  name="es_destacado"
                  checked={formData.es_destacado}
                  onChange={handleInputChange}
                />
                <label htmlFor="es_destacado">Destacar en Tienda</label>
              </div>

              <div className="form-group checkbox">
                <input
                  type="checkbox"
                  id="activo"
                  name="activo"
                  checked={formData.activo}
                  onChange={handleInputChange}
                />
                <label htmlFor="activo">Activo / Visible</label>
              </div>
            </div>
          </fieldset>

          {/* Botones de acción */}
          <div className="form-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={() => navigate('/admin-dashboard')}
            >
              <AiOutlineArrowLeft size={20} />
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-submit"
              disabled={loading || uploadingImage}
            >
              <AiOutlineCheck size={20} />
              {loading ? 'Guardando...' : 'Guardar Producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminNuevoProductoScreen;