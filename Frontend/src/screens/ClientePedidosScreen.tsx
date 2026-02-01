import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/ClientePedidosScreen.css'; // Asegúrate de crear este CSS o mover los estilos del HTML

interface Pedido {
    id: string;
    fecha: string;
    estado: 'Pendiente' | 'Entregado' | 'En Tránsito' | 'Cancelado';
    total: number;
}

const ClientePedidosScreen: React.FC = () => {
    const navigate = useNavigate();

    // Datos estáticos de ejemplo basados en tu HTML
    const pedidos: Pedido[] = [
        { id: "#ORD-001", fecha: "15/12/2024", estado: "Entregado", total: 847 },
        { id: "#ORD-002", fecha: "10/12/2024", estado: "En Tránsito", total: 520 },
    ];

    // Helper para el color de los badges de estado
    const getBadgeStyle = (estado: string) => {
        switch (estado) {
            case 'Entregado': return { backgroundColor: '#ECB2C3', color: '#0f0f12' };
            case 'En Tránsito': return { backgroundColor: '#f5d8e8', color: '#0f0f12' };
            default: return { backgroundColor: '#d4b5c8', color: '#0f0f12' };
        }
    };

    return (
        <main className="pedidos-container" style={{ padding: '3rem 2rem' }}>
            <div className="container-fluid">
                {/* --- HEADER DE SECCIÓN --- */}
                <div className="d-flex justify-content-between align-items-center mb-5">
                    <h2 className="text-white mb-0" style={{ fontFamily: "'Playfair Display', serif" }}>
                        Mis Pedidos
                    </h2>
                    <button 
                        className="btn" 
                        style={{ backgroundColor: '#ECB2C3', color: '#0f0f12', fontWeight: 600 }}
                        onClick={() => navigate('/catalogo')}
                    >
                        <i className="fas fa-plus me-2"></i> Crear Pedido
                    </button>
                </div>

                {/* --- CARDS DE ESTADO --- */}
                <div className="row g-3 mb-5">
                    {[
                        { label: 'Pendientes', icon: 'fa-hourglass-half', value: '2' },
                        { label: 'Entregados', icon: 'fa-box', value: '8' },
                        { label: 'Completados', icon: 'fa-check-circle', value: '12' },
                        { label: 'Historial', icon: 'fa-clock', value: '22' }
                    ].map((stat, idx) => (
                        <div key={idx} className="col-lg-3 col-md-6">
                            <div className="status-card border rounded p-4 text-center">
                                <i className={`fas ${stat.icon}`} style={{ fontSize: '2rem', color: '#ECB2C3', marginBottom: '1rem' }}></i>
                                <h6 className="text-white mb-1">{stat.label}</h6>
                                <p style={{ color: '#d4b5c8', fontSize: '1.3rem', margin: 0, fontWeight: 600 }}>{stat.value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* --- TABLA DE PEDIDOS --- */}
                <div className="table-container border rounded">
                    <div className="table-responsive">
                        <table className="table mb-0" style={{ color: 'white', borderColor: '#ECB2C3' }}>
                            <thead>
                                <tr>
                                    <th className="p-3">Número de Pedido</th>
                                    <th className="p-3">Fecha</th>
                                    <th className="p-3">Estado</th>
                                    <th className="p-3">Total</th>
                                    <th className="p-3 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pedidos.map((pedido) => (
                                    <tr key={pedido.id} style={{ borderBottom: '1px solid #ECB2C3' }}>
                                        <td className="p-3">{pedido.id}</td>
                                        <td className="p-3">{pedido.fecha}</td>
                                        <td className="p-3">
                                            <span className="badge" style={getBadgeStyle(pedido.estado)}>
                                                {pedido.estado}
                                            </span>
                                        </td>
                                        <td className="p-3" style={{ color: '#ECB2C3', fontWeight: 600 }}>
                                            ${pedido.total.toLocaleString()}
                                        </td>
                                        <td className="p-3 text-center">
                                            <button className="btn btn-sm action-btn">
                                                <i className="fas fa-eye"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* --- FOOTER (Integrado al final del scroll del contenido) --- */}
            <footer className="mt-5 pt-5 border-top" style={{ borderColor: '#ECB2C3 !important' }}>
                <div className="row mb-4">
                    <div className="col-lg-3 col-md-6 mb-3">
                        <h6 className="text-white mb-3">Contacto</h6>
                        <p className="small" style={{ color: '#d4b5c8' }}>
                            <span style={{ color: '#ECB2C3' }}>info@dianaalaura.com</span><br />
                            <span style={{ color: '#ECB2C3' }}>+1 (234) 567-890</span>
                        </p>
                    </div>
                    <div className="col-lg-3 col-md-6 mb-3">
                        <h6 className="text-white mb-3">Acerca de</h6>
                        <p className="small" style={{ color: '#d4b5c8' }}>
                            Joyería y Bisutería con esencia femenina. Diseños exclusivos y de calidad.
                        </p>
                    </div>
                    <div className="col-lg-3 col-md-6 mb-3">
                        <h6 className="text-white mb-3">Ubicación</h6>
                        <p className="small" style={{ color: '#d4b5c8' }}>Calle Principal 123<br />Ciudad, Estado 12345</p>
                    </div>
                    <div className="col-lg-3 col-md-6 mb-3">
                        <h6 className="text-white mb-3">Redes Sociales</h6>
                        <div className="social-icons">
                            <i className="fab fa-instagram me-3" style={{ color: '#ECB2C3' }}></i>
                            <i className="fab fa-facebook me-3" style={{ color: '#ECB2C3' }}></i>
                            <i className="fab fa-tiktok" style={{ color: '#ECB2C3' }}></i>
                        </div>
                    </div>
                </div>
                <hr style={{ borderColor: '#ECB2C3' }} />
            </footer>
        </main>
    );
};

export default ClientePedidosScreen;