const API_URL = `${import.meta.env.VITE_API_URL || 'https://joyeria-diana-laura-nqnq.onrender.com/api'}/backups`;
//const API_URL = 'http://localhost:5000/api/backups'; 

// --- INTERFAZ DE DATOS ---
export interface Backup {
  id: string;
  name: string;
  type: string;
  size: string;
  status: 'completed' | 'failed';
  created_at: string;
  created_by?: string;
  detalles_log?: string;
  url_archivo?: string; // ← URL de Cloudinary para respaldos automáticos
}

// --- INTERFAZ DEL SCHEDULER ---
export interface SchedulerConfig {
  enabled: boolean;
  frecuencia: 'cada5min' | 'diario' | 'semanal' | 'mensual';
  hora: string;
  retencion_dias: number;
}

export interface SchedulerStatus {
  running: boolean;
  config: SchedulerConfig;
  nextRun: string | null;
  lastRun: string | null;
}

export const backupsService = {
  /**
   * OBTIENE EL HISTORIAL REAL DESDE LA BASE DE DATOS
   */
  async getHistory(): Promise<Backup[]> {
    try {
      const response = await fetch(`${API_URL}/history`);
      if (!response.ok) throw new Error('Error al obtener el historial del servidor');
      return await response.json();
    } catch (error) {
      console.error("Error en servicio getHistory:", error);
      return [];
    }
  },

  /**
   * DESCARGA EL ARCHIVO DE LOG (.txt) DESDE EL SERVIDOR
   */
  async downloadLogFile(id: string | number, fileName: string): Promise<void> {
    try {
      const response = await fetch(`${API_URL}/log/${id}`);
      if (!response.ok) throw new Error('No se pudo obtener el log');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const logName = `LOG_${fileName.replace('.dump', '')}.txt`;
      link.setAttribute('download', logName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error al descargar el log:", error);
      alert("No se pudo descargar el reporte técnico.");
    }
  },

  /**
   * Genera el backup (.dump) y permite al usuario elegir dónde guardarlo
   */
  async downloadBackupDirectly(): Promise<void> {
    const downloadUrl = `${API_URL}/direct-download`;

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

  /**
   * Descarga un respaldo automático desde Cloudinary
   * Permite al usuario elegir dónde guardarlo (igual que el manual)
   */
  async downloadFromCloudinary(urlArchivo: string, fileName: string): Promise<void> {
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: fileName,
          types: [{
            description: 'PostgreSQL Backup File',
            accept: { 'application/octet-stream': ['.dump'] },
          }],
        });

        const response = await fetch(urlArchivo);
        if (!response.ok) throw new Error('No se pudo descargar el archivo desde Cloudinary');

        const writable = await handle.createWritable();
        if (response.body) {
          await response.body.pipeTo(writable);
        } else {
          throw new Error('No se recibió cuerpo de respuesta');
        }
        console.log(`✅ Archivo ${fileName} guardado exitosamente.`);
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.log('Descarga cancelada por el usuario.');
        } else {
          console.error('Error usando FileSystem API:', err);
          // Fallback: descarga directa sin selector
          const link = document.createElement('a');
          link.href = urlArchivo;
          link.setAttribute('download', fileName);
          document.body.appendChild(link);
          link.click();
          link.remove();
        }
      }
    } else {
      // Navegadores sin FileSystem API
      const link = document.createElement('a');
      link.href = urlArchivo;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  },

  /**
   * Método de respaldo para navegadores que no soportan FileSystem API
   */
  fallbackDownload(url: string): void {
    const ahora = new Date();
    const marcaReferencia = ahora.getTime();
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `respaldo_joyeria_manual_${marcaReferencia}.dump`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  // ─── MÉTODOS DEL SCHEDULER ────────────────────────────────────────────────

  async getSchedulerStatus(): Promise<SchedulerStatus | null> {
    try {
      const response = await fetch(`${API_URL}/scheduler/status`);
      if (!response.ok) throw new Error('Error al obtener estado del scheduler');
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error("Error en getSchedulerStatus:", error);
      return null;
    }
  },

  async updateSchedulerConfig(config: SchedulerConfig): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${API_URL}/scheduler/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await response.json();
      return { success: response.ok, message: data.message || data.error };
    } catch (error) {
      console.error("Error en updateSchedulerConfig:", error);
      return { success: false, message: 'Error de conexión con el servidor' };
    }
  },

  async runSchedulerNow(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${API_URL}/scheduler/run-now`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      return { success: response.ok, message: data.message || data.error };
    } catch (error) {
      console.error("Error en runSchedulerNow:", error);
      return { success: false, message: 'Error de conexión con el servidor' };
    }
  },

  async getDatabaseHealth(): Promise<any> {
    try {
      const response = await fetch(`${API_URL}/health`);
      if (!response.ok) throw new Error('Error al obtener salud de BD');
      return await response.json();
    } catch (error) {
      console.error("Error en getDatabaseHealth:", error);
      return null;
    }
  },

  async runMaintenance(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${API_URL}/maintenance`, { method: 'POST' });
      const data = await response.json();
      return { success: response.ok, message: data.message || data.error };
    } catch (error) {
      return { success: false, message: 'Error de conexión' };
    }
  },

  deleteBackup: async (id: string): Promise<{ success: boolean; message: string }> => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error en deleteBackup:", error);
      return { success: false, message: 'Error de conexión con el servidor' };
    }
  },

  /**
   * Obtiene la lista de tablas disponibles en la BD
   */
  async getTablesList(): Promise<{ tabla: string; filas: number }[]> {
    try {
      const response = await fetch(`${API_URL}/tables`);
      if (!response.ok) throw new Error('Error al obtener tablas');
      const data = await response.json();
      return data.tables || [];
    } catch (error) {
      console.error("Error en getTablesList:", error);
      return [];
    }
  },

  /**
   * Descarga el .dump de una tabla específica con selector de carpeta
   */
  async downloadCollectionBackup(tabla: string): Promise<void> {
    const downloadUrl = `${API_URL}/collection/${tabla}`;
    const ahora = new Date();
    const localString = ahora.toLocaleString('es-MX', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    });
    const nombreLimpio = localString.replace(/\//g, '-').replace(/, /g, '_').replace(/:/g, '-');
    const nombreSugerido = `respaldo_${tabla}_${nombreLimpio}.dump`;

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
          throw new Error('No se recibió cuerpo de respuesta');
        }
        console.log(`✅ Colección ${tabla} guardada como ${nombreSugerido}`);
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.log('Descarga cancelada por el usuario.');
        } else {
          console.error('Error FileSystem API:', err);
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.setAttribute('download', nombreSugerido);
          document.body.appendChild(link);
          link.click();
          link.remove();
        }
      }
    } else {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', nombreSugerido);
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  },

  /**
   * Descarga una tabla como CSV con selector de carpeta
   */
  async downloadCollectionCSV(tabla: string): Promise<void> {
    const downloadUrl = `${API_URL}/collection/${tabla}/csv`;
    const ahora = new Date();
    const localString = ahora.toLocaleString('es-MX', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    });
    const nombreLimpio = localString.replace(/\//g, '-').replace(/, /g, '_').replace(/:/g, '-');
    const nombreSugerido = `respaldo_${tabla}_${nombreLimpio}.csv`;

    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: nombreSugerido,
          types: [{ description: 'CSV File', accept: { 'text/csv': ['.csv'] } }],
        });
        const response = await fetch(downloadUrl);
        if (!response.ok) throw new Error('Error al conectar con el servidor');
        const writable = await handle.createWritable();
        if (response.body) {
          await response.body.pipeTo(writable);
        } else {
          throw new Error('No se recibió cuerpo de respuesta');
        }
        console.log(`✅ CSV ${tabla} guardado como ${nombreSugerido}`);
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.log('Descarga cancelada por el usuario.');
        } else {
          console.error('Error FileSystem API:', err);
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.setAttribute('download', nombreSugerido);
          document.body.appendChild(link);
          link.click();
          link.remove();
        }
      }
    } else {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', nombreSugerido);
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  },
};