// Ruta: Joyeria-Diana-Laura/Frontend/src/screens/PerfilScreen.tsx

import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import "../styles/PerfilScreen.css";

// 🆕 TIPO ACTUALIZADO para sesiones activas (según backend)
interface SesionActiva {
  id: number; // 🆕 Cambiar a number
  device_name: string;
  browser: string;
  os: string;
  ip_address: string;
  location: string;
  created_at: string;
  last_activity: string;
  is_current?: boolean; // 🆕 Para marcar sesión actual
}

export default function PerfilScreen() {
  const { user, logout, getActiveSessions, revokeSession, revokeAllOtherSessions, revokeAllSessions } = useAuth();
  const navigate = useNavigate();
  const [sesionesActivas, setSesionesActivas] = useState<SesionActiva[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState<string>("");
  const [tipoMensaje, setTipoMensaje] = useState<"success" | "error">("success");

  // 🆕 CARGAR SESIONES REALES DEL BACKEND
  useEffect(() => {
    cargarSesionesActivas();
  }, []);

  const cargarSesionesActivas = async () => {
    try {
      setCargando(true);
      console.log('📋 Cargando sesiones activas del backend...');
      
      const sesiones = await getActiveSessions();
      
      console.log('✅ Sesiones cargadas:', sesiones.length);
      console.log('🎯 Sesión actual ya marcada por backend:', sesiones.some(s => s.is_current));
      
      // 🆕 YA NO necesitamos mapear ni marcar - el backend ya lo hace
      setSesionesActivas(sesiones);
      
    } catch (error: any) {
      console.error("❌ Error cargando sesiones:", error);
      mostrarMensaje("Error al cargar las sesiones activas: " + error.message, "error");
    } finally {
      setCargando(false);
    }
  };

  // 🆕 FUNCIÓN PARA MOSTRAR MENSAJES
  const mostrarMensaje = (texto: string, tipo: "success" | "error") => {
    setMensaje(texto);
    setTipoMensaje(tipo);
    setTimeout(() => setMensaje(""), 5000);
  };

const handleCerrarSesionDispositivo = async (sesionId: number) => {
  // 🆕 Agregar confirmación
  if (!window.confirm('¿Estás seguro de que quieres cerrar la sesión en este dispositivo?')) {
    return;
  }
  
  try {
    console.log("🔐 Cerrando sesión en dispositivo:", sesionId);
    await revokeSession(sesionId);
    
    // Actualizar lista local
    setSesionesActivas(prev => prev.filter(sesion => sesion.id !== sesionId));
    mostrarMensaje("✅ Sesión cerrada exitosamente. El otro dispositivo será desconectado en 15 segundos.", "success");
  } catch (error: any) {
    console.error("❌ Error cerrando sesión:", error);
    mostrarMensaje("Error al cerrar la sesión: " + error.message, "error");
  }
};

// 🆕 REEMPLAZAR handleCerrarOtrasSesiones en PerfilScreen.tsx
const handleCerrarOtrasSesiones = async () => {
  if (!window.confirm('¿Estás seguro de que quieres cerrar sesión en todos los otros dispositivos?')) {
    return;
  }
  
  try {
    console.log("🔐 Cerrando todas las otras sesiones...");
    const result = await revokeAllOtherSessions();
    
    // Recargar sesiones para mostrar solo la actual
    await cargarSesionesActivas();
    mostrarMensaje(`✅ Se cerraron ${result.revokedCount} sesiones. Los dispositivos serán desconectados en 15 segundos.`, "success");
  } catch (error: any) {
    console.error("❌ Error cerrando otras sesiones:", error);
    mostrarMensaje("Error al cerrar otras sesiones: " + error.message, "error");
  }
};

  // 🆕 3. CERRAR TODAS LAS SESIONES (incluyendo actual)
  const handleCerrarTodasLasSesiones = async () => {
    if (window.confirm("¿Estás seguro de que quieres cerrar todas las sesiones? Esto te cerrará la sesión en todos los dispositivos incluyendo este.")) {
      try {
        console.log("Cerrando TODAS las sesiones...");
        const result = await revokeAllSessions();
        
        // 🆕 El logout se ejecuta automáticamente en revokeAllSessions
        mostrarMensaje(`Se cerraron todas las sesiones (${result.revokedCount} dispositivos)`, "success");
        
        // Redirigir al login (ya que se hizo logout)
        navigate("/login");
      } catch (error: any) {
        console.error("❌ Error cerrando todas las sesiones:", error);
        mostrarMensaje("Error al cerrar todas las sesiones: " + error.message, "error");
      }
    }
  };

  // 🆕 4. CERRAR SOLO SESIÓN ACTUAL
  const handleCerrarSesionActual = async () => {
    if (window.confirm("¿Estás seguro de que quieres cerrar sesión en este dispositivo?")) {
      await logout();
      navigate("/login");
    }
  };

  // 🆕 FUNCIÓN PARA FORMATEAR FECHAS
  const formatearFecha = (fecha: string) => {
    const ahora = new Date();
    const fechaSesion = new Date(fecha);
    const diffMs = ahora.getTime() - fechaSesion.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Hace unos segundos";
    if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
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

          {/* 🆕 MENSAJES */}
          {mensaje && (
            <div className={`mensaje-alerta ${tipoMensaje}`}>
              {mensaje}
            </div>
          )}

          {/* Gestión de sesiones activas */}
          <section className="sesiones-section">
            <div className="section-header">
              <h2 className="section-title">Sesiones Activas</h2>
              <p className="section-subtitle">
                Gestiona tus sesiones iniciadas en diferentes dispositivos
              </p>
              
              {/* 🆕 BOTÓN ACTUALIZAR */}
              <button 
                className="btn-actualizar"
                onClick={cargarSesionesActivas}
                disabled={cargando}
              >
                🔄 Actualizar
              </button>
            </div>

            {cargando ? (
              <div className="loading-sesiones">
                <p>Cargando sesiones activas...</p>
              </div>
            ) : sesionesActivas.length === 0 ? (
              <div className="sin-sesiones">
                <p>No hay sesiones activas</p>
              </div>
            ) : (
              <div className="sesiones-list">
                {sesionesActivas.map((sesion) => (
                  <div key={sesion.id} className={`sesion-card ${sesion.is_current ? 'sesion-actual' : ''}`}>
                    <div className="sesion-info">
                      <div className="sesion-dispositivo">
                        <span className="dispositivo-icon">💻</span>
                        <div>
                          <h3 className="dispositivo-nombre">{sesion.device_name}</h3>
                          <p className="sesion-detalles">
                            {sesion.location} • {formatearFecha(sesion.last_activity)}
                            {sesion.is_current && (
                              <span className="badge-actual">Este dispositivo</span>
                            )}
                          </p>
                          <p className="sesion-ip">IP: {sesion.ip_address}</p>
                        </div>
                      </div>
                      <div className="sesion-actions">
                        {!sesion.is_current && (
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

            {/* 🆕 BOTONES PARA LOS 3 TIPOS DE CIERRE */}
            <div className="acciones-globales">
              <div className="botones-accion">
                <button 
                  className="btn-cerrar-otras"
                  onClick={handleCerrarOtrasSesiones}
                  disabled={sesionesActivas.filter(s => !s.is_current).length === 0}
                >
                  🔒 Cerrar Otras Sesiones
                </button>
                
                <button 
                  className="btn-cerrar-todas"
                  onClick={handleCerrarTodasLasSesiones}
                >
                  🚫 Cerrar Todas las Sesiones
                </button>
              </div>
              
              <div className="advertencias">
                <p className="advertencia">
                  <strong>Cerrar Otras Sesiones:</strong> Cierra sesión en todos los dispositivos excepto en este.
                </p>
                <p className="advertencia peligro">
                  <strong>Cerrar Todas las Sesiones:</strong> Cierra sesión en TODOS los dispositivos incluyendo este.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}