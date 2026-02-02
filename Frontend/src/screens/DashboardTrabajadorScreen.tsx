// Ruta: Joyeria-Diana-Laura/Frontend/src/screens/DashboardTrabajadorScreen.tsx

import React from "react";
import { useAuth } from "../contexts/AuthContext";
import DashboardLayout from "../components/DashboardLayout";

export default function DashboardTrabajadorScreen() {
  const { user } = useAuth();

  return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-8">
          <h1 className="text-4xl font-bold text-[#ecb2c3] mb-4">
            ¡Bienvenido Trabajador!
          </h1>
          <p className="text-xl text-gray-300 mb-6">
            Hola, <span className="font-semibold text-[#ecb2c3]">{user?.nombre || "Trabajador"}</span>
          </p>
          <p className="text-gray-400">
            Este es tu dashboard como trabajador de Joyería Diana Laura.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
