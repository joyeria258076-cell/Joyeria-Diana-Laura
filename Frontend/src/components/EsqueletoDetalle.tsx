// Ruta: Frontend/src/components/EsqueletoDetalle.tsx
// Esqueleto de carga del detalle de producto: la misma forma de la página
// (foto, etiquetas, nombre, precio y barra de compra) con un brillo que pasa,
// en lugar de una pantalla vacía con "Cargando producto…".
import React from 'react';
import '../styles/EsqueletoDetalle.css';

const EsqueletoDetalle: React.FC = () => (
  <div className="esq-detalle" role="status" aria-live="polite" aria-label="Cargando producto">
    <div className="esq-foto esq-brillo">
      <div className="esq-miniaturas">
        <span className="esq-brillo" />
        <span className="esq-brillo" />
      </div>
    </div>
    <div className="esq-info">
      <div className="esq-fila">
        <span className="esq-chip esq-brillo" />
        <span className="esq-chip esq-chip--corto esq-brillo" />
      </div>
      <span className="esq-linea esq-linea--titulo esq-brillo" />
      <span className="esq-linea esq-linea--titulo2 esq-brillo" />
      <span className="esq-linea esq-linea--precio esq-brillo" />
      <span className="esq-linea esq-brillo" />
      <span className="esq-linea esq-linea--media esq-brillo" />
      <div className="esq-fila esq-fila--specs">
        <span className="esq-spec esq-brillo" />
        <span className="esq-spec esq-brillo" />
      </div>
      <div className="esq-barra">
        <span className="esq-barra-precio esq-brillo" />
        <span className="esq-barra-boton esq-brillo" />
      </div>
    </div>
    <span className="esq-oculto">Cargando producto…</span>
  </div>
);

export default EsqueletoDetalle;
