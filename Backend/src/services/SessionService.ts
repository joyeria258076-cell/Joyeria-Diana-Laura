// Ruta: Joyeria-Diana-Laura/Backend/src/services/SessionService.ts
import { pool } from '../config/database';
import crypto from 'crypto';

export interface UserSession {
  id?: number;
  user_id: number;
  session_token: string;
  device_fingerprint: string;
  firebase_uid: string;
  device_name: string;
  browser: string;
  os: string;
  ip_address: string;
  user_agent: string;
  location: string;
  created_at?: Date;
  last_activity?: Date;
  expires_at: Date;
  is_revoked?: boolean;
  revoked_at?: Date;
}

export interface DeviceInfo {
  deviceName: string;
  browser: string;
  os: string;
}

// ─── HELPER: interval SQL según rol ───────────────────────────────────────────
// La fecha se calcula con NOW() en PostgreSQL (siempre UTC) — Node no toca fechas
function getIntervalByRol(rol?: string): string {
  return (rol === 'trabajador' || rol === 'admin')
    ? '15 minutes'  // personal
    : '1 hour';     // cliente (o sin rol)
}

export class SessionService {
  /**
   * Generar token de sesión seguro
   */
  static generateSessionToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generar fingerprint único del dispositivo
   */
  static generateDeviceFingerprint(userAgent: string, ipAddress: string): string {
    const fingerprintData = `${userAgent}`;
    return crypto.createHash('sha256').update(fingerprintData).digest('hex').substring(0, 16);
  }

  /**
   * Obtener ubicación real desde IP usando ipgeolocation.io
   */
  static async getLocationFromIp(ipAddress: string): Promise<string> {
    try {
      if (ipAddress === '127.0.0.1' || ipAddress === '::1') {
        return 'Localhost';
      }
      if (ipAddress.includes('172.') || ipAddress.includes('10.') || ipAddress.includes('192.168.')) {
        return 'Red Interna';
      }

      const apiKey = process.env.IP_GEOLOCATION_API_KEY;
      if (apiKey) {
        const response = await fetch(`https://api.ipgeolocation.io/ipgeo?apiKey=${apiKey}&ip=${ipAddress}`);
        
        if (response.ok) {
          const data = await response.json();
          const locationParts = [];
          if (data.city && data.city !== '') locationParts.push(data.city);
          if (data.state_prov && data.state_prov !== '') locationParts.push(data.state_prov);
          if (data.country_name && data.country_name !== '') locationParts.push(data.country_name);
          const location = locationParts.length > 0 ? locationParts.join(', ') : 'Ubicación Desconocida';
          console.log(`📍 Ubicación obtenida para ${ipAddress}: ${location}`);
          return location;
        } else {
          console.warn(`⚠️ ipgeolocation.io respondió con error: ${response.status}`);
        }
      }

      console.log('🔄 Usando fallback ipapi.co...');
      const fallbackResponse = await fetch(`http://ipapi.co/${ipAddress}/json/`);
      
      if (fallbackResponse.ok) {
        const data = await fallbackResponse.json();
        if (!data.error) {
          const locationParts = [];
          if (data.city) locationParts.push(data.city);
          if (data.region) locationParts.push(data.region);
          if (data.country_name) locationParts.push(data.country_name);
          return locationParts.join(', ') || 'Ubicación Desconocida';
        }
      }

      return 'Ubicación No Disponible';

    } catch (error: any) {
      console.error('❌ Error obteniendo ubicación:', error.message);
      return 'Ubicación No Determinada';
    }
  }

