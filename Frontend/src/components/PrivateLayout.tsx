// Ruta: src/components/PrivateLayout.tsx
import React from "react";
import { Outlet } from "react-router-dom";
import HeaderPrivado from "./HeaderPrivado";
import FooterPrivado from "./FooterPrivado"; 
import "../styles/PrivateLayout.css"; 
import Breadcrumbs from "./Breadcrumbs";

export const PrivateLayout: React.FC = () => {
  return (
    <div className="app-private-wrapper">
      {/* 1. Este va a la Columna 1 (Sidebar) */}
      <HeaderPrivado /> 
      <Breadcrumbs />
      {/* 2. Este va a la Columna 2, Fila 2 (Contenido) */}
      <main className="content-area">
        <div className="page-container">
            <Outlet /> 
        </div>
        <FooterPrivado /> 
      </main>
    </div>
  );
};