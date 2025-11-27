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
    const { user, logout } = useAuth();
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

    const cerrarDetalles = () => {
        setProductoSeleccionado(null);
    };

    const cambiarPagina = (nuevaPagina: number) => {
        setPaginaActual(nuevaPagina);
        window.scrollTo(0, 0);
    };

    return (
        <div className="catalogo-container">
            {/* Header */}
            <header className="inicio-header">
                <div className="header-content">
                    <div className="logo">
                        <span className="logo-initials">DL</span>
                        <span className="logo-name">Diana Laura</span>
                    </div>
                    <nav className="nav-menu">
                        <a 
                            href="#inicio" 
                            className="nav-link" 
                            onClick={(e) => { e.preventDefault(); navigate("/inicio"); }}
                        >
                            Inicio
                        </a>
                        <a 
                            href="#catalogo" 
                            className="nav-link active"
                        >
                            Catálogo
                        </a>
                        <a href="#personalizados" className="nav-link">Personalizados</a>
                        <a href="#nosotros" className="nav-link">Sobre Nosotros</a>
                        <a href="#contacto" className="nav-link">Contacto</a>
                    </nav>
                    <div className="user-actions">
                        <button 
                            className="catalog-icon-btn"
                            onClick={() => navigate("/catalogo")}
                            title="Ver Catálogo"
                        >
                            🛍️
                        </button>
                        <button 
                            className="profile-icon-btn"
                            onClick={() => navigate("/perfil")}
                            title="Mi Perfil"
                        >
                            👤
                        </button>
                        <span className="user-welcome">Hola, {user?.nombre}</span>
                        <button className="logout-btn" onClick={logout}>
                            Cerrar Sesión
                        </button>
                    </div>
                </div>
            </header>

            {/* Contenido del Catálogo */}
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
                                    </div>

                                    <div className="ar-instructions">
                                        <h4>¿Cómo ver en AR?</h4>
                                        <div className="qr-section">
                                            <div className="qr-image-container"></div>
                                            <p className="qr-description">
                                                Escanea este código QR con la aplicación de Unity 
                                                para ver <strong>{productoSeleccionado.nombre}</strong> 
                                                en Realidad Aumentada.
                                            </p>
                                        </div>
                                        <ol>
                                            <li>Haz click en "Ver en Realidad Aumentada"</li>
                                            <li>Escanea el código QR con tu dispositivo móvil</li>
                                            <li>Apunta la cámara a una superficie plana</li>
                                            <li>¡Disfruta de la joya en tu espacio!</li>
                                        </ol>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <footer className="inicio-footer">
                <div className="footer-content">
                    <div className="footer-brand">
                        <div className="logo">
                            <span className="logo-initials">DL</span>
                            <span className="logo-name">Diana Laura</span>
                        </div>
                        <p className="footer-tagline">
                            Joyería y Bisutería con esencia femenina
                        </p>
                    </div>
                    <div className="footer-links">
                        <div className="link-group">
                            <h4>Colecciones</h4>
                            <a href="#anillos">Anillos</a>
                            <a href="#collares">Collares</a>
                            <a href="#aretes">Aretes</a>
                            <a href="#pulseras">Pulseras</a>
                        </div>
                        <div className="link-group">
                            <h4>Empresa</h4>
                            <a href="#nosotros">Sobre Nosotros</a>
                            <a href="#contacto">Contacto</a>
                            <a href="#personalizados">Diseños Personalizados</a>
                        </div>
                        <div className="link-group">
                            <h4>Legal</h4>
                            <a href="#privacidad">Política de Privacidad</a>
                            <a href="#terminos">Términos y Condiciones</a>
                        </div>
                    </div>
                </div>
                <div className="footer-bottom">
                    <p>&copy; 2025 Diana Laura - Joyería y Bisutería. Todos los derechos reservados.</p>
                    <div className="social-links">
                        <a href="#" className="social-link">📱</a>
                        <a href="#" className="social-link">📷</a>
                        <a href="#" className="social-link">👤</a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default CatalogoScreen;