  /**
   * Crear nueva sesión de usuario con fingerprint.
   * El parámetro `rol` determina el tiempo de expiración:
   *   - admin / trabajador → 15 minutos
   *   - cliente (o sin rol) → 1 hora
   */
  static async createSession(
    userId: number,
    firebaseUid: string,
    deviceInfo: DeviceInfo,
    ipAddress: string,
    userAgent: string,
    rol?: string                          // ← NUEVO parámetro
  ): Promise<{ success: boolean; sessionId?: number; sessionToken?: string; error?: string }> {
    try {
      if (!userId || !firebaseUid) {
        return { success: false, error: 'Parámetros requeridos faltantes' };
      }

      const deviceFingerprint = this.generateDeviceFingerprint(userAgent, ipAddress);

      console.log(`🔍 Verificando sesión existente para dispositivo: ${deviceFingerprint}`);

      const existingSession = await pool.query(
        `SELECT id, session_token, expires_at FROM user_sessions 
         WHERE user_id = $1 AND device_fingerprint = $2 
         AND is_revoked = false AND expires_at > NOW()
         ORDER BY created_at DESC LIMIT 1`,
        [userId, deviceFingerprint]
      );

      // Si ya existe sesión activa → renovarla con el nuevo tiempo según rol
      if (existingSession.rows.length > 0) {
        const existingToken = existingSession.rows[0].session_token;
        const existingId    = existingSession.rows[0].id;

        console.log(`♻️ REUTILIZANDO sesión existente ID: ${existingId}`);

        await pool.query(
          `UPDATE user_sessions 
           SET last_activity = NOW(), expires_at = NOW() + $1::interval
           WHERE id = $2`,
          [getIntervalByRol(rol), existingId]
        );

        return { success: true, sessionId: existingId, sessionToken: existingToken };
      }

      // No existe → crear nueva sesión
      console.log(`🆕 Creando nueva sesión para dispositivo: ${deviceFingerprint}, rol: ${rol || 'cliente'}`);

      const sessionToken = this.generateSessionToken();
      const intervalo    = getIntervalByRol(rol);

      // Obtener ubicación de forma no bloqueante
      let location = 'Obteniendo ubicación...';
      this.getLocationFromIp(ipAddress)
        .then(realLocation => {
          pool.query(
            `UPDATE user_sessions SET location = $1 WHERE session_token = $2`,
            [realLocation, sessionToken]
          ).catch(err => console.error('❌ Error actualizando ubicación:', err));
        })
        .catch(err => console.error('❌ Error obteniendo ubicación:', err));

      const result = await pool.query(
        `INSERT INTO user_sessions 
         (user_id, session_token, device_fingerprint, firebase_uid, device_name, browser, os, ip_address, user_agent, location, expires_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW() + $11::interval) 
         RETURNING id`,
        [
          userId,
          sessionToken,
          deviceFingerprint,
          firebaseUid,
          deviceInfo.deviceName,
          deviceInfo.browser,
          deviceInfo.os,
          ipAddress,
          userAgent,
          location,
          intervalo
        ]
      );

      if (result.rows.length > 0) {
        console.log(`✅ Nueva sesión creada ID: ${result.rows[0].id} — intervalo: +${intervalo}`);
        return { success: true, sessionId: result.rows[0].id, sessionToken };
      }

      return { success: false, error: 'No se pudo crear la sesión' };

    } catch (error: any) {
      console.error('❌ Error creando sesión:', error);

      if (error.code === '23505') {
        console.warn('⚠️ Token duplicado, generando nuevo...');
        return this.createSession(userId, firebaseUid, deviceInfo, ipAddress, userAgent, rol);
      }

      return { success: false, error: error.message };
    }
  }

