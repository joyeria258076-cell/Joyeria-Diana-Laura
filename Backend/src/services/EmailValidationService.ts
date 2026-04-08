// Ruta: Joyeria-Diana-Laura/Backend/src/services/emailValidationService.ts
import axios from 'axios';

export class EmailValidationService {
  private static readonly ZEROBOUNCE_API_KEY = process.env.ZEROBOUNCE_API_KEY;

  /**
   * Verifica si un email realmente existe usando ZeroBounce
   */
  static async validateEmail(email: string): Promise<{ valid: boolean; message?: string }> {
    // 1. Primero validación básica de formato
    const formatValidation = this.validateFormat(email);
    if (!formatValidation.valid) {
      return formatValidation;
    }

    // 2. Si no hay API key de ZeroBounce, usar solo validación básica
    if (!this.ZEROBOUNCE_API_KEY) {
      console.log('⚠️ ZeroBounce API key no configurada, usando validación básica');
      return await this.basicEmailValidation(email);
    }

    try {
      console.log(`🎯 Validando email con ZeroBounce: ${email}`);
      
      const response = await axios.get(`https://api.zerobounce.net/v2/validate`, {
        params: {
          api_key: this.ZEROBOUNCE_API_KEY,
          email: email,
          ip_address: ''
        },
        timeout: 10000
      });

      console.log('🎯 Respuesta ZeroBounce:', response.data);

      // Si ZeroBounce responde con error de créditos, usar validación básica
      if (response.data.error && response.data.error.includes('credits')) {
        console.log('⚠️ ZeroBounce sin créditos, usando validación básica');
        return await this.basicEmailValidation(email);
      }

      const { status, sub_status } = response.data;

      // Estados válidos
      if (status === 'valid') {
        console.log('🎯 Email marcado como VÁLIDO por ZeroBounce');
        return { valid: true };
      }

      // Estados que deben ser rechazados
      if (status === 'invalid' || status === 'spamtrap' || status === 'abuse') {
        let message = 'El correo electrónico no es válido';
        
        if (sub_status === 'mailbox_not_found') {
          message = 'El correo electrónico no existe';
        } else if (sub_status === 'no_mx_record') {
          message = 'El dominio no tiene servidores de email';
        }
        
        return { valid: false, message };
      }

      // Para catch-all y otros estados, usar validación básica
      console.log(`⚠️ Estado ZeroBounce ${status}, usando validación básica`);
      return await this.basicEmailValidation(email);

    } catch (error: any) {
      console.error('🎯 Error con ZeroBounce API:', error.message);
      
      // En caso de error, usar validación básica
      console.log('⚠️ ZeroBounce no disponible, usando validación básica');
      return await this.basicEmailValidation(email);
    }
  }

  /**
   * Validación básica MEJORADA como fallback
   */
  private static async basicEmailValidation(email: string): Promise<{ valid: boolean; message?: string }> {
    try {
      const domain = email.split('@')[1];
      
      if (!domain) {
        return { valid: false, message: 'Formato de email inválido' };
      }

      // Lista de dominios temporales/disposable
      const disposableDomains = [
        'tempmail.com', 'guerrillamail.com', 'mailinator.com', 
        '10minutemail.com', 'throwawaymail.com', 'yopmail.com',
        'fake.com', 'trashmail.com', 'temp-mail.org', 
        'disposableemail.com', 'getnada.com', 'maildrop.cc',
        'tmpmail.org', 'fakeinbox.com'
      ];

      if (disposableDomains.some(disposable => domain.includes(disposable))) {
        return { 
          valid: false, 
          message: 'No se permiten emails temporales o desechables' 
        };
      }

      // Validar dominio de email común
      const commonDomains = [
        'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com',
        'icloud.com', 'protonmail.com', 'live.com', 'aol.com'
      ];

      // Si es un dominio común, aceptarlo
      if (commonDomains.some(common => domain.includes(common))) {
        console.log(`✅ Email de dominio común aceptado: ${domain}`);
        return { valid: true };
      }

      // Para otros dominios, aceptar con advertencia
      console.log(`⚠️ Dominio no común: ${domain}, pero aceptado en modo básico`);
      return { 
        valid: true, 
        message: 'Email aceptado (validación básica)' 
      };

    } catch (error) {
      console.error('Error en validación básica:', error);
      // En caso de error, ser más permisivo
      return { 
        valid: true, 
        message: 'Email aceptado (modo de respaldo)' 
      };
    }
  }

  /**
   * Verificar créditos disponibles en ZeroBounce
   */
  static async checkCredits(): Promise<{ credits: number; message: string }> {
    if (!this.ZEROBOUNCE_API_KEY) {
      return { credits: 0, message: 'API key no configurada' };
    }

    try {
      const response = await axios.get(`https://api.zerobounce.net/v2/getcredits`, {
        params: {
          api_key: this.ZEROBOUNCE_API_KEY
        }
      });

      let credits = 0;
      
      if (typeof response.data === 'object' && response.data.Credits) {
        credits = Number.parseInt(response.data.Credits) || 0;
      }
      
      console.log(`💰 Créditos ZeroBounce disponibles: ${credits}`);
      
      return { 
        credits, 
        message: credits > 0 ? 
          `Tienes ${credits} créditos disponibles` : 
          'No hay créditos disponibles' 
      };

    } catch (error: any) {
      console.error('❌ Error verificando créditos ZeroBounce:', error.message);
      
      return { 
        credits: 0, 
        message: 'Error verificando créditos: ' + error.message 
      };
    }
  }

  /**
   * Validación de formato estricto
   */
  static validateFormat(email: string): { valid: boolean; message?: string } {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    if (!emailRegex.test(email)) {
      return { 
        valid: false, 
        message: 'Formato de email inválido. Ejemplo: usuario@dominio.com' 
      };
    }

    // Validar longitud
    if (email.length < 6 || email.length > 60) {
      return { 
        valid: false, 
        message: 'El email debe tener entre 6 y 60 caracteres' 
      };
    }

    // Validar que no tenga espacios
    if (email.includes(' ')) {
      return { 
        valid: false, 
        message: 'El email no puede contener espacios' 
      };
    }

    return { valid: true };
  }
}