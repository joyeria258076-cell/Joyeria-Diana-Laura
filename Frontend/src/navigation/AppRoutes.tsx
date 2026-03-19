// Frontend/src/navigation/AppRoutes.tsx
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
import ProductoDetallePublicScreen from "../screens/publico/ProductoDetallePublicScreen";

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
import AdminPageContentInitialScreen from "../screens/admin/contenido/AdminPageContentInitialScreen";
import AdminPageContentNoticiasScreen from "../screens/admin/contenido/AdminPageContentNoticiasScreen";
import AdminContentInfoScreen from "../screens/admin/contenido/AdminContentInfoScreen";
import AdminContentFAQScreen from "../screens/admin/contenido/AdminContentFAQScreen";
import AdminContentMisionScreen from "../screens/admin/contenido/AdminContentMisionScreen";
import AdminPageManagementScreen from "../screens/admin/contenido/AdminPageManagementScreen";
import AdminSectionManagementScreen from "../screens/admin/contenido/AdminSectionManagementScreen";
import GestionPedidosScreen from "../screens/trabajador/GestionPedidosScreen";
import AdminEditarTrabajadorScreen from "../screens/admin/AdminEditarTrabajadorScreen";

// INVENTARIO Y PRODUCTOS
import AdminInventarioScreen from '../screens/admin/AdminInventarioScreen';
import AdminNuevoProductoScreen from '../screens/admin/AdminNuevoProductoScreen';
import AdminProductoDetalleScreen from "../screens/admin/AdminProductoDetalleScreen";
import AdminEditarProductoScreen from "../screens/admin/AdminEditarProductoScreen";

// PERSONAL Y REPORTES
import AdminTrabajadoresScreen from "../screens/admin/AdminTrabajadoresScreen";
import AdminAltaTrabajadorForm from "../screens/admin/AdminAltaTrabajadorForm";
import AdminPerfilScreen from "../screens/admin/AdminPerfilScreen";
import AdminReportesScreen from "../screens/admin/AdminReportesScreen";
import DashboardTrabajadorScreen from "../screens/trabajador/DashboardTrabajadorScreen";
import ActividadesTrabajadorScreen from "../screens/trabajador/ActividadesTrabajadorScreen";

// CATEGORÍAS
import AdminCategoriasScreen from "../screens/admin/AdminCategoriasScreen";

// 📁 PANTALLAS DE BASE DE DATOS
import AdminDatabaseScreen from "../screens/admin/basedatos/AdminDatabaseScreen";
import AdminBackupsScreen from "../screens/admin/basedatos/AdminBackupsScreen";
import AdminImportExportScreen from "../screens/admin/basedatos/AdminImportExportScreen";
import AdminAutomationScreen from "../screens/admin/basedatos/AdminAutomationScreen";
import AdminSimpleImportScreen from "../screens/admin/basedatos/AdminSimpleImportScreen";
import AdminExportScreen from "../screens/admin/basedatos/AdminExportScreen";
import AdminBulkUpdateScreen from "../screens/admin/basedatos/AdminBulkUpdateScreen";

// ✅ NUEVO: Pantalla de monitoreo
import AdminMonitoreoScreen from "../screens/admin/basedatos/AdminMonitoreoScreen";

// 📁 PANTALLAS DE CONFIGURACIÓN
import AdminVariablesConfigScreen from "../screens/admin/configuracion/AdminVariablesConfigScreen";

// 📁 PANTALLAS DE PROVEEDORES
import AdminProveedoresScreen from "../screens/admin/proveedores/AdminProveedoresScreen";
import AdminNuevoProveedorScreen from "../screens/admin/proveedores/AdminNuevoProveedorScreen";
import AdminEditarProveedorScreen from "../screens/admin/proveedores/AdminEditarProveedorScreen";
import AdminProveedorDetalleScreen from "../screens/admin/proveedores/AdminProveedorDetalleScreen";

// PANTALLAS DE ERROR
import NotFoundScreen from '../screens/general/NotFoundScreen';
import ForbiddenScreen from '../screens/general/ForbiddenScreen';
import ServerErrorScreen from '../screens/general/ServerErrorScreen';
import ClientePedidosScreen from "../screens/cliente/ClientePedidosScreen";
import CarritoScreen from "../screens/cliente/CarritoScreen";
import ProductoDetalleScreen from "../screens/cliente/ProductoDetalleScreen";