  /**
   * Obtener sesión por token
   */
  static async getSessionByToken(sessionToken: string): Promise<{ success: boolean; session?: UserSession; error?: string }> {
    try {
      const result = await pool.query(
        `SELECT * FROM user_sessions 
         WHERE session_token = $1 AND is_revoked = false AND expires_at > NOW()`,
        [sessionToken]
      );

      if (result.rows.length > 0) {
        return { success: true, session: result.rows[0] };
      } else {
        return { success: false, error: 'Sesión no encontrada o revocada' };
      }
    } catch (error: any) {
      console.error('❌ Error obteniendo sesión:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtener sesión actual por fingerprint
   */
  static async getCurrentSessionByFingerprint(userId: number, fingerprint: string): Promise<{ success: boolean; session?: UserSession; error?: string }> {
    try {
      const result = await pool.query(
        `SELECT * FROM user_sessions 
         WHERE user_id = $1 AND device_fingerprint = $2 AND is_revoked = false AND expires_at > NOW()`,
        [userId, fingerprint]
      );

      if (result.rows.length > 0) {
        return { success: true, session: result.rows[0] };
      } else {
        return { success: false, error: 'Sesión actual no encontrada' };
      }
    } catch (error: any) {
      console.error('❌ Error obteniendo sesión actual:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtener todas las sesiones activas de un usuario
   */
  static async getActiveSessionsByUserId(userId: number): Promise<{ success: boolean; sessions: UserSession[]; error?: string }> {
    try {
      const result = await pool.query(
        `SELECT * FROM user_sessions 
         WHERE user_id = $1 AND is_revoked = false AND expires_at > NOW()
         ORDER BY last_activity DESC`,
        [userId]
      );

      return { success: true, sessions: result.rows };
    } catch (error: any) {
      console.error('❌ Error obteniendo sesiones activas:', error);
      return { success: false, sessions: [], error: error.message };
    }
  }

  /**
   * Actualizar última actividad de una sesión
   */
  static async updateLastActivity(sessionToken: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Renovar last_activity Y extender expires_at según el rol del usuario
      // Si está activo, su sesión se renueva automáticamente
      const result = await pool.query(
        `UPDATE user_sessions us
         SET 
           last_activity = CURRENT_TIMESTAMP,
           expires_at = CURRENT_TIMESTAMP + (
             CASE 
               WHEN u.rol = 'trabajador' OR u.rol = 'admin' 
                 THEN interval '15 minutes'
               ELSE 
                 interval '1 hour'
             END
           )
         FROM usuarios u
         WHERE us.session_token = $1 
           AND us.user_id = u.id
           AND us.is_revoked = false`,
        [sessionToken]
      );

      if (result.rowCount && result.rowCount > 0) {
        return { success: true };
      } else {
        return { success: false, error: 'Sesión no encontrada' };
      }
    } catch (error: any) {
      console.error('❌ Error actualizando actividad:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Revocar una sesión específica por ID
   */
  static async revokeSessionById(sessionId: number): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await pool.query(
        `UPDATE user_sessions 
         SET is_revoked = true, revoked_at = CURRENT_TIMESTAMP 
         WHERE id = $1 AND is_revoked = false`,
        [sessionId]
      );

      if (result.rowCount && result.rowCount > 0) {
        console.log(`✅ Sesión revocada ID: ${sessionId}`);
        return { success: true };
      } else {
        return { success: false, error: 'Sesión no encontrada o ya revocada' };
      }
    } catch (error: any) {
      console.error('❌ Error revocando sesión:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Revocar una sesión específica por token
   */
  static async revokeSessionByToken(sessionToken: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await pool.query(
        `UPDATE user_sessions 
         SET is_revoked = true, revoked_at = CURRENT_TIMESTAMP 
         WHERE session_token = $1 AND is_revoked = false`,
        [sessionToken]
      );

      if (result.rowCount && result.rowCount > 0) {
        console.log(`✅ Sesión revocada: ${sessionToken}`);
        return { success: true };
      } else {
        return { success: false, error: 'Sesión no encontrada o ya revocada' };
      }
    } catch (error: any) {
      console.error('❌ Error revocando sesión:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Revocar todas las sesiones de un usuario EXCEPTO la actual
   */
  static async revokeAllOtherSessions(userId: number, currentSessionToken: string): Promise<{ success: boolean; revokedCount: number; error?: string }> {
    try {
      const result = await pool.query(
        `UPDATE user_sessions 
         SET is_revoked = true, revoked_at = CURRENT_TIMESTAMP 
         WHERE user_id = $1 AND session_token != $2 AND is_revoked = false`,
        [userId, currentSessionToken]
      );

      console.log(`✅ Revocadas ${result.rowCount} sesiones para usuario ${userId} (excepto actual)`);
      return { success: true, revokedCount: result.rowCount || 0 };
    } catch (error: any) {
      console.error('❌ Error revocando otras sesiones:', error);
      return { success: false, revokedCount: 0, error: error.message };
    }
  }

  /**
   * Revocar TODAS las sesiones de un usuario
   */
  static async revokeAllSessions(userId: number): Promise<{ success: boolean; revokedCount: number; error?: string }> {
    try {
      const result = await pool.query(
        `UPDATE user_sessions 
         SET is_revoked = true, revoked_at = CURRENT_TIMESTAMP 
         WHERE user_id = $1 AND is_revoked = false`,
        [userId]
      );

      console.log(`✅ Revocadas TODAS (${result.rowCount}) sesiones para usuario ${userId}`);
      return { success: true, revokedCount: result.rowCount || 0 };
    } catch (error: any) {
      console.error('❌ Error revocando todas las sesiones:', error);
      return { success: false, revokedCount: 0, error: error.message };
    }
  }

  /**
   * Limpiar sesiones expiradas
   */
  static async cleanupExpiredSessions(): Promise<{ success: boolean; cleanedCount: number; error?: string }> {
    try {
      const result = await pool.query(
        `DELETE FROM user_sessions WHERE expires_at <= NOW() OR is_revoked = true`
      );

      console.log(`🧹 Limpiadas ${result.rowCount} sesiones expiradas/revocadas`);
      return { success: true, cleanedCount: result.rowCount || 0 };
    } catch (error: any) {
      console.error('❌ Error limpiando sesiones expiradas:', error);
      return { success: false, cleanedCount: 0, error: error.message };
    }
  }

  /**
   * Obtener información del dispositivo desde User-Agent
   */
  static parseUserAgent(userAgent: string): DeviceInfo {
    if (!userAgent || userAgent === 'unknown') {
      return { deviceName: 'Dispositivo Desconocido', browser: 'Desconocido', os: 'Desconocido' };
    }

    let browser = 'Desconocido';
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';
    else if (userAgent.includes('Opera')) browser = 'Opera';

    let os = 'Desconocido';
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS') || userAgent.includes('iPhone')) os = 'iOS';

    return { deviceName: `${os} - ${browser}`, browser, os };
  }

  static async getCurrentSessionTokenByUserAndDevice(
    userId: number,
    userAgent: string,
    ipAddress: string
  ): Promise<{ success: boolean; sessionToken?: string; error?: string }> {
    try {
      const deviceFingerprint = this.generateDeviceFingerprint(userAgent, ipAddress);

      const result = await pool.query(
        `SELECT session_token FROM user_sessions 
         WHERE user_id = $1 AND device_fingerprint = $2 
         AND is_revoked = false AND expires_at > NOW()
         ORDER BY created_at DESC LIMIT 1`,
        [userId, deviceFingerprint]
      );

      if (result.rows.length > 0) {
        return { success: true, sessionToken: result.rows[0].session_token };
      } else {
        return { success: false, error: 'Sesión actual no encontrada' };
      }
    } catch (error: any) {
      console.error('❌ Error obteniendo sessionToken actual:', error);
      return { success: false, error: error.message };
    }
  }
}