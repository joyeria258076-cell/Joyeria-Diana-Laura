import React from 'react';
import PaginaError from './PaginaError';

const ServerErrorScreen: React.FC = () => (
  <PaginaError
    codigo="500"
    titulo={<>Algo <em>se nos cayó</em></>}
    texto="Estamos puliendo algunos detalles del servidor. Intenta de nuevo en unos momentos."
    accion={{ etiqueta: 'Reintentar', onClick: () => window.location.reload() }}
  />
);

export default ServerErrorScreen;
