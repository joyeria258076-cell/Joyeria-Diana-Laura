// Ruta: src/components/PrivateLayout.tsx
import React from "react";
import { Outlet } from "react-router-dom";
import HeaderPrivado from "./HeaderPrivado";
import FooterPrivado from "./FooterPrivado"; 
import "../styles/PrivateLayout.css"; 
import Breadcrumbs from "./Breadcrumbs";
import { useAuth } from "../contexts/AuthContext";
import "../styles/AdminV2.css";
import "../styles/AdminSkin.css";
import "../styles/TrabajadorV5.css";
import "../styles/AdminV5.css";

export const PrivateLayout: React.FC = () => {
  const { user } = useAuth();
  // Las pantallas del admin llevan una capa de estilo común (styles/AdminSkin.css)
  const esAdmin = user?.rol === "admin";
  const esTrabajador = user?.rol === "trabajador";
  return (
    <div className="app-private-wrapper">
      {/* 1. Este va a la Columna 1 (Sidebar) */}
      <HeaderPrivado /> 
      <Breadcrumbs />
      {/* 2. Este va a la Columna 2, Fila 2 (Contenido) */}
      <main className={`content-area${esAdmin ? " admin-skin" : ""}${esTrabajador ? " trabajador-skin" : ""}`}>
        <div className="page-container">
            <Outlet /> 
        </div>
        <FooterPrivado /> 
      </main>
    </div>
  );
};