// Ruta: Joyeria-Diana-Laura/Frontend/src/App.tsx

import React from 'react';
import './App.css';
import AppRoutes from './navigation/AppRoutes';
import ErrorPantalla from './components/ErrorPantalla';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { NotificacionesProvider } from './contexts/NotificacionesContext';
import ThemeConfigLoader from './components/ThemeConfigLoader';
import DecoracionTemporada from './components/DecoracionTemporada';
import OfflineBanner from './components/OfflineBanner';
import BotonAccesibilidad from './components/BotonAccesibilidad';

function App(): React.JSX.Element {
  return (
    <AuthProvider>
      <CartProvider>
      <NotificacionesProvider>
        <ThemeConfigLoader />
        <DecoracionTemporada />
        <OfflineBanner />
        <BotonAccesibilidad />

        {/* Sistema de rutas */}
        <ErrorPantalla><AppRoutes /></ErrorPantalla>
      </NotificacionesProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;