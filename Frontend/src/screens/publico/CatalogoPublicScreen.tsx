// Frontend/src/screens/publico/CatalogoPublicScreen.tsx
import React, { useState, useEffect } from "react";
import PublicHeader from "../../components/PublicHeader";
import PublicFooter from "../../components/PublicFooter";
import DetalleProductoModal from "./DetalleProductoModal";
import { productsAPI } from "../../services/api";
import { AiOutlineSearch } from "react-icons/ai";
import "./CatalogoPublicScreen.css";

interface Producto {
  id: number;
  nombre: string;
  descripcion?: string;
  categoria_id?: number;
  categoria_nombre?: string;
  tipo_producto_nombre?: string;
  material_principal?: string;
  precio_venta: number;
  precio_oferta?: number;
  imagen_principal?: string;
  stock_actual: number;
  es_nuevo?: boolean;
  dias_fabricacion?: number;
  permite_personalizacion?: boolean;
}

interface ProductosPorCategoria {
  [key: string]: Producto[];
}

interface FiltrosSearch {
  nombre: string;
  categoria_id?: number | string;
  tipo_producto_id?: number | string;
  material_principal: string;
  precio_min: string;
  precio_max: string;
}

const PAGE_SIZE = 10;

const CatalogoPublicScreen: React.FC = () => {
  // ===== ESTADOS DE DATOS =====
  const [productosPorCategoria, setProductosPorCategoria] = useState<ProductosPorCategoria>({});
  const [resultadosBusqueda, setResultadosBusqueda] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Array<{ id: number; nombre: string }>>([]);
  const [tiposProducto, setTiposProducto] = useState<Array<{ id: number; nombre: string }>>([]);

  // ===== ESTADOS DE UI =====
  const [searchMode, setSearchMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedProducto, setSelectedProducto] = useState<Producto | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // ===== PAGINACIÓN (solo modo búsqueda) =====
  const [paginaBusqueda, setPaginaBusqueda] = useState(0);

  // ===== FILTROS =====
  const [filtros, setFiltros] = useState<FiltrosSearch>({
    nombre: "",
    material_principal: "",
    precio_min: "",
    precio_max: "",
  });

  // ===== CARGAR DATOS INICIALES =====
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);

        // Sin límite — trae todos los productos
        const respCategorias = await productsAPI.getProductsByCategories();
        const categoriasArray = Array.isArray(respCategorias?.data)
          ? respCategorias.data
          : [];

        const categoriasObj: ProductosPorCategoria = {};
        categoriasArray.forEach((cat: any) => {
          categoriasObj[cat.categoria_nombre] = cat.productos || [];
        });
        setProductosPorCategoria(categoriasObj);

        const respAllCategorias = await productsAPI.getCategories();
        setCategorias(
          Array.isArray(respAllCategorias?.data) ? respAllCategorias.data : []
        );

        const respTipos = await productsAPI.getTiposProducto();
        setTiposProducto(
          Array.isArray(respTipos?.data) ? respTipos.data : []
        );
      } catch (error) {
        console.error("Error cargando datos del catálogo:", error);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);

  // ===== BÚSQUEDA =====
  const handleBuscar = async () => {
    try {
      setLoading(true);
      setSearchMode(true);
      setPaginaBusqueda(0);

      const response = await productsAPI.searchAndFilter({
        nombre: filtros.nombre || undefined,
        categoria_id: filtros.categoria_id ? Number(filtros.categoria_id) : undefined,
        tipo_producto_id: filtros.tipo_producto_id ? Number(filtros.tipo_producto_id) : undefined,
        material_principal: filtros.material_principal || undefined,
        precio_min: filtros.precio_min ? Number(filtros.precio_min) : undefined,
        precio_max: filtros.precio_max ? Number(filtros.precio_max) : undefined,
      });

      setResultadosBusqueda(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      console.error("Error en búsqueda:", error);
      setResultadosBusqueda([]);
    } finally {
      setLoading(false);
    }
  };

  // ===== VER MÁS DE UNA CATEGORÍA → entra a modo búsqueda con paginación =====
  const handleVerMasCategoria = async (categoria_id: number) => {
    try {
      setLoading(true);
      setSearchMode(true);
      setPaginaBusqueda(0);

      const response = await productsAPI.searchAndFilter({ categoria_id });
      setResultadosBusqueda(Array.isArray(response?.data) ? response.data : []);
    } catch (error) {
      console.error("Error cargando categoría:", error);
      setResultadosBusqueda([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLimpiarFiltros = () => {
    setFiltros({
      nombre: "",
      material_principal: "",
      precio_min: "",
      precio_max: "",
    });
    setSearchMode(false);
    setResultadosBusqueda([]);
    setPaginaBusqueda(0);
  };

  const handleAbrirDetalle = (producto: Producto) => {
    setSelectedProducto(producto);
    setModalOpen(true);
  };

  const handleCerrarModal = () => {
    setModalOpen(false);
    setSelectedProducto(null);
  };

  // ===== CÁLCULOS DE PAGINACIÓN =====
  const totalPaginas = Math.ceil(resultadosBusqueda.length / PAGE_SIZE);
  const productosPaginaActual = resultadosBusqueda.slice(
    paginaBusqueda * PAGE_SIZE,
    (paginaBusqueda + 1) * PAGE_SIZE
  );

  // ===== PLACEHOLDER =====
  const placeholderImage =
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iIzBkMGQwZCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjI0IiBmaWxsPSIjZWNiMmMzIiBmb250LWZhbWlseT0iQXJpYWwiPkpveWEgRGlhbmEgTGF1cmE8L3RleHQ+PC9zdmc+";

  // ===== RENDER TARJETA =====
  const renderCard = (producto: Producto) => (
    <div
      key={producto.id}
      className="producto-card"
      onClick={() => handleAbrirDetalle(producto)}
    >
      <div
        className="producto-image"
        style={{
          backgroundImage: `url(${producto.imagen_principal || placeholderImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {producto.es_nuevo && <span className="badge-nuevo">Nuevo</span>}
        {producto.precio_oferta && <span className="badge-descuento">Oferta</span>}
      </div>
      <div className="producto-info">
        <h4 className="producto-nombre">{producto.nombre}</h4>
        <p className="producto-categoria">{producto.categoria_nombre}</p>
        <div className="producto-footer">
          <div className="precio-display">
            {producto.precio_oferta ? (
              <>
                <span className="precio-original">
                  ${(producto.precio_venta ?? 0).toLocaleString("es-MX")}
                </span>
                <span className="precio-oferta">
                  ${(producto.precio_oferta ?? 0).toLocaleString("es-MX")}
                </span>
              </>
            ) : (
              <span className="precio-actual">
                ${(producto.precio_venta ?? 0).toLocaleString("es-MX")}
              </span>
            )}
          </div>
          <button className="btn-ver" title="Ver detalles">
            Ver
          </button>
        </div>
      </div>
    </div>
  );

  // ===== RENDER PAGINACIÓN =====
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
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    return (
      <div className="paginacion-container">
        <button
          className="paginacion-btn"
          onClick={() => irA(0)}
          disabled={paginaBusqueda === 0}
        >«</button>
        <button
          className="paginacion-btn"
          onClick={() => irA(paginaBusqueda - 1)}
          disabled={paginaBusqueda === 0}
        >‹</button>

        {range[0] > 0 && (
          <>
            <button className="paginacion-btn" onClick={() => irA(0)}>1</button>
            {range[0] > 1 && <span className="paginacion-ellipsis">…</span>}
          </>
        )}

        {range.map((p) => (
          <button
            key={p}
            className={`paginacion-btn${p === paginaBusqueda ? " paginacion-btn--activo" : ""}`}
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

        <button
          className="paginacion-btn"
          onClick={() => irA(paginaBusqueda + 1)}
          disabled={paginaBusqueda === totalPaginas - 1}
        >›</button>
        <button
          className="paginacion-btn"
          onClick={() => irA(totalPaginas - 1)}
          disabled={paginaBusqueda === totalPaginas - 1}
        >»</button>
      </div>
    );
  };

  // ===== RENDER =====
  return (
    <div className="catalogo-public-container">
      <PublicHeader />

      {/* HERO */}
      <section className="catalogo-hero">
        <div className="container-lg">
          <h1 className="catalogo-title">Nuestro Catálogo</h1>
          <p className="catalogo-subtitle">Joyas únicas que cuentan historias</p>
        </div>
      </section>

      {/* BÚSQUEDA Y FILTROS */}
      <section className="busqueda-filtros-section">
        <div className="container-lg">
          <div className="busqueda-container">
            <div className="search-bar">
              <AiOutlineSearch className="search-icon" />
              <input
                type="text"
                placeholder="Buscar por nombre..."
                value={filtros.nombre}
                onChange={(e) => setFiltros({ ...filtros, nombre: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
              />
            </div>

            <div className="filtros-row">
              <div className="form-group">
                <label htmlFor="categoria">Categoría</label>
                <select
                  id="categoria"
                  value={filtros.categoria_id || ""}
                  onChange={(e) =>
                    setFiltros({
                      ...filtros,
                      categoria_id: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                >
                  <option value="">Todas las categorías</option>
                  {categorias.map((cat: any) => (
                    <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="tipo">Tipo de Producto</label>
                <select
                  id="tipo"
                  value={filtros.tipo_producto_id || ""}
                  onChange={(e) =>
                    setFiltros({
                      ...filtros,
                      tipo_producto_id: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                >
                  <option value="">Todos los tipos</option>
                  {tiposProducto.map((tipo: any) => (
                    <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="material">Material</label>
                <input
                  id="material"
                  type="text"
                  placeholder="Ej: Oro, Plata..."
                  value={filtros.material_principal}
                  onChange={(e) =>
                    setFiltros({ ...filtros, material_principal: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label htmlFor="precio-min">Precio Mínimo</label>
                <input
                  id="precio-min"
                  type="number"
                  placeholder="$0"
                  value={filtros.precio_min}
                  onChange={(e) => setFiltros({ ...filtros, precio_min: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label htmlFor="precio-max">Precio Máximo</label>
                <input
                  id="precio-max"
                  type="number"
                  placeholder="$999,999"
                  value={filtros.precio_max}
                  onChange={(e) => setFiltros({ ...filtros, precio_max: e.target.value })}
                />
              </div>

              <div className="botones-filtros">
                <button className="btn-buscar" onClick={handleBuscar}>Buscar</button>
                <button className="btn-limpiar" onClick={handleLimpiarFiltros}>Limpiar</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CONTENIDO */}
      <section className="catalogo-section">
        <div className="container-lg">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Cargando catálogo...</p>
            </div>
          ) : searchMode ? (

            // ===== MODO BÚSQUEDA — paginación numérica =====
            <>
              <div className="resultados-header">
                <h2>Resultados de búsqueda</h2>
                <p className="resultados-count">
                  {resultadosBusqueda.length} producto{resultadosBusqueda.length !== 1 ? "s" : ""} encontrado{resultadosBusqueda.length !== 1 ? "s" : ""}
                  {totalPaginas > 1 && ` — página ${paginaBusqueda + 1} de ${totalPaginas}`}
                </p>
              </div>

              {resultadosBusqueda.length > 0 ? (
                <>
                  <div className="productos-grid">
                    {productosPaginaActual.map((producto) => renderCard(producto))}
                  </div>
                  {renderPaginacion()}
                </>
              ) : (
                <div className="empty-state">
                  <p>No se encontraron productos con los criterios seleccionados.</p>
                  <button className="btn-volver" onClick={handleLimpiarFiltros}>
                    Ver catálogo completo
                  </button>
                </div>
              )}
            </>

          ) : (

            // ===== MODO CATEGORÍAS — muestra 10, botón "Ver más" → pasa a modo búsqueda =====
            Object.entries(productosPorCategoria).length > 0 ? (
              Object.entries(productosPorCategoria).map(([nombreCategoria, productos]) => {
                // Solo mostramos los primeros 10 en vista de catálogo
                const productosPreview = productos.slice(0, PAGE_SIZE);
                const hayMas = productos.length > PAGE_SIZE;

                return (
                  <div key={nombreCategoria} className="categoria-seccion">
                    <div className="categoria-header">
                      <h2 className="categoria-nombre">{nombreCategoria}</h2>
                      <span className="categoria-total">
                        {productos.length} producto{productos.length !== 1 ? "s" : ""}
                      </span>
                    </div>

                    <div className="productos-grid-4">
                      {productosPreview.map((producto) => renderCard(producto))}
                    </div>

                    {/* Si hay más de 10 → botón que lleva a modo búsqueda con paginación */}
                    {hayMas && (
                      <div className="categoria-footer">
                        <button
                          className="btn-ver-mas"
                          onClick={() =>
                            handleVerMasCategoria(productos[0].categoria_id || 0)
                          }
                        >
                          Ver todos en {nombreCategoria} ({productos.length} productos)
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="empty-state">
                <p>No hay productos disponibles en este momento.</p>
              </div>
            )
          )}
        </div>
      </section>

      {selectedProducto && (
        <DetalleProductoModal
          isOpen={modalOpen}
          producto={selectedProducto}
          onClose={handleCerrarModal}
        />
      )}

      <PublicFooter />
    </div>
  );
};

export default CatalogoPublicScreen;