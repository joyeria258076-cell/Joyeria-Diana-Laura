// Ruta:Joyeria-Diana-Laura/Frontend/src/navigation/AppRoutes.tsx

import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginScreen from "../screens/LoginScreen";
import RegistroScreen from "../screens/RegistroScreen";
import OlvideContraseniaScreen from "../screens/OlvideContraseniaScreen";
import ReiniciarContraseniaScreen from "../screens/ReiniciarContraseniaScreen";
import InicioScreen from "../screens/InicioScreen";
import PerfilScreen from "../screens/PerfilScreen";
import RecuperarConPreguntaScreen from '../screens/RecuperarConPreguntaScreen';
// 🆕 PANTALLAS MFA
import MFAVerifyScreen from "../screens/MFAVerifyScreen";
import MFASetupScreen from "../screens/MFASetupScreen";
import { useAuth } from "../contexts/AuthContext";

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-lg font-semibold">
        Cargando...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// 🆕 COMPONENTE PARA RUTAS PÚBLICAS (cuando NO hay usuario)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-lg font-semibold">
        Cargando...
      </div>
    );
  }

  if (user) {
    return <Navigate to="/inicio" replace />;
  }

  return <>{children}</>;
};

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 🆕 RUTAS PÚBLICAS (solo para usuarios NO autenticados) */}
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <LoginScreen />
            </PublicRoute>
          } 
        />
        <Route 
          path="/registro" 
          element={
            <PublicRoute>
              <RegistroScreen />
            </PublicRoute>
          } 
        />
        <Route 
          path="/olvide" 
          element={
            <PublicRoute>
              <OlvideContraseniaScreen />
            </PublicRoute>
          } 
        />
        <Route 
          path="/reiniciar" 
          element={
            <PublicRoute>
              <ReiniciarContraseniaScreen />
            </PublicRoute>
          } 
        />
        
        {/* 🆕 RUTA MFA VERIFICACIÓN (pública - para completar login) */}
        <Route 
          path="/verify-mfa" 
          element={
            <PublicRoute>
              <MFAVerifyScreen />
            </PublicRoute>
          } 
        />

        {/* 🆕 RUTAS PROTEGIDAS (solo para usuarios autenticados) */}
        <Route
          path="/inicio"
          element={
            <ProtectedRoute>
              <InicioScreen />
            </ProtectedRoute>
          }
        />

        <Route
          path="/perfil"
          element={
            <ProtectedRoute>
              <PerfilScreen />
            </ProtectedRoute>
          }
        />

        {/* 🆕 RUTA MFA SETUP (protegida - para configurar MFA) */}
        <Route
          path="/mfa-setup"
          element={
            <ProtectedRoute>
              <MFASetupScreen />
            </ProtectedRoute>
          }
        />

        <Route path="/recuperar-con-pregunta" element={<RecuperarConPreguntaScreen />} />

        {/* 🆕 RUTA POR DEFECTO */}
        <Route path="/" element={<Navigate to="/inicio" replace />} />
        
        {/* 🆕 RUTA 404 */}
        <Route path="*" element={<div>Página no encontrada</div>} />
      </Routes>
    </BrowserRouter>
  );
}