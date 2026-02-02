import React from 'react';
import '../styles/AdminReportesScreen.css';

const AdminReportesScreen: React.FC = () => {
  const reportes = [
    {
      id: 1,
      titulo: 'Ventas Totales',
      descripcion: 'Análisis completo de las ventas por período, productos y clientes.',
      icon: 'fa-chart-line'
    },
    {
      id: 2,
      titulo: 'Productos Más Vendidos',
      descripcion: 'Listado de los productos con mayor demanda y ventas del período.',
      icon: 'fa-star'
    },
    {
      id: 3,
      titulo: 'Performance Trabajadores',
      descripcion: 'Análisis del desempeño e indicadores de cada miembro del equipo.',
      icon: 'fa-users'
    }
  ];

  return (
    <div className="admin-reportes-container">
      <h2 className="section-title">Reportes y Análisis</h2>
      
      <div className="report-cards-grid">
        {reportes.map((reporte) => (
          <div key={reporte.id} className="report-item-card">
            <div className="report-icon-wrapper">
              <i className={`fas ${reporte.icon}`}></i>
            </div>
            <h4>{reporte.titulo}</h4>
            <p>{reporte.descripcion}</p>
            <button className="btn-view-report">
              Ver Reporte <i className="fas fa-arrow-right"></i>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminReportesScreen;