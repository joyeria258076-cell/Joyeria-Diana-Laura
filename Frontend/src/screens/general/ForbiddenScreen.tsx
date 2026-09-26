import React from 'react';
import PaginaError from './PaginaError';

const ForbiddenScreen: React.FC = () => (
  <PaginaError
    codigo="403"
    titulo={<>Acceso <em>restringido</em></>}
    texto="No tienes permiso para entrar a esta sección. Si crees que es un error, contacta a la administración de la joyería."
  />
);

export default ForbiddenScreen;
