import React from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminContentManager.css';

const AdminContentManagerScreen: React.FC = () => {
    const navigate = useNavigate();

    const contentOptions = [
        {
            id: 'pages',
            title: '📄 Gestión de Páginas',
            description: 'Crear, editar y eliminar páginas públicas',
            path: '/admin-contenido/paginas',
            icon: '📄'
        },
        {
            id: 'sections',
            title: '📑 Gestión de Secciones',
            description: 'Organizar apartados dentro de las páginas',
            path: '/admin-contenido/secciones',
            icon: '📑'
        },
        {
            id: 'inicio',
            title: '🏠 Página de Inicio',
            description: 'Editar carrusel y promociones',
            path: '/admin-contenido/inicio',
            icon: '🏠'
        },
        {
            id: 'noticias',
            title: '📰 Noticias',
            description: 'Gestionar artículos y noticias',
            path: '/admin-contenido/noticias',
            icon: '📰'
        },
        {
            id: 'info',
            title: 'ℹ️ Información Empresarial',
            description: 'Editar datos de la empresa',
            path: '/admin-contenido/info',
            icon: 'ℹ️'
        },
        {
            id: 'mision',
            title: '🎯 Misión, Visión y Valores',
            description: 'Gestionar misión, visión y valores',
            path: '/admin-contenido/mision',
            icon: '🎯'
        },
        {
            id: 'faq',
            title: '❓ Preguntas Frecuentes',
            description: 'Administrar FAQ del sitio',
            path: '/admin-contenido/faq',
            icon: '❓'
        }
    ];

    return (
        <div className="content-manager-container">
            <h2 className="content-manager-title">
                <span className="title-icon">⚙️</span> Gestor de Contenido Web
            </h2>
            
            <div className="content-options-grid">
                {contentOptions.map(option => (
                    <div
                        key={option.id}
                        className="content-option-card"
                        onClick={() => navigate(option.path)}
                    >
                        <div className="option-icon">{option.icon}</div>
                        <h3 className="option-title">{option.title}</h3>
                        <p className="option-description">{option.description}</p>
                        <button className="option-button">Acceder →</button>
                    </div>
                ))}
            </div>

            <div className="content-info-section">
                <h3>💡 Consejos útiles</h3>
                <ul>
                    <li><strong>Páginas:</strong> Utiliza estas para crear nuevas páginas públicas con su propia URL.</li>
                    <li><strong>Secciones:</strong> Organiza las secciones (apartados) dentro de cada página para mejor estructura.</li>
                    <li><strong>Contenidos:</strong> Agrupa el contenido específico dentro de cada sección.</li>
                    <li>Recuerda que el orden es: Páginas → Secciones → Contenidos</li>
                </ul>
            </div>
        </div>
    );
};

export default AdminContentManagerScreen;
