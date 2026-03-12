import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AiOutlineClose, AiOutlineMinus, AiOutlinePlus, AiOutlineShoppingCart, AiOutlineStar, AiOutlineArrowRight, AiOutlineLock } from 'react-icons/ai';
import './DetalleProductoModal.css';

// Detectar sesión activa leyendo localStorage directamente
const estaLogueado = (): boolean => {
  try {
    const userData = localStorage.getItem('diana_laura_user');
    const sessionToken = localStorage.getItem('diana_laura_session_token');
    return !!(userData && sessionToken);
  } catch {
    return false;
  }
};

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
  const [showLoginAlert, setShowLoginAlert] = React.useState(false);
  const navigate = useNavigate();
  const logueado = estaLogueado();

  if (!isOpen || !producto) return null;

  const placeholderImage = 'https://placehold.co/400x400/1a1a1a/ecb2c3?text=Joya';
  const imagenUrl = producto.imagen_principal || placeholderImage;
  const precioFinal = producto.precio_oferta || producto.precio_venta;
  const hayDescuento = producto.precio_oferta && producto.precio_oferta < producto.precio_venta;

  const handleAgregar = () => {
    if (!logueado) { setShowLoginAlert(true); return; }
    alert(`${cantidad} ${producto.nombre}(s) agregado(s) al carrito`);
    setCantidad(1);
  };

  const handleFavorito = () => {
    if (!logueado) { setShowLoginAlert(true); return; }
    alert('Guardado en favoritos');
  };

  // Logueado → página privada /producto/:id
  // No logueado → página pública /producto-publico/:id
  const handleVerDetalles = () => {
    onClose();
    if (logueado) {
      navigate(`/producto/${producto.id}`);
    } else {
      navigate(`/producto-publico/${producto.id}`);
    }
  };

  const handleIrLogin = () => { onClose(); navigate('/login'); };

  const incrementar = () => { if (cantidad < producto.stock_actual) setCantidad(cantidad + 1); };
  const decrementar = () => { if (cantidad > 1) setCantidad(cantidad - 1); };

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

        {/* ── Alerta de login (inline, dentro del modal) ── */}
        {showLoginAlert && (
          <div className="modal-login-alert">
            <div className="modal-login-alert-content">
              <AiOutlineLock size={18} />
              <p>Necesitas una cuenta para realizar esta acción</p>
              <div className="modal-login-alert-btns">
                <button className="btn-alerta-login" onClick={handleIrLogin}>Iniciar sesión</button>
                <button className="btn-alerta-cancelar" onClick={() => setShowLoginAlert(false)}>Cancelar</button>
              </div>
            </div>
          </div>
        )}

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
            {producto.categoria_nombre && (
              <p className="detalle-categoria">{producto.categoria_nombre}</p>
            )}
            {producto.descripcion && (
              <p className="detalle-descripcion">{producto.descripcion}</p>
            )}

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

            {producto.stock_actual > 0 && (
              <div className="detalle-cantidad">
                <label>Cantidad:</label>
                <div className="cantidad-control">
                  <button className="btn-cantidad" onClick={decrementar} disabled={cantidad === 1}>
                    <AiOutlineMinus size={16} />
                  </button>
                  <input
                    type="number" value={cantidad}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      if (val > 0 && val <= producto.stock_actual) setCantidad(val);
                    }}
                    min="1" max={producto.stock_actual}
                  />
                  <button className="btn-cantidad" onClick={incrementar} disabled={cantidad === producto.stock_actual}>
                    <AiOutlinePlus size={16} />
                  </button>
                </div>
              </div>
            )}

            <div className="detalle-acciones">
              {producto.stock_actual > 0 ? (
                <button className="btn btn-primary" onClick={handleAgregar}>
                  <AiOutlineShoppingCart size={20} />
                  Agregar al Carrito
                  {!logueado && <AiOutlineLock size={13} style={{marginLeft: 4, opacity: 0.7}} />}
                </button>
              ) : (
                <button className="btn btn-disabled" disabled>Producto Agotado</button>
              )}

              <button className="btn btn-secondary" onClick={handleFavorito}>
                <AiOutlineStar size={20} />
                Guardar Favorito
                {!logueado && <AiOutlineLock size={13} style={{marginLeft: 4, opacity: 0.7}} />}
              </button>

              <button className="btn btn-ver-detalles" onClick={handleVerDetalles}>
                <AiOutlineArrowRight size={20} />
                Ver detalles completos
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetalleProductoModal;