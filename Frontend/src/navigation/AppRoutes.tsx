// Frontend/src/navigation/AppRoutes.tsx
import React, { useState, useEffect, Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import VisitorTracker from "../components/VisitorTracker";

// LAYOUTS
import { PrivateLayout } from "../components/PrivateLayout";

// PANTALLAS PÚBLICAS (Visitantes) — carga inmediata, son la puerta de entrada del sitio
import InicioPublicScreen from "../screens/publico/InicioPublicScreen";
import CatalogoPublicScreen from "../screens/publico/CatalogoPublicScreen";
import NoticiasScreen from "../screens/publico/NoticiasScreen";
import NoticiaDetalleScreen from "../screens/publico/NoticiaDetalleScreen";
import ContactoPublicScreen from "../screens/publico/ContactoPublicScreen";
import UbicacionPublicScreen from "../screens/publico/UbicacionPublicScreen";
import AyudaPublicScreen from "../screens/publico/AyudaPublicScreen";
import ProductoDetallePublicScreen from "../screens/publico/ProductoDetallePublicScreen";
import LegalScreen from "../screens/publico/LegalScreen";

// PANTALLAS DE AUTENTICACIÓN — también carga inmediata
import LoginScreen from "../screens/auth/LoginScreen";
import RegistroScreen from "../screens/auth/RegistroScreen";
import OlvideContraseniaScreen from "../screens/auth/OlvideContraseniaScreen";
import ReiniciarContraseniaScreen from "../screens/auth/ReiniciarContraseniaScreen";
import RecuperarConPreguntaScreen from '../screens/auth/RecuperarConPreguntaScreen';
import MFAVerifyScreen from "../screens/auth/MFAVerifyScreen";
import WorkerActivacionScreen from "../screens/auth/WorkerActivacionScreen";
import WorkerCodigoScreen from "../screens/auth/WorkerCodigoScreen";

// PANTALLAS DE ERROR — livianas, carga inmediata
import NotFoundScreen from '../screens/general/NotFoundScreen';
import ForbiddenScreen from '../screens/general/ForbiddenScreen';
import ServerErrorScreen from '../screens/general/ServerErrorScreen';

// ══════════════════════════════════════════════════════════════
// PANTALLAS PRIVADAS (requieren sesión) — carga diferida (lazy):
// un visitante anónimo (público o en /login) nunca descarga este
// código, que es la mayor parte del bundle (paneles admin/trabajador).
// ══════════════════════════════════════════════════════════════
const InicioScreen = lazy(() => import("../screens/cliente/InicioScreen"));
const PerfilScreen = lazy(() => import("../screens/cliente/PerfilScreen"));
const CatalogoScreen = lazy(() => import('../screens/cliente/CatalogoScreen'));
const MFASetupScreen = lazy(() => import("../screens/auth/MFASetupScreen"));
const SobreNosotros = lazy(() => import("../screens/cliente/SobreNosotros"));
const Ubicacion = lazy(() => import("../screens/cliente/UbicacionScreen"));
const Ayuda = lazy(() => import("../screens/cliente/AyudaScreen"));
const ContactoScreen = lazy(() => import("../screens/cliente/ContactoScreen"));
const ConfiguracionScreen = lazy(() => import('../screens/general/ConfiguracionScreen'));
const AdminDashboardScreen = lazy(() => import("../screens/admin/AdminDashboardScreen"));
const AdminContentManagerScreen = lazy(() => import("../screens/admin/contenido/AdminContentManagerScreen"));
const AdminPageContentInitialScreen = lazy(() => import("../screens/admin/contenido/AdminPageContentInitialScreen"));
const AdminPageContentNoticiasScreen = lazy(() => import("../screens/admin/contenido/AdminPageContentNoticiasScreen"));
const AdminContentInfoScreen = lazy(() => import("../screens/admin/contenido/AdminContentInfoScreen"));
const AdminContentFAQScreen = lazy(() => import("../screens/admin/contenido/AdminContentFAQScreen"));
const AdminContentZonasEntregaScreen = lazy(() => import("../screens/admin/contenido/AdminContentZonasEntregaScreen"));
const AdminPageEditorScreen = lazy(() => import("../screens/admin/contenido/AdminPageEditorScreen"));
const AdminContentMisionScreen = lazy(() => import("../screens/admin/contenido/AdminContentMisionScreen"));
const AdminPageManagementScreen = lazy(() => import("../screens/admin/contenido/AdminPageManagementScreen"));
const AdminSectionManagementScreen = lazy(() => import("../screens/admin/contenido/AdminSectionManagementScreen"));
const GestionPedidosScreen = lazy(() => import("../screens/trabajador/GestionPedidosScreen"));
const GestionApartadosScreen = lazy(() => import("../screens/trabajador/GestionApartadosScreen"));
const AdminEditarTrabajadorScreen = lazy(() => import("../screens/admin/AdminEditarTrabajadorScreen"));

// INVENTARIO Y PRODUCTOS
const AdminInventarioScreen = lazy(() => import('../screens/admin/AdminInventarioScreen'));
const AdminNuevoProductoScreen = lazy(() => import('../screens/admin/AdminNuevoProductoScreen'));
const AdminProductoDetalleScreen = lazy(() => import("../screens/admin/AdminProductoDetalleScreen"));
const AdminEditarProductoScreen = lazy(() => import("../screens/admin/AdminEditarProductoScreen"));

// PERSONAL Y REPORTES
const AdminTrabajadoresScreen = lazy(() => import("../screens/admin/AdminTrabajadoresScreen"));
const AdminAltaTrabajadorForm = lazy(() => import("../screens/admin/AdminAltaTrabajadorForm"));
const AdminPerfilScreen = lazy(() => import("../screens/admin/AdminPerfilScreen"));
const AdminReportesScreen = lazy(() => import("../screens/admin/AdminReportesScreen"));
const DashboardTrabajadorScreen = lazy(() => import("../screens/trabajador/DashboardTrabajadorScreen"));
const ActividadesTrabajadorScreen = lazy(() => import("../screens/trabajador/ActividadesTrabajadorScreen"));

// CATEGORÍAS
const AdminCategoriasScreen = lazy(() => import("../screens/admin/AdminCategoriasScreen"));
const AdminPromocionesScreen = lazy(() => import("../screens/admin/AdminPromocionesScreen"));
const AdminColeccionesScreen = lazy(() => import("../screens/admin/AdminColeccionesScreen"));

// 📁 PANTALLAS DE BASE DE DATOS
const AdminDatabaseScreen = lazy(() => import("../screens/admin/basedatos/AdminDatabaseScreen"));
const AdminBackupsScreen = lazy(() => import("../screens/admin/basedatos/AdminBackupsScreen"));
const AdminImportExportScreen = lazy(() => import("../screens/admin/basedatos/AdminImportExportScreen"));
const AdminAutomationScreen = lazy(() => import("../screens/admin/basedatos/AdminAutomationScreen"));
const AdminSimpleImportScreen = lazy(() => import("../screens/admin/basedatos/AdminSimpleImportScreen"));
const AdminExportScreen = lazy(() => import("../screens/admin/basedatos/AdminExportScreen"));
const AdminBulkUpdateScreen = lazy(() => import("../screens/admin/basedatos/AdminBulkUpdateScreen"));
const AdminMonitoreoScreen = lazy(() => import("../screens/admin/basedatos/AdminMonitoreoScreen"));

// 📁 PANTALLAS DE CONFIGURACIÓN
const AdminVariablesConfigScreen = lazy(() => import("../screens/admin/configuracion/AdminVariablesConfigScreen"));

// 📁 PANTALLAS DE PROVEEDORES
const AdminProveedoresScreen = lazy(() => import("../screens/admin/proveedores/AdminProveedoresScreen"));
const AdminNuevoProveedorScreen = lazy(() => import("../screens/admin/proveedores/AdminNuevoProveedorScreen"));
const AdminEditarProveedorScreen = lazy(() => import("../screens/admin/proveedores/AdminEditarProveedorScreen"));
const AdminProveedorDetalleScreen = lazy(() => import("../screens/admin/proveedores/AdminProveedorDetalleScreen"));

const AdminPrediccionScreen = lazy(() => import("../screens/admin/AdminPrediccionScreen"));
const AdminSegmentosScreen = lazy(() => import("../screens/admin/AdminSegmentosScreen"));
const AdminLegalScreen = lazy(() => import("../screens/admin/AdminLegalScreen"));
const AdminPersonalizacionVisualScreen = lazy(() => import("../screens/admin/AdminPersonalizacionVisualScreen"));

const ClientePedidosScreen = lazy(() => import("../screens/cliente/ClientePedidosScreen"));
const CarritoScreen = lazy(() => import("../screens/cliente/CarritoScreen"));
const MisApartadosScreen = lazy(() => import("../screens/cliente/MisApartadosScreen"));
const SolicitarPersonalizacionScreen = lazy(() => import("../screens/cliente/SolicitarPersonalizacionScreen"));
const MisPersonalizacionesScreen = lazy(() => import("../screens/cliente/MisPersonalizacionesScreen"));
const GestionPersonalizacionScreen = lazy(() => import("../screens/trabajador/GestionPersonalizacionScreen"));
const AdminMonitoreoOperacionScreen = lazy(() => import("../screens/admin/AdminMonitoreoOperacionScreen"));
const NotificacionesScreen = lazy(() => import("../screens/cliente/NotificacionesScreen"));
const MisFavoritosScreen = lazy(() => import("../screens/cliente/MisFavoritosScreen"));
const ProductoDetalleScreen = lazy(() => import("../screens/cliente/ProductoDetalleScreen"));

const PantallaCargando = () => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '100vh', fontSize: '1.5rem', fontWeight: 'bold',
    backgroundColor: '#0f0f12', color: '#ecb2c3'
  }}>
    ⏳ Cargando...
  </div>
);

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
      <VisitorTracker />
      <Suspense fallback={<PantallaCargando />}>
      <Routes>
        {/* 1. RUTAS COMPLETAMENTE PÚBLICAS */}
        <Route path="/" element={<InicioPublicScreen />} />
        <Route path="/catalogo-publico" element={<CatalogoPublicScreen />} />
        <Route path="/producto-publico/:id" element={<ProductoDetallePublicScreen />} />
        <Route path="/noticias" element={<NoticiasScreen />} />
        <Route path="/noticias/:id" element={<NoticiaDetalleScreen />} />
        <Route path="/contacto-publico" element={<ContactoPublicScreen />} />
        <Route path="/ubicacion-publica" element={<UbicacionPublicScreen />} />
        <Route path="/ayuda-publica" element={<AyudaPublicScreen />} />
        <Route path="/legal/:tipo" element={<LegalScreen />} />

        {/* 2. RUTAS DE AUTENTICACIÓN */}
        <Route path="/login" element={<PublicRoute><LoginScreen /></PublicRoute>} />
        <Route path="/registro" element={<PublicRoute><RegistroScreen /></PublicRoute>} />
        <Route path="/olvide" element={<PublicRoute><OlvideContraseniaScreen /></PublicRoute>} />
        <Route path="/reiniciar" element={<PublicRoute><ReiniciarContraseniaScreen /></PublicRoute>} />
        <Route path="/verify-mfa" element={<PublicRoute><MFAVerifyScreen /></PublicRoute>} />
        <Route path="/worker-activacion" element={<WorkerActivacionScreen />} />
        <Route path="/worker-codigo" element={<WorkerCodigoScreen />} />
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
          <Route path="/mis-apartados" element={<MisApartadosScreen />} />
          <Route path="/mis-personalizaciones" element={<MisPersonalizacionesScreen />} />
          <Route path="/notificaciones" element={<NotificacionesScreen />} />
          <Route path="/favoritos" element={<MisFavoritosScreen />} />
          <Route path="/producto/:id" element={<ProductoDetalleScreen />} />
          <Route path="/producto/:id/personalizar" element={<SolicitarPersonalizacionScreen />} />

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

            <Route path="/admin-prediccion"   element={<AdminPrediccionScreen />} />
            <Route path="/admin-segmentos"    element={<AdminSegmentosScreen />} />
            <Route path="/configuracion" element={<ConfiguracionScreen />} />

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
            <Route path="/admin-contenido/zonas-entrega"       element={<AdminContentZonasEntregaScreen />} />
            <Route path="/admin-contenido/editor-visual"       element={<AdminPageEditorScreen />} />
            <Route path="/admin-contenido/mision"             element={<AdminContentMisionScreen />} />

            {/* Rutas de inventario */}
            <Route path="/admin-inventario"              element={<AdminInventarioScreen />} />
            <Route path="/admin-nuevo-producto"          element={<AdminNuevoProductoScreen />} />
            <Route path="/admin-categorias"              element={<AdminCategoriasScreen />} />
            <Route path="/admin/promociones"             element={<AdminPromocionesScreen />} />
            <Route path="/admin/colecciones"             element={<AdminColeccionesScreen />} />
            <Route path="/admin-trabajadores"            element={<AdminTrabajadoresScreen />} />
            <Route path="/admin-trabajadores/nuevo"      element={<AdminAltaTrabajadorForm />} />
            <Route path="/admin-trabajadores/editar/:id" element={<AdminEditarTrabajadorScreen />} />
            <Route path="/admin-perfil"                  element={<AdminPerfilScreen />} />
            <Route path="/admin-reportes"                element={<AdminReportesScreen />} />
            <Route path="/admin-legal"                   element={<AdminLegalScreen />} />
            <Route path="/admin/personalizacion-visual"  element={<AdminPersonalizacionVisualScreen />} />
            <Route path="/admin/producto/:id"            element={<AdminProductoDetalleScreen />} />
            <Route path="/admin/editar-producto/:id"     element={<AdminEditarProductoScreen />} />
          </Route>

          {/* 🔐 RUTAS EXCLUSIVAS TRABAJADOR — el admin no toma/gestiona pedidos, apartados
              ni personalizaciones, solo las monitorea (ver ruta /admin/monitoreo-operacion) */}
          <Route element={<RoleRoute allowedRoles={['trabajador']} />}>
            <Route path="/dashboard-trabajador"       element={<DashboardTrabajadorScreen />} />
            <Route path="/pedidos-admin"              element={<GestionPedidosScreen />} />
            <Route path="/apartados-admin" element={<GestionApartadosScreen />} />
            <Route path="/personalizaciones-admin" element={<GestionPersonalizacionScreen />} />
            <Route path="/trabajador/actividades"     element={<ActividadesTrabajadorScreen />} />
            <Route path="/trabajador/perfil"          element={<PerfilScreen />} />
          </Route>

          {/* 🔐 RUTA EXCLUSIVA ADMIN — monitoreo de solo lectura */}
          <Route element={<RoleRoute allowedRoles={['admin']} />}>
            <Route path="/admin/monitoreo-operacion"  element={<AdminMonitoreoOperacionScreen />} />
          </Route>
        </Route>

        {/* 4. MANEJO DE ERRORES */}
        <Route path="/403" element={<ForbiddenScreen />} />
        <Route path="/500" element={<ServerErrorScreen />} />
        <Route path="*"    element={<NotFoundScreen />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
