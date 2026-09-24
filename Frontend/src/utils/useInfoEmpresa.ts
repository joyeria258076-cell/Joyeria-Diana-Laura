// Datos de Información Empresarial (admin) compartidos por footers y pantallas.
// Se piden una sola vez por carga de página y se reutilizan.
import { useEffect, useState } from 'react';
import { contentAPI } from '../services/api';

export interface InfoEmpresa {
  nombre?: string | null;
  descripcion?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  email?: string | null;
  horario?: string | null;
  whatsapp?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  tiktok_url?: string | null;
}

let cache: InfoEmpresa | null = null;
let pendiente: Promise<InfoEmpresa | null> | null = null;

const cargar = () => {
  if (!pendiente) {
    pendiente = contentAPI.getInfoEmpresa()
      .then((res: any) => (cache = res?.data || null))
      .catch(() => { pendiente = null; return null; });
  }
  return pendiente;
};

export const useInfoEmpresa = (): InfoEmpresa | null => {
  const [info, setInfo] = useState<InfoEmpresa | null>(cache);
  useEffect(() => {
    if (cache) return;
    let vivo = true;
    cargar().then(d => { if (vivo) setInfo(d); });
    return () => { vivo = false; };
  }, []);
  return info;
};
