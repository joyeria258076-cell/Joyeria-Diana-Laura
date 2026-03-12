// Ruta: src/screens/cliente/CatalogoScreen.tsx
import React, { useState, useEffect } from 'react';
import { AiOutlineSearch } from 'react-icons/ai';
import './CatalogoScreen.css';
import { productsAPI } from '../../services/api';
import DetalleProductoModal from '../publico/DetalleProductoModal';

interface Producto {
    id: number;
    nombre: string;
    precio_venta: number;        // ✅ requerido (igual que DetalleProductoModal)
    precio_oferta?: number;
    descripcion?: string;
    imagen_principal?: string;
    categoria_nombre?: string;
    tipo_producto_nombre?: string;
    material_principal?: string;
    stock_actual: number;        // ✅ requerido (igual que DetalleProductoModal)
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

const CatalogoScreen: React.FC = () => {
    // --- ESTADOS DE DATOS ---
    // ✅ FIX: ahora es un array tipado, no un objeto genérico
    const [categorias_con_productos, setCategorias_con_productos] = useState<CategoriaConProductos[]>([]);
    const [resultadosBusqueda, setResultadosBusqueda] = useState<Producto[]>([]);
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [tiposProducto, setTiposProducto] = useState<TipoProducto[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchMode, setSearchMode] = useState(false);

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

    // 1. CARGAR DATOS INICIALES
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                setLoading(true);

                // ✅ FIX: el backend devuelve { success: true, data: [...] }
                // donde data es un array de { categoria_id, categoria_nombre, productos, total }
                const respProductos = await productsAPI.getProductsByCategories(4);
                const rawData = Array.isArray(respProductos?.data) ? respProductos.data : [];
                // Filtrar categorías que tengan al menos 1 producto
                const categoriasValidas = rawData.filter((c: CategoriaConProductos) => c.total > 0);
                setCategorias_con_productos(categoriasValidas);

                // Cargar todas las categorías para el filtro
                const respCategorias = await productsAPI.getCategories();
                setCategorias(Array.isArray(respCategorias?.data) ? respCategorias.data : []);

                // Cargar todos los tipos de producto para el filtro
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

    // --- MANEJADORES DE BÚSQUEDA Y FILTRO ---
    const handleBuscar = async () => {
        try {
            setLoading(true);
            setSearchMode(true);
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
    };

    // --- MANEJADORES DE MODAL ---
    const verDetalles = (producto: Producto) => {
        setSelectedProducto(producto);
        setModalOpen(true);
    };

    const cerrarModal = () => {
        setModalOpen(false);
        setSelectedProducto(null);
    };

    // --- PLACEHOLDER IMAGE ---
    const placeholderImg = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iIzFhMWEyZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjQ4IiBmaWxsPSIjZWNiMmMzIj7oo6s8L3RleHQ+PC9zdmc+';

    // ---- CARD REUTILIZABLE ----
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
            </div>
            <div className="producto-info">
                <h4>{producto.nombre}</h4>
                <p className="tipo">{producto.tipo_producto_nombre || producto.categoria_nombre}</p>
                <div className="precio-section">
                    {producto.precio_oferta ? (
                        <>
                            <span className="precio original">${producto.precio_venta?.toLocaleString('es-MX')}</span>
                            <span className="precio oferta">${producto.precio_oferta?.toLocaleString('es-MX')}</span>
                        </>
                    ) : (
                        <span className="precio">${producto.precio_venta?.toLocaleString('es-MX')}</span>
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

            {/* --- SECCIÓN DE FILTROS --- */}
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

            {/* --- VISTA POR CATEGORÍAS (modo normal) --- */}
            {!searchMode && (
                categorias_con_productos.length > 0 ? (
                    <div className="categorias-sections">
                        {categorias_con_productos.map((catData) => (
                            <section key={catData.categoria_id} className="categoria-section">
                                {/* ✅ Ahora usa categoria_nombre del objeto, no el índice */}
                                <h3 className="categoria-title">{catData.categoria_nombre}</h3>
                                <div className="productos-grid">
                                    {catData.productos.map((producto) => (
                                        <ProductoCard key={producto.id} producto={producto} />
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                ) : (
                    <div className="no-results">
                        <p>No hay productos disponibles en este momento.</p>
                    </div>
                )
            )}

            {/* --- RESULTADOS DE BÚSQUEDA --- */}
            {searchMode && (
                resultadosBusqueda.length > 0 ? (
                    <div className="resultados-section">
                        <h3 className="resultados-title">
                            Resultados ({resultadosBusqueda.length})
                        </h3>
                        <div className="productos-grid">
                            {resultadosBusqueda.map((producto) => (
                                <ProductoCard key={producto.id} producto={producto} />
                            ))}
                        </div>
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

            {/* --- MODAL DE DETALLES --- */}
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