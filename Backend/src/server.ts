// Backend/src/server.ts
//import 'newrelic';
import dotenv from 'dotenv';
dotenv.config();

if (process.env.NEW_RELIC_LICENSE_KEY) {
  require('newrelic');
}

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { testConnection } from './config/database';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import { LoginSecurityService } from './services/loginSecurityService';
import securityQuestionRoutes from './routes/securityQuestionRoutes';
import { getTokenInfo, authenticateToken } from './middleware/authMiddleware';
import { JWTConfig } from './config/jwtConfig';
import cookieParser from 'cookie-parser';
import { cookieAuthMiddleware } from './middleware/cookieMiddleware';
import productRoutes from './routes/productRoutes';
import adminRoutes from './routes/adminRoutes';
import adminContentRoutes from './routes/adminContentRoutes';
import importRoutes from './routes/importRoutes';
import backupRoutes from './routes/backupRoutes';
import carritoRoutes from './routes/carritoRoutes';
import uploadRoutes from './routes/uploadRoutes';
import cloudinary from './config/cloudinary';
import { testCloudinaryConnection } from './config/cloudinary';
import configuracionRoutes from './routes/configuracionRoutes';
import proveedoresRoutes from './routes/proveedoresRoutes';
import { BackupSchedulerService } from './services/BackupSchedulerService';
import templateRoutes from './routes/templateRoutes';
import metricsRoutes from './routes/metricsRoutes';
import { metricsMiddleware, setupErrorMonitoring, expressErrorMiddleware, cleanupOldLogs } from './middleware/metricsMiddleware';
import exportRoutes from './routes/exportRoutes';
import bulkUpdateRoutes from './routes/bulkUpdateRoutes';
import predictiveRoutes from './routes/predictiveRoutes';
import { AuthRequest } from './middleware/authMiddleware';
import pool from './config/database';

// IAST Agent
import { iastMiddleware, createIASTRouter, initializeIAST } from './iast/IASTMiddleware';

// RASP Agent
import { 
  raspMiddleware, 
  rateLimitMiddleware, 
  // helmetMiddleware,  // ❌ NO usar el helmetMiddleware de RASP, usar el de helmet directamente
  initializeRASP 
} from './rasp/RASPMiddleware';
import raspRouter from './rasp/RASPRouter';

const app = express();
app.disable('x-powered-by');
const PORT = process.env.PORT || 5000;

// ✅ CONFIGURACIÓN CORS (PRIMERO)
app.use(cors({
  origin: [
    'https://joyeria-diana-laura.vercel.app',
    'http://localhost:3000', 
    'https://joyeria-diana-laura-nqnq.onrender.com',
    'http://localhost:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization',
    'X-Session-Token'  
  ],
}));

app.options('*', cors());

// ✅ MIDDLEWARES BÁSICOS
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser()); 
app.use(metricsMiddleware);

// =============================================
// 🛡️ HELMET (IAST lo necesita) - Configuración que NO bloquea los dashboards
// =============================================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      scriptSrcAttr: ["'unsafe-inline'"],  // 👈 Permitir event handlers para los dashboards
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", "https:", "http://localhost:5000", "http://localhost:3000"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
}));

// =============================================
// 🛡️ MIDDLEWARES DE SEGURIDAD (RASP - sin helmet duplicado)
// =============================================
app.use(rateLimitMiddleware);   // RASP: Rate limiting
app.use(raspMiddleware);        // RASP: Detección activa
app.use(iastMiddleware);        // IAST: Monitoreo pasivo

// =============================================
// 📊 DASHBOARDS (IAST y RASP)
// =============================================
app.use('/iast', createIASTRouter());  // IAST Dashboard
app.use('/rasp', raspRouter);          // RASP Dashboard

// 🌟 Middleware condicional para rutas públicas/privadas
app.use((req, res, next) => {
  // 1. Permitir acceso público a ver productos y categorías
  if (req.path.startsWith('/api/products') && req.method === 'GET') {
    return next();
  }
  
  // 2. Permitir acceso público a VER noticias y configuración
  if (req.path.startsWith('/api/content') && req.method === 'GET') {
    return next();
  }
  
  // 3. Permitir acceso público a rutas de autenticación
  if (req.path.startsWith('/api/auth')) {
    return next();
  }

  if (req.path.startsWith('/api/backups')) {
    return next(); 
  }

  if (req.path.startsWith('/api/carrito/webhook')) {
    return next();
  }
  
  // 4. Aplicar middleware de cookies para el resto
  return cookieAuthMiddleware(req, res, next);
});

