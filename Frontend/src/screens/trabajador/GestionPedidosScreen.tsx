import React from 'react';
import './GestionPedidosScreen.css';

interface Pedido {
    id: string;
    cliente: string;
    productos: string;
    fecha: string;
    total: number;
    estado: 'En espera' | 'Pendiente' | 'Entregada' | 'Aceptada';
}

const GestionPedidosScreen: React.FC = () => {
    const pedidos: Pedido[] = [
        { id: '#PED-001', cliente: 'Ana López', productos: '2 productos', fecha: '15/12/2024', total: 209.98, estado: 'En espera' },
        { id: '#PED-002', cliente: 'Carlos Gómez', productos: '1 producto', fecha: '14/12/2024', total: 129.99, estado: 'Pendiente' },
        { id: '#PED-003', cliente: 'Diana Martínez', productos: '3 productos', fecha: '13/12/2024', total: 299.97, estado: 'Entregada' },
        { id: '#PED-004', cliente: 'Elena Rodríguez', productos: '2 productos', fecha: '12/12/2024', total: 209.98, estado: 'Aceptada' },
    ];

    const getStatusClass = (estado: string) => {
        switch (estado) {
            case 'En espera': return 'status-pending';
            case 'Pendiente': return 'status-waiting';
            case 'Entregada': return 'status-delivered';
            case 'Aceptada': return 'status-accepted';
            default: return '';
        }
    };

    return (
        <div className="gestion-pedidos-container">
            <div className="page-header">
                <h2>Gestión de Pedidos</h2>
            </div>

            <div className="tabs-container">
                <button className="tab-item active">Estado</button>
                <button className="tab-item">Historial</button>
            </div>

            <div className="table-responsive-custom">
                <table className="custom-table">
                    <thead>
                        <tr>
                            <th>ID Pedido</th>
                            <th>Cliente</th>
                            <th>Productos</th>
                            <th>Fecha</th>
                            <th>Total</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pedidos.map((pedido) => (
                            <tr key={pedido.id}>
                                <td>{pedido.id}</td>
                                <td>{pedido.cliente}</td>
                                <td>{pedido.productos}</td>
                                <td>{pedido.fecha}</td>
                                <td>${pedido.total.toFixed(2)}</td>
                                <td>
                                    <span className={`status-badge ${getStatusClass(pedido.estado)}`}>
                                        {pedido.estado}
                                    </span>
                                </td>
                                <td>
                                    <div className="action-buttons">
                                        <button className="btn-view" title="Ver detalle">
                                            <i className="fas fa-eye"></i> Ver
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default GestionPedidosScreen;