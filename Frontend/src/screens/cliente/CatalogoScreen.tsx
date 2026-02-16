import React, { useState, useMemo, useEffect } from 'react';
import './CatalogoScreen.css';
import { productsAPI } from '../../services/api';

interface Producto {
    id: number;
    nombre: string;
    precio: number;
    descripcion: string;
    imagen_url?: string;
    categoria: string;
}

const CatalogoScreen: React.FC = () => {
    // --- ESTADOS DE DATOS ---
    const [productos, setProductos] = useState<Producto[]>([]);
    const [loading, setLoading] = useState(true);

    // --- ESTADOS DE FILTRADO ---
    const [categoriaActiva, setCategoriaActiva] = useState('Todas');
    const [busqueda, setBusqueda] = useState('');
    const [precioMaximo, setPrecioMaximo] = useState(20000); 
    const [orden, setOrden] = useState('relevancia'); 
    
    // --- ESTADOS DE UI ---
    const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
    const [paginaActual, setPaginaActual] = useState(1);
    const [instruccionesAbiertas, setInstruccionesAbiertas] = useState(false);
    
    const productosPorPagina = 6;

    // 1. CARGAR PRODUCTOS REALES DESDE LA API
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                setLoading(true);
                const data = await productsAPI.getAll();
                const lista = Array.isArray(data) ? data : (data.data || []);
                
                const productosNormalizados = lista.map((p: any) => ({
                    id: p.id,
                    nombre: p.nombre,
                    precio: Number(p.precio),
                    descripcion: p.descripcion || 'Sin descripción disponible.',
                    imagen_url: p.imagen_url || p.imagen, // Soporta ambos nombres de columna
                    categoria: p.categoria_nombre || p.categoria || 'Joyería'
                }));

                setProductos(productosNormalizados);
            } catch (error) {
                console.error("Error cargando catálogo", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, []);

    // 2. GENERAR CATEGORÍAS DINÁMICAS (Basadas en los productos existentes)
    const categoriasDinamicas = useMemo(() => {
        const nombresCategorias = productos.map(p => p.categoria);
        // Usamos Array.from para evitar errores de TS/ES5 con el spread de Set
        return ['Todas', ...Array.from(new Set(nombresCategorias))];
    }, [productos]);

    // 3. LÓGICA DE FILTRADO MULTIVARIABLE
    const productosFiltrados = useMemo(() => {
        let resultado = productos.filter(p => {
            // Filtro por Categoría exacta
            const coincideCategoria = categoriaActiva === 'Todas' || p.categoria === categoriaActiva;
            
            // Filtro por Busqueda
            const coincideBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
                                     p.descripcion.toLowerCase().includes(busqueda.toLowerCase());
                                     
            // Filtro por Precio
            const coincidePrecio = p.precio <= precioMaximo;

            return coincideCategoria && coincideBusqueda && coincidePrecio;
        });

        // Ordenamiento
        if (orden === 'precio-bajo') {
            resultado.sort((a, b) => a.precio - b.precio);
        } else if (orden === 'precio-alto') {
            resultado.sort((a, b) => b.precio - a.precio);
        }

        return resultado;
    }, [categoriaActiva, busqueda, precioMaximo, orden, productos]);

    // --- LÓGICA DE PAGINACIÓN ---
    const indiceInicio = (paginaActual - 1) * productosPorPagina;
    const productosActuales = productosFiltrados.slice(indiceInicio, indiceInicio + productosPorPagina);
    const totalPaginas = Math.ceil(productosFiltrados.length / productosPorPagina);

    // --- MANEJADORES ---
    const verDetalles = (producto: Producto) => {
        setProductoSeleccionado(producto);
        setInstruccionesAbiertas(false);
    };

    const cerrarDetalles = () => {
        setProductoSeleccionado(null);
        setInstruccionesAbiertas(false);
    };

    const cambiarPagina = (nuevaPagina: number) => {
        setPaginaActual(nuevaPagina);
        window.scrollTo(0, 0);
    };

    if (loading) {
        return <div className="loading-screen">Cargando joyas exclusivas...</div>;
    }

    return (
        <main className="catalogo-body">
            <h2 className="page-title">Catálogo de Productos</h2>

            {/* --- SECCIÓN DE FILTROS --- */}
            <div className="filtros-container-premium">
                <div className="search-container-premium">
                    <input 
                        type="text" 
                        className="search-input"
                        placeholder="Buscar joya..."
                        value={busqueda}
                        onChange={(e) => { setBusqueda(e.target.value); setPaginaActual(1); }}
                    />
                    <span className="search-icon">🔍</span>
                </div>

                <div className="advanced-filters-row">
                    <div className="filter-group">
                        <label className="filter-label">Max: <strong>${precioMaximo.toLocaleString()}</strong></label>
                        <input 
                            type="range" 
                            className="price-slider"
                            min="0" 
                            max="30000" 
                            step="500"
                            value={precioMaximo}
                            onChange={(e) => { setPrecioMaximo(Number(e.target.value)); setPaginaActual(1); }}
                        />
                    </div>

                    <div className="filter-group">
                        <select 
                            className="filter-select"
                            value={orden} 
                            onChange={(e) => setOrden(e.target.value)}
                        >
                            <option value="relevancia">Relevancia</option>
                            <option value="precio-bajo">Precio: Bajo a Alto</option>
                            <option value="precio-alto">Precio: Alto a Bajo</option>
                        </select>
                    </div>
                </div>

                {/* Chips de Categoría DINÁMICOS */}
                <div className="categorias-filter">
                    <div className="filter-buttons">
                        {categoriasDinamicas.map(cat => (
                            <button 
                                key={cat}
                                className={`btn-filter ${categoriaActiva === cat ? 'active' : 'outline'}`}
                                onClick={() => { setCategoriaActiva(cat); setPaginaActual(1); }}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* AVISO SIN RESULTADOS */}
            {!loading && productosFiltrados.length === 0 && (
                <div className="no-results">
                    <p>No encontramos joyas con esas características.</p>
                    <button className="btn-link" onClick={() => {setBusqueda(''); setPrecioMaximo(20000); setCategoriaActiva('Todas');}}>
                        Limpiar filtros
                    </button>
                </div>
            )}

            {/* --- GRID DE PRODUCTOS --- */}
            <div className="productos-grid">
                {productosActuales.map((producto) => (
                    <div key={producto.id} className="producto-card">
                        <div className="producto-imagen-box">
                            <span className="categoria-tag">{producto.categoria}</span>
                            {producto.imagen_url ? (
                                <img src={producto.imagen_url} alt={producto.nombre} className="producto-img-real" />
                            ) : (
                                <div className="placeholder-icon">💎</div>
                            )}
                        </div>
                        <div className="producto-info">
                            <h6 className="producto-nombre">{producto.nombre}</h6>
                            <p className="producto-desc-corta">
                                {producto.descripcion.substring(0, 40)}...
                            </p>
                            <div className="producto-precio">${producto.precio.toLocaleString()}</div>
                            <div className="producto-acciones-grid">
                                <button className="btn-accion primary" onClick={() => verDetalles(producto)}>
                                    Ver Detalle
                                </button>
                                <button className="btn-accion outline">🛒</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* --- PAGINACIÓN --- */}
            {totalPaginas > 1 && (
                <div className="paginacion">
                    <button 
                        className="btn-pagina" 
                        disabled={paginaActual === 1} 
                        onClick={() => cambiarPagina(paginaActual - 1)}
                    > ← </button>
                    <span className="info-pagina">{paginaActual} / {totalPaginas}</span>
                    <button 
                        className="btn-pagina" 
                        disabled={paginaActual === totalPaginas} 
                        onClick={() => cambiarPagina(paginaActual + 1)}
                    > → </button>
                </div>
            )}

            {/* --- MODAL DE DETALLES --- */}
            {productoSeleccionado && (
                <div className="modal-overlay" onClick={cerrarDetalles}>
                    <div className="modal-detalles" onClick={e => e.stopPropagation()}>
                        <button className="btn-cerrar" onClick={cerrarDetalles}>×</button>
                        <div className="detalles-content">
                            <div className="detalles-imagen">
                                {productoSeleccionado.imagen_url ? (
                                    <img src={productoSeleccionado.imagen_url} alt="Full" className="img-full-modal"/>
                                ) : (
                                    <div className="placeholder-imagen grande">💎</div>
                                )}
                            </div>
                            <div className="detalles-info">
                                <h2>{productoSeleccionado.nombre}</h2>
                                <p className="detalles-precio">${productoSeleccionado.precio.toLocaleString()}</p>
                                <p className="detalles-descripcion">{productoSeleccionado.descripcion}</p>
                                <button className="btn-comprar">Agregar al Carrito</button>

                                <div className="ar-instructions">
                                    <button 
                                        className="ar-instructions-header" 
                                        onClick={() => setInstruccionesAbiertas(!instruccionesAbiertas)}
                                    >
                                        <h4>🔮 Ver en Realidad Aumentada</h4>
                                        <span>{instruccionesAbiertas ? '−' : '+'}</span>
                                    </button>
                                    
                                    {instruccionesAbiertas && (
                                        <div className="ar-instructions-content expanded">
                                            <p className="qr-description">
                                                Escanea este código con nuestra App Unity para probarte esta joya virtualmente.
                                            </p>
                                            <div className="fake-qr" style={{background: '#eee', height: '100px', width: '100px', margin: '10px auto', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                                <small>ID: {productoSeleccionado.id}</small>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
};

export default CatalogoScreen;