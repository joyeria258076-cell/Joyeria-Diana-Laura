// Ruta: Frontend/src/components/BarraCategorias.tsx
//
// Tercera fila del encabezado público: la barra de categorías de producto,
// al estilo de las tiendas grandes (PCEL pone ahí Computadoras, Hardware,
// Accesorios…). La fila de arriba lleva las páginas del sitio; esta lleva
// lo que la clienta viene a comprar.
//
// Se alimenta sola de /products/categorias y enlaza al catálogo con
// ?categoria=<id>, que CatalogoPublicScreen lee para pre-filtrar.
//
// Si la petición falla o no hay categorías, no renderiza nada: el
// encabezado se ve como antes, sin huecos ni errores.

import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AiOutlineLeft, AiOutlineRight, AiOutlineGift, AiOutlineStar } from "react-icons/ai";
import { productsAPI } from "../services/api";
import "./BarraCategorias.css";

interface Categoria {
  id: number;
  nombre: string;
  categoria_padre_id?: number | null;
  orden?: number | null;
  activo?: boolean;
}

const BarraCategorias: React.FC = () => {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const pistaRef = useRef<HTMLDivElement>(null);
  const [puedeIzq, setPuedeIzq] = useState(false);
  const [puedeDer, setPuedeDer] = useState(false);

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

  // Las flechas solo aparecen si la pista realmente desborda, para no
  // mostrar controles muertos en escritorio.
  const revisarDesborde = () => {
    const el = pistaRef.current;
    if (!el) return;
    const margen = 4; // tolerancia de redondeo del navegador
    setPuedeIzq(el.scrollLeft > margen);
    setPuedeDer(el.scrollLeft + el.clientWidth < el.scrollWidth - margen);
  };

  useEffect(() => {
    revisarDesborde();
    const el = pistaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(revisarDesborde);
    ro.observe(el);
    window.addEventListener("resize", revisarDesborde);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", revisarDesborde);
    };
  }, [categorias.length]);

  const desplazar = (dir: 1 | -1) => {
    const el = pistaRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(200, el.clientWidth * 0.6), behavior: "smooth" });
  };

  if (categorias.length === 0) return null;

  return (
    <nav className="bc-barra" aria-label="Categorías de joyería">
      <div className="bc-inner">
        <button
          type="button"
          className={`bc-flecha${puedeIzq ? " is-visible" : ""}`}
          onClick={() => desplazar(-1)}
          aria-label="Ver categorías anteriores"
          tabIndex={puedeIzq ? 0 : -1}
          aria-hidden={!puedeIzq}
        >
          <AiOutlineLeft size={13} />
        </button>

        <div className="bc-pista" ref={pistaRef} onScroll={revisarDesborde}>
          {categorias.map((cat) => (
            <Link
              key={cat.id}
              to={`/catalogo-publico?categoria=${cat.id}`}
              className="bc-link"
            >
              {cat.nombre}
            </Link>
          ))}
        </div>

        <button
          type="button"
          className={`bc-flecha${puedeDer ? " is-visible" : ""}`}
          onClick={() => desplazar(1)}
          aria-label="Ver más categorías"
          tabIndex={puedeDer ? 0 : -1}
          aria-hidden={!puedeDer}
        >
          <AiOutlineRight size={13} />
        </button>

        {/* Dos accesos destacados al extremo derecho. En una sola línea: la
            versión de dos renglones sobresalía del alto de la barra y se
            leía como un bloque pegado encima. */}
        <div className="bc-destacados">
          <Link to="/catalogo-publico" className="bc-destacado">
            <AiOutlineGift size={15} aria-hidden="true" />
            <span>Personalizadas</span>
          </Link>

          <Link to="/noticias" className="bc-destacado bc-destacado--alt">
            <AiOutlineStar size={15} aria-hidden="true" />
            <span>Novedades</span>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default BarraCategorias;
