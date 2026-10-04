// Ruta: src/components/AuthTapa.tsx
// Panel de color sólido de las pantallas de acceso (la "tapa" del estuche):
// logo, una frase con su palabra destacada y un texto corto.
import React from "react";
import "../styles/AuthV5.css";

interface Props {
  titulo: React.ReactNode;
  texto: string;
}

const AuthTapa: React.FC<Props> = ({ titulo, texto }) => (
  <aside className="av5-tapa">
    <img className="av5-logo" src="/pwa-192.png" alt="" width={64} height={64} />
    <div className="av5-tapa-textos">
      <h1>{titulo}</h1>
      <p>{texto}</p>
    </div>
    <span className="av5-firma">Joyería Diana Laura</span>
  </aside>
);

export default AuthTapa;
