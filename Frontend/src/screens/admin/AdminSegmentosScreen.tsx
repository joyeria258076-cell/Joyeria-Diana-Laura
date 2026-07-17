import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminSegmentosScreen.css';

/* ── Datos estáticos del modelo K-Means ── */
const SEGMENTOS = [
  { id: 0, nombre: 'Premium',     color: '#c9a84c', clientes: 18, descripcion: 'Alto ticket, compras frecuentes',  accion: 'Atención personalizada y piezas exclusivas' },
  { id: 1, nombre: 'Frecuente',   color: '#6b2d5e', clientes: 42, descripcion: 'Compran seguido, ticket moderado', accion: 'Programas de lealtad y descuentos por volumen' },
  { id: 2, nombre: 'Ocasional',   color: '#d4607e', clientes: 97, descripcion: 'Pocas compras, ticket bajo',       accion: 'Campañas de reactivación y promociones especiales' },
  { id: 3, nombre: 'De apartado', color: '#4a8c7a', clientes: 26, descripcion: 'Usan sistema de apartado',         accion: 'Facilidades de pago y recordatorios de apartado' },
];

const CLIENTES: { id: number; nombre: string; compras: number; ticket: number; monto_apartado: number; usa_apartados: boolean; segmento: number }[] = [
  { id: 12, nombre: 'María G.',   compras: 8,  ticket: 320, monto_apartado: 0,   usa_apartados: false, segmento: 1 },
  { id: 7,  nombre: 'Jorge R.',   compras: 12, ticket: 890, monto_apartado: 0,   usa_apartados: false, segmento: 0 },
  { id: 23, nombre: 'Ana P.',     compras: 1,  ticket: 180, monto_apartado: 0,   usa_apartados: false, segmento: 2 },
  { id: 15, nombre: 'Luis M.',    compras: 5,  ticket: 420, monto_apartado: 0,   usa_apartados: false, segmento: 0 },
  { id: 31, nombre: 'Rosa F.',    compras: 9,  ticket: 280, monto_apartado: 0,   usa_apartados: false, segmento: 1 },
  { id: 44, nombre: 'Pedro S.',   compras: 1,  ticket: 150, monto_apartado: 0,   usa_apartados: false, segmento: 2 },
  { id: 8,  nombre: 'Laura V.',   compras: 3,  ticket: 210, monto_apartado: 1200, usa_apartados: true, segmento: 3 },
  { id: 19, nombre: 'Carlos M.',  compras: 2,  ticket: 340, monto_apartado: 800, usa_apartados: true,  segmento: 3 },
  { id: 55, nombre: 'Diana R.',   compras: 15, ticket: 950, monto_apartado: 0,   usa_apartados: false, segmento: 0 },
  { id: 62, nombre: 'Sofía L.',   compras: 6,  ticket: 260, monto_apartado: 0,   usa_apartados: false, segmento: 1 },
];

/* Puntos del scatter para el mapa de clusters */
const SCATTER_PUNTOS = [
  { x: 72, y: 75, seg: 0 }, { x: 78, y: 68, seg: 0 }, { x: 65, y: 80, seg: 0 },
  { x: 82, y: 72, seg: 0 }, { x: 70, y: 65, seg: 0 },
  { x: 40, y: 45, seg: 1 }, { x: 35, y: 52, seg: 1 }, { x: 45, y: 38, seg: 1 },
  { x: 30, y: 48, seg: 1 }, { x: 50, y: 42, seg: 1 }, { x: 38, y: 55, seg: 1 },
  { x: 15, y: 18, seg: 2 }, { x: 20, y: 12, seg: 2 }, { x: 10, y: 22, seg: 2 },
  { x: 25, y: 15, seg: 2 }, { x: 12, y: 28, seg: 2 }, { x: 22, y: 20, seg: 2 },
  { x: 55, y: 25, seg: 3 }, { x: 60, y: 30, seg: 3 }, { x: 50, y: 20, seg: 3 },
  { x: 65, y: 28, seg: 3 }, { x: 58, y: 35, seg: 3 },
];

