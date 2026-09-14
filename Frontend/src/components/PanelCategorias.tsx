// Ruta: Frontend/src/components/PanelCategorias.tsx
//
// Panel de categorías en tarjeta clara, debajo del banner principal: el
// atajo que ve el visitante apenas entra. La tarjeta es clara a propósito,
// para que resalte sobre el banner y el fondo oscuro en vez de fundirse.
//
// Si la petición falla o no hay categorías, no renderiza nada: la página
// se ve igual que antes, sin huecos ni errores.

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { productsAPI } from "../services/api";
import "./PanelCategorias.css";

interface Categoria {
  id: number;
  nombre: string;
  imagen_url?: string | null;
  categoria_padre_id?: number | null;
  orden?: number | null;
  activo?: boolean;
}

// Si la foto vive en Cloudinary le pedimos una versión del tamaño real del
// mosaico en vez de la original, que suele venir en muy alta resolución.
const optimizar = (url: string | null | undefined, ancho: number) => {
  if (!url || !url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url || undefined;
  if (/\/upload\/[^/]*w_\d/.test(url)) return url;
  return url.replace("/upload/", `/upload/f_auto,q_auto,w_${ancho}/`);
};

// Marcador dibujado en SVG (no pide red) para categorías sin foto.
const MARCADOR =
  `data:image/svg+xml;utf8,` +
  `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300">` +
  `<rect width="300" height="300" fill="%23f0e6dc"/>` +
  `<g transform="translate(150,150)" fill="none" stroke="%23c9956c" stroke-width="2.5" opacity="0.65">` +
  `<path d="M-34,-22 L34,-22 L50,-4 L0,52 L-50,-4 Z"/>` +
  `<path d="M-34,-22 L0,-4 L34,-22 M-50,-4 L50,-4 M0,-4 L0,52"/>` +
  `</g></svg>`;

const PanelCategorias: React.FC = () => {
  const [categorias, setCategorias] = useState<Categoria[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await productsAPI.getCategories();
        const lista: Categoria[] = Array.isArray(res) ? res : res?.data || [];
        setCategorias(
          lista
            .filter((c) => c.activo !== false && !c.categoria_padre_id)
            .sort((a, b) => (a.orden ?? 99) - (b.orden ?? 99))
        );
      } catch {
        setCategorias([]);
      }
    })();
  }, []);

  if (categorias.length === 0) return null;

  return (
    <section className="pc-section" aria-labelledby="pc-titulo">
      <div className="container-lg">
        <div className="pc-panel">
          {/* Encabezado en una fila —título, filete y enlace— en vez de un
              título centrado y solitario que ocupaba alto sin aportar. */}
          <div className="pc-header">
            <h2 className="pc-titulo" id="pc-titulo">
              Explora por categoría
            </h2>
            <span className="pc-filete" aria-hidden="true" />
            <Link to="/catalogo-publico" className="pc-ver-todo">
              Ver todo <span aria-hidden="true">→</span>
            </Link>
          </div>

          <ul className="pc-grid">
            {categorias.map((cat) => (
              <li key={cat.id}>
                <Link to={`/catalogo-publico?categoria=${cat.id}`} className="pc-item">
                  <span className="pc-item-marco">
                    <img
                      className="pc-item-img"
                      src={optimizar(cat.imagen_url, 300) || MARCADOR}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      width={300}
                      height={300}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = MARCADOR;
                      }}
                    />
                  </span>
                  <span className="pc-item-nombre">{cat.nombre}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default PanelCategorias;
