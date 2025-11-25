import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

export class MFAService {
  /**
   * Generar secreto MFA para un usuario
   */
  static generateSecret(email: string): speakeasy.GeneratedSecret {
    return speakeasy.generateSecret({
      name: `Joyería Diana Laura (${email})`,
      issuer: 'Joyería Diana Laura'
    });
  }

  /**
   * Verificar código TOTP del usuario
   */
  static verifyToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 1 // Permite 30 segundos de margen
    });
  }

  /**
   * Generar códigos de respaldo de un solo uso
   */
  static generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 8; i++) {
      // Generar código de 8 caracteres alfanuméricos
      codes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
    }
    return codes;
  }

  /**
   * Generar QR Code para la app authenticator
   */
  static async generateQRCode(otpauthUrl: string): Promise<string> {
    try {
      return await QRCode.toDataURL(otpauthUrl);
    } catch (error) {
      console.error('❌ Error generando QR code:', error);
      throw new Error('No se pudo generar el código QR');
    }
  }

  /**
   * Validar formato de código MFA (6 dígitos)
   */
  static isValidMFACode(token: string): boolean {
    return /^\d{6}$/.test(token);
  }
}