// Ruta: Joyeria-Diana-Laura/Frontend/src/components/OfflineBanner.tsx

import { useEffect, useState } from 'react';
import '../styles/OfflineBanner.css';

function OfflineBanner(): React.JSX.Element | null {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="offline-banner" role="alert">
      <span className="offline-banner-icon">📶</span>
      <span className="offline-banner-text">
        Sin conexión a internet. Puedes seguir navegando lo ya cargado, pero los datos podrían no estar actualizados.
      </span>
      <button className="offline-banner-retry" onClick={() => window.location.reload()}>
        Reintentar
      </button>
    </div>
  );
}

export default OfflineBanner;
