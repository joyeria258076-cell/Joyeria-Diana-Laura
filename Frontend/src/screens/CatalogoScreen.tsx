import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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
    const { user } = useAuth();
    const navigate = useNavigate();
    const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
    const [paginaActual, setPaginaActual] = useState(1);
    const productosPorPagina = 4;

    // Datos estáticos de productos
    const productos: Producto[] = [
        {
            id: 1,
            nombre: "Anillo Diamante Elegante",
            precio: 2500,
            descripcion: "Anillo en plata sterling con diamante central de 0.5 quilates",
            imagen: "/assets/images/anillo-diamante.jpg",
            categoria: "Anillos"
        },
        {
            id: 2,
            nombre: "Collar Oro 18k",
            precio: 1800,
            descripcion: "Collar elegante en oro de 18k con diseño contemporáneo",
            imagen: "/assets/images/collar-oro.jpg",
            categoria: "Collares"
        },
        {
            id: 3,
            nombre: "Aretes Perlas Naturales",
            precio: 1200,
            descripcion: "Aretes con perlas naturales y detalles en plata",
            imagen: "/assets/images/aretes-perlas.jpg",
            categoria: "Aretes"
        },
        {
            id: 4,
            nombre: "Pulsera Esmeralda",
            precio: 3200,
            descripcion: "Pulsera en oro con esmeraldas colombianas auténticas",
            imagen: "/assets/images/pulsera-esmeralda.jpg",
            categoria: "Pulseras"
        },
        {
            id: 5,
            nombre: "Set Matrimonio",
            precio: 4500,
            descripcion: "Set completo de anillos para boda en oro blanco",
            imagen: "/assets/images/set-matrimonio.jpg",
            categoria: "Conjuntos"
        },
        {
            id: 6,
            nombre: "Anillo Zafiro Azul",
            precio: 2800,
            descripcion: "Anillo con zafiro azul natural y diamantes secundarios",
            imagen: "/assets/images/anillo-zafiro.jpg",
            categoria: "Anillos"
        },
        {
            id: 7,
            nombre: "Collar Perlas Cultivadas",
            precio: 2200,
            descripcion: "Collar de perlas cultivadas con cierre de oro",
            imagen: "/assets/images/collar-perlas.jpg",
            categoria: "Collares"
        },
        {
            id: 8,
            nombre: "Aretes Diamante Solitario",
            precio: 1900,
            descripcion: "Aretes con diamantes solitarios en setting de platino",
            imagen: "/assets/images/aretes-diamante.jpg",
            categoria: "Aretes"
        }
    ];

    // Calcular productos para la página actual
    const indiceInicio = (paginaActual - 1) * productosPorPagina;
    const productosActuales = productos.slice(indiceInicio, indiceInicio + productosPorPagina);
    const totalPaginas = Math.ceil(productos.length / productosPorPagina);

    const verDetalles = (producto: Producto) => {
        setProductoSeleccionado(producto);
    };

    const verEnAR = (producto: Producto) => {
        alert(`🔮 Abriendo vista AR para: ${producto.nombre}\n\nEsta funcionalidad abrirá la cámara de Unity para ver el producto en Realidad Aumentada.`);
    };

    const cerrarDetalles = () => {
        setProductoSeleccionado(null);
    };

    const cambiarPagina = (nuevaPagina: number) => {
        setPaginaActual(nuevaPagina);
        window.scrollTo(0, 0);
    };

    return (
        <div className="catalogo-container">
            {/* Solo el contenido específico del catálogo - SIN header/footer */}
            <div className="catalogo-content">
                {/* Hero Section del Catálogo */}
                <section className="catalogo-hero">
                    <h1 className="catalogo-title">
                        Nuestro Catálogo Exclusivo
                    </h1>
                    <p className="catalogo-description">
                        Descubre piezas únicas elaboradas con los más altos estándares de calidad. 
                        Cada joya cuenta una historia especial.
                    </p>
                </section>

                {/* Grid de Productos */}
                <section className="productos-section">
                    <div className="section-header">
                        <h2 className="section-title">Productos Destacados</h2>
                        <p className="section-subtitle">Explora nuestra colección de joyas excepcionales</p>
                    </div>
                    
                    <div className="productos-grid">
                        {productosActuales.map((producto) => (
                            <div key={producto.id} className="producto-card">
                                <div className="producto-imagen">
                                    <div className="placeholder-imagen">
                                        💎
                                    </div>
                                </div>
                                <div className="producto-info">
                                    <h3 className="producto-nombre">{producto.nombre}</h3>
                                    <p className="producto-precio">${producto.precio.toLocaleString()}</p>
                                    <p className="producto-categoria">{producto.categoria}</p>
                                    <button 
                                        className="btn-ver-detalles"
                                        onClick={() => verDetalles(producto)}
                                    >
                                        Ver Detalles
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Paginación */}
                    <div className="paginacion">
                        <button 
                            className="btn-pagina" 
                            disabled={paginaActual === 1}
                            onClick={() => cambiarPagina(paginaActual - 1)}
                        >
                            ← Anterior
                        </button>
                        
                        <span className="info-pagina">
                            Página {paginaActual} de {totalPaginas}
                        </span>
                        
                        <button 
                            className="btn-pagina"
                            disabled={paginaActual === totalPaginas}
                            onClick={() => cambiarPagina(paginaActual + 1)}
                        >
                            Siguiente →
                        </button>
                    </div>
                </section>

                {/* Modal de Detalles */}
                {productoSeleccionado && (
                    <div className="modal-overlay">
                        <div className="modal-detalles">
                            <button className="btn-cerrar" onClick={cerrarDetalles}>×</button>
                            
                            <div className="detalles-content">
                                <div className="detalles-imagen">
                                    <div className="placeholder-imagen grande">
                                        💎
                                    </div>
                                </div>
                                
                                <div className="detalles-info">
                                    <h2>{productoSeleccionado.nombre}</h2>
                                    <p className="detalles-precio">${productoSeleccionado.precio.toLocaleString()}</p>
                                    <p className="detalles-descripcion">{productoSeleccionado.descripcion}</p>
                                    <p className="detalles-categoria">Categoría: {productoSeleccionado.categoria}</p>
                                    
                                    <div className="detalles-acciones">
                                        <button className="btn-comprar">
                                            Agregar al Carrito
                                        </button>
                                        <button 
                                            className="btn-ver-ar"
                                            onClick={() => verEnAR(productoSeleccionado)}
                                        >
                                            👁️ Ver en Realidad Aumentada
                                        </button>
                                    </div>

                                    <div className="ar-instructions">
                                        <h4>¿Cómo ver en AR?</h4>
                                        <ol>
                                            <li>Haz click en "Ver en Realidad Aumentada"</li>
                                            <li>Permite el acceso a la cámara</li>
                                            <li>Apunta a una superficie plana</li>
                                            <li>¡Disfruta de la joya en tu espacio!</li>
                                        </ol>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CatalogoScreen;