const AdminSegmentosScreen: React.FC = () => {
  const navigate = useNavigate();
  const [segSeleccionado, setSegSeleccionado] = useState<number | null>(null);
  const [filtroSeg, setFiltroSeg] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const clientesFiltrados = filtroSeg !== null
    ? CLIENTES.filter(c => c.segmento === filtroSeg)
    : CLIENTES;

  const handleEnviarPromocion = () => {
    if (segSeleccionado === null) return;
    setEnviando(true);
    setTimeout(() => { setEnviando(false); setEnviado(true); setTimeout(() => setEnviado(false), 3000); }, 1500);
  };

  const segActivo = segSeleccionado !== null ? SEGMENTOS[segSeleccionado] : null;

  return (
    <div className="seg-container">
      <div className="seg-wrapper">

        {/* Header */}
        <div className="seg-header">
          <button className="seg-btn-back" onClick={() => navigate('/admin-dashboard')}>
            ← Volver
          </button>
          <div>
            <p className="seg-eyebrow">Propuesta 3 · K-Means Clustering</p>
            <h1 className="seg-titulo">Panel de Segmentos de Clientes</h1>
          </div>
        </div>

        {/* ── TARJETAS DE SEGMENTOS ── */}
        <section className="seg-seccion">
          <h2 className="seg-subtitulo">Clientes por segmento</h2>
          <div className="seg-cards-grid">
            {SEGMENTOS.map(seg => (
              <button
                key={seg.id}
                className={`seg-card ${segSeleccionado === seg.id ? 'seg-card--activa' : ''}`}
                style={{ '--seg-color': seg.color } as React.CSSProperties}
                onClick={() => {
                  setSegSeleccionado(prev => prev === seg.id ? null : seg.id);
                  setFiltroSeg(prev => prev === seg.id ? null : seg.id);
                }}
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
                  <span className="seg-filtro-badge" style={{ background: SEGMENTOS[filtroSeg].color }}>
                    {SEGMENTOS[filtroSeg].nombre}
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
                    const seg = SEGMENTOS[c.segmento];
                    return (
                      <tr key={c.id}>
                        <td className="seg-td-id">{c.id}</td>
                        <td className="seg-td-nombre">{c.nombre}</td>
                        <td className="seg-td-num">{c.compras}</td>
                        <td className="seg-td-num">${c.ticket.toLocaleString('es-MX')}</td>
                        <td className="seg-td-num">{c.monto_apartado > 0 ? `$${c.monto_apartado.toLocaleString('es-MX')}` : '—'}</td>
                        <td>
                          <span className="seg-badge" style={{ background: seg.color + '22', color: seg.color, border: `1px solid ${seg.color}55` }}>
                            {seg.nombre}
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
            <h2 className="seg-subtitulo">Distribución (clusters)</h2>
            <div className="seg-scatter">
              <span className="seg-scatter-label-y">Ticket promedio →</span>
              {SCATTER_PUNTOS.map((p, i) => (
                <div
                  key={i}
                  className="seg-scatter-punto"
                  style={{
                    left: `${p.x}%`,
                    bottom: `${p.y}%`,
                    background: SEGMENTOS[p.seg].color,
                    opacity: segSeleccionado === null || segSeleccionado === p.seg ? 1 : 0.15,
                    transform: segSeleccionado === p.seg ? 'scale(1.5)' : 'scale(1)',
                  }}
                  title={SEGMENTOS[p.seg].nombre}
                />
              ))}
              <span className="seg-scatter-label-x">Nº compras →</span>
            </div>
            <div className="seg-scatter-leyenda">
              {SEGMENTOS.map(s => (
                <span key={s.id} className="seg-scatter-leyenda-item">
                  <span className="seg-scatter-dot" style={{ background: s.color }} />
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
            {SEGMENTOS.map(seg => (
              <div
                key={seg.id}
                className="seg-estrategia"
                style={{ '--seg-color': seg.color } as React.CSSProperties}
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
                <p className="seg-accion-sub">{segActivo.accion}</p>
                <button
                  className={`seg-accion-btn ${enviado ? 'seg-accion-btn--ok' : ''}`}
                  onClick={handleEnviarPromocion}
                  disabled={enviando || enviado}
                >
                  {enviando ? 'Enviando...' : enviado ? '✓ Promoción enviada' : 'Enviar promoción'}
                </button>
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
