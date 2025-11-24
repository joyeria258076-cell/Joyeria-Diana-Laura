// Ruta:Joyeria-Diana-Laura/Frontend/src/navigation/AppRoutes.tsx

import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginScreen from "../screens/LoginScreen";
import RegistroScreen from "../screens/RegistroScreen";
import OlvideContraseniaScreen from "../screens/OlvideContraseniaScreen";
import ReiniciarContraseniaScreen from "../screens/ReiniciarContraseniaScreen";
import InicioScreen from "../screens/InicioScreen";
import PerfilScreen from "../screens/PerfilScreen";
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

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/registro" element={<RegistroScreen />} />
        <Route path="/olvide" element={<OlvideContraseniaScreen />} />
        <Route path="/reiniciar" element={<ReiniciarContraseniaScreen />} />

        {/* Rutas protegidas */}
        <Route
          path="/inicio"
          element={
            <ProtectedRoute>
              <InicioScreen />
            </ProtectedRoute>
          }
        />

            
        {/* Ruta de perfil */}
        <Route
          path="/perfil"
          element={
            <ProtectedRoute>
              <PerfilScreen />
            </ProtectedRoute>
          }
        />

        {/* Ruta por defecto */}
        <Route path="*" element={<Navigate to="/inicio" replace />} />
      </Routes>
    </BrowserRouter>
  );
}