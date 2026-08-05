// Ruta: Frontend/src/contexts/NotificacionesContext.tsx
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { carritoAPI } from '../services/api';
import { useAuth } from './AuthContext';

export interface Notificacion {
    id: string;
    folio: string;
    mensaje: string;
    fecha: string;
    leida: boolean;
}

interface NotificacionesContextType {
    notifs: Notificacion[];
    noLeidas: number;
    marcarTodasLeidas: () => void;
    marcarLeida: (id: string) => void;
    borrarNotif: (id: string) => void;
    limpiarTodo: () => void;
}

const STORAGE_KEY_NOTIFS  = 'diana_laura_notifs';
const STORAGE_KEY_ESTADOS = 'diana_laura_estados_pedidos';
const POLLING_INTERVAL    = 30000;

const MENSAJE_ESTADO: Record<string, string> = {
    confirmado:     '✅ Tu pedido fue confirmado. Ya puedes realizar el pago.',
    en_preparacion: '🔧 Tu pedido está siendo preparado.',
    enviado:        '🚚 Tu pedido fue enviado. ¡Pronto llegará!',
    entregado:      '📦 Tu pedido fue entregado. ¡Gracias por tu compra!',
    cancelado:      '🚫 Tu pedido fue cancelado.',
};

// Las claves se ligan al id del usuario logueado para que las notificaciones
// y estados anteriores de una cuenta nunca se mezclen con los de otra cuenta
// que haya iniciado sesion antes en el mismo navegador.
const claveNotifs  = (userId: string | number) => `${STORAGE_KEY_NOTIFS}_${userId}`;
const claveEstados = (userId: string | number) => `${STORAGE_KEY_ESTADOS}_${userId}`;

const cargarNotifs = (userId: string | number): Notificacion[] => {
    try { return JSON.parse(localStorage.getItem(claveNotifs(userId)) || '[]'); }
    catch { return []; }
};
const guardarNotifs = (userId: string | number, n: Notificacion[]) =>
    localStorage.setItem(claveNotifs(userId), JSON.stringify(n));
const cargarEstadosAnteriores = (userId: string | number): Record<number, string> => {
    try { return JSON.parse(localStorage.getItem(claveEstados(userId)) || '{}'); }
    catch { return {}; }
};
const guardarEstadosAnteriores = (userId: string | number, e: Record<number, string>) =>
    localStorage.setItem(claveEstados(userId), JSON.stringify(e));

const NotificacionesContext = createContext<NotificacionesContextType | undefined>(undefined);

export const NotificacionesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const userId = user?.id ?? 'anonimo';
    const [notifs, setNotifs] = useState<Notificacion[]>([]);
    const estadosAnteriores = useRef<Record<number, string>>({});
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const userRole = user?.rol?.toLowerCase().trim() || '';
    const noLeidas = notifs.filter(n => !n.leida).length;

    // Al cambiar de usuario (login, logout o cambio de cuenta en el mismo navegador)
    // se recargan las notificaciones y estados desde el almacenamiento propio de
    // ESE usuario, en vez de arrastrar los del usuario anterior.
    useEffect(() => {
        setNotifs(cargarNotifs(userId));
        estadosAnteriores.current = cargarEstadosAnteriores(userId);
    }, [userId]);

    const pollEstados = async () => {
        try {
            const data = await carritoAPI.getEstadosPedidosCliente();
            if (!data.success) return;
            const nuevasNotifs: Notificacion[] = [];
            const estadosGuardados = cargarEstadosAnteriores(userId);
            data.data.forEach((p: any) => {
                const anterior = estadosGuardados[p.id];
                if (anterior && anterior !== p.estado && MENSAJE_ESTADO[p.estado]) {
                    nuevasNotifs.push({ id: `${p.id}-${p.estado}-${Date.now()}`, folio: p.folio, mensaje: MENSAJE_ESTADO[p.estado], fecha: new Date().toISOString(), leida: false });
                }
                estadosAnteriores.current[p.id] = p.estado;
            });
            guardarEstadosAnteriores(userId, estadosAnteriores.current);
            if (nuevasNotifs.length > 0) {
                setNotifs(prev => {
                    const todas = [...nuevasNotifs, ...prev].slice(0, 100);
                    guardarNotifs(userId, todas);
                    return todas;
                });
            }
        } catch { /* silencioso — no bloquear la UI por un fallo de polling */ }
    };

    useEffect(() => {
        if (userRole !== 'cliente') return;
        pollEstados();
        pollingRef.current = setInterval(pollEstados, POLLING_INTERVAL);
        return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
    }, [userRole, userId]);

    const marcarTodasLeidas = () => {
        setNotifs(prev => { const u = prev.map(n => ({ ...n, leida: true })); guardarNotifs(userId, u); return u; });
    };
    const marcarLeida = (id: string) => {
        setNotifs(prev => { const u = prev.map(n => n.id === id ? { ...n, leida: true } : n); guardarNotifs(userId, u); return u; });
    };
    const borrarNotif = (id: string) => {
        setNotifs(prev => { const u = prev.filter(n => n.id !== id); guardarNotifs(userId, u); return u; });
    };
    const limpiarTodo = () => { setNotifs([]); guardarNotifs(userId, []); };

    return (
        <NotificacionesContext.Provider value={{ notifs, noLeidas, marcarTodasLeidas, marcarLeida, borrarNotif, limpiarTodo }}>
            {children}
        </NotificacionesContext.Provider>
    );
};

export const useNotificaciones = (): NotificacionesContextType => {
    const ctx = useContext(NotificacionesContext);
    if (!ctx) throw new Error('useNotificaciones debe usarse dentro de NotificacionesProvider');
    return ctx;
};
