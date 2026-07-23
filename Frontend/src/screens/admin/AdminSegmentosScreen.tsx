import React, { useEffect, useState } from 'react';
import { segmentacionAPI, type ClienteSegmentado, type Segmento } from '../../services/api';
import { AiOutlineUsergroupAdd, AiOutlineDotChart, AiOutlineMail, AiOutlineCheckCircle } from 'react-icons/ai';
import './AdminSegmentosScreen.css';

/* Colores fijos por nombre de segmento (el modelo K-Means siempre produce estos 3) */
const COLORES_SEGMENTO: Record<string, string> = {
  'Cliente Frecuente de Alto Gasto': '#c9a84c',
  'Cliente Ocasional': '#d4607e',
  'Cliente Apartador': '#4a8c7a',
};

const colorDeSegmento = (nombre: string) => COLORES_SEGMENTO[nombre] || '#a06de0';

/* Normaliza pca_x/pca_y (rango real, puede ser negativo) a porcentaje 0-100 para el scatter */
function normalizarPuntos(clientes: ClienteSegmentado[]) {
  if (clientes.length === 0) return [];
  const xs = clientes.map(c => c.pca_x);
  const ys = clientes.map(c => c.pca_y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const rangoX = maxX - minX || 1;
  const rangoY = maxY - minY || 1;

  return clientes.map(c => ({
    x: 8 + ((c.pca_x - minX) / rangoX) * 84,
    y: 8 + ((c.pca_y - minY) / rangoY) * 84,
    segmento: c.segmento,
  }));
}

const AdminSegmentosScreen: React.FC = () => {
  const [segmentos, setSegmentos] = useState<Segmento[]>([]);
  const [clientes, setClientes] = useState<ClienteSegmentado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  const [segSeleccionado, setSegSeleccionado] = useState<string | null>(null);
  const [filtroSeg, setFiltroSeg] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState('');
  const [asuntoPersonalizado, setAsuntoPersonalizado] = useState('');
  const [mensajePersonalizado, setMensajePersonalizado] = useState('');

  const ASUNTO_DEFAULT = 'Una oferta especial para ti, de parte de Joyería Diana Laura';

  const seleccionarSegmento = (seg: Segmento) => {
    setSegSeleccionado(prev => {
      const nuevo = prev === seg.nombre ? null : seg.nombre;
      if (nuevo) { setAsuntoPersonalizado(ASUNTO_DEFAULT); setMensajePersonalizado(seg.accion); }
      return nuevo;
    });
    setFiltroSeg(prev => prev === seg.nombre ? null : seg.nombre);
  };

  useEffect(() => {
    segmentacionAPI.obtener().then(res => {
      if (!res) { setError(true); setCargando(false); return; }
      setSegmentos(res.segmentos);
      setClientes(res.clientes);
      setCargando(false);
    });
  }, []);

  const clientesFiltrados = filtroSeg !== null
    ? clientes.filter(c => c.segmento === filtroSeg)
    : clientes;

  const puntosScatter = normalizarPuntos(clientes);

  const handleEnviarPromocion = async () => {
    if (segSeleccionado === null) return;
    const seg = segmentos.find(s => s.nombre === segSeleccionado);
    if (!seg) return;

    const clienteIds = clientes.filter(c => c.segmento === segSeleccionado).map(c => c.id);
    if (clienteIds.length === 0) return;

    setEnviando(true);
    setErrorEnvio('');

    const resultado = await segmentacionAPI.enviarPromocion({
      cliente_ids: clienteIds,
      segmento: segSeleccionado,
      asunto: asuntoPersonalizado.trim() || ASUNTO_DEFAULT,
      mensaje: mensajePersonalizado.trim() || seg.accion,
    });

    setEnviando(false);
    const enviados = resultado.enviados ?? 0;
    const fallidos = resultado.fallidos ?? 0;

    if (resultado.success && enviados > 0 && fallidos === 0) {
      setEnviado(true);
      setTimeout(() => setEnviado(false), 4000);
    } else if (resultado.success && enviados > 0 && fallidos > 0) {
      setErrorEnvio(`Se enviaron ${enviados} de ${enviados + fallidos} correos. ${fallidos} fallaron (revisa los emails de esos clientes).`);
    } else {
      setErrorEnvio(resultado.message || `No se pudo enviar ningún correo (0 de ${enviados + fallidos}). Verifica la configuración de Brevo en el servidor.`);
    }
  };

  const segActivo = segSeleccionado !== null ? segmentos.find(s => s.nombre === segSeleccionado) ?? null : null;

  if (cargando) {
    return (
      <div className="sg-wrap">
        <p className="sg-estado">Calculando segmentos con K-Means...</p>
      </div>
    );
  }

  if (error || segmentos.length === 0) {
    return (
      <div className="sg-wrap">
        <p className="sg-estado">No se pudo cargar la segmentación. Verifica que el microservicio ML esté disponible.</p>
      </div>
    );
  }

  return (
    <div className="sg-wrap animate-in">
      <div className="sg-header">
        <h1 className="sg-titulo"><AiOutlineUsergroupAdd size={22} /> Segmentos de Clientes</h1>
        <p className="sg-subtitulo">Clasificación automática con K-Means · {clientes.length} clientes analizados</p>
      </div>

      {/* ── Tarjetas de segmento ── */}
      <div className="sg-segmentos-grid">
        {segmentos.map(seg => (
          <button
            key={seg.nombre}
            className={`sg-seg-card${segSeleccionado === seg.nombre ? ' sel' : ''}`}
            style={{ '--seg-color': colorDeSegmento(seg.nombre) } as React.CSSProperties}
            onClick={() => seleccionarSegmento(seg)}
          >
            <span className="sg-seg-count">{seg.clientes}</span>
            <span className="sg-seg-nombre">{seg.nombre}</span>
            <span className="sg-seg-desc">{seg.descripcion}</span>
          </button>
        ))}
      </div>

      <div className="sg-layout">
        {/* ── Columna principal: tabla ── */}
        <div className="sg-main">
          <div className="sg-tabla-head">
            <h3>Lista de clientes</h3>
            {filtroSeg !== null && (
              <div className="sg-filtro-activo">
                <span className="sg-filtro-dot" style={{ background: colorDeSegmento(filtroSeg) }} />
                {filtroSeg}
                <button onClick={() => { setFiltroSeg(null); setSegSeleccionado(null); }}>Ver todos</button>
              </div>
            )}
          </div>

          <div className="sg-tabla-wrap">
            <table className="sg-tabla">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Compras</th>
                  <th>Ticket prom.</th>
                  <th>Monto apart.</th>
                  <th>Segmento</th>
                </tr>
              </thead>
              <tbody>
                {clientesFiltrados.map(c => {
                  const color = colorDeSegmento(c.segmento);
                  return (
                    <tr key={c.id}>
                      <td className="sg-td-muted">{c.id}</td>
                      <td className="sg-td-nombre">{c.nombre}</td>
                      <td className="sg-td-muted">{c.num_compras}</td>
                      <td className="sg-td-muted">${c.ticket_promedio.toLocaleString('es-MX')}</td>
                      <td className="sg-td-muted">{c.monto_apartado_promedio > 0 ? `$${c.monto_apartado_promedio.toLocaleString('es-MX')}` : '—'}</td>
                      <td>
                        <span className="sg-badge" style={{ color, borderColor: color + '55', background: color + '18' }}>
                          {c.segmento}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Barra lateral: mapa de clusters + acción ── */}
        <aside className="sg-side">
          <div className="sg-card">
            <h3><AiOutlineDotChart size={16} /> Distribución de clusters</h3>
            <div className="sg-scatter">
              {puntosScatter.map((p, i) => (
                <div
                  key={i}
                  className="sg-scatter-punto"
                  style={{
                    left: `${p.x}%`,
                    bottom: `${p.y}%`,
                    background: colorDeSegmento(p.segmento),
                    opacity: segSeleccionado === null || segSeleccionado === p.segmento ? 1 : 0.15,
                    transform: segSeleccionado === p.segmento ? 'scale(1.6)' : 'scale(1)',
                  }}
                  title={p.segmento}
                />
              ))}
            </div>
            <div className="sg-scatter-leyenda">
              {segmentos.map(s => (
                <span key={s.nombre} className="sg-scatter-leyenda-item">
                  <span className="sg-scatter-dot" style={{ background: colorDeSegmento(s.nombre) }} />
                  {s.nombre}
                </span>
              ))}
            </div>
          </div>

          <div className="sg-card">
            <h3><AiOutlineMail size={16} /> Acción sugerida</h3>
            {segActivo ? (
              <>
                <p className="sg-accion-texto">
                  Enviar promoción a <strong style={{ color: colorDeSegmento(segActivo.nombre) }}>{segActivo.nombre}</strong>
                </p>
                <p className="sg-accion-sub">{segActivo.accion}</p>

                <label className="sg-label">Asunto del correo</label>
                <input
                  className="sg-input"
                  value={asuntoPersonalizado}
                  onChange={e => setAsuntoPersonalizado(e.target.value)}
                  placeholder={ASUNTO_DEFAULT}
                  maxLength={150}
                />

                <label className="sg-label">Mensaje personalizado</label>
                <textarea
                  className="sg-textarea"
                  value={mensajePersonalizado}
                  onChange={e => setMensajePersonalizado(e.target.value)}
                  placeholder={segActivo.accion}
                  rows={4}
                  maxLength={500}
                />
                <span className="sg-contador">{mensajePersonalizado.length}/500</span>

                <button
                  className={`sg-btn-enviar${enviado ? ' sg-btn-enviar--ok' : ''}`}
                  onClick={handleEnviarPromocion}
                  disabled={enviando || enviado || !mensajePersonalizado.trim()}
                >
                  {enviando ? 'Enviando...' : enviado ? (<><AiOutlineCheckCircle size={15} /> Promoción enviada</>) : 'Enviar promoción'}
                </button>
                {errorEnvio && <p className="sg-accion-error">{errorEnvio}</p>}
              </>
            ) : (
              <p className="sg-accion-placeholder">Selecciona un segmento arriba para ver la acción recomendada y enviar una promoción.</p>
            )}
          </div>

          <div className="sg-estrategias">
            <h4>Estrategias por segmento</h4>
            {segmentos.map(seg => (
              <div key={seg.nombre} className="sg-estrategia-row">
                <span className="sg-estrategia-dot" style={{ background: colorDeSegmento(seg.nombre) }} />
                <div>
                  <strong>{seg.nombre}</strong>
                  <span> — {seg.accion}</span>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default AdminSegmentosScreen;
