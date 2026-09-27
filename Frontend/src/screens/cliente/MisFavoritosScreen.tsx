// Ruta: Frontend/src/screens/cliente/MisFavoritosScreen.tsx
// Mis favoritos con el estilo de la app: resumen, filtro por categoría, orden,
// agregar al carrito desde la tarjeta y sugerencias cuando está vacío.
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { favoritosAPI, productsAPI } from '../../services/api';
import { useCart } from '../../contexts/CartContext';
import { AiFillHeart, AiOutlineHeart, AiOutlineShoppingCart, AiOutlineCheck, AiOutlineArrowRight } from 'react-icons/ai';
import './MisFavoritosScreen.css';
import './FavoritosApp.css';

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

const dinero = (n: number) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const precioDe = (p: ProductoFavorito) => Number(p.precio_promocion ?? p.precio_oferta ?? p.precio_venta);

type Orden = 'recientes' | 'menor' | 'mayor';

const MisFavoritosScreen: React.FC = () => {
    const navigate = useNavigate();
    const { agregarAlCarrito } = useCart();
    const [favoritos, setFavoritos] = useState<ProductoFavorito[]>([]);
    const [sugerencias, setSugerencias] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [quitando, setQuitando] = useState<number | null>(null);
    const [agregando, setAgregando] = useState<number | null>(null);
    const [agregados, setAgregados] = useState<number[]>([]);
    const [categoria, setCategoria] = useState<string>('todas');
    const [orden, setOrden] = useState<Orden>('recientes');
    const [aviso, setAviso] = useState('');

    const cargar = async () => {
        setLoading(true);
        try {
            const res = await favoritosAPI.getAll();
            const lista = Array.isArray(res) ? res : (res?.data || []);
            setFavoritos(lista);
            if (!lista.length) {
                const r: any = await productsAPI.getAll().catch(() => null);
                const todos = Array.isArray(r?.data) ? r.data : [];
                setSugerencias(todos.filter((p: any) => p.imagen_principal && p.stock_actual > 0 && !String(p.nombre).startsWith('[DEMO]')).slice(0, 4));
            }
        } catch {
            setFavoritos([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { cargar(); }, []);

    const mostrarAviso = (t: string) => { setAviso(t); window.setTimeout(() => setAviso(''), 2800); };

    const quitarFavorito = async (e: React.MouseEvent, producto_id: number) => {
        e.stopPropagation();
        setQuitando(producto_id);
        try {
            await favoritosAPI.toggle(producto_id);
            setFavoritos(prev => prev.filter(f => f.producto_id !== producto_id));
        } catch { /* silencioso */ }
        finally { setQuitando(null); }
    };

    const agregar = async (e: React.MouseEvent, p: ProductoFavorito) => {
        e.stopPropagation();
        setAgregando(p.producto_id);
        try {
            await agregarAlCarrito(p.producto_id, 1);
            setAgregados(a => [...a, p.producto_id]);
            mostrarAviso(`${p.nombre} se agregó al carrito`);
        } catch (err: any) {
            // Piezas con opciones obligatorias (talla, largo…): se eligen en su detalle
            if (/elige|escribe/i.test(err?.message || '')) navigate(`/producto/${p.producto_id}`);
            else mostrarAviso(err?.message || 'No se pudo agregar');
        } finally { setAgregando(null); }
    };

    const categorias = useMemo(() => Array.from(new Set(favoritos.map(f => f.categoria_nombre).filter(Boolean))) as string[], [favoritos]);
    const visibles = useMemo(() => {
        const lista = categoria === 'todas' ? [...favoritos] : favoritos.filter(f => f.categoria_nombre === categoria);
        if (orden === 'menor') lista.sort((a, b) => precioDe(a) - precioDe(b));
        else if (orden === 'mayor') lista.sort((a, b) => precioDe(b) - precioDe(a));
        else lista.sort((a, b) => +new Date(b.fecha_agregado) - +new Date(a.fecha_agregado));
        return lista;
    }, [favoritos, categoria, orden]);

    const total = favoritos.reduce((s, p) => s + precioDe(p), 0);
    const enOferta = favoritos.filter(p => precioDe(p) < Number(p.precio_venta)).length;
    const disponibles = favoritos.filter(p => p.stock_actual > 0).length;

    return (
        <main className="mf-body mf2">
            {/* Resumen */}
            <section className="mf2-hero">
                <div className="mf2-hero-textos">
                    <span className="mf2-hero-eyebrow">Tu lista de deseos</span>
                    <h1 className="mf2-hero-titulo">Mis <em>favoritos</em></h1>
                    <p className="mf2-hero-sub">Las joyas que te enamoraron, listas para cuando decidas llevarlas.</p>
                </div>
                <div className="mf2-hero-datos">
                    <div><strong>{loading ? '—' : favoritos.length}</strong><span>pieza{favoritos.length === 1 ? '' : 's'}</span></div>
                    <div><strong>{loading ? '—' : dinero(total)}</strong><span>en total</span></div>
                    <div><strong>{loading ? '—' : enOferta}</strong><span>con descuento</span></div>
                </div>
            </section>

            {aviso && <div className="mf2-aviso" role="status"><AiOutlineCheck size={16} /> {aviso}</div>}

            {loading ? (
                <div className="mf-grid">{[0, 1, 2, 3].map(i => <div key={i} className="mf2-esqueleto" />)}</div>
            ) : favoritos.length === 0 ? (
                <>
                    <div className="mf-vacio">
                        <span className="mf-vacio-circulo"><AiOutlineHeart size={38} className="mf-vacio-icon" /></span>
                        <h3 className="mf-vacio-titulo">Aún no tienes favoritos</h3>
                        <p>Toca el corazón de cualquier pieza del catálogo y aparecerá aquí.</p>
                        <button className="mf-btn-catalogo" onClick={() => navigate('/catalogo')}>Ver catálogo</button>
                    </div>
                    {sugerencias.length > 0 && (
                        <section className="mf2-sugerencias">
                            <span className="mf2-hero-eyebrow">Para empezar</span>
                            <h2 className="mf2-sub-titulo">Te pueden <em>gustar</em></h2>
                            <div className="mf-grid">
                                {sugerencias.map(p => (
                                    <div key={p.id} className="mf-card" onClick={() => navigate(`/producto/${p.id}`)}>
                                        <div className="mf-card-imagen"><img src={p.imagen_principal} alt={p.nombre} loading="lazy" /></div>
                                        <div className="mf-card-info">
                                            <p className="mf-card-categoria">{p.categoria_nombre}</p>
                                            <h4 className="mf-card-nombre">{p.nombre}</h4>
                                            <span className="mf-precio-final">{dinero(Number(p.precio_oferta ?? p.precio_venta))}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </>
            ) : (
                <>
                    {/* Filtros */}
                    <div className="mf2-barra">
                        <div className="mf2-chips" role="tablist" aria-label="Categorías">
                            <button role="tab" aria-selected={categoria === 'todas'} className={categoria === 'todas' ? 'activo' : ''} onClick={() => setCategoria('todas')}>Todas <small>{favoritos.length}</small></button>
                            {categorias.map(c => (
                                <button key={c} role="tab" aria-selected={categoria === c} className={categoria === c ? 'activo' : ''} onClick={() => setCategoria(c)}>
                                    {c} <small>{favoritos.filter(f => f.categoria_nombre === c).length}</small>
                                </button>
                            ))}
                        </div>
                        <label className="mf2-orden">
                            <span>Ordenar</span>
                            <select value={orden} onChange={e => setOrden(e.target.value as Orden)}>
                                <option value="recientes">Más recientes</option>
                                <option value="menor">Menor precio</option>
                                <option value="mayor">Mayor precio</option>
                            </select>
                        </label>
                    </div>
                    {disponibles < favoritos.length && (
                        <p className="mf2-nota">{favoritos.length - disponibles} de tus favoritos están agotados por ahora.</p>
                    )}

                    <div className="mf-grid">
                        {visibles.map(p => {
                            const final = precioDe(p);
                            const oferta = final < Number(p.precio_venta);
                            const agotado = p.stock_actual === 0;
                            const listo = agregados.includes(p.producto_id);
                            return (
                                <div key={p.id} className={`mf-card${agotado ? ' mf2-card--agotado' : ''}`} onClick={() => navigate(`/producto/${p.producto_id}`)}>
                                    <div className="mf-card-imagen">
                                        <img src={p.imagen_principal || PLACEHOLDER} alt={p.nombre}
                                            onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER; }} />
                                        <div className="mf2-badges">
                                            {p.es_nuevo && <span className="mf-badge-nuevo">Nuevo</span>}
                                            {oferta && <span className="mf2-badge mf2-badge--oferta">-{Math.round(100 - (final / Number(p.precio_venta)) * 100)}%</span>}
                                        </div>
                                        {agotado && <span className="mf2-agotado">Agotado</span>}
                                        <button className="mf-btn-quitar" onClick={(e) => quitarFavorito(e, p.producto_id)}
                                            disabled={quitando === p.producto_id} aria-label="Quitar de favoritos" title="Quitar de favoritos">
                                            <AiFillHeart size={16} />
                                        </button>
                                    </div>
                                    <div className="mf-card-info">
                                        <p className="mf-card-categoria">{p.categoria_nombre}</p>
                                        <h4 className="mf-card-nombre">{p.nombre}</h4>
                                        <div className="mf-card-precios">
                                            <span className="mf-precio-final">{dinero(final)}</span>
                                            {oferta && <span className="mf-precio-tachado">{dinero(Number(p.precio_venta))}</span>}
                                        </div>
                                        {!agotado && p.stock_actual <= 5 && <span className="mf-stock-poco">Quedan {p.stock_actual}</span>}
                                        <button className={`mf2-agregar${listo ? ' listo' : ''}`} disabled={agotado || agregando === p.producto_id}
                                            onClick={(e) => agregar(e, p)}>
                                            {agotado ? 'Agotado' : listo ? <><AiOutlineCheck size={16} /> En tu carrito</>
                                                : agregando === p.producto_id ? 'Agregando…' : <><AiOutlineShoppingCart size={16} /> Agregar</>}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <button className="mf2-seguir" onClick={() => navigate('/catalogo')}>Seguir explorando el catálogo <AiOutlineArrowRight size={16} /></button>
                </>
            )}
        </main>
    );
};

export default MisFavoritosScreen;
