// Ruta: Frontend/src/components/AuthHeader.tsx
//
// Encabezado reducido para las pantallas de autenticación.
//
// Antes usaban el PublicHeader completo —con buscador, menú de siete
// secciones y botón de Acceso—, que distrae justo cuando la persona viene
// a hacer una sola cosa: entrar a su cuenta. (Y el botón de "Acceso" en la
// propia pantalla de acceso no tenía mucho sentido.)
//
// Queda el logo, que vuelve al inicio, y un enlace de salida discreto.

import React from "react";
import { Link } from "react-router-dom";
import { AiOutlineArrowLeft } from "react-icons/ai";
import "./AuthHeader.css";

interface Props {
  /** Texto del enlace de salida. Por defecto, volver a la tienda. */
  volverTexto?: string;
  /** Destino del enlace de salida. */
  volverA?: string;
}

const AuthHeader: React.FC<Props> = ({
  volverTexto = "Volver a la tienda",
  volverA = "/",
}) => (
  <header className="auth-header">
    <div className="auth-header-inner">
      <Link to="/" className="auth-header-marca">
        <span className="auth-header-iniciales">DL</span>
        <span className="auth-header-nombre">Diana Laura</span>
      </Link>

      <Link to={volverA} className="auth-header-volver">
        <AiOutlineArrowLeft size={14} aria-hidden="true" />
        <span>{volverTexto}</span>
      </Link>
    </div>
  </header>
);

export default AuthHeader;
