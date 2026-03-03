import React, { useState, useEffect } from 'react';
import { AiOutlineSearch, AiOutlinePlus, AiOutlineMinus } from 'react-icons/ai';
import './CatalogoScreen.css';
import { productsAPI } from '../../services/api';
import DetalleProductoModal from '../publico/DetalleProductoModal';

interface Producto {
    id: number;
    nombre: string;
    precio_venta?: number;
    precio_oferta?: number;
    descripcion?: string;
    imagen_principal?: string;
    categoria_nombre?: string;
    tipo_producto_nombre?: string;
    material_principal?: string;
    stock_actual?: number;
    es_nuevo?: boolean;
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
    const [productosPorCategoria, setProductosPorCategoria] = useState<any>({});
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
                
                // Cargar productos por categorías
                const respProductos = await productsAPI.getProductsByCategories(4);
                const productosData = Array.isArray(respProductos?.data) ? respProductos.data : [];
                setProductosPorCategoria(productosData);

                // Cargar todas las categorías
                const respCategorias = await productsAPI.getCategories();
                const categoriasData = Array.isArray(respCategorias?.data) ? respCategorias.data : [];
                setCategorias(categoriasData);

                // Cargar todos los tipos de producto
                const respTipos = await productsAPI.getTiposProducto();
                const tiposData = Array.isArray(respTipos?.data) ? respTipos.data : [];
                setTiposProducto(tiposData);
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
            const productos = Array.isArray(response?.data) ? response.data : [];
            setResultadosBusqueda(productos);
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

    // --- MANEJADORES ---
    const verDetalles = (producto: Producto) => {
        setSelectedProducto(producto);
        setModalOpen(true);
    };

    const cerrarModal = () => {
        setModalOpen(false);
        setSelectedProducto(null);
    };

    // --- RENDERIZADO ---
    if (loading) {
        return <div className="loading-screen">Cargando joyas exclusivas...</div>;
    }

    return (
        <main className="catalogo-body">
            <h2 className="page-title">Catálogo de Productos</h2>

            {/* --- SECCIÓN DE FILTROS --- */}
            <div className="filtros-container">
                {/* BUSCADOR */}
                <div className="search-section">
                    <div className="buscador">
                        <input
                            type="text"
                            placeholder="Buscar producto..."
                            value={filtros.nombre}
                            onChange={(e) => setFiltros({ ...filtros, nombre: e.target.value })}
                            onKeyPress={(e) => e.key === 'Enter' && handleBuscar()}
                        />
                        <button className="btn-buscar" onClick={handleBuscar}>
                            <AiOutlineSearch size={20} />
                        </button>
                    </div>
                </div>

                {/* FILTROS AVANZADOS */}
                <div className="filtros-row">
                    <div className="form-group">
                        <label>Categoría</label>
                        <select
                            value={filtros.categoria_id}
                            onChange={(e) => setFiltros({ ...filtros, categoria_id: e.target.value })}
                        >
                            <option value="">Todas las categorías</option>
                            {categorias.map((cat: any) => (
                                <option key={cat.id} value={cat.id}>
                                    {cat.nombre}
                                </option>
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
                            {tiposProducto.map((tipo: any) => (
                                <option key={tipo.id} value={tipo.id}>
                                    {tipo.nombre}
                                </option>
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
                    <button className="btn-primary" onClick={handleBuscar}>
                        Buscar
                    </button>
                    <button className="btn-secondary" onClick={handleLimpiarFiltros}>
                        Limpiar Filtros
                    </button>
                </div>
            </div>

            {/* --- VISTA DE CATEGORÍAS O RESULTADOS --- */}
            {!searchMode && Object.keys(productosPorCategoria).length > 0 ? (
                <div className="categorias-sections">
                    {Object.entries(productosPorCategoria).map(([nombreCategoria, productos]) => (
                        <section key={nombreCategoria} className="categoria-section">
                            <h3 className="categoria-title">{nombreCategoria}</h3>
                            <div className="productos-grid">
                                {Array.isArray(productos) && (productos as Producto[]).map((producto) => (
                                    <div key={producto.id} className="producto-card" onClick={() => verDetalles(producto)}>
                                        <div className="producto-imagen">
                                            {producto.imagen_principal ? (
                                                <img src={producto.imagen_principal} alt={producto.nombre} />
                                            ) : (
                                                <div className="placeholder">💎</div>
                                            )}
                                            {producto.es_nuevo && <span className="badge-nuevo">Nuevo</span>}
                                            {producto.precio_oferta && <span className="badge-oferta">Oferta</span>}
                                        </div>
                                        <div className="producto-info">
                                            <h4>{producto.nombre}</h4>
                                            <p className="tipo">{producto.tipo_producto_nombre}</p>
                                            <div className="precio-section">
                                                {producto.precio_oferta ? (
                                                    <>
                                                        <span className="precio original">${producto.precio_venta?.toLocaleString()}</span>
                                                        <span className="precio oferta">${producto.precio_oferta?.toLocaleString()}</span>
                                                    </>
                                                ) : (
                                                    <span className="precio">${producto.precio_venta?.toLocaleString()}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            ) : null}

            {/* --- RESULTADOS DE BÚSQUEDA --- */}
            {searchMode && (
                <div>
                    {resultadosBusqueda.length > 0 ? (
                        <div className="resultados-section">
                            <h3 className="resultados-title">
                                Resultados de búsqueda ({resultadosBusqueda.length})
                            </h3>
                            <div className="productos-grid">
                                {resultadosBusqueda.map((producto) => (
                                    <div key={producto.id} className="producto-card" onClick={() => verDetalles(producto)}>
                                        <div className="producto-imagen">
                                            {producto.imagen_principal ? (
                                                <img src={producto.imagen_principal} alt={producto.nombre} />
                                            ) : (
                                                <div className="placeholder">💎</div>
                                            )}
                                            {producto.es_nuevo && <span className="badge-nuevo">Nuevo</span>}
                                            {producto.precio_oferta && <span className="badge-oferta">Oferta</span>}
                                        </div>
                                        <div className="producto-info">
                                            <h4>{producto.nombre}</h4>
                                            <p className="tipo">{producto.tipo_producto_nombre}</p>
                                            <div className="precio-section">
                                                {producto.precio_oferta ? (
                                                    <>
                                                        <span className="precio original">${producto.precio_venta?.toLocaleString()}</span>
                                                        <span className="precio oferta">${producto.precio_oferta?.toLocaleString()}</span>
                                                    </>
                                                ) : (
                                                    <span className="precio">${producto.precio_venta?.toLocaleString()}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
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
                    )}
                </div>
            )}

            {/* --- MODAL DE DETALLES --- */}
            {modalOpen && selectedProducto && (
                <DetalleProductoModal
                    producto={selectedProducto}
                    onClose={cerrarModal}
                />
            )}
        </main>
    );
};

export default CatalogoScreen;