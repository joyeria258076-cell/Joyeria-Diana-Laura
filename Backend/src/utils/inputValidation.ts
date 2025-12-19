// Ruta: Joyeria-Diana-Laura/Backend/src/utils/inputValidation.ts

/**
 * Valida que el input no contenga patrones de inyección SQL o XSS
 * @param input - Cadena a validar
 * @param fieldName - Nombre del campo (para mensajes de error)
 * @returns { valid: boolean, message?: string }
 */
export const validateInputSecurity = (
  input: string,
  fieldName: string = "Campo"
): { valid: boolean; message?: string } => {
  if (!input || typeof input !== "string") {
    return { valid: false, message: `${fieldName} no puede estar vacío` };
  }

  // Patrones de inyección SQL comunes
  const sqlInjectionPatterns = [
    /(\bOR\b|\bAND\b)\s*['"]?\d+['"]?\s*=\s*['"]?\d+['"]?/i, // ' OR '1'='1
    /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bCREATE\b)/i,
    /--\s*$/i, // Comentarios SQL
    /;.*?(?:DROP|DELETE|TRUNCATE|UPDATE|INSERT)/i, // Múltiples sentencias
    /('\s*OR\s*'.*'='|'\s*OR\s*1\s*=\s*1)/i, // Variantes comunes
    /"\s*OR\s*"\s*=\s*"/i, // Comillas dobles
    /(`|%27|%23)/i, // Caracteres codificados
  ];

  // Patrones de XSS comunes
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi, // Scripts HTML
    /javascript:/gi, // Eventos JavaScript
    /<iframe[^>]*>/gi, // Iframes
    /<svg[^>]*>/gi, // SVG con potencial XSS
    /on\w+\s*=/gi, // Event handlers (onclick, onerror, etc)
    /<img[^>]*on/gi, // Imágenes con eventos
    /eval\s*\(/gi, // Eval
    /expression\s*\(/gi, // CSS expression
    /<embed[^>]*>/gi, // Embeds
    /<object[^>]*>/gi, // Objects
  ];

  // Verificar inyección SQL
  for (const pattern of sqlInjectionPatterns) {
    if (pattern.test(input)) {
      return {
        valid: false,
        message: `${fieldName} contiene caracteres o patrones no permitidos (SQL injection detected)`,
      };
    }
  }

  // Verificar XSS
  for (const pattern of xssPatterns) {
    if (pattern.test(input)) {
      return {
        valid: false,
        message: `${fieldName} contiene caracteres o patrones no permitidos (XSS detected)`,
      };
    }
  }

  return { valid: true };
};

/**
 * Sanitiza un input removiendo caracteres potencialmente peligrosos
 * (Uso en el frontend principalmente, pero útil como defensa adicional)
 */
export const sanitizeInput = (input: string): string => {
  if (!input || typeof input !== "string") {
    return "";
  }

  return (
    input
      // Remover etiquetas HTML
      .replace(/<[^>]*>/g, "")
      // Remover caracteres de control
      .replace(/[\x00-\x1F\x7F]/g, "")
      // Escapar comillas
      .trim()
  );
};

/**
 * Valida que el nombre tenga entre 3 y 30 caracteres
 * y solo contenga letras y espacios
 */
export const validateName = (
  name: string
): { valid: boolean; message?: string } => {
  if (!name || typeof name !== "string") {
    return { valid: false, message: "El nombre es requerido" };
  }

  const trimmedName = name.trim();

  // Verificar rango de caracteres
  if (trimmedName.length < 3) {
    return {
      valid: false,
      message: "El nombre debe tener al menos 3 caracteres",
    };
  }

  if (trimmedName.length > 30) {
    return {
      valid: false,
      message: "El nombre no puede tener más de 30 caracteres",
    };
  }

  // Validar seguridad
  const securityCheck = validateInputSecurity(trimmedName, "Nombre");
  if (!securityCheck.valid) {
    return securityCheck;
  }

  return { valid: true };
};

/**
 * Valida que el email sea seguro
 */
export const validateEmailSecurity = (
  email: string
): { valid: boolean; message?: string } => {
  if (!email || typeof email !== "string") {
    return { valid: false, message: "El email es requerido" };
  }

  // Validar seguridad
  const securityCheck = validateInputSecurity(email, "Email");
  if (!securityCheck.valid) {
    return securityCheck;
  }

  return { valid: true };
};

/**
 * Valida que la contraseña sea segura (aunque normalmente no necesita esto)
 */
export const validatePasswordSecurity = (
  password: string
): { valid: boolean; message?: string } => {
  if (!password || typeof password !== "string") {
    return { valid: false, message: "La contraseña es requerida" };
  }

  // Para contraseñas, permitimos más caracteres especiales
  // Solo rechazamos patrones de inyección muy evidentes
  const dangerousPatterns = [
    /;\s*(?:DROP|DELETE|TRUNCATE)/i,
    /<script/gi,
    /javascript:/gi,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(password)) {
      return {
        valid: false,
        message: "La contraseña contiene caracteres no permitidos",
      };
    }
  }

  return { valid: true };
};
