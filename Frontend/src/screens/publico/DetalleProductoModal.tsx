import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AiOutlineClose, AiOutlineMinus, AiOutlinePlus, AiOutlineShoppingCart, AiOutlineStar, AiFillStar, AiOutlineArrowRight, AiOutlineLock, AiOutlineEdit, AiOutlineCheckCircle, AiOutlineWarning, AiOutlineTag, AiOutlineGift, AiOutlineHeart, AiFillHeart } from 'react-icons/ai';
import { useCart } from '../../contexts/CartContext';
import { favoritosAPI, recomendacionAPI, type Recomendacion } from '../../services/api';
import './DetalleProductoModal.css';
import './DetalleModalApp.css';
import SelectorOpciones, { type EstadoOpciones } from '../../components/SelectorOpciones';

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
  precio_promocion?: number;
  imagen_principal?: string;
  stock_actual: number;
  es_nuevo?: boolean;
  permite_personalizacion?: boolean;
  tiene_medidas?: boolean;
}

interface DetalleProductoModalProps {
  isOpen: boolean;
  producto: Producto | null;
  onClose: () => void;
  promoFechaFin?: string;
}

const DetalleProductoModal: React.FC<DetalleProductoModalProps> = ({ isOpen, producto, onClose, promoFechaFin }) => {
  const [cantidad, setCantidad]           = React.useState(1);
  const [talla, setTalla]                 = React.useState('');
  const [nota, setNota]                   = React.useState('');
  const [tallaError, setTallaError]       = React.useState('');
  const [showLoginAlert, setShowLoginAlert] = React.useState(false);
  const [agregando, setAgregando]         = React.useState(false);
  const [exitoso, setExitoso]             = React.useState(false);
  const [esFavorito, setEsFavorito]       = React.useState(false);
  const [togglingFav, setTogglingFav]     = React.useState(false);
  const [recomendaciones, setRecomendaciones] = React.useState<Recomendacion[]>([]);
  const [descAbierta, setDescAbierta]     = React.useState(false);
  const [opc, setOpc]                     = React.useState<EstadoOpciones>({ hayOpciones: false, eleccion: [], costo: 0, valido: true, falta: null });
  const [intentoOpc, setIntentoOpc]       = React.useState(false);
  const navigate = useNavigate();
  const logueado = estaLogueado();
  const { agregarAlCarrito } = useCart();

  React.useEffect(() => {
    if (!isOpen || !producto || !logueado) return;
    favoritosAPI.check(producto.id)
      .then(res => setEsFavorito(!!res?.favorito))
      .catch(() => {});
  }, [isOpen, producto?.id, logueado]);

  React.useEffect(() => {
    if (!isOpen || !producto) return;
    setRecomendaciones([]);
    recomendacionAPI.recomendar([producto.nombre])
      .then(recs => setRecomendaciones(recs))
      .catch(() => {});
  }, [isOpen, producto?.id]);

  if (!isOpen || !producto) return null;

  const placeholderImage = 'https://placehold.co/400x400/1a1a1a/ecb2c3?text=Joya';
  const imagenUrl        = producto.imagen_principal || placeholderImage;
  const precioFinal      = producto.precio_promocion ?? producto.precio_oferta ?? producto.precio_venta;
  const hayDescuento     = precioFinal < producto.precio_venta;
  const esPromocion      = !!producto.precio_promocion;
  const requiereTalla    = producto.tiene_medidas || producto.permite_personalizacion;

  const promoVenceLabel = (() => {
    if (!esPromocion || !promoFechaFin) return null;
    const hoy = new Date();
    const fin  = new Date(promoFechaFin);
    const dias = Math.ceil((fin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    if (dias <= 0) return null;
    if (dias === 1) return '⏰ ¡Oferta termina hoy!';
    if (dias <= 3) return `⏰ ¡Solo quedan ${dias} días de oferta!`;
    return `📅 Válida hasta ${fin.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })}`;
  })();

  const handleAgregar = async () => {
    if (!logueado) { setShowLoginAlert(true); return; }

    if (opc.hayOpciones && !opc.valido) { setIntentoOpc(true); return; }
    // ✅ Validar talla si el producto la requiere (solo si no tiene opciones dadas de alta)
    if (!opc.hayOpciones && requiereTalla && !talla.trim()) {
      setTallaError('Por favor indica la talla o medida');
      return;
    }
    setTallaError('');
    setAgregando(true);
    try {
      await agregarAlCarrito(producto.id, cantidad, opc.hayOpciones ? undefined : (talla.trim() || undefined), opc.hayOpciones ? undefined : (nota.trim() || undefined), opc.hayOpciones ? opc.eleccion : undefined);
      setExitoso(true);
      setCantidad(1);
      setTalla('');
      setNota('');
      setTimeout(() => setExitoso(false), 2500);
    } catch (err: any) {
      alert(err?.message || 'No se pudo agregar. Intenta de nuevo.');
    } finally {
      setAgregando(false);
    }
  };

  const handleFavorito = async () => {
    if (!logueado) { setShowLoginAlert(true); return; }
    if (!producto || togglingFav) return;
    setTogglingFav(true);
    try {
      const res = await favoritosAPI.toggle(producto.id);
      setEsFavorito(!!res?.favorito);
    } catch { /* ignorar */ } finally {
      setTogglingFav(false);
    }
  };

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
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        {/* ── Alerta de login ── */}
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

        {/* ✅ Confirmación visual al agregar */}
        {exitoso && (
          <div className="modal-agregado-ok">
            <AiOutlineCheckCircle size={16} /> <strong>{producto.nombre}</strong> se agregó al carrito
          </div>
        )}

        {/* Body */}
        <div className="detalle-modal-body dm-body">
          {/* Imagen */}
          <div className="detalle-imagen-section dm-foto-col">
            <div className="detalle-imagen-container dm-foto">
              <img src={imagenUrl} alt={producto.nombre} />
              {producto.es_nuevo && <span className="badge badge-nuevo">Nuevo</span>}
              {hayDescuento && <span className="badge badge-descuento">En oferta</span>}
              {producto.permite_personalizacion && (
                <span className="badge badge-personalizable-modal"><AiOutlineEdit size={12} /> Personalizable</span>
              )}
              {producto.stock_actual === 0 && <span className="dm-agotado">Agotado</span>}
            </div>
          </div>

          {/* Información */}
          <div className="detalle-info-section dm-info">
            <div className="detalle-chips">
              {producto.categoria_nombre && <p className="detalle-categoria">{producto.categoria_nombre}</p>}
              {producto.permite_personalizacion && (
                <span className="detalle-chip-personalizable"><AiOutlineEdit size={12} /> Personalizable</span>
              )}
              {producto.stock_actual > 0 && producto.stock_actual <= 5 && (
                <span className="dm-chip-quedan">Quedan {producto.stock_actual}</span>
              )}
            </div>

            <div className="detalle-precios dm-precios">
              <span className="precio-actual">${Number(precioFinal).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              {hayDescuento && <span className="precio-original">${Number(producto.precio_venta).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
              {esPromocion && <span className="badge-promo-modal"><AiOutlineTag size={12} /> Promoción</span>}
              {promoVenceLabel && <p className="promo-vence-label">{promoVenceLabel}</p>}
            </div>

            <p className={`dm-stock ${producto.stock_actual === 0 ? 'dm-stock--no' : producto.stock_actual <= 5 ? 'dm-stock--poco' : ''}`}>
              <span />
              {producto.stock_actual === 0 ? 'Agotado por ahora' : producto.stock_actual <= 5 ? `Solo quedan ${producto.stock_actual}` : `${producto.stock_actual} disponibles`}
            </p>

            {producto.descripcion && (
              <div className="dm-desc">
                <p className={`detalle-descripcion${descAbierta ? '' : ' dm-desc--corta'}`}>{producto.descripcion}</p>
                {producto.descripcion.length > 160 && (
                  <button type="button" className="dm-leer-mas" onClick={() => setDescAbierta(v => !v)}>
                    {descAbierta ? 'Leer menos' : 'Leer más'}
                  </button>
                )}
              </div>
            )}

            {producto.material_principal && (
              <div className="detalle-caracteristicas">
                <div className="caracteristica-item">
                  <span className="label">Material</span>
                  <span className="valor">{producto.material_principal}</span>
                </div>
                {producto.permite_personalizacion && (
                  <div className="caracteristica-item">
                    <span className="label">Personalización</span>
                    <span className="valor">Disponible</span>
                  </div>
                )}
              </div>
            )}

            {producto.stock_actual > 0 && (
              <>
                <SelectorOpciones productoId={producto.id} onChange={setOpc} mostrarErrores={intentoOpc} compacto />
                {!opc.hayOpciones && requiereTalla && (
                  <div className="detalle-talla">
                    <label>Talla / medida <span className="detalle-requerido">*</span></label>
                    <input
                      type="text"
                      className={`detalle-talla-input ${tallaError ? 'input-error' : ''}`}
                      placeholder="Ej: 7, M, 15cm…"
                      value={talla}
                      onChange={e => { setTalla(e.target.value); setTallaError(''); }}
                    />
                    {tallaError && <span className="detalle-talla-error"><AiOutlineWarning size={12} /> {tallaError}</span>}
                  </div>
                )}

                {!opc.hayOpciones && producto.permite_personalizacion && (
                  <div className="detalle-talla">
                    <label>Notas de personalización (opcional)</label>
                    <input
                      type="text"
                      className="detalle-talla-input"
                      placeholder="Ej: grabado con nombre 'Ana', color dorado…"
                      value={nota}
                      onChange={e => setNota(e.target.value)}
                    />
                  </div>
                )}

                <div className="detalle-cantidad">
                  <label>Cantidad</label>
                  <div className="cantidad-control">
                    <button className="btn-cantidad" onClick={decrementar} disabled={cantidad === 1} aria-label="Quitar uno">
                      <AiOutlineMinus size={16} />
                    </button>
                    <input
                      type="number" value={cantidad}
                      onChange={(e) => {
                        const val = Number.parseInt(e.target.value) || 1;
                        if (val > 0 && val <= producto.stock_actual) setCantidad(val);
                      }}
                      min="1" max={producto.stock_actual}
                      aria-label="Cantidad"
                    />
                    <button className="btn-cantidad" onClick={incrementar} disabled={cantidad === producto.stock_actual} aria-label="Agregar uno">
                      <AiOutlinePlus size={16} />
                    </button>
                  </div>
                </div>
              </>
            )}

            <button className="dm-ver-completo" onClick={handleVerDetalles}>
              Ver detalles completos <AiOutlineArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Barra de compra fija (como la app): total · favorito · agregar */}
        <div className="dm-barra">
          <div className="dm-barra-precio">
            <span>{cantidad > 1 ? `Total · ${cantidad} piezas` : 'Precio'}</span>
            <strong>${((Number(precioFinal) + opc.costo) * cantidad).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <small>MXN</small></strong>
          </div>
          <button
            className={`dm-fav${esFavorito ? ' activo' : ''}`}
            onClick={handleFavorito}
            disabled={togglingFav}
            aria-label={esFavorito ? 'Quitar de favoritos' : 'Guardar en favoritos'}
            title={esFavorito ? 'En favoritos' : 'Guardar en favoritos'}
          >
            {esFavorito ? <AiFillHeart size={20} /> : <AiOutlineHeart size={20} />}
          </button>
          {producto.stock_actual > 0 ? (
            <button
              className={`dm-agregar${exitoso ? ' exito' : ''}`}
              onClick={handleAgregar}
              disabled={agregando || exitoso}
            >
              {exitoso ? <AiOutlineCheckCircle size={18} /> : <AiOutlineShoppingCart size={18} />}
              {agregando ? 'Agregando…' : exitoso ? 'Agregado' : (intentoOpc && opc.falta) ? opc.falta : 'Agregar'}
              {!logueado && <AiOutlineLock size={13} className="dm-candado" />}
            </button>
          ) : (
            <button className="dm-agregar" disabled>Agotado</button>
          )}
        </div>

        {recomendaciones.length > 0 && (
          <div className="detalle-recomendaciones">
            <div className="detalle-rec-inner">
            <p className="detalle-rec-titulo">Productos similares que te pueden <em>interesar</em></p>
            <ul className="detalle-rec-lista">
              {recomendaciones.map((r, i) => (
                <li
                  key={i}
                  className="detalle-rec-card"
                  onClick={() => {
                    onClose();
                    if (r.id) {
                      navigate(logueado ? `/producto/${r.id}` : `/producto-publico/${r.id}`);
                    } else {
                      navigate(`/catalogo?buscar=${encodeURIComponent(r.nombre)}`);
                    }
                  }}
                  title={`Ver ${r.nombre}`}
                >
                  <div className="detalle-rec-card-img">
                    {r.imagen_url ? (
                      <img src={r.imagen_url} alt={r.nombre} loading="lazy" />
                    ) : (
                      <span className="detalle-rec-img-fallback"><AiOutlineGift size={22} /></span>
                    )}
                  </div>
                  <div className="detalle-rec-card-info">
                    <span className="detalle-rec-card-nombre">{r.nombre}</span>
                    {r.precio_venta != null && (
                      <span className="detalle-rec-card-precio">${r.precio_venta.toFixed(2)}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default DetalleProductoModal;