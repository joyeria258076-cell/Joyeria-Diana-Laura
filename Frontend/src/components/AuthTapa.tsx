// Ruta: src/components/AuthTapa.tsx
// Panel de las pantallas de acceso: una foto real del carrusel del inicio
// a todo el panel, con la frase y el logo encima (oscurecido abajo para leerse).
import React, { useEffect, useState } from "react";
import { contentAPI } from "../services/api";
import "../styles/AuthV5.css";

interface Props {
  titulo: React.ReactNode;
  texto: string;
}

const RESPALDO = "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1200&q=80&fit=crop";
let cache: string[] | null = null;

// Cloudinary: pide la imagen al ancho justo
const optimizar = (url: string) =>
  url.includes("res.cloudinary.com") && url.includes("/upload/") ? url.replace("/upload/", "/upload/f_auto,q_auto,w_1200/") : url;

const AuthTapa: React.FC<Props> = ({ titulo, texto }) => {
  const [fotos, setFotos] = useState<string[]>(cache || []);

  useEffect(() => {
    if (cache) return;
    (async () => {
      try {
        const res: any = await contentAPI.getCarruselInicio();
        const lista: any[] = Array.isArray(res) ? res : res?.data || [];
        const urls = lista.filter(c => c.activo !== false && c.imagen_url).map(c => optimizar(c.imagen_url));
        cache = urls.length ? urls : [RESPALDO];
      } catch { cache = [RESPALDO]; }
      setFotos(cache);
    })();
  }, []);

  // Una foto distinta cada vez que se entra
  const [indice] = useState(() => Math.floor(Math.random() * 100));
  const foto = fotos.length ? fotos[indice % fotos.length] : null;

  return (
    <aside className="av5-tapa">
      {foto && <img className="av5-foto" src={foto} alt="" />}
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