// =============================================
// 🚀 RUTAS DE LA API
// =============================================

app.use('/api/templates', templateRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/bulk-update', bulkUpdateRoutes);

// 🎯 ENDPOINTS DE DIAGNÓSTICO
app.get('/api/jwt-info', getTokenInfo);

app.get('/api/jwt-config', (req, res) => {
  res.json({
    success: true,
    data: {
      algorithm: 'HS256',
      expiresIn: '30d',
      issuer: 'joyeria-diana-laura-backend',
      audience: 'joyeria-diana-laura-frontend',
      secretLength: JWTConfig.getSecret().length,
      configValid: JWTConfig.getSecret().length >= 32
    }
  });
});

// 🆕 ENDPOINT PARA DEBUG - Verificar rol del usuario actual
app.get('/api/debug/my-role', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = (req as any).user?.id || (req as any).user?.userId;
    
    if (!userId) {
      return res.json({ 
        success: false, 
        message: 'No hay usuario en la request',
        userFromToken: req.user 
      });
    }

    const result = await pool.query('SELECT id, email, rol FROM usuarios WHERE id = $1', [userId]);
    
    res.json({
      success: true,
      data: {
        userId,
        userFromToken: req.user,
        userFromDB: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Error en debug/my-role:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    });
  }
});

// ✅ Rutas principales
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/security', securityQuestionRoutes);
app.use('/api/products', productRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/content', adminContentRoutes);
app.use('/api/import', importRoutes);
app.use('/api/backups', backupRoutes);
app.use('/api/carrito', carritoRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/configuracion', configuracionRoutes);
app.use('/api/proveedores', proveedoresRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/prediccion', predictiveRoutes);

// 🩺 ENDPOINTS DE SALUD
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: '🚀 Backend Diana Laura - API funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/db-test', async (req, res) => {
  const dbOk = await testConnection();
  res.json({
    success: dbOk,
    message: dbOk ? '✅ BD Conectada' : '❌ Error BD'
  });
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'Servidor funcionando' });
});

// Middleware de errores (debe ir al final)
app.use(expressErrorMiddleware);

// =============================================
// 🚀 INICIALIZACIÓN DEL SERVIDOR
// =============================================

app.listen(PORT, async () => {
  console.log(`\n🎯 Servidor en puerto ${PORT}`);
  console.log(`📊 Endpoints disponibles:`);
  console.log(`   🔐 Auth: http://localhost:${PORT}/api/auth`);
  console.log(`   👥 Users: http://localhost:${PORT}/api/users`);
  console.log(`   💎 Products: http://localhost:${PORT}/api/products`); 
  console.log(`   📰 Content: http://localhost:${PORT}/api/content`); 
  console.log(`   ❤️ Health: http://localhost:${PORT}/api/health`);
  console.log(`   🗄️ DB Test: http://localhost:${PORT}/api/db-test`);
  console.log(`   📤 Export: http://localhost:${PORT}/api/export`);
  console.log(`   🔄 Bulk Update: http://localhost:${PORT}/api/bulk-update`);
  console.log(`   🔍 Debug Role: http://localhost:${PORT}/api/debug/my-role`);
  console.log(`   🔐 IAST Dashboard: http://localhost:${PORT}/iast/dashboard`);
  console.log(`   🛡️ RASP Dashboard: http://localhost:${PORT}/rasp/dashboard`);
  console.log(`🔐 CORS Headers permitidos: Content-Type, Authorization, X-Session-Token`);
  console.log(`   🛠️ Admin: http://localhost:${PORT}/api/admin`);

  // 🎯 CONEXIÓN Y LIMPIEZA INICIAL
  try {
    const dbOk = await testConnection();
    if (dbOk) {
      console.log('✅ Base de datos conectada correctamente');
      await LoginSecurityService.cleanupExpiredLocks();
      await BackupSchedulerService.initialize();
    } else {
      console.log('❌ Error conectando a la base de datos');
    }
  } catch (error) {
    console.error('❌ Error en inicialización:', error);
  }

  const cloudinaryOk = await testCloudinaryConnection();
  if (cloudinaryOk) {
    console.log('✅ Cloudinary configurado correctamente');
  }
  
  setupErrorMonitoring();
  await cleanupOldLogs();
  initializeRASP();   // Inicializar RASP
  initializeIAST();   // Inicializar IAST
  
  console.log('=================================\n');
});