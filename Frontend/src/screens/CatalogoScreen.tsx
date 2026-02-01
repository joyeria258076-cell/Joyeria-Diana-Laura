import React, { useState, useMemo } from 'react';
import '../styles/CatalogoScreen.css';

interface Producto {
    id: number;
    nombre: string;
    precio: number;
    descripcion: string;
    imagen: string;
    categoria: string;
}

const CatalogoScreen: React.FC = () => {
    // --- ESTADOS ---
    const [categoriaActiva, setCategoriaActiva] = useState('Todas');
    const [busqueda, setBusqueda] = useState(''); // Estado para Búsqueda Simple
    const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
    const [paginaActual, setPaginaActual] = useState(1);
    const [instruccionesAbiertas, setInstruccionesAbiertas] = useState(false);
    
    const productosPorPagina = 4;
    const categorias = ['Todas', 'Anillos', 'Collares', 'Aretes', 'Pulseras', 'Conjuntos'];

    // --- DATOS (MOCK) ---
    const productos: Producto[] = [
        { id: 1, nombre: "Anillo Diamante Elegante", precio: 2500, descripcion: "Anillo en plata sterling con diamante central de 0.5 quilates", imagen: "/assets/images/anillo-diamante.jpg", categoria: "Anillos" },
        { id: 2, nombre: "Collar de Oro 18K", precio: 1800, descripcion: "Cadena de oro sólido con acabado pulido", imagen: "/assets/images/collar-oro.jpg", categoria: "Collares" },
        { id: 3, nombre: "Aretes de Perlas", precio: 1200, descripcion: "Perlas cultivadas con broche de oro blanco", imagen: "/assets/images/aretes-perlas.jpg", categoria: "Aretes" },
        { id: 4, nombre: "Pulsera Esmeralda", precio: 3200, descripcion: "Esmeraldas naturales engastadas en plata", imagen: "/assets/images/pulsera-esmeralda.jpg", categoria: "Pulseras" },
        { id: 5, nombre: "Set Matrimonio", precio: 4500, descripcion: "Conjunto de anillos coordinados", imagen: "/assets/images/set-matrimonio.jpg", categoria: "Conjuntos" },
        { id: 6, nombre: "Anillo Zafiro Azul", precio: 2800, descripcion: "Zafiro central con halo de diamantes", imagen: "/assets/images/anillo-zafiro.jpg", categoria: "Anillos" },
        { id: 7, nombre: "Collar de Perlas", precio: 2200, descripcion: "Anillo en plata sterling con diamante central de 0.5 quilates", imagen: "/assets/images/collar-perlas.jpg", categoria: "Collares" },
        { id: 8, nombre: "Aretes Diamante", precio: 1900, descripcion: "Anillo en plata sterling con diamante central de 0.5 quilates", imagen: "/assets/images/aretes-diamante.jpg", categoria: "Aretes" }
    ];

    // --- LÓGICA DE FILTRADO COMBINADO (Punto 4 del Checklist) ---
    const productosFiltrados = useMemo(() => {
        return productos.filter(p => {
            const coincideCategoria = categoriaActiva === 'Todas' || p.categoria === categoriaActiva;
            const coincideBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
                                     p.descripcion.toLowerCase().includes(busqueda.toLowerCase());
            return coincideCategoria && coincideBusqueda;
        });
    }, [categoriaActiva, busqueda]);

    // --- LÓGICA DE PAGINACIÓN ---
    const indiceInicio = (paginaActual - 1) * productosPorPagina;
    const productosActuales = productosFiltrados.slice(indiceInicio, indiceInicio + productosPorPagina);
    const totalPaginas = Math.ceil(productosFiltrados.length / productosPorPagina);

    // --- MANEJADORES DE EVENTOS ---
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

    return (
        <main className="catalogo-body">
            <h2 className="page-title">Catálogo de Productos</h2>

            {/* --- 4.a BÚSQUEDA SIMPLE --- */}
            <div className="search-container-premium">
                <input 
                    type="text" 
                    className="search-input"
                    placeholder="Buscar por nombre o material (ej. Diamante)..."
                    value={busqueda}
                    onChange={(e) => {
                        setBusqueda(e.target.value);
                        setPaginaActual(1); // Reiniciar paginación al buscar
                    }}
                />
                <span className="search-icon">🔍</span>
            </div>

            {/* --- 4.b BÚSQUEDA AVANZADA (CHIPS) --- */}
            <div className="categorias-filter">
                <h5 className="filter-label">Explorar por Categoría</h5>
                <div className="filter-buttons">
                    {categorias.map(cat => (
                        <button 
                            key={cat}
                            className={`btn-filter ${categoriaActiva === cat ? 'active' : 'outline'}`}
                            onClick={() => {
                                setCategoriaActiva(cat);
                                setPaginaActual(1);
                            }}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* AVISO SIN RESULTADOS */}
            {productosFiltrados.length === 0 && (
                <div className="no-results">
                    <p>No se encontraron piezas que coincidan con tu búsqueda.</p>
                </div>
            )}

            {/* --- GRID DE PRODUCTOS --- */}
            <div className="productos-grid">
                {productosActuales.map((producto) => (
                    <div key={producto.id} className="producto-card">
                        <div className="producto-imagen-box">
                            <div className="placeholder-icon">💎</div>
                        </div>
                        <div className="producto-info">
                            <h6 className="producto-nombre">{producto.nombre}</h6>
                            <p className="producto-desc-corta">{producto.descripcion.substring(0, 45)}...</p>
                            <div className="producto-precio">${producto.precio.toLocaleString()}</div>
                            <div className="producto-acciones-grid">
                                <button className="btn-accion primary" onClick={() => verDetalles(producto)}>
                                    Ver Detalle
                                </button>
                                <button className="btn-accion outline">
                                    Agregar al Carrito
                                </button>
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
                    >
                        ← Anterior
                    </button>
                    <span className="info-pagina">Página {paginaActual} de {totalPaginas}</span>
                    <button 
                        className="btn-pagina" 
                        disabled={paginaActual === totalPaginas} 
                        onClick={() => cambiarPagina(paginaActual + 1)}
                    >
                        Siguiente →
                    </button>
                </div>
            )}

            {/* --- MODAL DE DETALLES --- */}
            {productoSeleccionado && (
                <div className="modal-overlay">
                    <div className="modal-detalles">
                        <button className="btn-cerrar" onClick={cerrarDetalles}>×</button>
                        <div className="detalles-content">
                            <div className="detalles-imagen">
                                <div className="placeholder-imagen grande">💎</div>
                            </div>
                            <div className="detalles-info">
                                <h2>{productoSeleccionado.nombre}</h2>
                                <p className="detalles-precio">${productoSeleccionado.precio.toLocaleString()}</p>
                                <p className="detalles-descripcion">{productoSeleccionado.descripcion}</p>
                                <p className="detalles-categoria">Categoría: <strong>{productoSeleccionado.categoria}</strong></p>
                                <button className="btn-comprar">Agregar al Carrito</button>

                                <div className="ar-instructions">
                                    <button 
                                        className="ar-instructions-header" 
                                        onClick={() => setInstruccionesAbiertas(!instruccionesAbiertas)}
                                    >
                                        <h4>¿Cómo ver en Realidad Aumentada?</h4>
                                        <span>{instruccionesAbiertas ? '−' : '+'}</span>
                                    </button>
                                    
                                    <div className={`ar-instructions-content ${instruccionesAbiertas ? 'expanded' : 'collapsed'}`}>
                                        <div className="qr-section">
                                            <div className="qr-image-container">
                                                {/* Representación visual de un QR */}
                                                <div className="fake-qr"></div>
                                            </div>
                                            <p className="qr-description">
                                                Escanea con la aplicación de <strong>Unity</strong> para proyectar la pieza.
                                            </p>
                                        </div>
                                    </div>
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