// Ruta: Joyeria-Diana-Laura/Frontend/src/screens/DashboardAdminScreen.tsx

import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function DashboardAdminScreen() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-700 to-pink-600">
      <div className="text-center p-12 bg-black bg-opacity-60 rounded-xl">
        <h1 className="text-6xl font-bold text-pink-400 mb-6">
          👨‍💼 ¡Bienvenido Admin!
        </h1>
        <p className="text-2xl text-white mb-4">
          Hola, <span className="font-bold text-pink-300">{user?.nombre || "Admin"}</span>
        </p>
        <p className="text-lg text-gray-300 mb-10">
          Panel de administración - Acceso total al sistema
        </p>
        
        <button
          onClick={handleLogout}
          className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-lg rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
        >
          🚪 Cerrar sesión
        </button>
      </div>
    </div>
  );
}
