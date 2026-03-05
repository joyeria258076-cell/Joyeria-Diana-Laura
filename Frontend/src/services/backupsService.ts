const API_URL = 'http://localhost:5000/api/backups';

export const backupsService = {
  /**
   * Genera el backup y permite al usuario elegir dónde guardarlo
   */
  async downloadBackupDirectly(): Promise<void> {
    const downloadUrl = `${API_URL}/direct-download`;

    // --- NUEVA LÓGICA DE NOMBRE DINÁMICO LOCAL ---
    const ahora = new Date();
    
    // Obtenemos fecha (DD-MM-YYYY)
    const fecha = ahora.toLocaleDateString('es-MX').replace(/\//g, '-');
    
    // Obtenemos hora (HH-MM-SS)
    const hora = ahora.toLocaleTimeString('es-MX', { hour12: false }).replace(/:/g, '-');
    
    // Nombre final que aparecerá en la ventana de Windows
    const nombreSugerido = `respaldo_joyeria_${fecha}_${hora}.dump`;

    // 1. Verificar si el navegador soporta el selector de archivos
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: nombreSugerido, // <--- CAMBIADO: Ahora usa la variable dinámica
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
    // Para el fallback también usamos la hora local
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