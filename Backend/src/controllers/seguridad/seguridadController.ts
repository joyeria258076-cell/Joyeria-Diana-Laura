import { Request, Response } from 'express';
// 👇 Importaciones corregidas subiendo 2 niveles
import { LoginSecurityService } from '../../services/loginSecurityService';
import { pool } from '../../config/database';
import admin from '../../config/firebase';
import { getUserByEmail } from '../../models/userModel';

// Verificar estado de bloqueo de cuenta
export const checkAccountLock = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email requerido' });
    }

    const lockStatus = await LoginSecurityService.isAccountLocked(email);
    const securityStats = await LoginSecurityService.getSecurityStats(email);

    res.json({
      success: true,
      data: {
        locked: lockStatus.locked,
        lockedUntil: lockStatus.lockedUntil,
        securityStats: securityStats
      }
    });

  } catch (error) {
    console.error('Error en checkAccountLock:', error);
    res.status(500).json({ success: false, message: 'Error verificando cuenta' });
  }
};

// Desbloquear cuenta manualmente (Admin)
export const unlockAccount = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email requerido' });
    }

    await LoginSecurityService.clearFailedAttempts(email);
    
    console.log(`🔓 Cuenta desbloqueada manualmente: ${email}`);
    
    res.json({
      success: true,
      message: 'Cuenta desbloqueada exitosamente'
    });

  } catch (error) {
    console.error('Error en unlockAccount:', error);
    res.status(500).json({ success: false, message: 'Error desbloqueando cuenta' });
  }
};

// Diagnóstico completo de seguridad de login
export const checkLoginSecurity = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email requerido' });
    }

    const lockStatus = await LoginSecurityService.isAccountLocked(email);
    const securityStats = await LoginSecurityService.getSecurityStats(email);

    // Verificar si existe en la tabla login_security
    const result = await pool.query(
      'SELECT * FROM login_security WHERE email = $1',
      [email]
    );

    res.json({
      success: true,
      data: {
        lockStatus,
        securityStats,
        existsInTable: result.rows.length > 0,
        tableData: result.rows[0] || null
      }
    });

  } catch (error) {
    console.error('Error en checkLoginSecurity:', error);
    res.status(500).json({ success: false, message: 'Error verificando seguridad de login' });
  }
};

// Verificar usuario en Firebase y PostgreSQL simultáneamente
export const checkFirebaseUser = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email requerido' });
    }

    console.log(`🔍 Verificando usuario en Firebase: ${email}`);

    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      console.log(`✅ Usuario encontrado en Firebase: ${userRecord.uid}`);
      
      // Obtener usuario de PostgreSQL para el ID numérico
      const dbUser = await getUserByEmail(email);
      
      res.json({
        success: true,
        exists: true,
        emailVerified: userRecord.emailVerified,
        data: {
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName,
          emailVerified: userRecord.emailVerified,
          id: dbUser?.id || null
        }
      });

    } catch (firebaseError: any) {
      if (firebaseError.code === 'auth/user-not-found') {
        console.log(`❌ Usuario NO encontrado en Firebase: ${email}`);
        return res.json({ success: true, exists: false });
      }
      throw firebaseError;
    }

  } catch (error: any) {
    console.error('Error en checkFirebaseUser:', error);
    res.status(500).json({ success: false, message: 'Error verificando usuario: ' + error.message });
  }
};

// Diagnóstico de tablas (Temporal)
export const diagnosticCheckUsersTable = async (req: Request, res: Response) => {
  try {
    console.log('🔍 Diagnóstico de tabla usuarios...');
    const columnCheck = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'rol'`);
    const usersCheck = await pool.query(`SELECT id, email, nombre, rol FROM usuarios LIMIT 10`);
    
    res.json({
      success: true,
      message: 'Diagnóstico completado',
      data: {
        rolColumnExists: columnCheck.rows.length > 0,
        sampleUsers: usersCheck.rows
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error en diagnóstico', error: error.message });
  }
};