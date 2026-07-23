import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { segmentacionAPI, type ClienteSegmentado, type Segmento } from '../../services/api';
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
  const navigate = useNavigate();
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
      <div className="seg-container">
        <div className="seg-wrapper">
          <p style={{ textAlign: 'center', padding: '4rem', opacity: 0.7 }}>Calculando segmentos con K-Means...</p>
        </div>
      </div>
    );
  }

  if (error || segmentos.length === 0) {
    return (
      <div className="seg-container">
        <div className="seg-wrapper">
          <p style={{ textAlign: 'center', padding: '4rem', opacity: 0.7 }}>
            No se pudo cargar la segmentación. Verifica que el microservicio ML esté disponible.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="seg-container">
      <div className="seg-wrapper">

        {/* Header */}
        <div className="seg-header">
          <div>
            <p className="seg-eyebrow">Propuesta 3 · K-Means Clustering</p>
            <h1 className="seg-titulo">Panel de Segmentos de Clientes</h1>
          </div>
        </div>

        {/* ── TARJETAS DE SEGMENTOS ── */}
        <section className="seg-seccion">
          <h2 className="seg-subtitulo">Clientes por segmento ({clientes.length} en total)</h2>
          <div className="seg-cards-grid">
            {segmentos.map(seg => (
              <button
                key={seg.nombre}
                className={`seg-card ${segSeleccionado === seg.nombre ? 'seg-card--activa' : ''}`}
                style={{ '--seg-color': colorDeSegmento(seg.nombre) } as React.CSSProperties}
                onClick={() => seleccionarSegmento(seg)}
              >
                <div className="seg-card-circulo" />
                <div className="seg-card-info">
                  <span className="seg-card-nombre">{seg.nombre}</span>
                  <span className="seg-card-count">{seg.clientes} clientes</span>
                  <span className="seg-card-desc">{seg.descripcion}</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ── TABLA + SCATTER ── */}
        <div className="seg-medio">

          {/* Tabla de clientes */}
          <section className="seg-seccion seg-tabla-seccion">
            <div className="seg-tabla-header">
              <h2 className="seg-subtitulo" style={{ margin: 0 }}>
                Lista de clientes
                {filtroSeg !== null && (
                  <span className="seg-filtro-badge" style={{ background: colorDeSegmento(filtroSeg) }}>
                    {filtroSeg}
                  </span>
                )}
              </h2>
              {filtroSeg !== null && (
                <button className="seg-clear-btn" onClick={() => { setFiltroSeg(null); setSegSeleccionado(null); }}>
                  Ver todos
                </button>
              )}
            </div>

            <div className="seg-tabla-wrap">
              <table className="seg-tabla">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Compras</th>
                    <th>Ticket Prom.</th>
                    <th>Monto Apart.</th>
                    <th>Segmento</th>
                  </tr>
                </thead>
                <tbody>
                  {clientesFiltrados.map(c => {
                    const color = colorDeSegmento(c.segmento);
                    return (
                      <tr key={c.id}>
                        <td className="seg-td-id">{c.id}</td>
                        <td className="seg-td-nombre">{c.nombre}</td>
                        <td className="seg-td-num">{c.num_compras}</td>
                        <td className="seg-td-num">${c.ticket_promedio.toLocaleString('es-MX')}</td>
                        <td className="seg-td-num">{c.monto_apartado_promedio > 0 ? `$${c.monto_apartado_promedio.toLocaleString('es-MX')}` : '—'}</td>
                        <td>
                          <span className="seg-badge" style={{ background: color + '22', color, border: `1px solid ${color}55` }}>
                            {c.segmento}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Mapa de clusters */}
          <section className="seg-seccion seg-scatter-seccion">
            <h2 className="seg-subtitulo">Distribución (clusters, proyección PCA)</h2>
            <div className="seg-scatter">
              <span className="seg-scatter-label-y">Componente 2 →</span>
              {puntosScatter.map((p, i) => (
                <div
                  key={i}
                  className="seg-scatter-punto"
                  style={{
                    left: `${p.x}%`,
                    bottom: `${p.y}%`,
                    background: colorDeSegmento(p.segmento),
                    opacity: segSeleccionado === null || segSeleccionado === p.segmento ? 1 : 0.15,
                    transform: segSeleccionado === p.segmento ? 'scale(1.5)' : 'scale(1)',
                  }}
                  title={p.segmento}
                />
              ))}
              <span className="seg-scatter-label-x">Componente 1 →</span>
            </div>
            <div className="seg-scatter-leyenda">
              {segmentos.map(s => (
                <span key={s.nombre} className="seg-scatter-leyenda-item">
                  <span className="seg-scatter-dot" style={{ background: colorDeSegmento(s.nombre) }} />
                  {s.nombre}
                </span>
              ))}
            </div>
          </section>

        </div>

        {/* ── ACCIONES SUGERIDAS ── */}
        <div className="seg-acciones-layout">
          <section className="seg-seccion seg-leyenda-seccion">
            <h2 className="seg-subtitulo">Estrategias por segmento</h2>
            {segmentos.map(seg => (
              <div
                key={seg.nombre}
                className="seg-estrategia"
                style={{ '--seg-color': colorDeSegmento(seg.nombre) } as React.CSSProperties}
              >
                <span className="seg-estrategia-dot" />
                <div>
                  <strong>{seg.nombre}</strong>
                  <span> → {seg.accion}</span>
                </div>
              </div>
            ))}
          </section>

          <section className="seg-seccion seg-accion-seccion">
            <p className="seg-accion-eyebrow">Acción sugerida</p>
            {segActivo ? (
              <>
                <p className="seg-accion-texto">
                  Enviar promoción personalizada al segmento <strong>"{segActivo.nombre}"</strong>
                </p>
                <p className="seg-accion-sub">Estrategia sugerida: {segActivo.accion}</p>

                <div className="seg-personalizar">
                  <label className="seg-personalizar-label">Asunto del correo</label>
                  <input
                    className="seg-personalizar-input"
                    value={asuntoPersonalizado}
                    onChange={e => setAsuntoPersonalizado(e.target.value)}
                    placeholder={ASUNTO_DEFAULT}
                    maxLength={150}
                  />

                  <label className="seg-personalizar-label">Mensaje personalizado</label>
                  <textarea
                    className="seg-personalizar-textarea"
                    value={mensajePersonalizado}
                    onChange={e => setMensajePersonalizado(e.target.value)}
                    placeholder={segActivo.accion}
                    rows={4}
                    maxLength={500}
                  />
                  <span className="seg-personalizar-contador">{mensajePersonalizado.length}/500</span>
                </div>

                <button
                  className={`seg-accion-btn ${enviado ? 'seg-accion-btn--ok' : ''}`}
                  onClick={handleEnviarPromocion}
                  disabled={enviando || enviado || !mensajePersonalizado.trim()}
                >
                  {enviando ? 'Enviando...' : enviado ? '✓ Promoción enviada' : 'Enviar promoción'}
                </button>
                {errorEnvio && <p className="seg-accion-error">{errorEnvio}</p>}
              </>
            ) : (
              <p className="seg-accion-placeholder">
                Selecciona un segmento arriba para ver la acción recomendada y enviar una promoción
              </p>
            )}
          </section>
        </div>

      </div>
    </div>
  );
};

export default AdminSegmentosScreen;
