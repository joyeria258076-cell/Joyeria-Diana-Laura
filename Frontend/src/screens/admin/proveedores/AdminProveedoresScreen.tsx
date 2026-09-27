// Frontend/src/screens/admin/proveedores/AdminProveedoresScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Loader from '../../../components/Loader';
import {
  AiOutlinePlus, AiOutlineSearch, AiOutlineReload, AiOutlineEdit, AiOutlineDelete, AiOutlineEye,
  AiOutlineMail, AiOutlinePhone, AiOutlineShop, AiOutlineIdcard, AiOutlineCheckCircle, AiOutlineStop,
  AiOutlineLeft, AiOutlineRight, AiOutlineUser, AiOutlineWarning,
} from 'react-icons/ai';
import { proveedoresAPI } from '../../../services/api';
import '../../../styles/AdminV2.css';
import './AdminProveedoresScreen.css';

interface Proveedor {
  id: number;
  nombre: string;
  razon_social: string;
  rfc: string;
  telefono: string;
  email: string;
  persona_contacto: string;
  notas?: string;
  activo: boolean;
  fecha_creacion: string;
  imagen_url?: string;
}

type Filtro = 'todos' | 'activos' | 'inactivos';
const POR_PAGINA = 9;

const iniciales = (nombre: string) =>
  nombre.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || '?';

