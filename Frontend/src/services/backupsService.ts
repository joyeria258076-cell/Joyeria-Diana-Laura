// Ruta: Frontend/src/services/backupsService.ts

const API_URL = 'http://localhost:5000/api/backups';

export const backupsService = {
  /**
   * Dispara la generación y descarga inmediata del backup
   */
  downloadBackupDirectly(): void {
    // CAMBIO: Ahora coincide exactamente con la ruta del backend
    const downloadUrl = `${API_URL}/direct-download`;
    
    // Abrir en una pestaña nueva o usar el link invisible es lo mejor para streams
    const link = document.createElement('a');
    link.href = downloadUrl;
    // El navegador intentará descargar el stream con este nombre
    link.setAttribute('download', `respaldo_joyeria_${Date.now()}.sql`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
};