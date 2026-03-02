// Ruta: Joyeria-Diana-Laura/Backend/src/server.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './config/database';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import { LoginSecurityService } from './services/loginSecurityService';
import securityQuestionRoutes from './routes/securityQuestionRoutes';
import { getTokenInfo } from './middleware/authMiddleware';
import { JWTConfig } from './config/jwtConfig';
import cookieParser from 'cookie-parser';
import { cookieAuthMiddleware } from './middleware/cookieMiddleware';
import productRoutes from './routes/productRoutes';
import adminRoutes from './routes/adminRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ CONFIGURACIÓN CORS CORREGIDA
app.use(cors({
  origin: [
    'https://joyeria-diana-laura.vercel.app',
    'http://localhost:3000', 
    'https://joyeria-diana-laura-nqnq.onrender.com',
    'http://localhost:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization',
    'X-Session-Token'  
  ],
}));

app.use(cookieParser()); 

// 🌟 SOLUCIÓN AL CATÁLOGO PÚBLICO: Middleware Condicional
app.use((req, res, next) => {
  // 1. Permitir acceso público a ver productos y categorías (Catálogo Público)
  if (req.path.startsWith('/api/products') && req.method === 'GET') {
    return next();
  }
  
  // 2. Permitir acceso público a las rutas de autenticación (Login, Registro, etc.)
  if (req.path.startsWith('/api/auth')) {
    return next();
  }
  
  // 3. Aplicar el candado de seguridad de cookies para todo el resto de la App
  return cookieAuthMiddleware(req, res, next);
});

// 🎯 ENDPOINT PARA DIAGNÓSTICO JWT
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

app.options('*', cors());

// ✅ LÍMITES AUMENTADOS PARA LAS IMÁGENES
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ✅ Rutas
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/security', securityQuestionRoutes);
app.use('/api/products', productRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: '🚀 Backend Diana Laura - Login & Users API',
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

app.listen(PORT, async () => {
  console.log(`🎯 Servidor en puerto ${PORT}`);
  console.log(`📊 Endpoints disponibles:`);
  console.log(`   🔐 Auth: http://localhost:${PORT}/api/auth`);
  console.log(`   👥 Users: http://localhost:${PORT}/api/users`);
  console.log(`   💎 Products: http://localhost:${PORT}/api/products`); 
  console.log(`   ❤️  Health: http://localhost:${PORT}/api/health`);
  console.log(`   🗄️  DB Test: http://localhost:${PORT}/api/db-test`);
  console.log(`🔐 CORS Headers permitidos: Content-Type, Authorization, X-Session-Token`);
  console.log(`   🛠️  Admin: http://localhost:${PORT}/api/admin`);

  // 🎯 CONEXIÓN Y LIMPIEZA INICIAL
  try {
    const dbOk = await testConnection();
    if (dbOk) {
      console.log('✅ Base de datos conectada correctamente');
      await LoginSecurityService.cleanupExpiredLocks();
    } else {
      console.log('❌ Error conectando a la base de datos');
    }
  } catch (error) {
    console.error('❌ Error en inicialización:', error);
  }
});