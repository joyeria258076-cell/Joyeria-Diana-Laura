// Ruta:Joyeria-Diana-Laura/Frontend/src/navigation/AppRoutes.tsx

import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginScreen from "../screens/LoginScreen";
import RegistroScreen from "../screens/RegistroScreen";
import OlvideContraseniaScreen from "../screens/OlvideContraseniaScreen";
import ReiniciarContraseniaScreen from "../screens/ReiniciarContraseniaScreen";
import InicioScreen from "../screens/InicioScreen";
import { useAuth } from "../contexts/AuthContext";

// 🎯 NUEVO: Componente para rutas públicas que redirige si está autenticado
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-lg font-semibold">
        Cargando...
      </div>
    );
  }

  // 🎯 Si ya está autenticado, redirigir a inicio
  if (user) {
    console.log('🔄 Usuario autenticado detectado en ruta pública - Redirigiendo a /inicio');
    return <Navigate to="/inicio" replace />;
  }

  return <>{children}</>;
};

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

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 🎯 RUTAS PÚBLICAS MODIFICADAS - Ahora usan PublicRoute */}
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

        {/* Rutas protegidas (se mantienen igual) */}
        <Route
          path="/inicio"
          element={
            <ProtectedRoute>
              <InicioScreen />
            </ProtectedRoute>
          }
        />

        {/* Ruta por defecto */}
        <Route path="*" element={<Navigate to="/inicio" replace />} />
      </Routes>
    </BrowserRouter>
  );
}