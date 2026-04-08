// Frontend/src/screens/admin/AdminEditarProductoScreen.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AiOutlineArrowLeft, AiOutlineCheck, AiOutlineClose, AiOutlineUpload, AiOutlineDelete } from 'react-icons/ai';
import { productsAPI, uploadAPI } from '../../services/api';
import './AdminEditarProductoScreen.css';

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
  dias_fabricacion: number;
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
  const [currentImagePublicId, setCurrentImagePublicId] = useState<string>('');
  
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
    activo: true
  });

  // Cargar datos del producto y referencias
  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      
      try {
        setLoadingData(true);
        
        // Cargar producto
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
          dias_fabricacion: producto.dias_fabricacion || 0,
          imagen_principal: producto.imagen_principal || '',
          es_nuevo: producto.es_nuevo || false,
          es_destacado: producto.es_destacado || false,
          activo: producto.activo !== false
        });
        
        if (producto.imagen_principal) {
          setImagePreview(producto.imagen_principal);
        }
        
        // Cargar datos de referencia
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
          
          const iva = configs.find((c: Configuracion) => c.clave === 'iva_porcentaje');
          const margen = configs.find((c: Configuracion) => c.clave === 'margen_ganancia_default');
          const stockMinimo = configs.find((c: Configuracion) => c.clave === 'stock_minimo_default');
          const stockMaximo = configs.find((c: Configuracion) => c.clave === 'stock_maximo_default');
          
          if (iva) setIvaConfig(parseFloat(iva.valor));
          if (margen) setMargenConfig(parseFloat(margen.valor));
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
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
      // Si hay imagen anterior, actualizar (eliminar y subir nueva)
      if (currentImagePublicId) {
        const response = await uploadAPI.updateImage(selectedFile, currentImagePublicId, 'joyeria/productos');
        if (response.success) {
          setFormData(prev => ({
            ...prev,
            imagen_principal: response.data.url,
            imagen_public_id: response.data.publicId
          }));
          setCurrentImagePublicId(response.data.publicId);
          return true;
        } else {
          setError(response.message || 'Error al actualizar la imagen');
          return false;
        }
      } else {
        // Subir imagen nueva
        const response = await uploadAPI.uploadImage(selectedFile, 'joyeria/productos');
        if (response.success) {
          setFormData(prev => ({
            ...prev,
            imagen_principal: response.data.url,
            imagen_public_id: response.data.publicId
          }));
          setCurrentImagePublicId(response.data.publicId);
          return true;
        } else {
          setError(response.message || 'Error al subir la imagen');
          return false;
        }
      }
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

    if (!formData.categoria_id) {
      setError('Debe seleccionar una categoría');
      return false;
    }

    if (!formData.precio_compra || formData.precio_compra <= 0) {
      setError('El precio de compra debe ser mayor a 0');
      return false;
    }

    if (formData.stock_actual < 0) {
      setError('El stock no puede ser negativo');
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

    // Si hay imagen pendiente por subir
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

      const response = await productsAPI.update(Number.parseInt(id!), dataToSend);

      if (response.success) {
        setSuccess(true);
        alert('¡Producto actualizado exitosamente!');
        setTimeout(() => {
          navigate(`/admin/producto/${id}`);
        }, 1000);
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

  if (loadingData) {
    return (
      <div className="admin-editar-loading">
        <div className="spinner"></div>
        <p>Cargando producto...</p>
      </div>
    );
  }

  return (
    <div className="admin-editar-container">
      <div className="editar-wrapper">
        {/* Header */}
        <div className="editar-header">
          <button className="btn-back" onClick={() => navigate(`/admin/producto/${id}`)}>
            <AiOutlineArrowLeft size={20} />
            <span>Volver al Detalle</span>
          </button>
          <h1>✏️ Editar Producto</h1>
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
            <span>¡Producto actualizado exitosamente!</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="editar-form">
          
          {/* Información Básica */}
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
                  required
                />
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

          {/* Referencias */}
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

          {/* Material e Información Física */}
          <fieldset className="form-section">
            <legend>💎 Material</legend>
            
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
                />
              </div>
            </div>
          </fieldset>

          {/* Precios */}
          <fieldset className="form-section">
            <legend>💰 Precios</legend>
            
            <div className="precio-info">
              <p>IVA: {ivaConfig}% | Margen: {margenConfig}%</p>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="precio_compra">Precio de Compra *</label>
                <input
                  type="number"
                  id="precio_compra"
                  name="precio_compra"
                  step="0.01"
                  min="0"
                  value={formData.precio_compra || ''}
                  onChange={handleInputChange}
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
                <label htmlFor="precio_oferta">Precio en Oferta</label>
                <input
                  type="number"
                  id="precio_oferta"
                  name="precio_oferta"
                  step="0.01"
                  min="0"
                  value={formData.precio_oferta || ''}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </fieldset>

          {/* Imagen */}
          <fieldset className="form-section">
            <legend>🖼️ Imagen</legend>
            
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
              </div>
            </div>

            {imagePreview && (
              <div className="image-preview-container">
                <img src={imagePreview} alt="Vista previa" className="image-preview" />
                <div className="image-preview-actions">
                  {selectedFile && (
                    <button
                      type="button"
                      className="btn-upload"
                      onClick={handleUploadImage}
                      disabled={uploadingImage}
                    >
                      <AiOutlineUpload size={18} />
                      {uploadingImage ? 'Subiendo...' : 'Actualizar Imagen'}
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
          </fieldset>

          {/* Stock */}
          <fieldset className="form-section">
            <legend>📦 Stock</legend>
            
            <div className="stock-info">
              <p>Mínimo: {stockMinimoDefault} | Máximo: {stockMaximoDefault}</p>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="stock_actual">Stock Actual</label>
                <input
                  type="number"
                  id="stock_actual"
                  name="stock_actual"
                  min="0"
                  value={formData.stock_actual}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="ubicacion_fisica">Ubicación Física</label>
                <input
                  type="text"
                  id="ubicacion_fisica"
                  name="ubicacion_fisica"
                  value={formData.ubicacion_fisica}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </fieldset>

          {/* Características Especiales */}
          <fieldset className="form-section">
            <legend>✨ Características</legend>
            
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
                />
              </div>
            </div>

            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="tiene_medidas"
                  checked={formData.tiene_medidas}
                  onChange={handleInputChange}
                />
                Tiene Medidas Personalizables
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="permite_personalizacion"
                  checked={formData.permite_personalizacion}
                  onChange={handleInputChange}
                />
                Permite Personalización
              </label>
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
                    rows={3}
                  />
                </div>
              </div>
            )}
          </fieldset>

          {/* Estado */}
          <fieldset className="form-section">
            <legend>👁️ Estado</legend>
            
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="es_nuevo"
                  checked={formData.es_nuevo}
                  onChange={handleInputChange}
                />
                Marcar como Nuevo
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="es_destacado"
                  checked={formData.es_destacado}
                  onChange={handleInputChange}
                />
                Destacar en Tienda
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="activo"
                  checked={formData.activo}
                  onChange={handleInputChange}
                />
                Activo / Visible
              </label>
            </div>
          </fieldset>

          {/* Botones */}
          <div className="form-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={() => navigate(`/admin/producto/${id}`)}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-submit"
              disabled={loading || uploadingImage}
            >
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminEditarProductoScreen;