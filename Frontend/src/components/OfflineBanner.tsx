// Ruta: Joyeria-Diana-Laura/Frontend/src/components/OfflineBanner.tsx

import { useEffect, useState } from 'react';
import '../styles/OfflineBanner.css';

function OfflineBanner(): React.JSX.Element | null {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [cerrado, setCerrado] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => { setIsOffline(true); setCerrado(false); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline || cerrado) return null;

  return (
    <div className="offline-banner" role="alert">
      <span className="offline-banner-icon">📶</span>
      <span className="offline-banner-text">
        Sin conexión a internet. Puedes seguir navegando lo ya cargado, pero los datos podrían no estar actualizados.
      </span>
      <button className="offline-banner-retry" onClick={() => window.location.reload()}>
        Reintentar
      </button>
      <button className="offline-banner-close" onClick={() => setCerrado(true)} aria-label="Cerrar aviso">
        ✕
      </button>
    </div>
  );
}

export default OfflineBanner;