const AdminProveedoresScreen: React.FC = () => {
  const navigate = useNavigate();
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [pagina, setPagina] = useState(1);

  useEffect(() => { cargarProveedores(); }, []);
  useEffect(() => { setPagina(1); }, [busqueda, filtro]);

  const cargarProveedores = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await proveedoresAPI.getAll();
      if (response.success) setProveedores(Array.isArray(response.data) ? response.data : []);
      else setError('Error al cargar los proveedores');
    } catch (err: any) {
      console.error('Error loading proveedores:', err);
      setError(err.message || 'Error al cargar los proveedores');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, nombre: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar al proveedor "${nombre}"?`)) return;
    try {
      const response = await proveedoresAPI.delete(id);
      if (response.success) cargarProveedores();
      else alert(response.message || 'Error al eliminar el proveedor');
    } catch (err: any) {
      alert(`Error al eliminar: ${err.message}`);
    }
  };

  const handleToggleStatus = async (id: number, activo: boolean) => {
    try {
      const response = await proveedoresAPI.toggleStatus(id, !activo);
      if (response.success) cargarProveedores();
      else alert(response.message || 'Error al cambiar el estado');
    } catch (err: any) {
      alert(`Error al cambiar estado: ${err.message}`);
    }
  };

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return proveedores.filter(p =>
      (filtro === 'todos' || (filtro === 'activos' ? p.activo : !p.activo)) &&
      (!q || [p.nombre, p.razon_social, p.rfc, p.email, p.persona_contacto].some(v => v?.toLowerCase().includes(q))));
  }, [proveedores, busqueda, filtro]);

  const activos = proveedores.filter(p => p.activo).length;
  const sinContacto = proveedores.filter(p => !p.email && !p.telefono).length;
  const totalPaginas = Math.max(1, Math.ceil(visibles.length / POR_PAGINA));
  const pag = visibles.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  return (
    <div className="av-page">
      <header className="av-hero">
        <div>
          <span className="av-hero-icono"><AiOutlineShop size={26} /></span>
          <span className="av-eyebrow">Compras</span>
          <h1 className="av-titulo">Tus <em>proveedores</em></h1>
          <p className="av-sub">Quién te surte cada pieza y cómo contactarlo. Los inactivos no aparecen al dar de alta productos.</p>
        </div>
        <div className="av-hero-acciones">
          <button className="av-btn" onClick={() => navigate('/admin/proveedor/nuevo')}><AiOutlinePlus size={17} /> Nuevo proveedor</button>
        </div>
      </header>

      <div className="av-kpis">
        <button className={`av-kpi ${filtro === 'todos' ? '' : ''}`} onClick={() => setFiltro('todos')}>
          <span className="av-kpi-icono"><AiOutlineShop size={20} /></span>
          <span><strong>{proveedores.length}</strong><small>Proveedores</small></span>
        </button>
        <button className={`av-kpi av-tono--ok ${filtro === 'activos' ? 'activo' : ''}`} onClick={() => setFiltro(filtro === 'activos' ? 'todos' : 'activos')}>
          <span className="av-kpi-icono"><AiOutlineCheckCircle size={20} /></span>
          <span><strong>{activos}</strong><small>Activos</small></span>
        </button>
        <button className={`av-kpi av-tono--apagado ${filtro === 'inactivos' ? 'activo' : ''}`} onClick={() => setFiltro(filtro === 'inactivos' ? 'todos' : 'inactivos')}>
          <span className="av-kpi-icono"><AiOutlineStop size={20} /></span>
          <span><strong>{proveedores.length - activos}</strong><small>Inactivos</small></span>
        </button>
        <div className="av-kpi av-tono--aviso">
          <span className="av-kpi-icono"><AiOutlineWarning size={20} /></span>
          <span><strong>{sinContacto}</strong><small>Sin datos de contacto</small></span>
        </div>
      </div>

      {error && <div className="av-alerta"><AiOutlineWarning size={18} /> {error}</div>}

      <div className="av-barra">
        <label className="av-buscar">
          <AiOutlineSearch size={18} />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por nombre, RFC, correo o contacto" />
        </label>
        <div className="av-segmento" role="group" aria-label="Filtrar">
          {(['todos', 'activos', 'inactivos'] as const).map(f => (
            <button key={f} className={filtro === f ? 'activo' : ''} onClick={() => setFiltro(f)}>
              {f === 'todos' ? 'Todos' : f === 'activos' ? 'Activos' : 'Inactivos'}
            </button>
          ))}
        </div>
        <button className="av-btn av-btn--sec av-btn--icono" onClick={cargarProveedores} disabled={loading} aria-label="Actualizar"><AiOutlineReload size={18} /></button>
      </div>

      {loading ? (
        <Loader texto="Cargando proveedores..." />
      ) : pag.length === 0 ? (
        <div className="av-vacio">
          <AiOutlineShop size={40} />
          <strong>{busqueda || filtro !== 'todos' ? 'Nada coincide con la búsqueda' : 'Aún no hay proveedores'}</strong>
          {!busqueda && filtro === 'todos' && (
            <button className="av-btn" onClick={() => navigate('/admin/proveedor/nuevo')}><AiOutlinePlus size={17} /> Agregar el primero</button>
          )}
        </div>
      ) : (
        <div className="pv3-grid">
          {pag.map(p => (
            <article key={p.id} className={`pv3-card ${!p.activo ? 'inactivo' : ''}`}>
              <div className="pv3-top">
                <div className="pv3-avatar">{p.imagen_url ? <img src={p.imagen_url} alt="" /> : iniciales(p.nombre)}</div>
                <div className="pv3-titulo">
                  <h3>{p.nombre}</h3>
                  <small>{p.razon_social && p.razon_social !== p.nombre ? p.razon_social : `Desde ${new Date(p.fecha_creacion).toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })}`}</small>
                </div>
                <button className={`pv3-switch ${p.activo ? 'on' : ''}`} onClick={() => handleToggleStatus(p.id, p.activo)}
                  role="switch" aria-checked={p.activo} title={p.activo ? 'Desactivar' : 'Activar'}><i /></button>
              </div>

              {p.notas && <p className="pv3-notas">{p.notas}</p>}

              <ul className="pv3-datos">
                <li><AiOutlineUser size={15} /> {p.persona_contacto || <em>Sin persona de contacto</em>}</li>
                <li><AiOutlineMail size={15} /> {p.email ? <a href={`mailto:${p.email}`}>{p.email}</a> : <em>Sin correo</em>}</li>
                <li><AiOutlinePhone size={15} /> {p.telefono ? <a href={`tel:${p.telefono.replace(/\s/g, '')}`}>{p.telefono}</a> : <em>Sin teléfono</em>}</li>
                <li><AiOutlineIdcard size={15} /> {p.rfc || <em>Sin RFC</em>}</li>
              </ul>

              <div className="pv3-pie">
                <span className={`av-pill av-pill--punto ${p.activo ? 'av-tono--ok' : 'av-tono--apagado'}`}>{p.activo ? 'Activo' : 'Inactivo'}</span>
                <div className="av-acciones">
                  <button className="av-accion" onClick={() => navigate(`/admin/proveedor/${p.id}`)} title="Ver detalle"><AiOutlineEye size={16} /></button>
                  <button className="av-accion" onClick={() => navigate(`/admin/editar-proveedor/${p.id}`)} title="Editar"><AiOutlineEdit size={16} /></button>
                  <button className="av-accion av-accion--peligro" onClick={() => handleDelete(p.id, p.nombre)} title="Eliminar"><AiOutlineDelete size={16} /></button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {!loading && visibles.length > POR_PAGINA && (
        <div className="av-paginas">
          <button className="av-accion" onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1} aria-label="Anterior"><AiOutlineLeft size={15} /></button>
          <span>Página <b>{pagina}</b> de <b>{totalPaginas}</b> · {visibles.length} proveedores</span>
          <button className="av-accion" onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas} aria-label="Siguiente"><AiOutlineRight size={15} /></button>
        </div>
      )}
    </div>
  );
};

export default AdminProveedoresScreen;
