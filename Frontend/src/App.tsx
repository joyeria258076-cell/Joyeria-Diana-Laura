// Ruta:Joyeria-Diana-Laura/Frontend/src/App.tsx

import React, { useState, useEffect } from 'react';
import './App.css';
import AppRoutes from './navigation/AppRoutes';
import { AuthProvider } from './contexts/AuthContext';
import './styles/AccessibilityFonts.css';

function App(): React.JSX.Element {
  // Estado para controlar el tamaño de fuente
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('fontSize');
    return saved ? parseInt(saved) : 16;
  });

  // Estado para mostrar/ocultar controles
  const [showControls, setShowControls] = useState(() => {
    const saved = localStorage.getItem('showAccessibilityControls');
    return saved ? saved === 'true' : true;
  });

  // Efecto para aplicar el tamaño de fuente
  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}px`;
    localStorage.setItem('fontSize', fontSize.toString());
  }, [fontSize]);

  // Efecto para guardar visibilidad
  useEffect(() => {
    localStorage.setItem('showAccessibilityControls', showControls.toString());
  }, [showControls]);

  // Función para AUMENTAR el tamaño de fuente
  const increaseFontSize = () => {
    if (fontSize < 24) {
      setFontSize(prev => prev + 2);
    }
  };

  // Función para DISMINUIR el tamaño de fuente
  const decreaseFontSize = () => {
    if (fontSize > 12) {
      setFontSize(prev => prev - 2);
    }
  };

  // Función para RESTABLECER el tamaño de fuente
  const resetFontSize = () => {
    setFontSize(16);
  };

  // Función para alternar visibilidad
  const toggleControls = () => {
    setShowControls(prev => !prev);
  };

  return (
    <AuthProvider>
      {/* Botones de control de accesibilidad */}
      <div className={`global-accessibility-buttons ${showControls ? 'expanded' : 'minimized'}`}>
        {/* Botón para minimizar/expandir */}
        <button 
          onClick={toggleControls}
          className="toggle-controls-btn"
          title={showControls ? "Minimizar controles" : "Mostrar controles de accesibilidad"}
          aria-label={showControls ? "Ocultar controles de accesibilidad" : "Mostrar controles de accesibilidad"}
        >
          {showControls ? "×" : "A"}
        </button>
        
        {/* Controles de tamaño de fuente (solo visibles cuando expanded) */}
        {showControls && (
          <>
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
          </>
        )}
      </div>
      
      {/* Sistema de rutas de la aplicación */}
      <AppRoutes/>
    </AuthProvider>
  );
}

export default App;