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

const cargarNotifs = (): Notificacion[] => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY_NOTIFS) || '[]'); }
    catch { return []; }
};
const guardarNotifs = (n: Notificacion[]) => localStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify(n));
const cargarEstadosAnteriores = (): Record<number, string> => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY_ESTADOS) || '{}'); }
    catch { return {}; }
};
const guardarEstadosAnteriores = (e: Record<number, string>) => localStorage.setItem(STORAGE_KEY_ESTADOS, JSON.stringify(e));

const NotificacionesContext = createContext<NotificacionesContextType | undefined>(undefined);

export const NotificacionesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [notifs, setNotifs] = useState<Notificacion[]>(cargarNotifs);
    const estadosAnteriores = useRef<Record<number, string>>(cargarEstadosAnteriores());
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const userRole = user?.rol?.toLowerCase().trim() || '';
    const noLeidas = notifs.filter(n => !n.leida).length;

    const pollEstados = async () => {
        try {
            const data = await carritoAPI.getEstadosPedidosCliente();
            if (!data.success) return;
            const nuevasNotifs: Notificacion[] = [];
            const estadosGuardados = cargarEstadosAnteriores();
            data.data.forEach((p: any) => {
                const anterior = estadosGuardados[p.id];
                if (anterior && anterior !== p.estado && MENSAJE_ESTADO[p.estado]) {
                    nuevasNotifs.push({ id: `${p.id}-${p.estado}-${Date.now()}`, folio: p.folio, mensaje: MENSAJE_ESTADO[p.estado], fecha: new Date().toISOString(), leida: false });
                }
                estadosAnteriores.current[p.id] = p.estado;
            });
            guardarEstadosAnteriores(estadosAnteriores.current);
            if (nuevasNotifs.length > 0) {
                setNotifs(prev => {
                    const todas = [...nuevasNotifs, ...prev].slice(0, 100);
                    guardarNotifs(todas);
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
    }, [userRole]);

    const marcarTodasLeidas = () => {
        setNotifs(prev => { const u = prev.map(n => ({ ...n, leida: true })); guardarNotifs(u); return u; });
    };
    const marcarLeida = (id: string) => {
        setNotifs(prev => { const u = prev.map(n => n.id === id ? { ...n, leida: true } : n); guardarNotifs(u); return u; });
    };
    const borrarNotif = (id: string) => {
        setNotifs(prev => { const u = prev.filter(n => n.id !== id); guardarNotifs(u); return u; });
    };
    const limpiarTodo = () => { setNotifs([]); guardarNotifs([]); };

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
