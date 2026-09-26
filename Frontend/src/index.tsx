// Ruta:Joyeria-Diana-Laura/Frontend/src/index.tsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './styles/temas.css';
import './styles/componentes.css';
import './styles/layout.css';
import './styles/modulos.css';
import App from './App';
// import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App/>
  </React.StrictMode>
);

// Cuando se publica una versión nueva, el service worker nuevo toma el control
// y la página se recarga una sola vez para no seguir mostrando la versión vieja.
// Al volver a la pestaña también se busca si hay versión nueva.
if ('serviceWorker' in navigator) {
  const habiaControl = !!navigator.serviceWorker.controller;
  let recargando = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!habiaControl || recargando) return; // primera instalación: no recargar
    recargando = true;
    window.location.reload();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      navigator.serviceWorker.getRegistration().then(r => r?.update()).catch(() => {});
    }
  });
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals();