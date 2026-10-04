// Ruta: Joyeria-Diana-Laura/Frontend/src/components/CamaraCaptura.tsx
//
// Sensor de cámara (getUserMedia): abre la cámara del dispositivo —webcam en
// PC o cámara del celular— y devuelve la foto tomada como File. Si no hay
// cámara o se niega el permiso, ofrece elegir una imagen de los archivos.

import { useEffect, useRef, useState } from 'react';
import '../styles/CamaraCaptura.css';

interface Props {
  abierta: boolean;
  frontal?: boolean;              // true = cámara frontal (selfie), false = trasera
  titulo?: string;
  onFoto: (archivo: File) => void;
  onCerrar: () => void;
}

function CamaraCaptura({ abierta, frontal = true, titulo = 'Tomar foto', onFoto, onCerrar }: Props): React.JSX.Element | null {
  const videoRef = useRef<HTMLVideoElement>(null);
  const archivoRef = useRef<HTMLInputElement>(null);
  const flujoRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState('');
  const [usarFrontal, setUsarFrontal] = useState(frontal);

  const detener = () => {
    flujoRef.current?.getTracks().forEach(t => t.stop());
    flujoRef.current = null;
  };

  useEffect(() => {
    if (!abierta) { detener(); return; }
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Este navegador no permite usar la cámara. Elige una imagen de tus archivos.');
      return;
    }
    let cancelado = false;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: usarFrontal ? 'user' : 'environment' }, audio: false })
      .then(flujo => {
        if (cancelado) { flujo.getTracks().forEach(t => t.stop()); return; }
        flujoRef.current = flujo;
        if (videoRef.current) { videoRef.current.srcObject = flujo; videoRef.current.play().catch(() => {}); }
      })
      .catch(() => setError('No se pudo abrir la cámara (permiso negado o no hay cámara). Elige una imagen de tus archivos.'));
    return () => { cancelado = true; detener(); };
  }, [abierta, usarFrontal]);

  if (!abierta) return null;

  const tomar = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const lienzo = document.createElement('canvas');
    lienzo.width = v.videoWidth;
    lienzo.height = v.videoHeight;
    const ctx = lienzo.getContext('2d');
    if (!ctx) return;
    if (usarFrontal) { ctx.translate(lienzo.width, 0); ctx.scale(-1, 1); } // como espejo, igual que la vista previa
    ctx.drawImage(v, 0, 0);
    lienzo.toBlob(b => {
      if (!b) return;
      detener();
      onFoto(new File([b], `foto-${Date.now()}.jpg`, { type: 'image/jpeg' }));
      onCerrar();
    }, 'image/jpeg', 0.9);
  };

  const cerrar = () => { detener(); onCerrar(); };

  return (
    <div className="cam-fondo" role="dialog" aria-modal="true" aria-label={titulo} onClick={cerrar}>
      <div className="cam-caja" onClick={e => e.stopPropagation()}>
        <div className="cam-cabeza">
          <strong>{titulo}</strong>
          <button type="button" className="cam-x" onClick={cerrar} aria-label="Cerrar">✕</button>
        </div>
        {error
          ? <p className="cam-error">{error}</p>
          : <video ref={videoRef} className={`cam-video${usarFrontal ? ' cam-video--espejo' : ''}`} playsInline muted />}
        <div className="cam-acciones">
          {!error && <button type="button" className="cam-btn cam-btn--principal" onClick={tomar}>📷 Tomar foto</button>}
          {!error && <button type="button" className="cam-btn" onClick={() => setUsarFrontal(f => !f)}>🔄 Cambiar cámara</button>}
          <button type="button" className="cam-btn" onClick={() => archivoRef.current?.click()}>🖼 Elegir de archivos</button>
        </div>
        <input ref={archivoRef} type="file" accept="image/*" hidden onChange={e => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) { detener(); onFoto(f); onCerrar(); }
        }} />
      </div>
    </div>
  );
}

export default CamaraCaptura;
