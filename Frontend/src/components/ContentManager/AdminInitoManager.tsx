import React, { useState, useEffect } from 'react';

interface CarouselItem {
    id: string;
    titulo: string;
    descripcion: string;
    imagen: string;
    enlace?: string;
}

interface PromocionItem {
    id: string;
    titulo: string;
    descripcion: string;
    descuento: number;
    activa: boolean;
}

const AdminInitoManager: React.FC = () => {
    const [carouselItems, setCarouselItems] = useState<CarouselItem[]>([
        {
            id: '1',
            titulo: 'Colección Primavera',
            descripcion: 'Descubre nuestras nuevas joyas para la primavera',
            imagen: '/placeholder-carousel.jpg',
            enlace: '/catalogo'
        }
    ]);

    const [promociones, setPromociones] = useState<PromocionItem[]>([
        {
            id: '1',
            titulo: '20% Descuento en Anillos',
            descripcion: 'Aplica en toda la colección de anillos',
            descuento: 20,
            activa: true
        }
    ]);

    const [newCarousel, setNewCarousel] = useState<Partial<CarouselItem>>({});
    const [newPromocion, setNewPromocion] = useState<Partial<PromocionItem>>({});

    const addCarouselItem = () => {
        if (newCarousel.titulo && newCarousel.descripcion) {
            const item: CarouselItem = {
                id: Date.now().toString(),
                titulo: newCarousel.titulo,
                descripcion: newCarousel.descripcion,
                imagen: newCarousel.imagen || '/placeholder-carousel.jpg',
                enlace: newCarousel.enlace || ''
            };
            setCarouselItems([...carouselItems, item]);
            setNewCarousel({});
        }
    };

    const deleteCarouselItem = (id: string) => {
        setCarouselItems(carouselItems.filter(item => item.id !== id));
    };

    const addPromocion = () => {
        if (newPromocion.titulo && newPromocion.descuento) {
            const promo: PromocionItem = {
                id: Date.now().toString(),
                titulo: newPromocion.titulo,
                descripcion: newPromocion.descripcion || '',
                descuento: newPromocion.descuento,
                activa: newPromocion.activa !== undefined ? newPromocion.activa : true
            };
            setPromociones([...promociones, promo]);
            setNewPromocion({});
        }
    };

    const deletePromocion = (id: string) => {
        setPromociones(promociones.filter(item => item.id !== id));
    };

    const togglePromocion = (id: string) => {
        setPromociones(promociones.map(p =>
            p.id === id ? { ...p, activa: !p.activa } : p
        ));
    };

    return (
        <div className="content-page">
            <h2 className="content-page-title">🏠 Gestionar Página de Inicio</h2>
            <p className="content-page-subtitle">Gestiona los elementos que aparecen en la página principal de tu tienda</p>

            {/* SECCIÓN DE CARRUSEL */}
            <div className="manager-subsection">
                <h3 className="subsection-title">🎠 Carrusel Principal</h3>
                <p className="subsection-description">Agrega imágenes y descripciones que rotarán en la página de inicio</p>
                
                <div className="carousel-form">
                    <div className="form-group">
                        <label>Título del Carrusel:</label>
                        <input
                            type="text"
                            placeholder="Ej: Colección Nueva"
                            value={newCarousel.titulo || ''}
                            onChange={(e) => setNewCarousel({ ...newCarousel, titulo: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label>Descripción:</label>
                        <textarea
                            placeholder="Descripción de la diapositiva"
                            value={newCarousel.descripcion || ''}
                            onChange={(e) => setNewCarousel({ ...newCarousel, descripcion: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label>URL de Imagen:</label>
                        <input
                            type="text"
                            placeholder="URL de la imagen"
                            value={newCarousel.imagen || ''}
                            onChange={(e) => setNewCarousel({ ...newCarousel, imagen: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label>Enlace (Opcional):</label>
                        <input
                            type="text"
                            placeholder="Ej: /catalogo"
                            value={newCarousel.enlace || ''}
                            onChange={(e) => setNewCarousel({ ...newCarousel, enlace: e.target.value })}
                        />
                    </div>

                    <button className="btn-primary" onClick={addCarouselItem}>
                        + Agregar Diapositiva
                    </button>
                </div>

                <div className="items-list">
                    {carouselItems.length === 0 ? (
                        <p className="empty-state">No hay diapositivas. ¡Crea la primera!</p>
                    ) : (
                        carouselItems.map(item => (
                            <div key={item.id} className="item-card">
                                <div className="item-preview">
                                    <img src={item.imagen} alt={item.titulo} className="item-image" />
                                </div>
                                <div className="item-info">
                                    <h5>{item.titulo}</h5>
                                    <p>{item.descripcion}</p>
                                    {item.enlace && <span className="item-link">🔗 {item.enlace}</span>}
                                </div>
                                <button className="btn-delete" onClick={() => deleteCarouselItem(item.id)}>
                                    🗑️ Eliminar
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* SECCIÓN DE PROMOCIONES */}
            <div className="manager-subsection">
                <h3 className="subsection-title">🎁 Promociones Destacadas</h3>
                <p className="subsection-description">Destaca promociones y ofertas especiales en la página de inicio</p>

                <div className="promocion-form">
                    <div className="form-group">
                        <label>Título de Promoción:</label>
                        <input
                            type="text"
                            placeholder="Ej: 20% Descuento en Anillos"
                            value={newPromocion.titulo || ''}
                            onChange={(e) => setNewPromocion({ ...newPromocion, titulo: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label>Descripción:</label>
                        <textarea
                            placeholder="Detalles de la promoción"
                            value={newPromocion.descripcion || ''}
                            onChange={(e) => setNewPromocion({ ...newPromocion, descripcion: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label>Porcentaje de Descuento:</label>
                        <input
                            type="number"
                            placeholder="Ej: 20"
                            min="0"
                            max="100"
                            value={newPromocion.descuento || ''}
                            onChange={(e) => setNewPromocion({ ...newPromocion, descuento: parseInt(e.target.value) })}
                        />
                    </div>

                    <button className="btn-primary" onClick={addPromocion}>
                        + Agregar Promoción
                    </button>
                </div>

                <div className="items-list">
                    {promociones.length === 0 ? (
                        <p className="empty-state">No hay promociones. ¡Crea la primera!</p>
                    ) : (
                        promociones.map(promo => (
                            <div key={promo.id} className="item-card promo-card">
                                <div className="item-header">
                                    <div>
                                        <h5>{promo.titulo}</h5>
                                        <p className="promo-description">{promo.descripcion}</p>
                                    </div>
                                    <span className={`badge ${promo.activa ? 'active' : 'inactive'}`}>
                                        {promo.activa ? '✓ Activa' : '✗ Inactiva'}
                                    </span>
                                </div>
                                <p className="discount-badge">💰 Descuento: {promo.descuento}%</p>
                                <div className="item-actions">
                                    <button 
                                        className="btn-toggle" 
                                        onClick={() => togglePromocion(promo.id)}
                                    >
                                        {promo.activa ? '🔴 Desactivar' : '🟢 Activar'}
                                    </button>
                                    <button 
                                        className="btn-delete" 
                                        onClick={() => deletePromocion(promo.id)}
                                    >
                                        🗑️ Eliminar
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminInitoManager;
