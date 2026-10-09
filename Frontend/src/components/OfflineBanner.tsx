// Ruta: Joyeria-Diana-Laura/Frontend/src/components/OfflineBanner.tsx

import { useEffect, useState } from 'react';
import { MdWifiOff } from 'react-icons/md';
import '../styles/OfflineBanner.css';

function OfflineBanner(): React.JSX.Element | null {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [cerrado, setCerrado] = useState(false);
  const [, setPermiso] = useState<string>("default");

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
      <span className="offline-banner-icon" aria-hidden="true"><MdWifiOff size={20} /></span>
      <span className="offline-banner-text">
        Sin conexión a internet. Puedes seguir navegando lo ya cargado, pero los datos podrían no estar actualizados.
      </span>
      {'Notification' in window && Notification.permission === 'default' && (
        <button className="offline-banner-retry" onClick={() => Notification.requestPermission().then(p => setPermiso(p))}>
          Avisarme al volver
        </button>
      )}
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
