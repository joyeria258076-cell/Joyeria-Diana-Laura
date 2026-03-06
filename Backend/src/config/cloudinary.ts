// Backend/src/config/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configuración de Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Verificar conexión
export const testCloudinaryConnection = async (): Promise<boolean> => {
  try {
    const result = await cloudinary.api.ping();
    console.log('✅ Conexión exitosa con Cloudinary');
    return true;
  } catch (error) {
    console.error('❌ Error conectando a Cloudinary:', error);
    return false;
  }
};

export default cloudinary;