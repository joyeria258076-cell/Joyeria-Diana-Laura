// Ruta: Frontend/src/contexts/CartContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { carritoAPI } from '../services/api';

// ── Interfaces ────────────────────────────────────────────────
export interface CartItem {
    id:                      number;
    usuario_id:              number;
    producto_id:             number;
    cantidad:                number;
    talla_medida?:           string;
    nota?:                   string;
    fecha_agregado:          string;
    producto_nombre:         string;
    producto_imagen?:        string;
    precio_venta:            number;
    precio_oferta?:          number;
    stock_actual:            number;
    permite_personalizacion: boolean;
    tiene_medidas:           boolean;
    categoria_nombre:        string;
}

interface CartContextType {
    items:              CartItem[];
    count:              number;
    total:              number;
    loading:            boolean;
    agregarAlCarrito:   (producto_id: number, cantidad: number, talla_medida?: string, nota?: string) => Promise<void>;
    actualizarCantidad: (id: number, cantidad: number) => Promise<void>;
    eliminarItem:       (id: number) => Promise<void>;
    vaciarCarrito:      () => Promise<void>;
    recargar:           () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error('useCart debe usarse dentro de CartProvider');
    return ctx;
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [items, setItems]     = useState<CartItem[]>([]);
    const [count, setCount]     = useState(0);
    const [total, setTotal]     = useState(0);
    const [loading, setLoading] = useState(false);

    const calcularTotales = (cartItems: CartItem[]) => {
        setCount(cartItems.reduce((s, i) => s + i.cantidad, 0));
        setTotal(cartItems.reduce((s, i) => {
            const precio = parseFloat(String(i.precio_oferta || i.precio_venta));
            return s + precio * i.cantidad;
        }, 0));
    };

    const recargar = useCallback(async () => {
        if (!user?.dbId) { setItems([]); setCount(0); setTotal(0); return; }
        try {
            setLoading(true);
            const data = await carritoAPI.getCarrito();
            if (data.success) {
                setItems(data.data.items || []);
                calcularTotales(data.data.items || []);
            }
        } catch { /* silencioso */ } finally { setLoading(false); }
    }, [user?.dbId]);

    useEffect(() => {
        if (user?.dbId) recargar();
        else { setItems([]); setCount(0); setTotal(0); }
    }, [user?.dbId]);

    const agregarAlCarrito = async (producto_id: number, cantidad: number, talla_medida?: string, nota?: string) => {
        if (!user?.dbId) throw new Error('Debes iniciar sesión');
        const data = await carritoAPI.agregar(producto_id, cantidad, talla_medida, nota);
        if (!data.success) throw new Error(data.message);
        await recargar();
    };

    const actualizarCantidad = async (id: number, cantidad: number) => {
        const data = await carritoAPI.actualizarCantidad(id, cantidad);
        if (!data.success) throw new Error(data.message);
        await recargar();
    };

    const eliminarItem = async (id: number) => {
        await carritoAPI.eliminarItem(id);
        await recargar();
    };

    const vaciarCarrito = async () => {
        await carritoAPI.vaciar();
        setItems([]); setCount(0); setTotal(0);
    };

    return (
        <CartContext.Provider value={{
            items, count, total, loading,
            agregarAlCarrito, actualizarCantidad,
            eliminarItem, vaciarCarrito, recargar
        }}>
            {children}
        </CartContext.Provider>
    );
};

export default CartContext;