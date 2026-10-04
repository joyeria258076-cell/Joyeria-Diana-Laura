// Ruta: src/components/AuthTapa.tsx
// Panel de color sólido de las pantallas de acceso (la "tapa" del estuche):
// un anillo con diamante dibujado en línea fina que se traza al entrar,
// una frase con su palabra destacada y el logo junto a la firma.
import React from "react";
import "../styles/AuthV5.css";

interface Props {
  titulo: React.ReactNode;
  texto: string;
}

const AuthTapa: React.FC<Props> = ({ titulo, texto }) => (
  <aside className="av5-tapa">
    <svg className="av5-joya" viewBox="0 0 240 280" aria-hidden="true">
      {/* diamante */}
      <g className="av5-trazo">
        <path d="M84 62 L104 34 H136 L156 62 L120 112 Z" />
        <path d="M84 62 H156 M104 34 L112 62 L120 112 L128 62 L136 34" />
      </g>
      {/* engaste y aro */}
      <path className="av5-trazo av5-trazo--2" d="M104 108 L120 124 L136 108" />
      <ellipse className="av5-trazo av5-trazo--3" cx="120" cy="190" rx="70" ry="68" />
      <ellipse className="av5-trazo av5-trazo--4" cx="120" cy="190" rx="58" ry="56" />
      {/* destellos */}
      <path className="av5-destello" d="M182 30 v20 M172 40 h20" />
      <path className="av5-destello av5-destello--2" d="M52 92 v14 M45 99 h14" />
      <path className="av5-destello av5-destello--3" d="M196 120 v10 M191 125 h10" />
    </svg>

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

export default AuthTapa;
