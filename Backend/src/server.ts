import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './config/database';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';

// Cargar variables de entorno según el entorno
if (process.env.NODE_ENV === 'production') {
  dotenv.config({ path: '.env.production' });
} else {
  dotenv.config();
}

const app = express();
const PORT = process.env.PORT || 5000;

// Configuración de CORS para producción
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Health check endpoint para Render
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: '🚀 Backend Diana Laura - Login & Users API',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/db-test', async (req, res) => {
  const dbOk = await testConnection();
  res.json({
    success: dbOk,
    message: dbOk ? '✅ BD Conectada' : '❌ Error BD',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Iniciar servidor
app.listen(PORT, async () => {
  console.log(`🎯 Servidor ejecutándose en puerto ${PORT}`);
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Endpoints disponibles:`);
  console.log(`   🔐 Auth: https://localhost:${PORT}/api/auth`);
  console.log(`   👥 Users: https://localhost:${PORT}/api/users`);
  console.log(`   ❤️  Health: https://localhost:${PORT}/api/health`);
  console.log(`   🗄️  DB Test: https://localhost:${PORT}/api/db-test`);
  
  // Probar conexión a BD
  await testConnection();
});