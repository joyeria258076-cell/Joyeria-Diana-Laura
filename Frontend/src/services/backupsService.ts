const API_URL = 'http://localhost:5000/api/backups';

// --- ENFOQUE EMPRESARIAL: INTERFAZ DE DATOS ---
export interface Backup {
  id: string;
  name: string;
  type: string;
  size: string;
  status: 'completed' | 'failed';
  created_at: string;
  created_by?: string; // Nombre del administrador que realizó la acción
}

export const backupsService = {
  /**
   * OBTIENE EL HISTORIAL REAL DESDE LA BASE DE DATOS
   * Este es el "puente" para que la tabla sea dinámica
   */
  async getHistory(): Promise<Backup[]> {
    try {
      const response = await fetch(`${API_URL}/history`);
      if (!response.ok) throw new Error('Error al obtener el historial del servidor');
      return await response.json();
    } catch (error) {
      console.error("Error en servicio getHistory:", error);
      return []; // Retorna array vacío para que la interfaz no truene
    }
  },

  /**
   * Genera el backup y permite al usuario elegir dónde guardarlo
   */
  async downloadBackupDirectly(): Promise<void> {
    const downloadUrl = `${API_URL}/direct-download`;

    // --- LÓGICA DE NOMBRE DINÁMICO ---
    const ahora = new Date();
    const fecha = ahora.toLocaleDateString('es-MX').replace(/\//g, '-');
    const hora = ahora.toLocaleTimeString('es-MX', { hour12: false }).replace(/:/g, '-');
    const nombreSugerido = `respaldo_joyeria_${fecha}_${hora}.dump`;

    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: nombreSugerido,
          types: [{
            description: 'PostgreSQL Backup File',
            accept: { 'application/octet-stream': ['.dump'] },
          }],
        });

        const response = await fetch(downloadUrl);
        if (!response.ok) throw new Error('Error al conectar con el servidor');

        const writable = await handle.createWritable();
        
        if (response.body) {
          await response.body.pipeTo(writable);
        } else {
          throw new Error('No se recibió cuerpo de respuesta del servidor');
        }
        
        console.log(`✅ Archivo ${nombreSugerido} guardado exitosamente.`);
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.log('Descarga cancelada por el usuario.');
        } else {
          console.error('Error usando FileSystem API:', err);
          this.fallbackDownload(downloadUrl);
        }
      }
    } else {
      this.fallbackDownload(downloadUrl);
    }
  },

  fallbackDownload(url: string): void {
    const ahora = new Date();
    const marcaReferencia = ahora.getTime(); 
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `respaldo_joyeria_manual_${marcaReferencia}.dump`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
};