// Ruta: Joyeria-Diana-Laura/Frontend/src/screens/PerfilScreen.tsx

import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import "../styles/PerfilScreen.css";

// Tipo para las sesiones activas
interface SesionActiva {
  id: string;
  dispositivo: string;
  ubicacion: string;
  fechaInicio: string;
  ultimaActividad: string;
  esDispositivoActual: boolean;
}

export default function PerfilScreen() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sesionesActivas, setSesionesActivas] = useState<SesionActiva[]>([]);
  const [cargando, setCargando] = useState(true);

  // Datos de ejemplo para las sesiones activas
  useEffect(() => {
    // Simular carga de sesiones activas
    const sesionesEjemplo: SesionActiva[] = [
      {
        id: "1",
        dispositivo: "Chrome en Windows",
        ubicacion: "Ciudad de México, MX",
        fechaInicio: "2024-01-15T10:30:00Z",
        ultimaActividad: "Hace 5 minutos",
        esDispositivoActual: true
      },
      {
        id: "2", 
        dispositivo: "Safari en iPhone",
        ubicacion: "Ciudad de México, MX",
        fechaInicio: "2024-01-14T15:20:00Z",
        ultimaActividad: "Hace 2 horas",
        esDispositivoActual: false
      },
      {
        id: "3",
        dispositivo: "Firefox en Mac",
        ubicacion: "Guadalajara, MX",
        fechaInicio: "2024-01-13T09:15:00Z",
        ultimaActividad: "Hace 1 día",
        esDispositivoActual: false
      }
    ];

    setTimeout(() => {
      setSesionesActivas(sesionesEjemplo);
      setCargando(false);
    }, 1000);
  }, []);

  const handleCerrarSesionDispositivo = (sesionId: string) => {
    // Lógica para cerrar sesión en dispositivo específico
    console.log("Cerrando sesión en dispositivo:", sesionId);
    setSesionesActivas(prev => prev.filter(sesion => sesion.id !== sesionId));
  };

  const handleCerrarTodasLasSesiones = async () => {
    // Lógica para cerrar todas las sesiones
    console.log("Cerrando todas las sesiones...");
    // Aquí llamaremos al backend para revocar todos los tokens
    await logout(); // Por ahora usamos el logout normal
  };

  const handleCerrarSesionActual = async () => {
    await logout();
  };

  return (
    <div className="perfil-container">
      {/* Header igual al InicioScreen */}
      <header className="perfil-header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-initials">DL</span>
            <span className="logo-name">Diana Laura</span>
          </div>
          <nav className="nav-menu">
            <a href="#inicio" className="nav-link" onClick={(e) => { e.preventDefault(); navigate("/inicio"); }}>
              Inicio
            </a>
            <a href="#colecciones" className="nav-link">Colecciones</a>
            <a href="#personalizados" className="nav-link">Personalizados</a>
            <a href="#nosotros" className="nav-link">Sobre Nosotros</a>
            <a href="#contacto" className="nav-link">Contacto</a>
          </nav>
          <div className="user-actions">
            <span className="user-welcome">Hola, {user?.nombre}</span>
            <button 
              className="logout-btn" 
              onClick={handleCerrarSesionActual}
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      {/* Contenido principal del perfil */}
      <main className="perfil-main">
        <div className="perfil-content">
          {/* Información del usuario */}
          <section className="user-info-section">
            <div className="user-avatar-large">
              {user?.nombre?.charAt(0) || 'U'}
            </div>
            <div className="user-details">
              <h1 className="user-name">{user?.nombre}</h1>
              <p className="user-email">{user?.email}</p>
              <p className="user-member">Miembro desde Enero 2024</p>
            </div>
          </section>

          {/* Gestión de sesiones activas */}
          <section className="sesiones-section">
            <div className="section-header">
              <h2 className="section-title">Sesiones Activas</h2>
              <p className="section-subtitle">
                Gestiona tus sesiones iniciadas en diferentes dispositivos
              </p>
            </div>

            {cargando ? (
              <div className="loading-sesiones">
                <p>Cargando sesiones activas...</p>
              </div>
            ) : (
              <div className="sesiones-list">
                {sesionesActivas.map((sesion) => (
                  <div key={sesion.id} className={`sesion-card ${sesion.esDispositivoActual ? 'sesion-actual' : ''}`}>
                    <div className="sesion-info">
                      <div className="sesion-dispositivo">
                        <span className="dispositivo-icon">💻</span>
                        <div>
                          <h3 className="dispositivo-nombre">{sesion.dispositivo}</h3>
                          <p className="sesion-detalles">
                            {sesion.ubicacion} • {sesion.ultimaActividad}
                            {sesion.esDispositivoActual && (
                              <span className="badge-actual">Este dispositivo</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="sesion-actions">
                        {!sesion.esDispositivoActual && (
                          <button 
                            className="btn-cerrar-sesion"
                            onClick={() => handleCerrarSesionDispositivo(sesion.id)}
                          >
                            Cerrar Sesión
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Botón para cerrar todas las sesiones */}
            <div className="acciones-globales">
              <button 
                className="btn-cerrar-todas"
                onClick={handleCerrarTodasLasSesiones}
              >
                🔒 Cerrar Todas las Sesiones
              </button>
              <p className="advertencia">
                Esto cerrará tu sesión en todos los dispositivos excepto en este.
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}