// Frontend/src/screens/publico/CatalogoPublicScreen.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AiOutlineSearch, AiOutlineTag } from "react-icons/ai";
import PublicHeader from "../../components/PublicHeader";
import PublicFooter from "../../components/PublicFooter";
import DetalleProductoModal from "./DetalleProductoModal";
import { productsAPI, promocionesAPI, favoritosAPI } from "../../services/api";
import "./CatalogoPublicScreen.css";

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
  precio_venta: number;
  precio_oferta?: number;
  precio_promocion?: number;
  descripcion?: string;
  imagen_principal?: string;
  categoria_id?: number;
  categoria_nombre?: string;
  tipo_producto_nombre?: string;
  material_principal?: string;
  stock_actual: number;
  es_nuevo?: boolean;
  dias_fabricacion?: number;
  permite_personalizacion?: boolean;
}

interface CategoriaConProductos {
  categoria_id: number;
  categoria_nombre: string;
  productos: Producto[];
  total: number;
}

interface FiltrosSearch {
  nombre?: string;
  categoria_id?: number | string;
  tipo_producto_id?: number | string;
  material_principal?: string;
  precio_min?: number;
  precio_max?: number;
}

interface Categoria { id: number; nombre: string; }
interface TipoProducto { id: number; nombre: string; }

const PAGE_SIZE = 10;

