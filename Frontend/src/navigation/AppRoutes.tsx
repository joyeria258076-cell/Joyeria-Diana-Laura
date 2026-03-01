import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

// LAYOUTS
import { PrivateLayout } from "../components/PrivateLayout";

// PANTALLAS PÚBLICAS (Visitantes)
import InicioPublicScreen from "../screens/publico/InicioPublicScreen";
import CatalogoPublicScreen from "../screens/publico/CatalogoPublicScreen";
import NoticiasScreen from "../screens/publico/NoticiasScreen";
import ContactoPublicScreen from "../screens/publico/ContactoPublicScreen";
import UbicacionPublicScreen from "../screens/publico/UbicacionPublicScreen";
import AyudaPublicScreen from "../screens/publico/AyudaPublicScreen";

// PANTALLAS DE AUTENTICACIÓN
import LoginScreen from "../screens/auth/LoginScreen";
import RegistroScreen from "../screens/auth/RegistroScreen";
import OlvideContraseniaScreen from "../screens/auth/OlvideContraseniaScreen";
import ReiniciarContraseniaScreen from "../screens/auth/ReiniciarContraseniaScreen";
import RecuperarConPreguntaScreen from '../screens/auth/RecuperarConPreguntaScreen';
import MFAVerifyScreen from "../screens/auth/MFAVerifyScreen";

// PANTALLAS PRIVADAS (Solo con Login)
import InicioScreen from "../screens/cliente/InicioScreen";
import PerfilScreen from "../screens/cliente/PerfilScreen";
import CatalogoScreen from '../screens/cliente/CatalogoScreen';

import MFASetupScreen from "../screens/auth/MFASetupScreen";
import SobreNosotros from "../screens/cliente/SobreNosotros";
import Ubicacion from "../screens/cliente/UbicacionScreen";
import Ayuda from "../screens/cliente/AyudaScreen";
import ContactoScreen from "../screens/cliente/ContactoScreen";
import ConfiguracionScreen from '../screens/general/ConfiguracionScreen';
import AdminDashboardScreen from "../screens/admin/AdminDashboardScreen";
import AdminContentManagerScreen from "../screens/admin/contenido/AdminContentManagerScreen";
import AdminContentInicioScreen from "../screens/admin/contenido/AdminContentInicioScreen";
import AdminContentNoticiasScreen from "../screens/admin/contenido/AdminContentNoticiasScreen";
import AdminContentInfoScreen from "../screens/admin/contenido/AdminContentInfoScreen";
import AdminContentFAQScreen from "../screens/admin/contenido/AdminContentFAQScreen";
import AdminContentMisionScreen from "../screens/admin/contenido/AdminContentMisionScreen";
import GestionPedidosScreen from "../screens/trabajador/GestionPedidosScreen";

// 🌟 NUEVAS PANTALLAS IMPORTADAS (Reemplazan a AdminProductosScreen)
import AdminInventarioScreen from '../screens/admin/AdminInventarioScreen';
import AdminNuevoProductoScreen from '../screens/admin/AdminNuevoProductoScreen';

import AdminTrabajadoresScreen from "../screens/admin/AdminTrabajadoresScreen";
import AdminAltaTrabajadorForm from "../screens/admin/AdminAltaTrabajadorForm";
import AdminPerfilScreen from "../screens/admin/AdminPerfilScreen";
import AdminReportesScreen from "../screens/admin/AdminReportesScreen";
import DashboardTrabajadorScreen from "../screens/trabajador/DashboardTrabajadorScreen";

// 🌟 NUEVA PANTALLA IMPORTADA PARA CATEGORÍAS
import AdminCategoriasScreen from "../screens/admin/AdminCategoriasScreen";

// PANTALLAS DE ERROR
import NotFoundScreen from '../screens/general/NotFoundScreen';
import ForbiddenScreen from '../screens/general/ForbiddenScreen';
import ServerErrorScreen from '../screens/general/ServerErrorScreen';
import ClientePedidosScreen from "../screens/cliente/ClientePedidosScreen";

