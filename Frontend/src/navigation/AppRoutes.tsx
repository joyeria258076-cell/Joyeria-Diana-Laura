// Ruta: Joyeria-Diana-Laura/Frontend/src/navigation/AppRoutes.tsx

import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

// LAYOUTS
import { PrivateLayout } from "../components/PrivateLayout";

// PANTALLAS PÚBLICAS (Visitantes)
import InicioPublicScreen from "../screens/InicioPublicScreen";
import CatalogoPublicScreen from "../screens/CatalogoPublicScreen";
import NoticiasScreen from "../screens/NoticiasScreen";
import ContactoPublicScreen from "../screens/ContactoPublicScreen";
import UbicacionPublicScreen from "../screens/UbicacionPublicScreen";
import AyudaPublicScreen from "../screens/AyudaPublicScreen";

// PANTALLAS DE AUTENTICACIÓN
import LoginScreen from "../screens/LoginScreen";
import RegistroScreen from "../screens/RegistroScreen";
import OlvideContraseniaScreen from "../screens/OlvideContraseniaScreen";
import ReiniciarContraseniaScreen from "../screens/ReiniciarContraseniaScreen";
import RecuperarConPreguntaScreen from '../screens/RecuperarConPreguntaScreen';
import MFAVerifyScreen from "../screens/MFAVerifyScreen";

// PANTALLAS PRIVADAS (Solo con Login)
import InicioScreen from "../screens/InicioScreen";
import PerfilScreen from "../screens/PerfilScreen";
import CatalogoScreen from '../screens/CatalogoScreen';
import MFASetupScreen from "../screens/MFASetupScreen";
import SobreNosotros from "../screens/SobreNosotros";
import Ubicacion from "../screens/UbicacionScreen";
import Ayuda from "../screens/AyudaScreen";
import ContactoScreen from "../screens/ContactoScreen";
import ConfiguracionScreen from '../screens/ConfiguracionScreen';
import AdminDashboardScreen from "../screens/AdminDashboardScreen";
import GestionPedidosScreen from "../screens/GestionPedidosScreen";
import AdminProductosScreen from '../screens/AdminProductosScreen'; 
import AdminTrabajadoresScreen from "../screens/AdminTrabajadoresScreen";
import AdminPerfilScreen from "../screens/AdminPerfilScreen";
import AdminReportesScreen from "../screens/AdminReportesScreen";
import DashboardTrabajadorScreen from "../screens/DashboardTrabajadorScreen";

// PANTALLAS DE ERROR
import NotFoundScreen from '../screens/NotFoundScreen';
import ForbiddenScreen from '../screens/ForbiddenScreen';
import ServerErrorScreen from '../screens/ServerErrorScreen';
import ClientePedidosScreen from "../screens/ClientePedidosScreen";

// --- COMPONENTES DE PROTECCIÓN ---
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-lg font-semibold bg-[#0f0f12] text-[#ecb2c3]">Cargando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-lg font-semibold bg-[#0f0f12] text-[#ecb2c3]">Cargando...</div>;
  if (user) {
    // 🆕 Redirigir según el rol del usuario
    console.log('🔐 Usuario detectado en PublicRoute. Rol:', user.rol);
    if (user.rol === 'admin') {
      return <Navigate to="/admin-dashboard" replace />;
    } else if (user.rol === 'trabajador') {
      return <Navigate to="/dashboard-trabajador" replace />;
    }
    return <Navigate to="/inicio" replace />;
  }
  return <>{children}</>;
};

export default function AppRoutes() {
  const { loading } = useAuth();
  const [forcedLoad, setForcedLoad] = useState(false);

  // Manejo de carga de seguridad (5 segundos)
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('⚠️ AuthContext tardó demasiado, forzando carga.');
        setForcedLoad(true);
      }
    }, 5000);
    return () => clearTimeout(timeout);
  }, [loading]);

  if (loading && !forcedLoad) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', fontSize: '1.5rem', fontWeight: 'bold',
        backgroundColor: '#0f0f12', color: '#ecb2c3'
      }}>
        ⏳ Cargando Diana Laura...
      </div>
    );
  }

  return (
    <BrowserRouter>
    
      <Routes>
        {/* 1. RUTAS COMPLETAMENTE PÚBLICAS */}
        <Route path="/" element={<InicioPublicScreen />} />
        <Route path="/catalogo-publico" element={<CatalogoPublicScreen />} />
        <Route path="/noticias" element={<NoticiasScreen />} />
        <Route path="/contacto-publico" element={<ContactoPublicScreen />} />
        <Route path="/ubicacion-publica" element={<UbicacionPublicScreen />} />
        <Route path="/ayuda-publica" element={<AyudaPublicScreen />} />

        {/* 2. RUTAS DE AUTENTICACIÓN (Solo si no estás logueado) */}
        <Route path="/login" element={<PublicRoute><LoginScreen /></PublicRoute>} />
        <Route path="/registro" element={<PublicRoute><RegistroScreen /></PublicRoute>} />
        <Route path="/olvide" element={<PublicRoute><OlvideContraseniaScreen /></PublicRoute>} />
        <Route path="/reiniciar" element={<PublicRoute><ReiniciarContraseniaScreen /></PublicRoute>} />
        <Route path="/verify-mfa" element={<PublicRoute><MFAVerifyScreen /></PublicRoute>} />
        <Route path="/recuperar-con-pregunta" element={<RecuperarConPreguntaScreen />} />

        {/* 3. RUTAS PROTEGIDAS (Con PrivateLayout / Sidebar) */}
        <Route
          element={
            <ProtectedRoute>
              <PrivateLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/inicio" element={<InicioScreen />} />
          <Route path="/perfil" element={<PerfilScreen />} />
          <Route path="/catalogo" element={<CatalogoScreen />} />
          <Route path="/mfa-setup" element={<MFASetupScreen />} />
          <Route path="/sobre-nosotros" element={<SobreNosotros />} />
          <Route path="/contacto" element={<ContactoScreen />} />
          <Route path="/ubicacion" element={<Ubicacion />} />
          <Route path="/ayuda" element={<Ayuda />} />
          <Route path="/pedidos" element={<ClientePedidosScreen />} />
          <Route path="/configuracion" element={<ConfiguracionScreen />} />
          <Route path="/admin-dashboard" element={<AdminDashboardScreen />} />
          <Route path="/pedidos-admin" element={<GestionPedidosScreen />} />
          <Route path="/admin-productos" element={<AdminProductosScreen />} />
          <Route path="/admin-trabajadores" element={<AdminTrabajadoresScreen />} />
          <Route path="/admin-perfil" element={<AdminPerfilScreen />} />
          <Route path="/admin-reportes" element={<AdminReportesScreen />} />
        </Route>

        {/* 3.5. DASHBOARDS PROTEGIDOS (Sin Layout / Sin Sidebar) */}
        <Route path="/dashboard-trabajador" element={<ProtectedRoute><DashboardTrabajadorScreen /></ProtectedRoute>} />

        {/* 4. MANEJO DE ERRORES */}
        <Route path="/403" element={<ForbiddenScreen />} />
        <Route path="/500" element={<ServerErrorScreen />} />
        <Route path="*" element={<NotFoundScreen />} />
      </Routes>
    </BrowserRouter>
  );
}