import React, { useState, useEffect } from 'react';
import './AdminProductosScreen.css';
import { productsAPI } from '../../services/api';

interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
  imagen_url?: string;
  categoria_nombre?: string;
}

interface Categoria {
  id: number;
  nombre: string;
}

const AdminProductosScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState('bajas');
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(false);

  const [nuevoProducto, setNuevoProducto] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    stock: '',
    categoria_id: '',
    categoria_nombre: '', // 👈 Campo para escribir categorías nuevas
    imagen_url: ''
  });

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        productsAPI.getAll(),
        productsAPI.getCategories()
      ]);
      
      setProductos(Array.isArray(prodRes) ? prodRes : (prodRes.data || []));
      setCategorias(Array.isArray(catRes) ? catRes : (catRes.data || []));
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoProducto.nombre || !nuevoProducto.precio || (!nuevoProducto.categoria_id && !nuevoProducto.categoria_nombre)) {
      alert("Faltan datos obligatorios (Nombre, Precio y Categoría)");
      return;
    }

    try {
      await productsAPI.create({
        ...nuevoProducto,
        precio: parseFloat(nuevoProducto.precio),
        stock: parseInt(nuevoProducto.stock) || 0,
        // Si no seleccionó de la lista, el backend usará categoria_nombre
        categoria_id: nuevoProducto.categoria_id ? parseInt(nuevoProducto.categoria_id) : null,
        categoria_nombre: nuevoProducto.categoria_nombre
      });
      
      alert("✅ Producto creado con éxito");
      setNuevoProducto({ nombre: '', descripcion: '', precio: '', stock: '', categoria_id: '', categoria_nombre: '', imagen_url: '' });
      cargarDatos();
      setActiveTab('bajas');
    } catch (error: any) {
      alert("❌ Error al crear: " + error.message);
    }
  };

  const handleEliminar = async (id: number) => {
    if (!window.confirm("¿Deseas eliminar este producto?")) return;
    try {
      await productsAPI.delete(id);
      alert("🗑️ Producto eliminado");
      cargarDatos();
    } catch (error: any) {
      alert("❌ Error: " + error.message);
    }
  };

  return (
    <div className="admin-productos-container">
      <div className="admin-page-header">
        <h2>Gestión de Inventario</h2>
        <button className="btn-refresh" onClick={cargarDatos}>🔄 Recargar</button>
      </div>

      <div className="admin-tabs">
        <button className={`tab-btn ${activeTab === 'altas' ? 'active' : ''}`} onClick={() => setActiveTab('altas')}>+ Registrar Nuevo</button>
        <button className={`tab-btn ${activeTab === 'bajas' ? 'active' : ''}`} onClick={() => setActiveTab('bajas')}>Lista e Inventario</button>
      </div>

      {activeTab === 'altas' && (
        <div className="form-container-admin">
          <h3>Registrar Nuevo Producto</h3>
          <form onSubmit={handleCrear} className="admin-form">
            <div className="form-group">
              <label>Nombre:</label>
              <input type="text" value={nuevoProducto.nombre} onChange={e => setNuevoProducto({...nuevoProducto, nombre: e.target.value})} placeholder="Nombre del producto" />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Precio:</label>
                <input type="number" value={nuevoProducto.precio} onChange={e => setNuevoProducto({...nuevoProducto, precio: e.target.value})} placeholder="0.00" />
              </div>
              <div className="form-group">
                <label>Stock:</label>
                <input type="number" value={nuevoProducto.stock} onChange={e => setNuevoProducto({...nuevoProducto, stock: e.target.value})} placeholder="0" />
              </div>
            </div>

            <div className="form-group">
              <label>Categoría (Escribe una nueva o selecciona):</label>
              <input 
                type="text" 
                list="lista-categorias"
                value={nuevoProducto.categoria_nombre}
                onChange={e => {
                    const val = e.target.value;
                    const cat = categorias.find(c => c.nombre === val);
                    setNuevoProducto({
                        ...nuevoProducto, 
                        categoria_nombre: val,
                        categoria_id: cat ? cat.id.toString() : ''
                    });
                }}
                placeholder="Escribe para buscar o crear..."
              />
              <datalist id="lista-categorias">
                {categorias.map(c => <option key={c.id} value={c.nombre} />)}
              </datalist>
            </div>

            <div className="form-group">
              <label>Descripción:</label>
              <textarea rows={3} value={nuevoProducto.descripcion} onChange={e => setNuevoProducto({...nuevoProducto, descripcion: e.target.value})}></textarea>
            </div>

            <div className="form-group">
              <label>URL Imagen:</label>
              <input type="text" value={nuevoProducto.imagen_url} onChange={e => setNuevoProducto({...nuevoProducto, imagen_url: e.target.value})} />
            </div>

            <button type="submit" className="btn-submit-admin">Guardar Producto</button>
          </form>
        </div>
      )}

      {activeTab !== 'altas' && (
        <div className="admin-table-responsive">
          <table className="admin-custom-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Imagen</th>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Precio</th>
                <th>Stock</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productos.map((prod) => (
                <tr key={prod.id}>
                  <td>#{prod.id}</td>
                  <td>{prod.imagen_url ? <img src={prod.imagen_url} alt="p" className="table-img-mini" style={{width:'40px', borderRadius:'4px'}}/> : '📷'}</td>
                  <td>{prod.nombre}</td>
                  <td>{prod.categoria_nombre || 'General'}</td>
                  <td>${Number(prod.precio).toLocaleString()}</td>
                  <td><span className={`stock-badge ${prod.stock < 5 ? 'low' : 'ok'}`}>{prod.stock}</span></td>
                  <td><button className="btn-action-delete" onClick={() => handleEliminar(prod.id)}>🗑️</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminProductosScreen;