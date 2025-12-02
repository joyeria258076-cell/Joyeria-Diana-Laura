// ARCHIVO COMPLETAMENTE NUEVO - CREAR DESDE CERO
export const CookieConfig = {
  isProduction: process.env.NODE_ENV === 'production',
  
  settings: {
    production: {
      httpOnly: true,
      secure: true,
      sameSite: 'none' as const,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/',
      domain: '.joyeria-diana-laura-nqnq.onrender.com'
    },
    
    development: {
      httpOnly: true,
      secure: false,
      sameSite: 'lax' as const,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/',
      domain: undefined
    }
  },
  
  getConfig() {
    return this.isProduction ? this.settings.production : this.settings.development;
  },
  
  getClearConfig() {
    const config = this.getConfig();
    return {
      httpOnly: config.httpOnly,
      secure: config.secure,
      sameSite: config.sameSite,
      path: config.path,
      domain: config.domain
    };
  }
};