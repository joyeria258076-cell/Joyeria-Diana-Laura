// Ruta: Joyeria-Diana-Laura/Backend/src/server.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './config/database';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import { LoginSecurityService } from './services/loginSecurityService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ SOLO UNA CONFIGURACIÓN CORS
app.use(cors({
  origin: [
    'https://joyeria-diana-laura.vercel.app',
    'http://localhost:3000', 
    'https://joyeria-diana-laura-nqnq.onrender.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ✅ SOLO UN express.json()
app.use(express.json());

// ✅ Rutas
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

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
  console.log(`   ❤️  Health: http://localhost:${PORT}/api/health`);
  console.log(`   🗄️  DB Test: http://localhost:${PORT}/api/db-test`);
  
  // 🎯 CONEXIÓN Y LIMPIEZA INICIAL
  try {
    const dbOk = await testConnection();
    if (dbOk) {
      console.log('✅ Base de datos conectada correctamente');
      
      // 🎯 AQUÍ VA LA LÍNEA QUE MENCIONASTE - después de testConnection()
      // Limpiar bloqueos expirados al iniciar
      await LoginSecurityService.cleanupExpiredLocks();
      
    } else {
      console.log('❌ Error conectando a la base de datos');
    }
  } catch (error) {
    console.error('❌ Error en inicialización:', error);
  }
});