// --- COMPONENTES DE PROTECCIÓN ---

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-lg font-semibold bg-[#0f0f12] text-[#ecb2c3]">Cargando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const RoleRoute: React.FC<{ allowedRoles: string[] }> = ({ allowedRoles }) => {
  const { user } = useAuth();
  const userRole = user?.rol?.toLowerCase().trim() || '';
  if (!user || !allowedRoles.includes(userRole)) {
    return <Navigate to="/403" replace />;
  }
  return <Outlet />;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-lg font-semibold bg-[#0f0f12] text-[#ecb2c3]">Cargando...</div>;
  if (user) {
    const userRole = user.rol?.toLowerCase().trim();
    if (userRole === 'admin') return <Navigate to="/admin-dashboard" replace />;
    if (userRole === 'trabajador') return <Navigate to="/dashboard-trabajador" replace />;
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
        <Route path="/producto-publico/:id" element={<ProductoDetallePublicScreen />} />
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
          {/* --- RUTAS PARA TODOS LOS USUARIOS LOGUEADOS --- */}
          <Route path="/inicio" element={<InicioScreen />} />
          <Route path="/perfil" element={<PerfilScreen />} />
          <Route path="/catalogo" element={<CatalogoScreen />} />
          <Route path="/mfa-setup" element={<MFASetupScreen />} />
          <Route path="/sobre-nosotros" element={<SobreNosotros />} />
          <Route path="/contacto" element={<ContactoScreen />} />
          <Route path="/ubicacion" element={<Ubicacion />} />
          <Route path="/ayuda" element={<Ayuda />} />
          <Route path="/pedidos" element={<ClientePedidosScreen />} />
          <Route path="/carrito" element={<CarritoScreen />} />
          <Route path="/producto/:id" element={<ProductoDetalleScreen />} />
          <Route path="/configuracion" element={<ConfiguracionScreen />} />

          {/* 🔐 RUTAS EXCLUSIVAS ADMIN */}
          <Route element={<RoleRoute allowedRoles={['admin']} />}>
            <Route path="/admin-dashboard" element={<AdminDashboardScreen />} />

            {/* 📁 RUTAS DE BASE DE DATOS */}
            <Route path="/admin-database"     element={<AdminDatabaseScreen />} />
            <Route path="/admin-backups"      element={<AdminBackupsScreen />} />
            <Route path="/admin-import-export" element={<AdminImportExportScreen />} />
            <Route path="/admin-automation"   element={<AdminAutomationScreen />} />
            <Route path="/admin/importar"     element={<AdminSimpleImportScreen />} />
            <Route path="/admin/exportar" element={<AdminExportScreen />} />
            <Route path="/admin/actualizacion-masiva" element={<AdminBulkUpdateScreen />} />
            <Route path="/admin/importar-csv" element={<AdminSimpleImportScreen />} />
            {/* ✅ NUEVO */}
            <Route path="/admin-monitoreo"    element={<AdminMonitoreoScreen />} />

            {/* 📁 RUTAS DE CONFIGURACIÓN */}
            <Route path="/admin/configuracion/variables" element={<AdminVariablesConfigScreen />} />

            {/* 📁 RUTAS DE PROVEEDORES */}
            <Route path="/admin/proveedores"            element={<AdminProveedoresScreen />} />
            <Route path="/admin/proveedor/nuevo"        element={<AdminNuevoProveedorScreen />} />
            <Route path="/admin/proveedor/:id"          element={<AdminProveedorDetalleScreen />} />
            <Route path="/admin/editar-proveedor/:id"   element={<AdminEditarProveedorScreen />} />

            {/* Rutas de contenido */}
            <Route path="/admin-contenido"                    element={<AdminContentManagerScreen />} />
            <Route path="/admin-contenido/paginas"            element={<AdminPageManagementScreen />} />
            <Route path="/admin-contenido/secciones"          element={<AdminSectionManagementScreen />} />
            <Route path="/admin-contenido/pagina-inicio"      element={<AdminPageContentInitialScreen />} />
            <Route path="/admin-contenido/pagina-noticias"    element={<AdminPageContentNoticiasScreen />} />
            <Route path="/admin-contenido/info"               element={<AdminContentInfoScreen />} />
            <Route path="/admin-contenido/faq"                element={<AdminContentFAQScreen />} />
            <Route path="/admin-contenido/mision"             element={<AdminContentMisionScreen />} />

            {/* Rutas de inventario */}
            <Route path="/admin-inventario"              element={<AdminInventarioScreen />} />
            <Route path="/admin-nuevo-producto"          element={<AdminNuevoProductoScreen />} />
            <Route path="/admin-categorias"              element={<AdminCategoriasScreen />} />
            <Route path="/admin-trabajadores"            element={<AdminTrabajadoresScreen />} />
            <Route path="/admin-trabajadores/nuevo"      element={<AdminAltaTrabajadorForm />} />
            <Route path="/admin-trabajadores/editar/:id" element={<AdminEditarTrabajadorScreen />} />
            <Route path="/admin-perfil"                  element={<AdminPerfilScreen />} />
            <Route path="/admin-reportes"                element={<AdminReportesScreen />} />
            <Route path="/admin/producto/:id"            element={<AdminProductoDetalleScreen />} />
            <Route path="/admin/editar-producto/:id"     element={<AdminEditarProductoScreen />} />
          </Route>

          {/* 🔐 RUTAS EXCLUSIVAS TRABAJADOR / ADMIN */}
          <Route element={<RoleRoute allowedRoles={['trabajador', 'admin']} />}>
            <Route path="/dashboard-trabajador"       element={<DashboardTrabajadorScreen />} />
            <Route path="/pedidos-admin"              element={<GestionPedidosScreen />} />
            <Route path="/trabajador/actividades"     element={<ActividadesTrabajadorScreen />} />
            <Route path="/trabajador/configuracion"   element={<ConfiguracionScreen />} />
            <Route path="/trabajador/perfil"          element={<PerfilScreen />} />
          </Route>
        </Route>

        {/* 4. MANEJO DE ERRORES */}
        <Route path="/403" element={<ForbiddenScreen />} />
        <Route path="/500" element={<ServerErrorScreen />} />
        <Route path="*"    element={<NotFoundScreen />} />
      </Routes>
    </BrowserRouter>
  );
}