// Ruta: src/screens/cliente/CatalogoScreen.tsx
import React, { useState, useEffect } from 'react';
import { AiOutlineSearch } from 'react-icons/ai';
import './CatalogoScreen.css';
import { productsAPI } from '../../services/api';
import DetalleProductoModal from '../publico/DetalleProductoModal';

interface Producto {
    id: number;
    nombre: string;
    precio_venta: number;
    precio_oferta?: number;
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

interface Categoria {
    id: number;
    nombre: string;
}

interface TipoProducto {
    id: number;
    nombre: string;
}

const PAGE_SIZE = 10;

const CatalogoScreen: React.FC = () => {
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

    // --- PLACEHOLDER IMAGE ---
    const placeholderImg = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iIzFhMWEyZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjQ4IiBmaWxsPSIjZWNiMmMzIj7oo6s8L3RleHQ+PC9zdmc+';

    // 1. CARGAR DATOS INICIALES — sin límite, trae todos
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

            } catch (error) {
                console.error('Error cargando datos iniciales:', error);
            } finally {
                setLoading(false);
            }
        };

        loadInitialData();
    }, []);

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

    // --- RENDER PAGINACIÓN ---
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
    const ProductoCard = ({ producto }: { producto: Producto }) => (
        <div className="producto-card" onClick={() => verDetalles(producto)}>
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
                {producto.precio_oferta && <span className="badge-oferta">Oferta</span>}
                {producto.stock_actual === 0 && <span className="badge-agotado">Agotado</span>}
                {producto.stock_actual > 0 && producto.stock_actual <= 5 && (
                    <span className="badge-poco-stock">¡Últimas {producto.stock_actual}!</span>
                )}
            </div>
            <div className="producto-info">
                <h4>{producto.nombre}</h4>
                <p className="tipo">{producto.tipo_producto_nombre || producto.categoria_nombre}</p>
                <div className="precio-section">
                    {producto.precio_oferta ? (
                        <>
                            <span className="precio original">${(producto.precio_venta ?? 0).toLocaleString('es-MX')}</span>
                            <span className="precio oferta">${(producto.precio_oferta ?? 0).toLocaleString('es-MX')}</span>
                        </>
                    ) : (
                        <span className="precio">${(producto.precio_venta ?? 0).toLocaleString('es-MX')}</span>
                    )}
                </div>
                <div className="producto-stock">
                    {producto.stock_actual === 0 ? (
                        <span className="stock-agotado">❌ Agotado</span>
                    ) : producto.stock_actual <= 5 ? (
                        <span className="stock-poco">⚠️ Quedan {producto.stock_actual} unidades</span>
                    ) : (
                        <span className="stock-ok">✅ {producto.stock_actual} disponibles</span>
                    )}
                </div>
            </div>
        </div>
    );

    // --- RENDERIZADO ---
    if (loading) {
        return <div className="loading-screen">Cargando joyas exclusivas...</div>;
    }

    return (
        <main className="catalogo-body">
            <h2 className="page-title">Catálogo de Productos</h2>

            {/* --- FILTROS --- */}
            <div className="filtros-container">
                <div className="search-section">
                    <div className="buscador">
                        <input
                            type="text"
                            placeholder="Buscar producto..."
                            value={filtros.nombre}
                            onChange={(e) => setFiltros({ ...filtros, nombre: e.target.value })}
                            onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
                        />
                        <button className="btn-buscar" onClick={handleBuscar}>
                            <AiOutlineSearch size={20} />
                        </button>
                    </div>
                </div>

                <div className="filtros-row">
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
                    <button className="btn-secondary" onClick={handleLimpiarFiltros}>Limpiar Filtros</button>
                </div>
            </div>

            {/* --- MODO CATEGORÍAS — primeros 10, botón ver más → paginación --- */}
            {!searchMode && (
                Object.entries(productosPorCategoria).length > 0 ? (
                    <div className="categorias-sections">
                        {Object.entries(productosPorCategoria).map(([nombreCategoria, productos]) => {
                            const productosPreview = productos.slice(0, PAGE_SIZE);
                            const hayMas = productos.length > PAGE_SIZE;
                            // Obtenemos categoria_id del primer producto para el API call
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
                                        {productosPreview.map((producto) => (
                                            <ProductoCard key={producto.id} producto={producto} />
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

            {/* --- MODO BÚSQUEDA — paginación numérica --- */}
            {searchMode && (
                resultadosBusqueda.length > 0 ? (
                    <div className="resultados-section">
                        <h3 className="resultados-title">
                            Resultados ({resultadosBusqueda.length})
                            {totalPaginas > 1 && ` — página ${paginaBusqueda + 1} de ${totalPaginas}`}
                        </h3>
                        <div className="productos-grid">
                            {productosPaginaActual.map((producto) => (
                                <ProductoCard key={producto.id} producto={producto} />
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

            {/* --- MODAL --- */}
            {modalOpen && selectedProducto && (
                <DetalleProductoModal
                    isOpen={modalOpen}
                    producto={selectedProducto}
                    onClose={cerrarModal}
                />
            )}
        </main>
    );
};

export default CatalogoScreen;