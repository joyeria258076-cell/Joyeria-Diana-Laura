// Ruta: Frontend/src/screens/cliente/MisFavoritosScreen.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { favoritosAPI } from '../../services/api';
import { AiFillHeart, AiOutlineHeart } from 'react-icons/ai';
import './MisFavoritosScreen.css';

interface ProductoFavorito {
    id: number;
    producto_id: number;
    nombre: string;
    precio_venta: number;
    precio_oferta?: number;
    precio_promocion?: number;
    imagen_principal?: string;
    stock_actual: number;
    es_nuevo?: boolean;
    categoria_nombre?: string;
    fecha_agregado: string;
}

const PLACEHOLDER = `data:image/svg+xml;utf8,<svg width="300" height="300" xmlns="http://www.w3.org/2000/svg"><rect width="300" height="300" fill="%23141414"/><g transform="translate(150,150)" stroke="%23594936" stroke-width="1.5" fill="none" opacity="0.7"><path d="M-22,-14 L22,-14 L32,-2 L0,34 L-32,-2 Z"/><path d="M-22,-14 L0,-2 L22,-14 M-32,-2 L32,-2 M0,-2 L0,34"/></g></svg>`;

const MisFavoritosScreen: React.FC = () => {
    const navigate = useNavigate();
    const [favoritos, setFavoritos] = useState<ProductoFavorito[]>([]);
    const [loading, setLoading] = useState(true);
    const [quitando, setQuitando] = useState<number | null>(null);

    const cargar = async () => {
        setLoading(true);
        try {
            const res = await favoritosAPI.getAll();
            const lista = Array.isArray(res) ? res : (res?.data || []);
            setFavoritos(lista);
        } catch {
            setFavoritos([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { cargar(); }, []);

    const quitarFavorito = async (e: React.MouseEvent, producto_id: number) => {
        e.stopPropagation();
        setQuitando(producto_id);
        try {
            await favoritosAPI.toggle(producto_id);
            setFavoritos(prev => prev.filter(f => f.producto_id !== producto_id));
        } catch { /* silencioso */ }
        finally { setQuitando(null); }
    };

    return (
        <main className="mf-body">
            <div className="mf-header">
                <h2 className="mf-titulo">Mis Favoritos</h2>
                <span className="mf-contador">{favoritos.length} producto{favoritos.length !== 1 ? 's' : ''}</span>
            </div>

            {loading ? (
                <div className="mf-loading">Cargando tus favoritos...</div>
            ) : favoritos.length === 0 ? (
                <div className="mf-vacio">
                    <AiOutlineHeart size={44} className="mf-vacio-icon" />
                    <p>Aún no has marcado ningún producto como favorito.</p>
                    <button className="mf-btn-catalogo" onClick={() => navigate('/catalogo')}>Ver catálogo</button>
                </div>
            ) : (
                <div className="mf-grid">
                    {favoritos.map(p => {
                        const precioFinal = p.precio_promocion ?? p.precio_oferta;
                        return (
                            <div key={p.id} className="mf-card" onClick={() => navigate(`/producto/${p.producto_id}`)}>
                                <div className="mf-card-imagen">
                                    <img
                                        src={p.imagen_principal || PLACEHOLDER}
                                        alt={p.nombre}
                                        onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER; }}
                                    />
                                    {p.es_nuevo && <span className="mf-badge-nuevo">Nuevo</span>}
                                    <button
                                        className="mf-btn-quitar"
                                        onClick={(e) => quitarFavorito(e, p.producto_id)}
                                        disabled={quitando === p.producto_id}
                                        aria-label="Quitar de favoritos"
                                        title="Quitar de favoritos"
                                    ><AiFillHeart size={16} /></button>
                                </div>
                                <div className="mf-card-info">
                                    <p className="mf-card-categoria">{p.categoria_nombre}</p>
                                    <h4 className="mf-card-nombre">{p.nombre}</h4>
                                    <div className="mf-card-precios">
                                        {precioFinal ? (
                                            <>
                                                <span className="mf-precio-tachado">${Number(p.precio_venta).toLocaleString('es-MX')}</span>
                                                <span className="mf-precio-final">${Number(precioFinal).toLocaleString('es-MX')}</span>
                                            </>
                                        ) : (
                                            <span className="mf-precio-final">${Number(p.precio_venta).toLocaleString('es-MX')}</span>
                                        )}
                                    </div>
                                    {p.stock_actual === 0 ? (
                                        <span className="mf-stock-agotado">Agotado</span>
                                    ) : p.stock_actual <= 5 ? (
                                        <span className="mf-stock-poco">Quedan {p.stock_actual}</span>
                                    ) : (
                                        <span className="mf-stock-ok">Disponible</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </main>
    );
};

export default MisFavoritosScreen;
