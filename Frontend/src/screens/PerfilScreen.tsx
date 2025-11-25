// Ruta: Joyeria-Diana-Laura/Frontend/src/screens/PerfilScreen.tsx

import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { authAPI } from "../services/api";
import "../styles/PerfilScreen.css";

// 🆕 TIPO ACTUALIZADO para sesiones activas (según backend)
interface SesionActiva {
  id: number;
  device_name: string;
  browser: string;
  os: string;
  ip_address: string;
  location: string;
  created_at: string;
  last_activity: string;
  is_current?: boolean;
}

// 🆕 INTERFAZ para estado MFA
interface MFAStatus {
  mfaEnabled: boolean;
}

export default function PerfilScreen() {
  const { user, logout, getActiveSessions, revokeSession, revokeAllOtherSessions, revokeAllSessions } = useAuth();
  const navigate = useNavigate();
  const [sesionesActivas, setSesionesActivas] = useState<SesionActiva[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState<string>("");
  const [tipoMensaje, setTipoMensaje] = useState<"success" | "error">("success");
  const [mfaStatus, setMfaStatus] = useState<MFAStatus>({ mfaEnabled: false }); // 🆕 ESTADO MFA
  const [cargandoMFA, setCargandoMFA] = useState(true); // 🆕 LOADING MFA

  // 🆕 CARGAR SESIONES Y ESTADO MFA DEL BACKEND
  useEffect(() => {
    cargarSesionesActivas();
    cargarEstadoMFA(); // 🆕 Cargar estado MFA real
  }, []);

  // 🆕 FUNCIÓN PARA CARGAR ESTADO MFA REAL
  const cargarEstadoMFA = async () => {
    if (!user?.dbId) {
      setCargandoMFA(false);
      return;
    }

    try {
      console.log('🔍 Cargando estado MFA real para usuario:', user.dbId);
      const response = await authAPI.checkMFAStatus(user.dbId);
      
      if (response.success) {
        setMfaStatus(response.data);
        console.log('✅ Estado MFA cargado:', response.data.mfaEnabled);
      } else {
        console.warn('⚠️ No se pudo cargar estado MFA:', response.message);
      }
    } catch (error: any) {
      console.error('❌ Error cargando estado MFA:', error);
    } finally {
      setCargandoMFA(false);
    }
  };

  const cargarSesionesActivas = async () => {
    try {
      setCargando(true);
      console.log('📋 Cargando sesiones activas del backend...');
      
      const sesiones = await getActiveSessions();
      
      console.log('✅ Sesiones cargadas:', sesiones.length);
      console.log('🎯 Sesión actual ya marcada por backend:', sesiones.some(s => s.is_current));
      
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

  // 🆕 FUNCIÓN PARA DESACTIVAR MFA
  const handleDesactivarMFA = async () => {
    if (!user?.dbId) return;

    if (window.confirm('¿Estás seguro de que quieres desactivar la autenticación en dos pasos?')) {
      try {
        setCargandoMFA(true);
        console.log('🚫 Desactivando MFA para usuario:', user.dbId);
        
        const response = await authAPI.disableMFA(user.dbId);
        
        if (response.success) {
          setMfaStatus({ mfaEnabled: false });
          mostrarMensaje("MFA desactivado correctamente", "success");
          console.log('✅ MFA desactivado');
        } else {
          throw new Error(response.message || 'Error desactivando MFA');
        }
      } catch (error: any) {
        console.error('❌ Error desactivando MFA:', error);
        mostrarMensaje("Error al desactivar MFA: " + error.message, "error");
      } finally {
        setCargandoMFA(false);
      }
    }
  };

  // 🆕 FUNCIÓN PARA ACTUALIZAR ESTADO MFA (cuando vuelve de mfa-setup)
  const actualizarEstadoMFA = () => {
    cargarEstadoMFA();
  };

const handleCerrarSesionDispositivo = async (sesionId: number) => {
  const sesion = sesionesActivas.find(s => s.id === sesionId);
  
  const esSesionActual = sesion?.is_current === true;
  
  let mensajeConfirmacion = '';
  
  if (esSesionActual) {
    mensajeConfirmacion = '⚠️ ¿Cerrar tu SESIÓN ACTUAL? Serás redirigido al login.';
  } else {
    mensajeConfirmacion = `¿Cerrar sesión en ${sesion?.device_name} (${sesion?.location})?`;
  }

  if (!window.confirm(mensajeConfirmacion)) {
    return;
  }
  
  try {
    console.log("🔐 Cerrando sesión en dispositivo:", sesionId);
    await revokeSession(sesionId);
    
    if (esSesionActual) {
      mostrarMensaje("✅ Tu sesión actual se ha cerrado. Serás redirigido al login...", "success");
      
      setTimeout(async () => {
        await logout();
        navigate("/login");
      }, 1000);
    } else {
      setSesionesActivas(prev => prev.filter(s => s.id !== sesionId));
      mostrarMensaje("✅ Sesión cerrada exitosamente. El otro dispositivo será desconectado en 15 segundos.", "success");
    }
  } catch (error: any) {
    console.error("❌ Error cerrando sesión:", error);
    mostrarMensaje("Error al cerrar la sesión: " + error.message, "error");
  }
};

const handleCerrarOtrasSesiones = async () => {
  if (!window.confirm('¿Estás seguro de que quieres cerrar sesión en todos los otros dispositivos?')) {
    return;
  }
  
  try {
    console.log("🔐 Cerrando todas las otras sesiones...");
    const result = await revokeAllOtherSessions();
    
    await cargarSesionesActivas();
    mostrarMensaje(`✅ Se cerraron ${result.revokedCount} sesiones. Los dispositivos serán desconectados en 15 segundos.`, "success");
  } catch (error: any) {
    console.error("❌ Error cerrando otras sesiones:", error);
    mostrarMensaje("Error al cerrar otras sesiones: " + error.message, "error");
  }
};

  const handleCerrarTodasLasSesiones = async () => {
    if (window.confirm("¿Estás seguro de que quieres cerrar todas las sesiones? Esto te cerrará la sesión en todos los dispositivos incluyendo este.")) {
      try {
        console.log("Cerrando TODAS las sesiones...");
        const result = await revokeAllSessions();
        
        mostrarMensaje(`Se cerraron todas las sesiones (${result.revokedCount} dispositivos)`, "success");
        
        navigate("/login");
      } catch (error: any) {
        console.error("❌ Error cerrando todas las sesiones:", error);
        mostrarMensaje("Error al cerrar todas las sesiones: " + error.message, "error");
      }
    }
  };

  const handleCerrarSesionActual = async () => {
    if (window.confirm("¿Estás seguro de que quieres cerrar sesión en este dispositivo?")) {
      await logout();
      navigate("/login");
    }
  };

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

      <main className="perfil-main">
        <div className="perfil-content">
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

          {mensaje && (
            <div className={`mensaje-alerta ${tipoMensaje}`}>
              {mensaje}
            </div>
          )}

          {/* 🆕 SECCIÓN MFA MEJORADA */}
          <section className="sesiones-section">
            <div className="section-header">
              <h2 className="section-title">🔒 Autenticación en Dos Pasos (MFA)</h2>
              <p className="section-subtitle">
                Protege tu cuenta con una capa adicional de seguridad
              </p>
              
              {/* 🆕 BOTÓN ACTUALIZAR MFA */}
              <button 
                className="btn-actualizar"
                onClick={actualizarEstadoMFA}
                disabled={cargandoMFA}
              >
                {cargandoMFA ? '🔄' : '🔄'} Actualizar Estado
              </button>
            </div>

            <div className="mfa-status-card">
              <div className="mfa-status-content">
                <div className="mfa-status-info">
                  {cargandoMFA ? (
                    <h3>Cargando estado MFA...</h3>
                  ) : (
                    <>
                      <h3>
                        Estado actual: 
                        <span className={`mfa-badge ${mfaStatus.mfaEnabled ? 'mfa-enabled' : 'mfa-disabled'}`}>
                          {mfaStatus.mfaEnabled ? " ✅ ACTIVADA" : " ❌ NO ACTIVADA"}
                        </span>
                      </h3>
                      <p>
                        {mfaStatus.mfaEnabled 
                          ? "Tu cuenta está protegida con autenticación en dos pasos. Necesitarás un código de verificación cada vez que inicies sesión."
                          : "La autenticación en dos pasos añade una capa extra de seguridad a tu cuenta. Además de tu contraseña, necesitarás un código de verificación de tu aplicación móvil."
                        }
                      </p>
                      
                      <div className="mfa-benefits">
                        <h4>Beneficios:</h4>
                        <ul>
                          <li>✅ Protección contra accesos no autorizados</li>
                          <li>✅ Seguridad incluso si tu contraseña es comprometida</li>
                          <li>✅ Códigos que cambian cada 30 segundos</li>
                          <li>✅ Compatible con Google Authenticator, Authy, etc.</li>
                        </ul>
                      </div>
                    </>
                  )}
                </div>
                
                <div className="mfa-action">
                  {!mfaStatus.mfaEnabled ? (
                    <>
                      <button 
                        className="btn-activar-mfa"
                        onClick={() => navigate('/mfa-setup')}
                        disabled={cargandoMFA}
                      >
                        🔐 Activar Autenticación en Dos Pasos
                      </button>
                      <small>Puedes desactivarla en cualquier momento</small>
                    </>
                  ) : (
                    <>
                      <button 
                        className="btn-desactivar-mfa"
                        onClick={handleDesactivarMFA}
                        disabled={cargandoMFA}
                      >
                        🚫 Desactivar MFA
                      </button>
                      <small>Tu cuenta está actualmente protegida</small>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Gestión de sesiones activas */}
          <section className="sesiones-section">
            <div className="section-header">
              <h2 className="section-title">Sesiones Activas</h2>
              <p className="section-subtitle">
                Gestiona tus sesiones iniciadas en diferentes dispositivos
              </p>
              
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