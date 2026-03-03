import React from 'react';
import { AiOutlineClose, AiOutlineMinus, AiOutlinePlus, AiOutlineShoppingCart, AiOutlineStar } from 'react-icons/ai';
import './DetalleProductoModal.css';

interface Producto {
  id: number;
  nombre: string;
  descripcion?: string;
  categoria_nombre?: string;
  material_principal?: string;
  precio_venta: number;
  precio_oferta?: number;
  imagen_principal?: string;
  stock_actual: number;
  es_nuevo?: boolean;
  dias_fabricacion?: number;
  permite_personalizacion?: boolean;
}

interface DetalleProductoModalProps {
  isOpen: boolean;
  producto: Producto | null;
  onClose: () => void;
}

const DetalleProductoModal: React.FC<DetalleProductoModalProps> = ({ isOpen, producto, onClose }) => {
  const [cantidad, setCantidad] = React.useState(1);

  if (!isOpen || !producto) return null;

  const placeholderImage = 'https://placehold.co/400x400/1a1a1a/ec b2c3?text=Joya';
  const imagenUrl = producto.imagen_principal || placeholderImage;
  const precioFinal = producto.precio_oferta || producto.precio_venta;
  const hayDescuento = producto.precio_oferta && producto.precio_oferta < producto.precio_venta;

  const handleAgregar = () => {
    // TODO: Agregar al carrito
    alert(`${cantidad} ${producto.nombre}(s) agregado(s) al carrito`);
    setCantidad(1);
  };

  const incrementar = () => {
    if (cantidad < producto.stock_actual) setCantidad(cantidad + 1);
  };

  const decrementar = () => {
    if (cantidad > 1) setCantidad(cantidad - 1);
  };

  return (
    <div className="detalle-modal-overlay" onClick={onClose}>
      <div className="detalle-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="detalle-modal-header">
          <h2>{producto.nombre}</h2>
          <button className="btn-close" onClick={onClose} aria-label="Cerrar">
            <AiOutlineClose size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="detalle-modal-body">
          {/* Imagen */}
          <div className="detalle-imagen-section">
            <div className="detalle-imagen-container">
              <img src={imagenUrl} alt={producto.nombre} />
              {producto.es_nuevo && <span className="badge badge-nuevo">Nuevo</span>}
              {hayDescuento && <span className="badge badge-descuento">En Oferta</span>}
            </div>
          </div>

          {/* Información */}
          <div className="detalle-info-section">
            {/* Categoría */}
            {producto.categoria_nombre && (
              <p className="detalle-categoria">{producto.categoria_nombre}</p>
            )}

            {/* Descripción */}
            {producto.descripcion && (
              <p className="detalle-descripcion">{producto.descripcion}</p>
            )}

            {/* Características */}
            <div className="detalle-caracteristicas">
              {producto.material_principal && (
                <div className="caracteristica-item">
                  <span className="label">Material:</span>
                  <span className="valor">{producto.material_principal}</span>
                </div>
              )}

              {producto.dias_fabricacion && producto.dias_fabricacion > 0 && (
                <div className="caracteristica-item">
                  <span className="label">Tiempo de Fabricación:</span>
                  <span className="valor">{producto.dias_fabricacion} días</span>
                </div>
              )}

              {producto.permite_personalizacion && (
                <div className="caracteristica-item">
                  <span className="label">Personalización:</span>
                  <span className="valor">Disponible</span>
                </div>
              )}

              <div className="caracteristica-item">
                <span className="label">Stock Disponible:</span>
                <span className={`valor ${producto.stock_actual === 0 ? 'sin-stock' : ''}`}>
                  {producto.stock_actual === 0 ? 'Agotado' : `${producto.stock_actual} unidades`}
                </span>
              </div>
            </div>

            {/* Precios */}
            <div className="detalle-precios">
              {hayDescuento ? (
                <>
                  <span className="precio-original">${producto.precio_venta.toLocaleString('es-MX')}</span>
                  <span className="precio-actual">${precioFinal.toLocaleString('es-MX')}</span>
                </>
              ) : (
                <span className="precio-actual">${precioFinal.toLocaleString('es-MX')}</span>
              )}
            </div>

            {/* Cantid ad */}
            {producto.stock_actual > 0 && (
              <div className="detalle-cantidad">
                <label>Cantidad:</label>
                <div className="cantidad-control">
                  <button
                    className="btn-cantidad"
                    onClick={decrementar}
                    disabled={cantidad === 1}
                  >
                    <AiOutlineMinus size={16} />
                  </button>
                  <input
                    type="number"
                    value={cantidad}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      if (val > 0 && val <= producto.stock_actual) setCantidad(val);
                    }}
                    min="1"
                    max={producto.stock_actual}
                  />
                  <button
                    className="btn-cantidad"
                    onClick={incrementar}
                    disabled={cantidad === producto.stock_actual}
                  >
                    <AiOutlinePlus size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Botones de acción */}
            <div className="detalle-acciones">
              {producto.stock_actual > 0 ? (
                <button className="btn btn-primary" onClick={handleAgregar}>
                  <AiOutlineShoppingCart size={20} />
                  Agregar al Carrito
                </button>
              ) : (
                <button className="btn btn-disabled" disabled>
                  Producto Agotado
                </button>
              )}

              <button className="btn btn-secondary">
                <AiOutlineStar size={20} />
                Guardar Favorito
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetalleProductoModal;
