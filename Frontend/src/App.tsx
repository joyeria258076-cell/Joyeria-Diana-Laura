// Ruta:Joyeria-Diana-Laura/Frontend/src/App.tsx

import React, { useState, useEffect } from 'react';
import './App.css';
import AppRoutes from './navigation/AppRoutes';
import { AuthProvider } from './contexts/AuthContext';
import './styles/AccessibilityFonts.css'; // NUEVO

function App(): React.JSX.Element {
  // Estado para controlar el tamaño de fuente
  const [fontSize, setFontSize] = useState(() => {
    // Intentar cargar el tamaño guardado en localStorage
    const saved = localStorage.getItem('fontSize');
    return saved ? parseInt(saved) : 16; // 16px por defecto
  });

  // Efecto para aplicar el tamaño de fuente al HTML y guardarlo
  useEffect(() => {
    // Cambia el tamaño base de toda la aplicación
    document.documentElement.style.fontSize = `${fontSize}px`;
    // Guarda la preferencia del usuario
    localStorage.setItem('fontSize', fontSize.toString());
  }, [fontSize]); // Se ejecuta cada vez que fontSize cambia

  // Función para AUMENTAR el tamaño de fuente
  const increaseFontSize = () => {
    if (fontSize < 24) { // Límite máximo: 24px
      setFontSize(prev => prev + 2);
    }
  };

  // Función para DISMINUIR el tamaño de fuente
  const decreaseFontSize = () => {
    if (fontSize > 12) { // Límite mínimo: 12px
      setFontSize(prev => prev - 2);
    }
  };

  // Función para RESTABLECER el tamaño de fuente
  const resetFontSize = () => {
    setFontSize(16); // Vuelve al tamaño normal: 16px
  };

  return (
    <AuthProvider>
      {/* 
        Botones de control de accesibilidad 
        Aparecen en TODAS las pantallas de la aplicación
      */}
      <div className="global-accessibility-buttons">
        <button 
          onClick={decreaseFontSize}
          className="global-font-btn decrease-btn"
          title="Disminuir tamaño de texto (A-)"
          aria-label="Disminuir tamaño de texto para mejor legibilidad"
        >
          A-
        </button>
        <button 
          onClick={resetFontSize}
          className="global-font-btn reset-btn"
          title="Tamaño de texto normal"
          aria-label="Restablecer tamaño de texto al normal"
        >
          A
        </button>
        <button 
          onClick={increaseFontSize}
          className="global-font-btn increase-btn"
          title="Aumentar tamaño de texto (A+)"
          aria-label="Aumentar tamaño de texto para mejor legibilidad"
        >
          A+
        </button>
        <span className="global-font-size-indicator">
          {fontSize}px
        </span>
      </div>
      
      {/* Sistema de rutas de la aplicación */}
      <AppRoutes/>
    </AuthProvider>
  );
}

export default App;