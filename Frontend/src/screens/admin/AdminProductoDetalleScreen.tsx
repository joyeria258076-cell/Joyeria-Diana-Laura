// Frontend/src/screens/admin/AdminProductoDetalleScreen.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  AiOutlineEdit, AiOutlineDelete, AiOutlineDollarCircle, AiOutlineTags, AiOutlineSetting,
  AiOutlineColumnWidth, AiOutlineCalendar, AiOutlineInbox, AiOutlineCheckCircle, AiOutlineCloseCircle,
  AiOutlineEnvironment, AiOutlineIdcard,
} from 'react-icons/ai';
import { productsAPI } from '../../services/api';
import { colorDeUbicacion } from '../../utils/ubicacionesEntrega';
import './AdminProductoDetalleScreen.css';

interface Producto {
  id: number;
  codigo?: string;
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
  genero?: string;
  material_principal: string;
  peso_gramos: number | null;
  precio_compra: number;
  precio_venta: number;
  precio_oferta: number | null;
  precio_personalizacion?: number;
  margen_ganancia: number;
  stock_actual: number;
  stock_minimo: number;
  stock_maximo: number;
  ubicacion_fisica: string;
  ubicaciones_entrega?: string[];
  tiene_medidas: boolean;
  medidas: any;
  permite_personalizacion: boolean;
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
    if (!window.confirm(`¿Estás seguro de que deseas eliminar "${producto.nombre}"?`)) return;
    try {
      await productsAPI.delete(producto.id);
      alert('Producto eliminado exitosamente');
      navigate('/admin-inventario');
    } catch (err: any) {
      alert(`Error al eliminar: ${err.message}`);
    }
  };

  const formatPrice = (price: number): string =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(price);

  const formatDate = (dateString: string): string =>
    new Date(dateString).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (loading) {
    return (
      <div className="pd3-loading">
        <div className="pd3-spinner" />
        <p>Cargando producto...</p>
      </div>
    );
  }

  if (error || !producto) {
    return (
      <div className="pd3-error">
        <h2>Error</h2>
        <p>{error || 'Producto no encontrado'}</p>
      </div>
    );
  }

  const nivelStock = producto.stock_actual <= producto.stock_minimo
    ? 'bajo'
    : producto.stock_actual <= producto.stock_minimo * 2
      ? 'medio'
      : 'ok';
  const porcentajeStock = Math.min(100, Math.round((producto.stock_actual / (producto.stock_minimo * 2 || 1)) * 100));

  return (
    <div className="pd3-container">
      {/* Banner de producto */}
      <div className="pd3-hero">
        <div className="pd3-hero-media">
          {producto.imagen_principal ? (
            <img src={producto.imagen_principal} alt={producto.nombre} />
          ) : (
            <div className="pd3-hero-media-placeholder"><AiOutlineInbox size={32} /></div>
          )}
        </div>

        <div className="pd3-hero-info">
          <div className="pd3-hero-top">
            <span className={`pd3-badge ${producto.activo ? 'on' : 'off'}`}>
              {producto.activo ? <AiOutlineCheckCircle size={12} /> : <AiOutlineCloseCircle size={12} />}
              {producto.activo ? 'Activo' : 'Inactivo'}
            </span>
            {producto.es_nuevo && <span className="pd3-badge new">Nuevo</span>}
            {producto.es_destacado && <span className="pd3-badge featured">Destacado</span>}
          </div>

          <h1>{producto.nombre}</h1>
          {producto.codigo && <div className="pd3-hero-codigo"><AiOutlineIdcard size={12} /> {producto.codigo}</div>}
          <p className="pd3-hero-desc">{producto.descripcion || 'Sin descripción'}</p>

          <div className="pd3-hero-precio">
            {formatPrice(producto.precio_venta)}
            {producto.precio_oferta && (
              <span className="pd3-hero-precio-oferta">{formatPrice(producto.precio_oferta)} en oferta</span>
            )}
          </div>
        </div>

        <div className="pd3-hero-actions">
          <button className="pd3-btn-edit" onClick={() => navigate(`/admin/editar-producto/${producto.id}`)}>
            <AiOutlineEdit size={16} /> Editar
          </button>
          <button className="pd3-btn-delete" onClick={handleDelete}>
            <AiOutlineDelete size={16} />
          </button>
        </div>
      </div>

      {/* Contenido: sidebar stock + paneles */}
      <div className="pd3-layout">
        <aside className="pd3-sidebar">
          <div className="pd3-sidebar-sticky">
            <div className="pd3-stock-card">
              <span className="pd3-stock-titulo"><AiOutlineInbox size={14} /> Stock</span>
              <div className="pd3-stock-num">{producto.stock_actual} <small>unidades</small></div>
              <div className="pd3-stock-bar">
                <div className={`pd3-stock-fill ${nivelStock}`} style={{ width: `${porcentajeStock}%` }} />
              </div>
              <div className="pd3-stock-rows">
                <div className="pd3-stock-row"><span>Mínimo</span><strong>{producto.stock_minimo}</strong></div>
                <div className="pd3-stock-row"><span>Máximo</span><strong>{producto.stock_maximo}</strong></div>
                <div className="pd3-stock-row"><span>Ubicación</span><strong>{producto.ubicacion_fisica || 'No especificada'}</strong></div>
              </div>
            </div>

            <div className="pd3-meta-card">
              <span className="pd3-meta-label"><AiOutlineCalendar size={13} /> Creado</span>
              <span className="pd3-meta-value">{formatDate(producto.fecha_creacion)}</span>
            </div>
            {producto.fecha_actualizacion && (
              <div className="pd3-meta-card">
                <span className="pd3-meta-label"><AiOutlineCalendar size={13} /> Actualizado</span>
                <span className="pd3-meta-value">{formatDate(producto.fecha_actualizacion)}</span>
              </div>
            )}
          </div>
        </aside>

        <div className="pd3-main">
          <div className="pd3-panel">
            <h3><AiOutlineDollarCircle size={16} /> Precios</h3>
            <div className="pd3-precios-grid">
              <div className="pd3-precio-item">
                <span>Precio Compra</span>
                <strong>{formatPrice(producto.precio_compra)}</strong>
              </div>
              <div className="pd3-precio-item">
                <span>Margen</span>
                <strong>{producto.margen_ganancia}%</strong>
              </div>
              <div className="pd3-precio-item destacado">
                <span>Precio Venta</span>
                <strong>{formatPrice(producto.precio_venta)}</strong>
              </div>
              {producto.precio_oferta && (
                <div className="pd3-precio-item oferta">
                  <span>Precio Oferta</span>
                  <strong>{formatPrice(producto.precio_oferta)}</strong>
                </div>
              )}
              {producto.permite_personalizacion && !!producto.precio_personalizacion && (
                <div className="pd3-precio-item">
                  <span>Cargo Personalización</span>
                  <strong>{formatPrice(producto.precio_personalizacion)}</strong>
                </div>
              )}
            </div>
          </div>

          <div className="pd3-panel-row">
            <div className="pd3-panel">
              <h3><AiOutlineTags size={16} /> Clasificación</h3>
              <div className="pd3-info-row"><span>Categoría</span><strong>{producto.categoria_nombre || 'No especificada'}</strong></div>
              <div className="pd3-info-row"><span>Tipo</span><strong>{producto.tipo_producto_nombre || 'No especificado'}</strong></div>
              <div className="pd3-info-row"><span>Proveedor</span><strong>{producto.proveedor_nombre || 'No especificado'}</strong></div>
              <div className="pd3-info-row"><span>Temporada</span><strong>{producto.temporada_nombre || 'No especificada'}</strong></div>
            </div>

            <div className="pd3-panel">
              <h3><AiOutlineSetting size={16} /> Características</h3>
              <div className="pd3-info-row"><span>Material</span><strong>{producto.material_principal || 'No especificado'}</strong></div>
              <div className="pd3-info-row"><span>Peso</span><strong>{producto.peso_gramos ? `${producto.peso_gramos} g` : 'No especificado'}</strong></div>
              <div className="pd3-info-row"><span>Género</span><strong>{producto.genero || 'Unisex'}</strong></div>
              <div className="pd3-info-row"><span>Personalización</span><strong>{producto.permite_personalizacion ? 'Sí' : 'No'}</strong></div>
            </div>
          </div>

          {producto.tiene_medidas && producto.medidas && (
            <div className="pd3-panel">
              <h3><AiOutlineColumnWidth size={16} /> Medidas</h3>
              <pre className="pd3-medidas-pre">
                {typeof producto.medidas === 'string' ? producto.medidas : JSON.stringify(producto.medidas, null, 2)}
              </pre>
            </div>
          )}

          {producto.ubicaciones_entrega && producto.ubicaciones_entrega.length > 0 && (
            <div className="pd3-panel">
              <h3><AiOutlineEnvironment size={16} /> Lugares de Entrega</h3>
              <div className="pd3-chips">
                {producto.ubicaciones_entrega.map(u => (
                  <span key={u} className="pd3-chip" style={{ background: colorDeUbicacion(u) }}>{u}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminProductoDetalleScreen;
