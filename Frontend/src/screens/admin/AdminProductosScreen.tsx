import React, { useState } from 'react';
import './AdminProductosScreen.css';

interface Producto {
  id: number;
  nombre: string;
  sku: string;
  categoria: string;
  precio: number;
  stock: number;
}

const AdminProductosScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState('altas');
  
  // Datos de ejemplo (esto vendría de tu API en el futuro)
  const [productos] = useState<Producto[]>([
    { id: 1, nombre: 'Anillo Estrella', sku: 'SKU-001', categoria: 'Anillos', precio: 89.99, stock: 125 },
    { id: 2, nombre: 'Collar Elegancia', sku: 'SKU-002', categoria: 'Collares', precio: 129.99, stock: 98 },
    { id: 3, nombre: 'Aretes Diamante', sku: 'SKU-003', categoria: 'Aretes', precio: 79.99, stock: 156 },
  ]);

  return (
    <div className="admin-productos-container">
      <div className="admin-page-header">
        <h2>Gestión de Productos</h2>
        <button className="btn-add-product">
          <i className="fas fa-plus"></i> Agregar Producto
        </button>
      </div>

      {/* TABS DE NAVEGACIÓN */}
      <div className="admin-tabs">
        <button 
          className={`tab-btn ${activeTab === 'altas' ? 'active' : ''}`}
          onClick={() => setActiveTab('altas')}
        >
          Altas
        </button>
        <button 
          className={`tab-btn ${activeTab === 'bajas' ? 'active' : ''}`}
          onClick={() => setActiveTab('bajas')}
        >
          Bajas
        </button>
        <button 
          className={`tab-btn ${activeTab === 'actualizacion' ? 'active' : ''}`}
          onClick={() => setActiveTab('actualizacion')}
        >
          Actualización
        </button>
      </div>

      {/* TABLA DE PRODUCTOS */}
      <div className="admin-table-responsive">
        <table className="admin-custom-table">
          <thead>
            <tr>
              <th>Nombre Producto</th>
              <th>SKU</th>
              <th>Categoría</th>
              <th>Precio</th>
              <th>Stock</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productos.map((prod) => (
              <tr key={prod.id}>
                <td>{prod.nombre}</td>
                <td><span className="sku-badge">{prod.sku}</span></td>
                <td>{prod.categoria}</td>
                <td>${prod.precio.toFixed(2)}</td>
                <td>
                  <span className="stock-count">{prod.stock} unidades</span>
                </td>
                <td>
                  <div className="admin-actions">
                    <button className="btn-action-edit" title="Editar">
                      <i className="fas fa-edit"></i>
                    </button>
                    <button className="btn-action-delete" title="Eliminar">
                      <i className="fas fa-trash"></i>
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

export default AdminProductosScreen;