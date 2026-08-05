// Ruta: Frontend/src/screens/admin/AdminMonitoreoOperacionScreen.tsx
// Vista de SOLO LECTURA para el admin: consulta pedidos y apartados, sin
// botones de accion (tomar, cambiar estado, confirmar pago, etc.) — esas
// acciones son exclusivas del trabajador (ver GestionPedidosScreen /
// GestionApartadosScreen), tanto en la UI como ya validado en el backend.
import React, { useEffect, useState } from 'react';
import { AiOutlineShoppingCart, AiOutlineFlag, AiOutlineEye } from 'react-icons/ai';
import { carritoAPI, apartadoAPI } from '../../services/api';
import Loader from '../../components/Loader';
import './AdminMonitoreoOperacionScreen.css';

type Tab = 'pedidos' | 'apartados';

const ESTADO_COLOR: Record<string, string> = {
    pendiente: '#f5c842', confirmado: '#6bcb77', en_preparacion: '#4d96ff',
    enviado: '#f5d8e8', entregado: '#c9956c', cancelado: '#e05a6a',
    activo: '#4d96ff', liquidado: '#4a8c7a', vencido: '#e05a6a', pendiente_pago: '#f5c842',
};

const AdminMonitoreoOperacionScreen: React.FC = () => {
    const [tab, setTab] = useState<Tab>('pedidos');
    const [pedidos, setPedidos] = useState<any[]>([]);
    const [apartados, setApartados] = useState<any[]>([]);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        const cargar = async () => {
            setCargando(true);
            try {
                if (tab === 'pedidos') {
                    const res = await carritoAPI.getAllPedidos();
                    if (res.success) setPedidos(res.data || []);
                } else {
                    const res = await apartadoAPI.getTodos(undefined, undefined, 1, false);
                    if (res.success) setApartados(res.data || []);
                }
            } finally {
                setCargando(false);
            }
        };
        cargar();
    }, [tab]);

    return (
        <main className="mop-page">
            <div className="mop-header">
                <h1>Monitoreo de Operación</h1>
                <p className="mop-sub">Vista de solo consulta — tomar pedidos, cambiar estados o confirmar pagos es trabajo exclusivo del personal trabajador.</p>
            </div>

            <div className="mop-tabs">
                <button className={`mop-tab ${tab === 'pedidos' ? 'activo' : ''}`} onClick={() => setTab('pedidos')}>
                    <AiOutlineShoppingCart size={15} /> Pedidos
                </button>
                <button className={`mop-tab ${tab === 'apartados' ? 'activo' : ''}`} onClick={() => setTab('apartados')}>
                    <AiOutlineFlag size={15} /> Apartados
                </button>
            </div>

            {cargando ? (
                <Loader texto={`Cargando ${tab}...`} />
            ) : tab === 'pedidos' ? (
                pedidos.length === 0 ? (
                    <div className="mop-vacio">No hay pedidos registrados.</div>
                ) : (
                    <div className="mop-tabla-wrap">
                        <table className="mop-tabla">
                            <thead>
                                <tr>
                                    <th>Folio</th><th>Cliente</th><th>Estado</th>
                                    <th>Tomado por</th><th>Total</th><th>Fecha</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pedidos.map(p => (
                                    <tr key={p.id}>
                                        <td>{p.folio}</td>
                                        <td>{p.cliente_nombre_completo || '—'}</td>
                                        <td>
                                            <span className="mop-badge" style={{ background: `${ESTADO_COLOR[p.estado] || '#888'}22`, color: ESTADO_COLOR[p.estado] || '#ccc', borderColor: `${ESTADO_COLOR[p.estado] || '#888'}55` }}>
                                                {p.estado?.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td>{p.trabajador_asignado_nombre || <span className="mop-sin-asignar">Sin asignar</span>}</td>
                                        <td>${Number(p.total).toLocaleString('es-MX')}</td>
                                        <td>{new Date(p.fecha_creacion).toLocaleDateString('es-MX')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            ) : (
                apartados.length === 0 ? (
                    <div className="mop-vacio">No hay apartados registrados.</div>
                ) : (
                    <div className="mop-tabla-wrap">
                        <table className="mop-tabla">
                            <thead>
                                <tr>
                                    <th>Folio</th><th>Cliente</th><th>Estado</th>
                                    <th>Pagado</th><th>Saldo</th><th>Fecha límite</th>
                                </tr>
                            </thead>
                            <tbody>
                                {apartados.map(a => (
                                    <tr key={a.id}>
                                        <td>{a.folio}</td>
                                        <td>{a.cliente_nombre || '—'}</td>
                                        <td>
                                            <span className="mop-badge" style={{ background: `${ESTADO_COLOR[a.estado] || '#888'}22`, color: ESTADO_COLOR[a.estado] || '#ccc', borderColor: `${ESTADO_COLOR[a.estado] || '#888'}55` }}>
                                                {a.estado?.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td>${Number(a.monto_pagado).toLocaleString('es-MX')}</td>
                                        <td>${Number(a.saldo_pendiente).toLocaleString('es-MX')}</td>
                                        <td>{a.fecha_limite_liquidacion ? new Date(a.fecha_limite_liquidacion).toLocaleDateString('es-MX') : '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            )}

            <p className="mop-nota"><AiOutlineEye size={13} /> Esta pantalla es solo informativa. Para gestionar pedidos o apartados, contacta a un trabajador.</p>
        </main>
    );
};

export default AdminMonitoreoOperacionScreen;