const CatalogoPublicScreen: React.FC = () => {
  const navigate = useNavigate();
  const logueado = estaLogueado();

  // --- ESTADOS DE DATOS ---
  const [productosPorCategoria, setProductosPorCategoria] = useState<{ [key: string]: Producto[] }>({});
  const [resultadosBusqueda, setResultadosBusqueda] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [tiposProducto, setTiposProducto] = useState<TipoProducto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchMode, setSearchMode] = useState(false);

  // --- PAGINACIÓN (solo modo búsqueda) ---
  const [paginaBusqueda, setPaginaBusqueda] = useState(0);

  // --- ESTADOS DE FILTRADO ---
  const [filtros, setFiltros] = useState<FiltrosSearch>({
    nombre: '',
    categoria_id: '',
    tipo_producto_id: '',
    material_principal: '',
    precio_min: 0,
    precio_max: 100000,
  });

  // --- ESTADOS DE UI ---
  const [selectedProducto, setSelectedProducto] = useState<Producto | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // --- TICKER PROMOCIONES ---
  const [promociones, setPromociones] = useState<any[]>([]);
  const [tickerCerrado, setTickerCerrado] = useState(false);

  // --- FAVORITOS (solo si está logueado) ---
  const [favoritos, setFavoritos] = useState<Producto[]>([]);
  const [favoritosIds, setFavoritosIds] = useState<Set<number>>(new Set());
  const [togglingFav, setTogglingFav] = useState<number | null>(null);

  const placeholderImg = `data:image/svg+xml;utf8,<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="400" fill="%23141414"/><g transform="translate(200,200)" stroke="%23594936" stroke-width="1.5" fill="none" opacity="0.7"><path d="M-22,-14 L22,-14 L32,-2 L0,34 L-32,-2 Z"/><path d="M-22,-14 L0,-2 L22,-14 M-32,-2 L32,-2 M0,-2 L0,34"/></g></svg>`;

  // --- CARGAR DATOS INICIALES ---
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);

        const respProductos = await productsAPI.getProductsByCategories();
        const rawData = Array.isArray(respProductos?.data) ? respProductos.data : [];

        const categoriasObj: { [key: string]: Producto[] } = {};
        rawData
          .filter((c: CategoriaConProductos) => c.total > 0)
          .forEach((c: CategoriaConProductos) => {
            categoriasObj[c.categoria_nombre] = c.productos || [];
          });
        setProductosPorCategoria(categoriasObj);

        const respCategorias = await productsAPI.getCategories();
        setCategorias(Array.isArray(respCategorias?.data) ? respCategorias.data : []);

        const respTipos = await productsAPI.getTiposProducto();
        setTiposProducto(Array.isArray(respTipos?.data) ? respTipos.data : []);

        try {
          const resPromo = await promocionesAPI.getActivas();
          const lista = Array.isArray(resPromo) ? resPromo : (resPromo.data || []);
          setPromociones(lista);
        } catch { /* sin promociones */ }

        if (logueado) {
          try {
            const resFavs = await favoritosAPI.getAll();
            const lista: Producto[] = Array.isArray(resFavs?.data) ? resFavs.data.map((f: any) => ({
              id: f.producto_id,
              nombre: f.nombre,
              precio_venta: f.precio_venta,
              precio_oferta: f.precio_oferta,
              precio_promocion: f.precio_promocion,
              imagen_principal: f.imagen_principal,
              stock_actual: f.stock_actual,
              es_nuevo: f.es_nuevo,
              categoria_nombre: f.categoria_nombre,
            })) : [];
            setFavoritos(lista);
            setFavoritosIds(new Set(lista.map(p => p.id)));
          } catch { /* sin favoritos */ }
        }

      } catch (error) {
        console.error('Error cargando datos iniciales:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [logueado]);

  // --- BÚSQUEDA ---
  const handleBuscar = async () => {
    try {
      setLoading(true);
      setSearchMode(true);
      setPaginaBusqueda(0);

      const response = await productsAPI.searchAndFilter({
        nombre: filtros.nombre,
        categoria_id: filtros.categoria_id as number,
        tipo_producto_id: filtros.tipo_producto_id as number,
        material_principal: filtros.material_principal,
        precio_min: filtros.precio_min,
        precio_max: filtros.precio_max,
      });
      setResultadosBusqueda(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      console.error('Error en búsqueda:', error);
      setResultadosBusqueda([]);
    } finally {
      setLoading(false);
    }
  };

  // --- VER MÁS DE UNA CATEGORÍA → entra a modo búsqueda con paginación ---
  const handleVerMasCategoria = async (categoria_id: number) => {
    try {
      setLoading(true);
      setSearchMode(true);
      setPaginaBusqueda(0);

      const response = await productsAPI.searchAndFilter({ categoria_id });
      setResultadosBusqueda(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      console.error('Error cargando categoría:', error);
      setResultadosBusqueda([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLimpiarFiltros = () => {
    setFiltros({
      nombre: '',
      categoria_id: '',
      tipo_producto_id: '',
      material_principal: '',
      precio_min: 0,
      precio_max: 100000,
    });
    setSearchMode(false);
    setResultadosBusqueda([]);
    setPaginaBusqueda(0);
  };

  // --- FAVORITOS TOGGLE (requiere sesión) ---
  const handleToggleFavorito = async (e: React.MouseEvent, productoId: number) => {
    e.stopPropagation();
    if (!logueado) {
      navigate('/login');
      return;
    }
    if (togglingFav === productoId) return;
    setTogglingFav(productoId);
    try {
      const res = await favoritosAPI.toggle(productoId);
      if (res.favorito) {
        setFavoritosIds(prev => new Set([...prev, productoId]));
        const resFavs = await favoritosAPI.getAll();
        const lista: Producto[] = Array.isArray(resFavs?.data) ? resFavs.data.map((f: any) => ({
          id: f.producto_id,
          nombre: f.nombre,
          precio_venta: f.precio_venta,
          precio_oferta: f.precio_oferta,
          precio_promocion: f.precio_promocion,
          imagen_principal: f.imagen_principal,
          stock_actual: f.stock_actual,
          es_nuevo: f.es_nuevo,
          categoria_nombre: f.categoria_nombre,
        })) : [];
        setFavoritos(lista);
        setFavoritosIds(new Set(lista.map(p => p.id)));
      } else {
        setFavoritosIds(prev => { const s = new Set(prev); s.delete(productoId); return s; });
        setFavoritos(prev => prev.filter(p => p.id !== productoId));
      }
    } catch { /* ignorar */ } finally {
      setTogglingFav(null);
    }
  };

  // --- MODAL ---
  const verDetalles = (producto: Producto) => {
    setSelectedProducto(producto);
    setModalOpen(true);
  };

  const cerrarModal = () => {
    setModalOpen(false);
    setSelectedProducto(null);
  };

  // --- CÁLCULOS DE PAGINACIÓN ---
  const totalPaginas = Math.ceil(resultadosBusqueda.length / PAGE_SIZE);
  const productosPaginaActual = resultadosBusqueda.slice(
    paginaBusqueda * PAGE_SIZE,
    (paginaBusqueda + 1) * PAGE_SIZE
  );

  const renderPaginacion = () => {
    if (totalPaginas <= 1) return null;

    const delta = 2;
    const range: number[] = [];
    for (
      let i = Math.max(0, paginaBusqueda - delta);
      i <= Math.min(totalPaginas - 1, paginaBusqueda + delta);
      i++
    ) {
      range.push(i);
    }

    const irA = (p: number) => {
      setPaginaBusqueda(p);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
      <div className="paginacion-container">
        <button className="paginacion-btn" onClick={() => irA(0)} disabled={paginaBusqueda === 0}>«</button>
        <button className="paginacion-btn" onClick={() => irA(paginaBusqueda - 1)} disabled={paginaBusqueda === 0}>‹</button>

        {range[0] > 0 && (
          <>
            <button className="paginacion-btn" onClick={() => irA(0)}>1</button>
            {range[0] > 1 && <span className="paginacion-ellipsis">…</span>}
          </>
        )}

        {range.map((p) => (
          <button
            key={p}
            className={`paginacion-btn${p === paginaBusqueda ? ' paginacion-btn--activo' : ''}`}
            onClick={() => irA(p)}
          >
            {p + 1}
          </button>
        ))}

        {range[range.length - 1] < totalPaginas - 1 && (
          <>
            {range[range.length - 1] < totalPaginas - 2 && (
              <span className="paginacion-ellipsis">…</span>
            )}
            <button className="paginacion-btn" onClick={() => irA(totalPaginas - 1)}>
              {totalPaginas}
            </button>
          </>
        )}

        <button className="paginacion-btn" onClick={() => irA(paginaBusqueda + 1)} disabled={paginaBusqueda === totalPaginas - 1}>›</button>
        <button className="paginacion-btn" onClick={() => irA(totalPaginas - 1)} disabled={paginaBusqueda === totalPaginas - 1}>»</button>
      </div>
    );
  };

  // --- CARD REUTILIZABLE ---
  const ProductoCard = ({ producto, indice = 0 }: { producto: Producto; indice?: number }) => {
    const esFav = favoritosIds.has(producto.id);
    return (
      <div
        className="producto-card reveal-stagger"
        style={{ ['--stagger-i' as any]: indice % 8 }}
        onClick={() => verDetalles(producto)}
      >
        <div className="producto-imagen">
          {producto.imagen_principal ? (
            <img
              src={producto.imagen_principal}
              alt={producto.nombre}
              onError={(e) => { (e.target as HTMLImageElement).src = placeholderImg; }}
            />
          ) : (
            <img src={placeholderImg} alt={producto.nombre} />
          )}
          {producto.es_nuevo && <span className="badge-nuevo">Nuevo</span>}
          {(producto.precio_oferta || producto.precio_promocion) && <span className="badge-oferta">{producto.precio_promocion ? 'Promo' : 'Oferta'}</span>}
          {producto.stock_actual === 0 && <span className="badge-agotado">Agotado</span>}
          {producto.stock_actual > 0 && producto.stock_actual <= 5 && (
            <span className="badge-poco-stock">¡Últimas {producto.stock_actual}!</span>
          )}
          <div className="producto-overlay"><span>Ver pieza →</span></div>
          <button
            className={`btn-favorito${esFav ? ' btn-favorito--activo' : ''}`}
            onClick={(e) => handleToggleFavorito(e, producto.id)}
            disabled={togglingFav === producto.id}
            aria-label={esFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          >
            {esFav ? '♥' : '♡'}
          </button>
        </div>
        <div className="producto-info">
          <h4>{producto.nombre}</h4>
          <p className="tipo">{producto.tipo_producto_nombre || producto.categoria_nombre}</p>
          <div className="precio-section">
            {(() => {
              const precioFinal = producto.precio_promocion ?? producto.precio_oferta;
              if (precioFinal) {
                return <>
                  <span className="precio original">${(producto.precio_venta ?? 0).toLocaleString('es-MX')}</span>
                  <span className="precio oferta">${Number(precioFinal).toLocaleString('es-MX')}</span>
                  {producto.precio_promocion && <AiOutlineTag size={13} />}
                </>;
              }
              return <span className="precio">${(producto.precio_venta ?? 0).toLocaleString('es-MX')}</span>;
            })()}
          </div>
          <div className="producto-stock">
            {producto.stock_actual === 0 ? (
              <span className="stock-agotado">Agotado</span>
            ) : producto.stock_actual <= 5 ? (
              <span className="stock-poco">Quedan {producto.stock_actual} unidades</span>
            ) : (
              <span className="stock-ok">{producto.stock_actual} disponibles</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const promoLabel = (p: any) => {
    if (p.tipo === 'porcentaje') return `${p.valor_descuento}% de descuento`;
    if (p.tipo === 'monto_fijo') return `-$${p.valor_descuento} MXN`;
    return p.nombre;
  };

  return (
    <div className="catalogo-public-container">
      <PublicHeader />

      {promociones.length > 0 && !tickerCerrado && (
        <div className="promo-ticker-fixed">
          <span className="promo-ticker-badge">Ofertas</span>
          <div className="promo-ticker-scroll-wrap">
            <div className="promo-ticker-scroll-track">
              {[...promociones, ...promociones].map((p, i) => (
                <span key={i} className="promo-ticker-scroll-item">
                  <strong>{p.nombre}</strong> — {promoLabel(p)}
                  {p.fecha_fin && (
                    <em> · Válida hasta {new Date(p.fecha_fin).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</em>
                  )}
                  <span className="promo-ticker-sep">◆</span>
                </span>
              ))}
            </div>
          </div>
          <button className="promo-ticker-close" onClick={() => setTickerCerrado(true)} aria-label="Cerrar">✕</button>
        </div>
      )}

      {loading ? (
        <div className="loading-screen">Cargando joyas exclusivas...</div>
      ) : (
      <main className="catalogo-body" style={promociones.length > 0 && !tickerCerrado ? { paddingTop: '36px' } : {}}>
        <div className="catalogo-encabezado">
          <span className="catalogo-eyebrow">Colección completa</span>
          <h2 className="page-title">Catálogo</h2>
          <p className="catalogo-subtitulo">Cada pieza, seleccionada con la misma atención al detalle con la que la harías tú.</p>
        </div>

        <div className="catalogo-shell">
          <aside className="catalogo-filtros-panel">
            <div className="filtro-buscador">
              <AiOutlineSearch size={16} className="filtro-buscador-icon" />
              <input
                type="text"
                placeholder="Buscar producto..."
                value={filtros.nombre}
                onChange={(e) => setFiltros({ ...filtros, nombre: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
              />
            </div>

            <div className="form-group">
              <label>Categoría</label>
              <select
                value={filtros.categoria_id}
                onChange={(e) => setFiltros({ ...filtros, categoria_id: e.target.value })}
              >
                <option value="">Todas las categorías</option>
                {categorias.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Tipo de Producto</label>
              <select
                value={filtros.tipo_producto_id}
                onChange={(e) => setFiltros({ ...filtros, tipo_producto_id: e.target.value })}
              >
                <option value="">Todos los tipos</option>
                {tiposProducto.map((tipo) => (
                  <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Material</label>
              <input
                type="text"
                placeholder="Ej: Oro, Plata..."
                value={filtros.material_principal}
                onChange={(e) => setFiltros({ ...filtros, material_principal: e.target.value })}
              />
            </div>

            <div className="filtro-precio-row">
              <div className="form-group">
                <label>Precio Mín</label>
                <input
                  type="number"
                  placeholder="0"
                  value={filtros.precio_min}
                  onChange={(e) => setFiltros({ ...filtros, precio_min: Number(e.target.value) })}
                />
              </div>

              <div className="form-group">
                <label>Precio Máx</label>
                <input
                  type="number"
                  placeholder="100000"
                  value={filtros.precio_max}
                  onChange={(e) => setFiltros({ ...filtros, precio_max: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="filtros-actions">
              <button className="btn-primary" onClick={handleBuscar}>Buscar</button>
              <button className="btn-secondary" onClick={handleLimpiarFiltros}>Limpiar</button>
            </div>
          </aside>

          <div className="catalogo-contenido">

            {favoritos.length > 0 && !searchMode && (
              <section className="favoritos-section">
                <div className="favoritos-header">
                  <span className="favoritos-titulo">Mis Favoritos</span>
                  <span className="favoritos-count">{favoritos.length} producto{favoritos.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="productos-grid favoritos-grid">
                  {favoritos.map((producto, i) => (
                    <ProductoCard key={`fav-${producto.id}`} producto={producto} indice={i} />
                  ))}
                </div>
              </section>
            )}

            {!searchMode && (
              Object.entries(productosPorCategoria).length > 0 ? (
                <div className="categorias-sections">
                  {Object.entries(productosPorCategoria).map(([nombreCategoria, productos]) => {
                    const productosPreview = productos.slice(0, PAGE_SIZE);
                    const hayMas = productos.length > PAGE_SIZE;
                    const categoria_id = productos[0]?.categoria_id || 0;

                    return (
                      <section key={nombreCategoria} className="categoria-section">
                        <div className="categoria-header-row">
                          <h3 className="categoria-title">{nombreCategoria}</h3>
                          <span className="categoria-count">
                            {productos.length} producto{productos.length !== 1 ? 's' : ''}
                          </span>
                        </div>

                        <div className="productos-grid">
                          {productosPreview.map((producto, i) => (
                            <ProductoCard key={producto.id} producto={producto} indice={i} />
                          ))}
                        </div>

                        {hayMas && (
                          <div className="categoria-ver-mas">
                            <button
                              className="btn-ver-mas"
                              onClick={() => handleVerMasCategoria(categoria_id)}
                            >
                              Ver todos en {nombreCategoria} ({productos.length} productos)
                            </button>
                          </div>
                        )}
                      </section>
                    );
                  })}
                </div>
              ) : (
                <div className="no-results">
                  <p>No hay productos disponibles en este momento.</p>
                </div>
              )
            )}

            {searchMode && (
              resultadosBusqueda.length > 0 ? (
                <div className="resultados-section">
                  <h3 className="resultados-title">
                    Resultados ({resultadosBusqueda.length})
                    {totalPaginas > 1 && ` — página ${paginaBusqueda + 1} de ${totalPaginas}`}
                  </h3>
                  <div className="productos-grid">
                    {productosPaginaActual.map((producto, i) => (
                      <ProductoCard key={producto.id} producto={producto} indice={i} />
                    ))}
                  </div>
                  {renderPaginacion()}
                </div>
              ) : (
                <div className="no-results">
                  <p>No encontramos productos con esos criterios.</p>
                  <button className="btn-link" onClick={handleLimpiarFiltros}>
                    Limpiar filtros
                  </button>
                </div>
              )
            )}

          </div>
        </div>

        {modalOpen && selectedProducto && (
          <DetalleProductoModal
            isOpen={modalOpen}
            producto={selectedProducto}
            onClose={cerrarModal}
            promoFechaFin={(selectedProducto as any).precio_promocion && promociones.length > 0 ? promociones[0].fecha_fin : undefined}
          />
        )}
      </main>
      )}

      <PublicFooter />
    </div>
  );
};

export default CatalogoPublicScreen;
