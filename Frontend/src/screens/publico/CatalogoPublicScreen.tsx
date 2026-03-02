import React, { useState, useEffect } from "react";
import PublicHeader from "../../components/PublicHeader";
import PublicFooter from "../../components/PublicFooter";
import { productsAPI } from "../../services/api"; 
import "./CatalogoPublicScreen.css";

interface Producto {
  id: number;
  nombre: string;
  categoria_nombre: string; 
  precio: number;
  imagen_url?: string;
}

const CatalogoPublicScreen: React.FC = () => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categoriaActiva, setCategoriaActiva] = useState("Todos");
  const [loading, setLoading] = useState(true);

  // 1. Cargar productos desde la base de datos
  useEffect(() => {
    const fetchProductos = async () => {
      try {
        const data = await productsAPI.getAll();
        const lista = Array.isArray(data) ? data : (data.data || []);
        
        // 🌟 CORRECCIÓN: Normalizar los datos tal como lo haces en tu catálogo privado
        const productosNormalizados = lista.map((p: any) => {
          // Detectamos si la imagen viene en p.imagen o p.imagen_url
          // Y evitamos usarla si dice literalmente "EMPTY"
          let urlFoto = p.imagen_url || p.imagen;
          if (urlFoto === 'EMPTY' || urlFoto === '') {
             urlFoto = undefined;
          }

          return {
            id: p.id,
            nombre: p.nombre,
            categoria_nombre: p.categoria_nombre || p.categoria || "General",
            precio: Number(p.precio),
            imagen_url: urlFoto
          };
        });

        setProductos(productosNormalizados);
      } catch (error) {
        console.error("Error cargando catálogo:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProductos();
  }, []);

  // 2. Categorías únicas
  const categoriasDinamicas = [
    "Todos",
    ...Array.from(new Set(productos.map((p) => p.categoria_nombre)))
  ];

  // 3. Lógica de filtrado dinámico
  const productosFiltrados = productos.filter((p) => {
    if (categoriaActiva === "Todos") return true;
    return p.categoria_nombre === categoriaActiva;
  });

  // 4. Placeholder oscuro y elegante que sí funciona
  const placeholderImage = 'https://placehold.co/300x300/1a1a1a/pink?text=Joya';

  return (
    <div className="catalogo-public-container">
      <PublicHeader />

      <section className="catalogo-hero">
        <div className="container-lg">
          <h1 className="catalogo-title">Nuestro Catálogo</h1>
          <p className="catalogo-subtitle">
            Joyas únicas que cuentan historias
          </p>
        </div>
      </section>

      <section className="catalogo-section">
        <div className="container-lg">
          
          <div className="filter-section">
            <div className="filter-buttons">
              {categoriasDinamicas.map((cat) => (
                <button
                  key={cat}
                  className={`filter-btn ${categoriaActiva === cat ? "active" : ""}`}
                  onClick={() => setCategoriaActiva(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="loading-state">Cargando inventario...</div>
          ) : (
            <div className="productos-grid">
              {productosFiltrados.map((producto) => (
                <div key={producto.id} className="producto-card">
                  <div 
                    className="producto-image"
                    style={{ 
                      backgroundImage: `url(${producto.imagen_url || placeholderImage})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}
                  >
                  </div>
                  <div className="producto-info">
                    <h4 className="producto-nombre">{producto.nombre}</h4>
                    <p className="producto-categoria">{producto.categoria_nombre}</p>
                    <div className="producto-footer">
                      <span className="producto-precio">
                        ${producto.precio.toLocaleString('es-MX')}
                      </span>
                      <button className="btn-agregar" title="Ver detalle">
                        <i className="fas fa-shopping-bag"></i>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && productosFiltrados.length === 0 && (
            <div className="empty-catalog">
              <p>No hay productos registrados en la categoría "{categoriaActiva}".</p>
            </div>
          )}
        </div>
      </section>

      <PublicFooter />
    </div>
  );
};

export default CatalogoPublicScreen;