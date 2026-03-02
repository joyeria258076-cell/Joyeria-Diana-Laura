import React, { useState, useEffect } from 'react';
import './AdminNuevoProductoScreen.css';
import { productsAPI } from '../../services/api';

interface Categoria {
  id: number;
  nombre: string;
  activo?: boolean; 
}

const AdminNuevoProductoScreen: React.FC = () => {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(false);

  const [nuevoProducto, setNuevoProducto] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    stock: '',
    categoria_id: '',
    imagen: '' 
  });

  useEffect(() => {
    const cargarCategorias = async () => {
      try {
        const catRes = await productsAPI.getCategories();
        setCategorias(Array.isArray(catRes) ? catRes : (catRes.data || []));
      } catch (error) {
        console.error("Error cargando categorías:", error);
      }
    };
    cargarCategorias();
  }, []);

  const handleImagenCambio = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("La imagen es muy pesada. El tamaño máximo es 2MB.");
        e.target.value = ''; // Limpiamos el input si falla
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNuevoProducto({ ...nuevoProducto, imagen: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  // Función para cancelar/quitar la imagen
  const removerImagen = () => {
    setNuevoProducto({ ...nuevoProducto, imagen: '' });
    const fileInput = document.getElementById('imagenProducto') as HTMLInputElement;
    if (fileInput) fileInput.value = ''; // Resetea el input para poder elegir la misma imagen si se quiere
  };

  // Prevenir signos negativos y limitar longitud en números
  const preventInvalidNumberInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
      e.preventDefault();
    }
  };

  const handlePrecioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.length <= 8) { // Límite de 8 caracteres (ej: 99999.99)
      setNuevoProducto({...nuevoProducto, precio: val});
    }
  };

  const handleStockChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.length <= 5) { // Límite de 5 caracteres (ej: 99999)
      setNuevoProducto({...nuevoProducto, stock: val});
    }
  };

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoProducto.nombre || !nuevoProducto.precio || !nuevoProducto.categoria_id) {
      alert("Faltan datos obligatorios (Nombre, Precio y seleccionar una Categoría)");
      return;
    }

    try {
      setLoading(true);
      await productsAPI.create({
        ...nuevoProducto,
        precio: parseFloat(nuevoProducto.precio),
        stock: parseInt(nuevoProducto.stock) || 0,
        categoria_id: parseInt(nuevoProducto.categoria_id)
      });
      alert("✅ Producto creado con éxito");
      
      // Limpiamos el formulario
      setNuevoProducto({ nombre: '', descripcion: '', precio: '', stock: '', categoria_id: '', imagen: '' });
      const fileInput = document.getElementById('imagenProducto') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error: any) {
      alert("❌ Error al crear: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-productos-container animate-fade-in">
      
      <div className="admin-page-header">
        <h2>Registrar Nuevo Producto</h2>
        <span className="header-subtitle">Añade una nueva pieza a la colección</span>
      </div>

      <div className="form-container-admin">
        <form onSubmit={handleCrear} className="admin-form">
          
          <div className="form-group">
            <label>Nombre del Producto</label>
            <input 
              type="text" 
              value={nuevoProducto.nombre} 
              onChange={e => setNuevoProducto({...nuevoProducto, nombre: e.target.value})} 
              placeholder="Ej. Anillo de Compromiso Skyline" 
              maxLength={80} /* Límite de 80 letras */
              required 
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Precio ($)</label>
              <input 
                type="number" 
                step="any" 
                min="0"
                onKeyDown={preventInvalidNumberInput}
                value={nuevoProducto.precio} 
                onChange={handlePrecioChange} 
                placeholder="0.00" 
                required 
              />
            </div>
            <div className="form-group">
              <label>Stock (Cantidad)</label>
              <input 
                type="number" 
                step="1"
                min="0"
                onKeyDown={preventInvalidNumberInput}
                value={nuevoProducto.stock} 
                onChange={handleStockChange} 
                placeholder="0" 
                required 
              />
            </div>
          </div>

          <div className="form-group">
            <label>Categoría</label>
            <div className="select-wrapper">
              <select 
                value={nuevoProducto.categoria_id}
                onChange={e => setNuevoProducto({...nuevoProducto, categoria_id: e.target.value})}
                className="admin-select"
                required
              >
                <option value="">-- Selecciona una categoría --</option>
                {categorias
                  .filter(c => c.activo !== false)
                  .map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Descripción</label>
            <textarea 
              rows={4} 
              value={nuevoProducto.descripcion} 
              onChange={e => setNuevoProducto({...nuevoProducto, descripcion: e.target.value})} 
              placeholder="Escribe los detalles de la joya, material, quilates..."
              maxLength={400} /* Límite de 400 letras */
            ></textarea>
          </div>

          <div className="form-group">
            <label>Imagen del Producto</label>
            <div className="upload-area-lux">
              <div className="upload-input-container">
                <input 
                  type="file" 
                  id="imagenProducto"
                  accept="image/png, image/jpeg, image/jpg, image/webp" 
                  onChange={handleImagenCambio} 
                />
              </div>
              {nuevoProducto.imagen && (
                <div className="preview-img-wrapper">
                  <button type="button" className="btn-remove-img" onClick={removerImagen} title="Quitar imagen">
                    ×
                  </button>
                  <img src={nuevoProducto.imagen} alt="Vista previa" />
                </div>
              )}
            </div>
          </div>

          <div className="submit-wrapper">
            <button type="submit" className="btn-submit-admin" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Producto'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default AdminNuevoProductoScreen;