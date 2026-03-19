// src/services/metricsAPI.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://joyeria-diana-laura-nqnq.onrender.com/api';

class MetricsApiService {
  private baseURL: string;
  constructor(baseURL: string) { this.baseURL = baseURL; }

  private getHeaders(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    try {
      const u = localStorage.getItem('diana_laura_user');
      if (u) { const t = JSON.parse(u).token; if (t) h['Authorization'] = `Bearer ${t}`; }
      const s = localStorage.getItem('diana_laura_session_token');
      if (s) h['X-Session-Token'] = s;
    } catch (_) {}
    return h;
  }

  private async get(ep: string) {
    const r = await fetch(`${this.baseURL}${ep}`, { method: 'GET', headers: this.getHeaders(), credentials: 'include' });
    if (!r.ok) { const e = await r.json().catch(()=>({})); throw new Error(e.message || `Error ${r.status}`); }
    return r.json();
  }

  private async patch(ep: string) {
    const r = await fetch(`${this.baseURL}${ep}`, { method: 'PATCH', headers: this.getHeaders(), credentials: 'include' });
    if (!r.ok) { const e = await r.json().catch(()=>({})); throw new Error(e.message || `Error ${r.status}`); }
    return r.json();
  }

  private async post(ep: string, body: object) {
    const r = await fetch(`${this.baseURL}${ep}`, { method: 'POST', headers: this.getHeaders(), credentials: 'include', body: JSON.stringify(body) });
    if (!r.ok) { const e = await r.json().catch(()=>({})); throw new Error(e.message || `Error ${r.status}`); }
    return r.json();
  }

  getResumen()                                              { return this.get('/metrics/resumen'); }
  getRendimiento(horas = 24)                                { return this.get(`/metrics/rendimiento?horas=${horas}`); }
  getEndpointsLentos(limite = 10)                           { return this.get(`/metrics/endpoints-lentos?limite=${limite}`); }
  getErrores(soloNoResueltos = false, page = 1, limit = 15) { return this.get(`/metrics/errores?soloNoResueltos=${soloNoResueltos}&page=${page}&limit=${limit}`); }
  getActividad(dias = 7, pageSes = 1, pageAud = 1)          { return this.get(`/metrics/actividad?dias=${dias}&pageSes=${pageSes}&pageAud=${pageAud}`); }
  getDatabase()                                             { return this.get('/metrics/database'); }
  resolverError(id: number)                                 { return this.patch(`/metrics/errores/${id}/resolver`); }
  runVacuum(tabla?: string)                                 { return this.post('/metrics/database/vacuum',  { tabla: tabla ?? '' }); } // ✅ NUEVO
  runAnalyze(tabla?: string)                                { return this.post('/metrics/database/analyze', { tabla: tabla ?? '' }); } // ✅ NUEVO
}

export const metricsAPI = new MetricsApiService(API_BASE_URL);