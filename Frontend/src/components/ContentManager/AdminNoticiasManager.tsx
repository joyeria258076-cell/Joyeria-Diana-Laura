import React, { useState } from 'react';

interface Noticia {
    id: string;
    titulo: string;
    contenido: string;
    imagen: string;
    fecha: string;
    activa: boolean;
}

const AdminNoticiasManager: React.FC = () => {
    const [noticias, setNoticias] = useState<Noticia[]>([
        {
            id: '1',
            titulo: 'Nueva Colección Disponible',
            contenido: 'Hemos lanzado nuestra nueva colección de joyas premium',
            imagen: '/placeholder-noticia.jpg',
            fecha: new Date().toISOString().split('T')[0],
            activa: true
        }
    ]);

    const [newNoticia, setNewNoticia] = useState<Partial<Noticia>>({});

    const addNoticia = () => {
        if (newNoticia.titulo && newNoticia.contenido) {
            const noticia: Noticia = {
                id: Date.now().toString(),
                titulo: newNoticia.titulo,
                contenido: newNoticia.contenido,
                imagen: newNoticia.imagen || '/placeholder-noticia.jpg',
                fecha: new Date().toISOString().split('T')[0],
                activa: true
            };
            setNoticias([...noticias, noticia]);
            setNewNoticia({});
        }
    };

    const deleteNoticia = (id: string) => {
        setNoticias(noticias.filter(n => n.id !== id));
    };

    const toggleNoticia = (id: string) => {
        setNoticias(noticias.map(n =>
            n.id === id ? { ...n, activa: !n.activa } : n
        ));
    };

    const editNoticia = (id: string, field: keyof Noticia, value: any) => {
        setNoticias(noticias.map(n =>
            n.id === id ? { ...n, [field]: value } : n
        ));
    };

    return (
        <div className="content-page">
            <h2 className="content-page-title">📰 Gestionar Noticias</h2>
            <p className="content-page-subtitle">Publica y gestiona noticias en tu tienda</p>

            <div className="manager-subsection">
                <h3 className="subsection-title">✍️ Crear Nueva Noticia</h3>
                <p className="subsection-description">Redacta y publica noticias para tus clientes</p>

                <div className="noticia-form">
                    <div className="form-group">
                        <label>Título de la Noticia:</label>
                        <input
                            type="text"
                            placeholder="Ej: Nueva Colección Disponible"
                            value={newNoticia.titulo || ''}
                            onChange={(e) => setNewNoticia({ ...newNoticia, titulo: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label>Contenido:</label>
                        <textarea
                            placeholder="Escribe el contenido completo de la noticia..."
                            rows={6}
                            value={newNoticia.contenido || ''}
                            onChange={(e) => setNewNoticia({ ...newNoticia, contenido: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label>URL de Imagen:</label>
                        <input
                            type="text"
                            placeholder="URL de la imagen de portada"
                            value={newNoticia.imagen || ''}
                            onChange={(e) => setNewNoticia({ ...newNoticia, imagen: e.target.value })}
                        />
                    </div>

                    <button className="btn-primary" onClick={addNoticia}>
                        📝 Publicar Noticia
                    </button>
                </div>
            </div>

            <div className="manager-subsection">
                <h3 className="subsection-title">📚 Noticias Publicadas ({noticias.length})</h3>
                <p className="subsection-description">Gestiona todas tus noticias publicadas</p>

                <div className="items-list">
                    {noticias.length === 0 ? (
                        <p className="empty-state">No hay noticias. ¡Publica la primera!</p>
                    ) : (
                        noticias.map(noticia => (
                            <div key={noticia.id} className="noticia-card item-card">
                                <div className="noticia-header">
                                    <div>
                                        <h5>{noticia.titulo}</h5>
                                        <span className="noticia-date">📅 {noticia.fecha}</span>
                                    </div>
                                    <span className={`badge ${noticia.activa ? 'active' : 'inactive'}`}>
                                        {noticia.activa ? '✓ Publicada' : '✗ Borrador'}
                                    </span>
                                </div>

                                <div className="noticia-preview">
                                    <img src={noticia.imagen} alt={noticia.titulo} className="noticia-image" />
                                    <p className="noticia-excerpt">{noticia.contenido.substring(0, 100)}...</p>
                                </div>

                                <div className="noticia-actions">
                                    <button className="btn-toggle" onClick={() => toggleNoticia(noticia.id)}>
                                        {noticia.activa ? '📌 Despublicar' : '📤 Publicar'}
                                    </button>
                                    <button className="btn-delete" onClick={() => deleteNoticia(noticia.id)}>
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

export default AdminNoticiasManager;
