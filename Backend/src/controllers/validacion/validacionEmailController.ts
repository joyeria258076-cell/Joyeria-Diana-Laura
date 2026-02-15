import { Request, Response } from 'express';
// 👇 Importaciones corregidas subiendo 2 niveles
import { EmailValidationService } from '../../services/EmailValidationService';
import admin from '../../config/firebase';

export const validateEmail = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'El email es requerido' });
    }

    // Validación de formato
    const formatValidation = EmailValidationService.validateFormat(email);
    if (!formatValidation.valid) {
      return res.status(400).json({ success: false, message: formatValidation.message });
    }

    // Validación con ZeroBounce
    console.log(`🔍 Validando email con ZeroBounce: ${email}`);
    const emailValidation = await EmailValidationService.validateEmail(email);
    
    if (!emailValidation.valid) {
      console.log(`❌ Validación fallida: ${emailValidation.message}`);
      return res.status(400).json({
        success: false,
        message: emailValidation.message || 'El email no es válido'
      });
    }

    console.log(`✅ Email validado correctamente: ${email}`);
    
    res.json({
      success: true,
      message: 'Email válido para registro',
      data: {
        email: email,
        valid: true
      }
    });

  } catch (error: any) {
    console.error('Error en validateEmail:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor: ' + error.message });
  }
};

export const checkEmailCredits = async (req: Request, res: Response) => {
  try {
    const creditsInfo = await EmailValidationService.checkCredits();
    res.json({
      success: true,
      data: {
        credits: creditsInfo.credits,
        message: creditsInfo.message
      }
    });

  } catch (error) {
    console.error('Error en checkEmailCredits:', error);
    res.status(500).json({ success: false, message: 'Error verificando créditos de email' });
  }
};

export const checkEmailConfig = async (req: Request, res: Response) => {
  try {
    // Verificar que Firebase esté configurado correctamente simulando un link
    const testEmail = 'test@example.com';
    const actionCodeSettings = {
      url: process.env.FRONTEND_URL || 'http://localhost:3000/login',
      handleCodeInApp: false
    };
    
    await admin.auth().generateEmailVerificationLink(testEmail, actionCodeSettings);
    
    res.json({
      success: true,
      message: 'Configuración de email verificada correctamente.'
    });
    
  } catch (error: any) {
    console.error('Error en checkEmailConfig:', error);
    res.status(400).json({ success: false, message: `Error en configuración de Firebase: ${error.message}` });
  }
};

export const testEmailDelivery = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email es requerido' });
    }

    console.log('🧪 Probando entrega de email para:', email);

    const actionCodeSettings = {
      url: 'https://joyeria-diana-laura.vercel.app/login?test=true',
      handleCodeInApp: false
    };

    const resetLink = await admin.auth().generatePasswordResetLink(email, actionCodeSettings);
    
    res.json({
      success: true,
      message: 'Prueba completada - Revisa logs del servidor',
      data: {
        email: email,
        linkGenerated: true,
        linkPreview: resetLink.substring(0, 100) + '...'
      }
    });

  } catch (error: any) {
    console.error('❌ Error en prueba:', error);
    res.status(500).json({ success: false, message: 'Error en prueba: ' + error.message });
  }
};