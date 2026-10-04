// Ruta: src/components/AuthTapa.tsx
// Panel de color sólido de las pantallas de acceso (la "tapa" del estuche):
// logo, una frase con su palabra destacada y tres piezas reales del catálogo
// colgando de su hilo, como las etiquetas del inicio.
import React, { useEffect, useState } from "react";
import { productsAPI } from "../services/api";
import "../styles/AuthV5.css";

interface Props {
  titulo: React.ReactNode;
  texto: string;
}

interface Pieza { id: number; nombre: string; imagen: string; precio: number; }

let cache: Pieza[] | null = null;

const AuthTapa: React.FC<Props> = ({ titulo, texto }) => {
  const [piezas, setPiezas] = useState<Pieza[]>(cache || []);

  useEffect(() => {
    if (cache) return;
    (async () => {
      try {
        const res: any = await productsAPI.getAll();
        const lista: any[] = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        const con = lista
          .filter(p => p.imagen_principal && !String(p.nombre || '').includes('[DEMO]') && Number(p.stock_actual) > 0)
          .slice(0, 3)
          .map(p => ({ id: p.id, nombre: p.nombre, imagen: p.imagen_principal, precio: Number(p.precio_oferta || p.precio_venta) }));
        cache = con;
        setPiezas(con);
      } catch { /* sin piezas, la tapa se ve igual */ }
    })();
  }, []);

  return (
    <aside className="av5-tapa">
      {piezas.length > 0 && (
        <div className="av5-piezas" aria-hidden="true">
          {piezas.map((p, i) => (
            <figure key={p.id} className={`av5-pieza av5-pieza--${i + 1}`}>
              <img src={p.imagen} alt="" loading="lazy" />
              <figcaption>${p.precio.toLocaleString('es-MX', { maximumFractionDigits: 0 })}</figcaption>
            </figure>
          ))}
        </div>
      )}

      <div className="av5-tapa-textos">
        <h1>{titulo}</h1>
        <p>{texto}</p>
      </div>
      <div className="av5-pie">
        <img className="av5-logo" src="/pwa-192.png" alt="" width={48} height={48} />
        <span className="av5-firma">Joyería Diana Laura</span>
      </div>
    </aside>
  );
};

export default AuthTapa;
