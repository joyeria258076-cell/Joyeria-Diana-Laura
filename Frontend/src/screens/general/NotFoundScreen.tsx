import React from 'react';
import PaginaError from './PaginaError';

const NotFoundScreen: React.FC = () => (
  <PaginaError
    codigo="404"
    titulo={<>Esta pieza <em>no existe</em></>}
    texto="La página que buscas no forma parte de nuestra joyería. Quizá cambió de lugar o el enlace está incompleto."
  />
);

export default NotFoundScreen;
