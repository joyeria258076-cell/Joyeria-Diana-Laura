// Frontend/src/screens/admin/AdminInventarioScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Loader from '../../components/Loader';
import {
  AiOutlinePlus, AiOutlineSearch, AiOutlineReload, AiOutlineEdit, AiOutlineDelete, AiOutlineEye,
  AiOutlineInbox, AiOutlineWarning, AiOutlineCheckCircle, AiOutlineLeft, AiOutlineRight, AiOutlineStar,
  AiOutlineAppstore, AiOutlineBars, AiOutlineStop, AiOutlineDollar, AiOutlineTags,
} from 'react-icons/ai';
import { productsAPI } from '../../services/api';
import '../../styles/AdminV2.css';
import './AdminInventarioScreen.css';

interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  categoria_id: number;
  categoria_nombre?: string;
  proveedor_nombre?: string;
  precio_venta: number;
  precio_oferta?: number | null;
  stock_actual: number;
  stock_minimo: number;
  es_nuevo?: boolean;
  es_destacado?: boolean;
  activo: boolean;
  fecha_creacion: string;
  imagen_principal?: string;
}

type Filtro = 'todos' | 'bajo' | 'agotado' | 'inactivo' | 'destacado';
type Orden = 'recientes' | 'nombre' | 'precio_desc' | 'precio_asc' | 'stock_asc';

const POR_PAGINA = 12;

const precio = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(Number(n) || 0);

const nivelStock = (p: Producto): 'agotado' | 'bajo' | 'medio' | 'ok' =>
  p.stock_actual <= 0 ? 'agotado' : p.stock_actual <= p.stock_minimo ? 'bajo' : p.stock_actual <= p.stock_minimo * 2 ? 'medio' : 'ok';

const TEXTO_NIVEL = { agotado: 'Agotado', bajo: 'Stock bajo', medio: 'Stock medio', ok: 'En stock' };
const TONO_NIVEL = { agotado: 'peligro', bajo: 'aviso', medio: 'info', ok: 'ok' };