// --- COMPONENTES DE PROTECCIÓN ---

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-lg font-semibold bg-[#0f0f12] text-[#ecb2c3]">Cargando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

// 🆕 RoleRoute corregido para funcionar como Wrapper de Rutas Anidadas
const RoleRoute: React.FC<{ allowedRoles: string[] }> = ({ allowedRoles }) => {
  const { user } = useAuth();
  if (!user || !allowedRoles.includes(user.rol || '')) {
    return <Navigate to="/403" replace />;
  }
  return <Outlet />; // Esto permite renderizar las rutas hijas
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-lg font-semibold bg-[#0f0f12] text-[#ecb2c3]">Cargando...</div>;
  if (user) {
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

        {/* 2. RUTAS DE AUTENTICACIÓN */}
        <Route path="/login" element={<PublicRoute><LoginScreen /></PublicRoute>} />
        <Route path="/registro" element={<PublicRoute><RegistroScreen /></PublicRoute>} />
        <Route path="/olvide" element={<PublicRoute><OlvideContraseniaScreen /></PublicRoute>} />
        <Route path="/reiniciar" element={<PublicRoute><ReiniciarContraseniaScreen /></PublicRoute>} />
        <Route path="/verify-mfa" element={<PublicRoute><MFAVerifyScreen /></PublicRoute>} />
        <Route path="/recuperar-con-pregunta" element={<RecuperarConPreguntaScreen />} />

        {/* 3. RUTAS PROTEGIDAS (Con PrivateLayout) */}
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

          {/* 🔐 RUTAS EXCLUSIVAS ADMIN */}
          <Route element={<RoleRoute allowedRoles={['admin']} />}>
            <Route path="/admin-dashboard" element={<AdminDashboardScreen />} />
            <Route path="/admin-contenido" element={<AdminContentManagerScreen />} />
            <Route path="/admin-contenido/inicio" element={<AdminContentInicioScreen />} />
            <Route path="/admin-contenido/noticias" element={<AdminContentNoticiasScreen />} />
            <Route path="/admin-contenido/info" element={<AdminContentInfoScreen />} />
            <Route path="/admin-contenido/faq" element={<AdminContentFAQScreen />} />
            <Route path="/admin-contenido/mision" element={<AdminContentMisionScreen />} />
            
            {/* 🌟 RUTAS SEPARADAS DE INVENTARIO Y NUEVO PRODUCTO */}
            <Route path="/admin-inventario" element={<AdminInventarioScreen />} />
            <Route path="/admin-nuevo-producto" element={<AdminNuevoProductoScreen />} />
            
            {/* 🌟 RUTA PARA CATEGORÍAS */}
            <Route path="/admin-categorias" element={<AdminCategoriasScreen />} />
            
            <Route path="/admin-trabajadores" element={<AdminTrabajadoresScreen />} />
            <Route path="/admin-trabajadores/nuevo" element={<AdminAltaTrabajadorForm />} />
            <Route path="/admin-perfil" element={<AdminPerfilScreen />} />
            <Route path="/admin-reportes" element={<AdminReportesScreen />} />
          </Route>

          {/* 🔐 RUTAS EXCLUSIVAS TRABAJADOR / ADMIN */}
          <Route element={<RoleRoute allowedRoles={['trabajador', 'admin']} />}>
             <Route path="/pedidos-admin" element={<GestionPedidosScreen />} />
          </Route>
        </Route>

        {/* DASHBOARDS PROTEGIDOS (Sin Sidebar) */}
        <Route path="/dashboard-trabajador" element={
            <ProtectedRoute>
                <DashboardTrabajadorScreen />
            </ProtectedRoute>
        } />

        {/* 4. MANEJO DE ERRORES */}
        <Route path="/403" element={<ForbiddenScreen />} />
        <Route path="/500" element={<ServerErrorScreen />} />
        <Route path="*" element={<NotFoundScreen />} />
      </Routes>
    </BrowserRouter>
  );
}