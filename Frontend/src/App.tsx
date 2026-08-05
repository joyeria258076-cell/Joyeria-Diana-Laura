// Ruta: Joyeria-Diana-Laura/Frontend/src/App.tsx

import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import AppRoutes from './navigation/AppRoutes';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { NotificacionesProvider } from './contexts/NotificacionesContext';
import ThemeConfigLoader from './components/ThemeConfigLoader';
import './styles/AccessibilityFonts.css';

const WIDGET_POS_KEY = 'accessibilityWidgetPos';

function App(): React.JSX.Element {
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('fontSize');
    return saved ? Number.parseInt(saved) : 16;
  });

  const [showControls, setShowControls] = useState(() => {
    const saved = localStorage.getItem('showAccessibilityControls');
    return saved ? saved === 'true' : false;
  });

  const [position, setPosition] = useState<{ x: number; y: number } | null>(() => {
    const saved = localStorage.getItem(WIDGET_POS_KEY);
    return saved ? JSON.parse(saved) : null;
  });

  const widgetRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ dragging: boolean; offsetX: number; offsetY: number; moved: boolean }>({
    dragging: false, offsetX: 0, offsetY: 0, moved: false,
  });

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}px`;
    localStorage.setItem('fontSize', fontSize.toString());
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem('showAccessibilityControls', showControls.toString());
  }, [showControls]);

  const increaseFontSize = () => { if (fontSize < 24) setFontSize(prev => prev + 2); };
  const decreaseFontSize = () => { if (fontSize > 12) setFontSize(prev => prev - 2); };
  const resetFontSize    = () => setFontSize(16);
  const toggleControls   = () => {
    if (dragState.current.moved) { dragState.current.moved = false; return; }
    setShowControls(prev => !prev);
  };

  const clampPosition = (x: number, y: number) => {
    const el = widgetRef.current;
    const w = el?.offsetWidth ?? 60;
    const h = el?.offsetHeight ?? 60;
    return {
      x: Math.min(Math.max(x, 0), window.innerWidth - w),
      y: Math.min(Math.max(y, 0), window.innerHeight - h),
    };
  };

  const handleDragStart = (clientX: number, clientY: number) => {
    const el = widgetRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragState.current = { dragging: true, offsetX: clientX - rect.left, offsetY: clientY - rect.top, moved: false };
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!dragState.current.dragging) return;
    dragState.current.moved = true;
    const next = clampPosition(clientX - dragState.current.offsetX, clientY - dragState.current.offsetY);
    setPosition(next);
  };

  const handleDragEnd = () => {
    if (!dragState.current.dragging) return;
    dragState.current.dragging = false;
    setPosition(prev => {
      if (prev) localStorage.setItem(WIDGET_POS_KEY, JSON.stringify(prev));
      return prev;
    });
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handleDragMove(e.clientX, e.clientY);
    const onMouseUp = () => handleDragEnd();
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchEnd = () => handleDragEnd();
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  return (
    <AuthProvider>
      <CartProvider>
      <NotificacionesProvider>
        <ThemeConfigLoader />
        {/* Botones de control de accesibilidad */}
        <div
          ref={widgetRef}
          className={`global-accessibility-buttons ${showControls ? 'expanded' : 'minimized'}`}
          style={position ? { left: position.x, top: position.y, right: 'auto', bottom: 'auto' } : undefined}
        >
          <button
            onClick={toggleControls}
            onMouseDown={e => handleDragStart(e.clientX, e.clientY)}
            onTouchStart={e => { if (e.touches[0]) handleDragStart(e.touches[0].clientX, e.touches[0].clientY); }}
            className="toggle-controls-btn"
            title={showControls ? "Minimizar controles (arrastra para mover)" : "Mostrar controles de accesibilidad (arrastra para mover)"}
            aria-label={showControls ? "Ocultar controles de accesibilidad" : "Mostrar controles de accesibilidad"}
          >
            {showControls ? "×" : "A"}
          </button>

          {showControls && (
            <>
              <button onClick={decreaseFontSize} className="global-font-btn decrease-btn" title="Disminuir tamaño de texto (A-)" aria-label="Disminuir tamaño de texto para mejor legibilidad">A-</button>
              <button onClick={resetFontSize}    className="global-font-btn reset-btn"    title="Tamaño de texto normal"        aria-label="Restablecer tamaño de texto al normal">A</button>
              <button onClick={increaseFontSize} className="global-font-btn increase-btn" title="Aumentar tamaño de texto (A+)" aria-label="Aumentar tamaño de texto para mejor legibilidad">A+</button>
              <span className="global-font-size-indicator">{fontSize}px</span>
            </>
          )}
        </div>

        {/* Sistema de rutas */}
        <AppRoutes />
      </NotificacionesProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;