const AdminInventarioScreen: React.FC = () => {
  const navigate = useNavigate();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [categoria, setCategoria] = useState<string>('todas');
  const [orden, setOrden] = useState<Orden>('recientes');
  const [vista, setVista] = useState<'tarjetas' | 'lista'>(() => {
    try { return (localStorage.getItem('inv_vista') as any) || 'tarjetas'; } catch { return 'tarjetas'; }
  });
  const [pagina, setPagina] = useState(1);

  const cargar = async () => {
    setCargando(true);
    setError('');
    try {
      const res = await productsAPI.getAll();
      setProductos(res.success && Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      console.error('Error loading products:', err);
      setError('No se pudo cargar el catálogo. Intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);
  useEffect(() => { setPagina(1); }, [busqueda, filtro, categoria, orden]);
  useEffect(() => { try { localStorage.setItem('inv_vista', vista); } catch { /* sin almacenamiento */ } }, [vista]);

  const handleDelete = async (id: number, nombre: string) => {
    if (!window.confirm(`¿Seguro que deseas eliminar "${nombre}"?`)) return;
    try {
      await productsAPI.delete(id);
      setProductos(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      alert(`Error al eliminar: ${err.message}`);
    }
  };

  const resumen = useMemo(() => ({
    total: productos.length,
    activos: productos.filter(p => p.activo).length,
    bajo: productos.filter(p => p.stock_actual > 0 && p.stock_actual <= p.stock_minimo).length,
    agotados: productos.filter(p => p.stock_actual <= 0).length,
    valor: productos.reduce((s, p) => s + Number(p.precio_venta || 0) * Math.max(0, Number(p.stock_actual || 0)), 0),
  }), [productos]);

  const categorias = useMemo(() => {
    const c: Record<string, number> = {};
    productos.forEach(p => { const n = p.categoria_nombre || 'Sin categoría'; c[n] = (c[n] || 0) + 1; });
    return Object.entries(c).sort((a, b) => b[1] - a[1]);
  }, [productos]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const lista = productos.filter(p => {
      if (categoria !== 'todas' && (p.categoria_nombre || 'Sin categoría') !== categoria) return false;
      if (filtro === 'bajo' && !(p.stock_actual > 0 && p.stock_actual <= p.stock_minimo)) return false;
      if (filtro === 'agotado' && p.stock_actual > 0) return false;
      if (filtro === 'inactivo' && p.activo) return false;
      if (filtro === 'destacado' && !p.es_destacado) return false;
      return !q || `${p.nombre} ${p.descripcion || ''} ${p.categoria_nombre || ''} ${p.id}`.toLowerCase().includes(q);
    });
    const cmp: Record<Orden, (a: Producto, b: Producto) => number> = {
      recientes: (a, b) => new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime(),
      nombre: (a, b) => a.nombre.localeCompare(b.nombre),
      precio_desc: (a, b) => b.precio_venta - a.precio_venta,
      precio_asc: (a, b) => a.precio_venta - b.precio_venta,
      stock_asc: (a, b) => a.stock_actual - b.stock_actual,
    };
    return lista.sort(cmp[orden]);
  }, [productos, busqueda, filtro, categoria, orden]);

  const totalPaginas = Math.max(1, Math.ceil(visibles.length / POR_PAGINA));
  const pag = visibles.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const KPIS: { id: Filtro; label: string; n: string | number; icono: React.ReactNode; tono: string }[] = [
    { id: 'todos', label: 'Productos', n: resumen.total, icono: <AiOutlineInbox size={20} />, tono: '' },
    { id: 'inactivo', label: `Activos · ${resumen.total - resumen.activos} ocultos`, n: resumen.activos, icono: <AiOutlineCheckCircle size={20} />, tono: 'ok' },
    { id: 'bajo', label: 'Stock bajo', n: resumen.bajo, icono: <AiOutlineWarning size={20} />, tono: 'aviso' },
    { id: 'agotado', label: 'Agotados', n: resumen.agotados, icono: <AiOutlineStop size={20} />, tono: 'peligro' },
  ];

  return (
    <div className="av-page inv3">
      <header className="av-hero">
        <div>
          <span className="av-hero-icono"><AiOutlineAppstore size={26} /></span>
          <span className="av-eyebrow">Gestión de catálogo</span>
          <h1 className="av-titulo">Tu <em>inventario</em></h1>
          <p className="av-sub">Revisa existencias, precios y visibilidad de cada pieza. Toca un indicador para filtrar.</p>
        </div>
        <div className="av-hero-acciones">
          <button className="av-btn av-btn--sec" onClick={() => navigate('/admin-categorias')}><AiOutlineTags size={17} /> Categorías</button>
          <button className="av-btn" onClick={() => navigate('/admin-nuevo-producto')}><AiOutlinePlus size={17} /> Nuevo producto</button>
        </div>
      </header>

      <div className="av-kpis">
        {KPIS.map(k => (
          <button key={k.id} className={`av-kpi ${k.tono ? `av-tono--${k.tono}` : ''} ${filtro === k.id && k.id !== 'todos' ? 'activo' : ''}`}
            onClick={() => setFiltro(filtro === k.id ? 'todos' : k.id)}>
            <span className="av-kpi-icono">{k.icono}</span>
            <span><strong>{k.n}</strong><small>{k.label}</small></span>
          </button>
        ))}
        <div className="av-kpi av-tono--acento">
          <span className="av-kpi-icono"><AiOutlineDollar size={20} /></span>
          <span><strong>{precio(resumen.valor)}</strong><small>Valor en existencias</small></span>
        </div>
      </div>

      {error && <div className="av-alerta"><AiOutlineWarning size={18} /> {error}</div>}

      <div className="av-barra">
        <label className="av-buscar">
          <AiOutlineSearch size={18} />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por nombre, categoría o #id" />
        </label>
        <select className="av-select" value={orden} onChange={e => setOrden(e.target.value as Orden)} aria-label="Ordenar">
          <option value="recientes">Más recientes</option>
          <option value="nombre">Nombre (A-Z)</option>
          <option value="precio_desc">Precio: mayor a menor</option>
          <option value="precio_asc">Precio: menor a mayor</option>
          <option value="stock_asc">Menos existencias</option>
        </select>
        <div className="av-segmento" role="group" aria-label="Vista">
          <button className={vista === 'tarjetas' ? 'activo' : ''} onClick={() => setVista('tarjetas')} aria-label="Tarjetas"><AiOutlineAppstore size={17} /></button>
          <button className={vista === 'lista' ? 'activo' : ''} onClick={() => setVista('lista')} aria-label="Lista"><AiOutlineBars size={17} /></button>
        </div>
        <button className="av-btn av-btn--sec av-btn--icono" onClick={cargar} disabled={cargando} aria-label="Actualizar"><AiOutlineReload size={18} /></button>
      </div>

      {categorias.length > 1 && (
        <div className="av-chips">
          <button className={`av-chip ${categoria === 'todas' ? 'activo' : ''}`} onClick={() => setCategoria('todas')}>Todas <b>{productos.length}</b></button>
          {categorias.map(([n, c]) => (
            <button key={n} className={`av-chip ${categoria === n ? 'activo' : ''}`} onClick={() => setCategoria(categoria === n ? 'todas' : n)}>{n} <b>{c}</b></button>
          ))}
          <button className={`av-chip ${filtro === 'destacado' ? 'activo' : ''}`} onClick={() => setFiltro(filtro === 'destacado' ? 'todos' : 'destacado')}><AiOutlineStar size={13} /> Destacados</button>
        </div>
      )}

      {cargando && productos.length === 0 ? (
        <Loader texto="Cargando inventario..." />
      ) : pag.length === 0 ? (
        <div className="av-vacio">
          <AiOutlineInbox size={40} />
          <strong>{productos.length ? 'Nada coincide con los filtros' : 'Aún no hay productos'}</strong>
          <span>{productos.length ? 'Prueba con otra búsqueda o quita los filtros.' : 'Da de alta tu primera pieza para empezar.'}</span>
          {!productos.length && <button className="av-btn" onClick={() => navigate('/admin-nuevo-producto')}><AiOutlinePlus size={17} /> Nuevo producto</button>}
        </div>
      ) : vista === 'tarjetas' ? (
        <div className="inv3-grid">
          {pag.map(p => {
            const nivel = nivelStock(p);
            const pct = Math.min(100, Math.round((p.stock_actual / Math.max(1, p.stock_minimo * 3)) * 100));
            return (
              <article key={p.id} className={`inv3-card ${!p.activo ? 'inactivo' : ''}`}>
                <button className="inv3-media" onClick={() => navigate(`/admin/producto/${p.id}`)} aria-label={`Ver ${p.nombre}`}>
                  {p.imagen_principal ? <img src={p.imagen_principal} alt="" loading="lazy" /> : <span className="inv3-sinfoto"><AiOutlineInbox size={30} /></span>}
                  <span className="inv3-etiquetas">
                    {!p.activo && <span className="inv3-et inv3-et--oculto">Oculto</span>}
                    {p.es_nuevo && <span className="inv3-et">Nuevo</span>}
                    {p.es_destacado && <span className="inv3-et inv3-et--dest"><AiOutlineStar size={11} /> Destacado</span>}
                  </span>
                </button>
                <div className="inv3-cuerpo">
                  <span className="inv3-cat">{p.categoria_nombre || 'Sin categoría'} · #{p.id}</span>
                  <h3 className="inv3-nombre">{p.nombre}</h3>
                  <div className="inv3-precio">
                    {p.precio_oferta ? <><b>{precio(p.precio_oferta)}</b><s>{precio(p.precio_venta)}</s></> : <b>{precio(p.precio_venta)}</b>}
                  </div>
                  <div className={`inv3-stock av-tono--${TONO_NIVEL[nivel]}`}>
                    <div className="inv3-stock-txt"><span>{TEXTO_NIVEL[nivel]}</span><b>{p.stock_actual} pzas</b></div>
                    <div className="inv3-stock-barra"><i style={{ width: `${pct}%` }} /></div>
                  </div>
                  <div className="inv3-acciones">
                    <button className="av-accion" onClick={() => navigate(`/admin/producto/${p.id}`)} title="Ver detalle"><AiOutlineEye size={17} /></button>
                    <button className="inv3-editar" onClick={() => navigate(`/admin/editar-producto/${p.id}`)}><AiOutlineEdit size={16} /> Editar</button>
                    <button className="av-accion av-accion--peligro" onClick={() => handleDelete(p.id, p.nombre)} title="Eliminar"><AiOutlineDelete size={17} /></button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="av-tabla-wrap">
          <table className="av-tabla inv3-tabla">
            <thead>
              <tr><th>Producto</th><th>Categoría</th><th>Precio</th><th>Existencias</th><th>Estado</th><th></th></tr>
            </thead>
            <tbody>
              {pag.map(p => {
                const nivel = nivelStock(p);
                return (
                  <tr key={p.id}>
                    <td>
                      <div className="inv3-fila-prod">
                        {p.imagen_principal ? <img src={p.imagen_principal} alt="" loading="lazy" /> : <span className="inv3-mini"><AiOutlineInbox size={18} /></span>}
                        <span><b>{p.nombre}</b><small>#{p.id}{p.es_destacado ? ' · Destacado' : ''}{p.es_nuevo ? ' · Nuevo' : ''}</small></span>
                      </div>
                    </td>
                    <td>{p.categoria_nombre || '—'}</td>
                    <td><b>{precio(p.precio_oferta || p.precio_venta)}</b></td>
                    <td><span className={`av-pill av-pill--punto av-tono--${TONO_NIVEL[nivel]}`}>{p.stock_actual} · {TEXTO_NIVEL[nivel]}</span></td>
                    <td><span className={`av-pill ${p.activo ? 'av-tono--ok' : 'av-tono--apagado'}`}>{p.activo ? 'Visible' : 'Oculto'}</span></td>
                    <td>
                      <div className="av-acciones">
                        <button className="av-accion" onClick={() => navigate(`/admin/producto/${p.id}`)} title="Ver detalle"><AiOutlineEye size={16} /></button>
                        <button className="av-accion" onClick={() => navigate(`/admin/editar-producto/${p.id}`)} title="Editar"><AiOutlineEdit size={16} /></button>
                        <button className="av-accion av-accion--peligro" onClick={() => handleDelete(p.id, p.nombre)} title="Eliminar"><AiOutlineDelete size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {visibles.length > POR_PAGINA && (
        <div className="av-paginas">
          <button className="av-accion" onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1} aria-label="Anterior"><AiOutlineLeft size={15} /></button>
          <span>Página <b>{pagina}</b> de <b>{totalPaginas}</b> · {visibles.length} productos</span>
          <button className="av-accion" onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas} aria-label="Siguiente"><AiOutlineRight size={15} /></button>
        </div>
      )}
    </div>
  );
};

export default AdminInventarioScreen;
