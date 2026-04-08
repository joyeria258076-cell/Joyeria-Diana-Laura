// Frontend/src/screens/admin/AdminProductoDetalleScreen.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AiOutlineArrowLeft, AiOutlineEdit, AiOutlineDelete, AiOutlineShopping, AiOutlineStock } from 'react-icons/ai';
import { productsAPI } from '../../services/api';
import './AdminProductoDetalleScreen.css';

interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  categoria_id: number;
  categoria_nombre?: string;
  proveedor_id?: number;
  proveedor_nombre?: string;
  temporada_id?: number;
  temporada_nombre?: string;
  tipo_producto_id?: number;
  tipo_producto_nombre?: string;
  material_principal: string;
  peso_gramos: number | null;
  precio_compra: number;
  precio_venta: number;
  precio_oferta: number | null;
  margen_ganancia: number;
  stock_actual: number;
  stock_minimo: number;
  stock_maximo: number;
  ubicacion_fisica: string;
  tiene_medidas: boolean;
  medidas: any;
  permite_personalizacion: boolean;
  dias_fabricacion: number;
  imagen_principal: string;
  es_nuevo: boolean;
  es_destacado: boolean;
  activo: boolean;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

const AdminProductoDetalleScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [producto, setProducto] = useState<Producto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState<string>('');

  useEffect(() => {
    if (id) {
      cargarProducto(Number.parseInt(id));
    }
  }, [id]);

  const cargarProducto = async (productoId: number) => {
    try {
      setLoading(true);
      const response = await productsAPI.getById(productoId);
      if (response.success) {
        setProducto(response.data);
        setSelectedImage(response.data.imagen_principal || '');
      } else {
        setError('No se pudo cargar el producto');
      }
    } catch (err: any) {
      console.error('Error cargando producto:', err);
      setError(err.message || 'Error al cargar el producto');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!producto) return;
    
    if (!window.confirm(`¿Estás seguro de que deseas eliminar "${producto.nombre}"?`)) {
      return;
    }

    try {
      await productsAPI.delete(producto.id);
      alert('Producto eliminado exitosamente');
      navigate('/admin-inventario');
    } catch (err: any) {
      alert(`Error al eliminar: ${err.message}`);
    }
  };

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const placeholderImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iIzBkMGQwZCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjI0IiBmaWxsPSIjZWNiMmMzIiBmb250LWZhbWlseT0iQXJpYWwiPkpveWEgRGlhbmEgTGF1cmE8L3RleHQ+PC9zdmc+';

  if (loading) {
    return (
      <div className="admin-detalle-loading">
        <div className="spinner"></div>
        <p>Cargando producto...</p>
      </div>
    );
  }

  if (error || !producto) {
    return (
      <div className="admin-detalle-error">
        <h2>Error</h2>
        <p>{error || 'Producto no encontrado'}</p>
        <button className="btn-volver" onClick={() => navigate('/admin-inventario')}>
          Volver al Inventario
        </button>
      </div>
    );
  }

  return (
    <div className="admin-detalle-container">
      {/* Header */}
      <div className="admin-detalle-header">
        <button className="btn-back" onClick={() => navigate('/admin-inventario')}>
          <AiOutlineArrowLeft size={20} />
          <span>Volver al Inventario</span>
        </button>
        <div className="header-actions">
          <button 
            className="btn-edit"
            onClick={() => navigate(`/admin/editar-producto/${producto.id}`)}
          >
            <AiOutlineEdit size={18} />
            Editar
          </button>
          <button 
            className="btn-delete"
            onClick={handleDelete}
          >
            <AiOutlineDelete size={18} />
            Eliminar
          </button>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="admin-detalle-content">
        {/* Columna izquierda - Imagen */}
        <div className="detalle-imagen-col">
          <div className="imagen-principal-container">
            <img 
              src={selectedImage || placeholderImage} 
              alt={producto.nombre}
              className="imagen-principal"
              onError={(e) => {
                (e.target as HTMLImageElement).src = placeholderImage;
              }}
            />
          </div>
          
          {/* Badges de estado */}
          <div className="detalle-badges">
            {producto.activo ? (
              <span className="badge-active">✓ Activo</span>
            ) : (
              <span className="badge-inactive">✗ Inactivo</span>
            )}
            {producto.es_nuevo && <span className="badge-nuevo">Nuevo</span>}
            {producto.es_destacado && <span className="badge-destacado">Destacado</span>}
          </div>

          {/* Información de stock */}
          <div className="detalle-stock-card">
            <h3>
              <AiOutlineStock size={20} />
              Stock
            </h3>
            <div className="stock-info-detalle">
              <div className="stock-item">
                <span className="stock-label">Actual:</span>
                <span className={`stock-value ${producto.stock_actual <= producto.stock_minimo ? 'stock-bajo' : ''}`}>
                  {producto.stock_actual} unidades
                </span>
              </div>
              <div className="stock-item">
                <span className="stock-label">Mínimo:</span>
                <span className="stock-value">{producto.stock_minimo}</span>
              </div>
              <div className="stock-item">
                <span className="stock-label">Máximo:</span>
                <span className="stock-value">{producto.stock_maximo}</span>
              </div>
              <div className="stock-item">
                <span className="stock-label">Ubicación:</span>
                <span className="stock-value">{producto.ubicacion_fisica || 'No especificada'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Columna derecha - Información */}
        <div className="detalle-info-col">
          <h1 className="detalle-titulo">{producto.nombre}</h1>
          
          {producto.descripcion && (
            <p className="detalle-descripcion">{producto.descripcion}</p>
          )}

          {/* Precios */}
          <div className="detalle-precios-card">
            <h3>💰 Precios</h3>
            <div className="precios-grid">
              <div className="precio-item">
                <span className="precio-label">Precio Compra:</span>
                <span className="precio-valor">{formatPrice(producto.precio_compra)}</span>
              </div>
              <div className="precio-item">
                <span className="precio-label">Margen:</span>
                <span className="precio-valor">{producto.margen_ganancia}%</span>
              </div>
              <div className="precio-item">
                <span className="precio-label">Precio Venta:</span>
                <span className="precio-valor precio-destacado">{formatPrice(producto.precio_venta)}</span>
              </div>
              {producto.precio_oferta && (
                <div className="precio-item">
                  <span className="precio-label">Precio Oferta:</span>
                  <span className="precio-valor precio-oferta">{formatPrice(producto.precio_oferta)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Clasificación */}
          <div className="detalle-info-grid">
            <div className="info-card">
              <h3>📋 Clasificación</h3>
              <div className="info-grid">
                <div className="info-row">
                  <span className="info-label">Categoría:</span>
                  <span className="info-value">{producto.categoria_nombre || 'No especificada'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Tipo:</span>
                  <span className="info-value">{producto.tipo_producto_nombre || 'No especificado'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Proveedor:</span>
                  <span className="info-value">{producto.proveedor_nombre || 'No especificado'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Temporada:</span>
                  <span className="info-value">{producto.temporada_nombre || 'No especificada'}</span>
                </div>
              </div>
            </div>

            <div className="info-card">
              <h3>⚙️ Características</h3>
              <div className="info-grid">
                <div className="info-row">
                  <span className="info-label">Material:</span>
                  <span className="info-value">{producto.material_principal || 'No especificado'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Peso:</span>
                  <span className="info-value">{producto.peso_gramos ? `${producto.peso_gramos} g` : 'No especificado'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Personalización:</span>
                  <span className="info-value">{producto.permite_personalizacion ? '✓ Sí' : '✗ No'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Días fabricación:</span>
                  <span className="info-value">{producto.dias_fabricacion || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Medidas */}
          {producto.tiene_medidas && producto.medidas && (
            <div className="info-card">
              <h3>📏 Medidas</h3>
              <pre className="medidas-pre">
                {typeof producto.medidas === 'string' 
                  ? producto.medidas 
                  : JSON.stringify(producto.medidas, null, 2)}
              </pre>
            </div>
          )}

          {/* Fechas */}
          <div className="detalle-fechas">
            <p>📅 Creado: {formatDate(producto.fecha_creacion)}</p>
            {producto.fecha_actualizacion && (
              <p>📅 Actualizado: {formatDate(producto.fecha_actualizacion)}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProductoDetalleScreen;