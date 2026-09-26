import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AiOutlineFileText, AiOutlineLayout, AiOutlineHome, AiOutlineRead, AiOutlineInfoCircle,
    AiOutlineAim, AiOutlineQuestionCircle, AiOutlineEnvironment, AiOutlineBgColors, AiOutlineArrowRight,
    AiOutlineBulb,
} from 'react-icons/ai';
import './AdminContentManager.css';

const AdminContentManagerScreen: React.FC = () => {
    const navigate = useNavigate();

    const contentOptions = [
        {
            id: 'pages',
            title: 'Gestión de Páginas',
            description: 'Crear, editar y eliminar páginas públicas',
            path: '/admin-contenido/paginas',
            icon: <AiOutlineFileText size={22} />
        },
        {
            id: 'sections',
            title: 'Gestión de Secciones',
            description: 'Organizar apartados dentro de las páginas',
            path: '/admin-contenido/secciones',
            icon: <AiOutlineLayout size={22} />
        },
        {
            id: 'inicio',
            title: 'Página de Inicio',
            description: 'Editar carrusel y promociones',
            path: '/admin-contenido/pagina-inicio',
            icon: <AiOutlineHome size={22} />
        },
        {
            id: 'noticias',
            title: 'Noticias',
            description: 'Gestionar artículos y noticias',
            path: '/admin-contenido/pagina-noticias',
            icon: <AiOutlineRead size={22} />
        },
        {
            id: 'info',
            title: 'Información Empresarial',
            description: 'Editar datos de la empresa',
            path: '/admin-contenido/info',
            icon: <AiOutlineInfoCircle size={22} />
        },
        {
            id: 'mision',
            title: 'Misión, Visión y Valores',
            description: 'Gestionar misión, visión y valores',
            path: '/admin-contenido/mision',
            icon: <AiOutlineAim size={22} />
        },
        {
            id: 'faq',
            title: 'Preguntas Frecuentes',
            description: 'Administrar FAQ del sitio',
            path: '/admin-contenido/faq',
            icon: <AiOutlineQuestionCircle size={22} />
        },
        {
            id: 'zonas-entrega',
            title: 'Zonas de Entrega',
            description: 'Dar de alta o quitar ubicaciones de entrega del negocio',
            path: '/admin-contenido/zonas-entrega',
            icon: <AiOutlineEnvironment size={22} />
        },
    ];

    return (
        <div className="content-manager-container">
            <span className="cm-eyebrow">Gestionar contenido</span>
            <h2 className="content-manager-title">Contenido del <span>sitio</span></h2>
            <p className="cm-sub">Todo lo que ven tus clientes en la página: textos, noticias, datos de la tienda y más.</p>

            {/* Acceso destacado al editor visual */}
            <button className="cm-destacado" onClick={() => navigate('/admin-contenido/editor-visual')}>
                <span className="cm-destacado-icon"><AiOutlineBgColors size={26} /></span>
                <span className="cm-destacado-textos">
                    <strong>Editor visual de páginas</strong>
                    <span>Edita secciones con vista previa en vivo, arrastra para reordenar y usa paletas predefinidas.</span>
                </span>
                <span className="cm-destacado-flecha"><AiOutlineArrowRight size={20} /></span>
            </button>

            <div className="content-options-grid">
                {contentOptions.map(option => (
                    <div
                        key={option.id}
                        className="content-option-card"
                        role="link"
                        tabIndex={0}
                        onClick={() => navigate(option.path)}
                        onKeyDown={(e) => { if (e.key === 'Enter') navigate(option.path); }}
                    >
                        <div className="option-icon">{option.icon}</div>
                        <h3 className="option-title">{option.title}</h3>
                        <p className="option-description">{option.description}</p>
                        <span className="option-button">Abrir <AiOutlineArrowRight size={14} /></span>
                    </div>
                ))}
            </div>

            <div className="content-info-section">
                <h3><AiOutlineBulb size={18} /> Consejos útiles</h3>
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
