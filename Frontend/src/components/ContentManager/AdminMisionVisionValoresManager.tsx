import React, { useState } from 'react';

import '../../styles/SitioSecciones.css';
import '../../styles/AdminContenido.css';
interface MisionVisionValores {
    mision: string;
    vision: string;
    valores: string[];
}

const AdminMisionVisionValoresManager: React.FC = () => {
    const [content, setContent] = useState<MisionVisionValores>({
        mision: 'Proporcionar joyas de alta calidad con diseños exclusivos que reflejen la elegancia y personalidad de nuestros clientes.',
        vision: 'Ser la joyería de referencia en la región, reconocida por nuestra excelencia, innovación y compromiso con nuestros clientes.',
        valores: [
            'Calidad: Comprometidos con la excelencia en cada pieza',
            'Integridad: Transparencia total en nuestros procesos',
            'Innovación: Diseños únicos y exclusivos',
            'Servicio: Atención excepcional a nuestros clientes'
        ]
    });

    const [newValor, setNewValor] = useState('');

    const handleMisionChange = (value: string) => {
        setContent({ ...content, mision: value });
    };

    const handleVisionChange = (value: string) => {
        setContent({ ...content, vision: value });
    };

    const addValor = () => {
        if (newValor.trim()) {
            setContent({
                ...content,
                valores: [...content.valores, newValor.trim()]
            });
            setNewValor('');
        }
    };

    const removeValor = (index: number) => {
        setContent({
            ...content,
            valores: content.valores.filter((_, i) => i !== index)
        });
    };

    const saveChanges = () => {
        console.log('Misión, Visión y Valores guardados:', content);
        alert('✓ Cambios guardados exitosamente');
    };

    return (
        <div className="content-page acf">
            <header className="sx-head">
                <div className="sx-eyebrow">Contenido</div>
                <h1 className="sx-title">Misión, visión y <span>valores</span></h1>
                <p className="sx-subtitle">Define la identidad y el propósito de la joyería. Se muestra en "Sobre nosotros".</p>
            </header>

            {/* SECCIÓN DE MISIÓN */}
            <div className="manager-subsection">
                <h3 className="subsection-title">Nuestra Misión</h3>
                <p className="subsection-description">¿Cuál es el propósito principal de tu empresa?</p>

                <div className="mvv-form">
                    <div className="form-group">
                        <label>Declaración de Misión:</label>
                        <textarea
                            placeholder="Escribe la misión de tu empresa..."
                            rows={4}
                            value={content.mision}
                            onChange={(e) => handleMisionChange(e.target.value)}
                        />
                    </div>
                </div>

                <div className="mvv-preview">
                    <h5>Vista Previa:</h5>
                    <div className="preview-box">
                        {content.mision}
                    </div>
                </div>
            </div>

            {/* SECCIÓN DE VISIÓN */}
            <div className="manager-subsection">
                <h3 className="subsection-title">Nuestra Visión</h3>
                <p className="subsection-description">¿Qué aspiras a lograr en el futuro?</p>

                <div className="mvv-form">
                    <div className="form-group">
                        <label>Declaración de Visión:</label>
                        <textarea
                            placeholder="Escribe la visión de tu empresa..."
                            rows={4}
                            value={content.vision}
                            onChange={(e) => handleVisionChange(e.target.value)}
                        />
                    </div>
                </div>

                <div className="mvv-preview">
                    <h5>Vista Previa:</h5>
                    <div className="preview-box">
                        {content.vision}
                    </div>
                </div>
            </div>

            {/* SECCIÓN DE VALORES */}
            <div className="manager-subsection">
                <h3 className="subsection-title">Nuestros Valores</h3>
                <p className="subsection-description">Principios fundamentales que guían tu empresa</p>

                <div className="valores-form">
                    <div className="form-group">
                        <label>Agregar Valor:</label>
                        <div className="valor-input-group">
                            <input
                                type="text"
                                placeholder="Ej: Calidad - Comprometidos con la excelencia"
                                value={newValor}
                                onChange={(e) => setNewValor(e.target.value)}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        addValor();
                                    }
                                }}
                            />
                            <button className="btn-add-valor" onClick={addValor}>
                                + Agregar
                            </button>
                        </div>
                    </div>
                </div>

                <div className="valores-list">
                    {content.valores.length === 0 ? (
                        <p className="empty-state">No hay valores. ¡Agrega el primero!</p>
                    ) : (
                        content.valores.map((valor, index) => (
                            <div key={index} className="valor-item">
                                <div className="valor-content">
                                    <span className="valor-number">{index + 1}</span>
                                    <div className="valor-text">{valor}</div>
                                </div>
                                <button
                                    className="btn-delete"
                                    onClick={() => removeValor(index)}
                                >
                                    🗑️
                                </button>
                            </div>
                        ))
                    )}
                </div>

                <div className="mvv-preview">
                    <h5>Vista Previa de Valores:</h5>
                    <div className="preview-box valores-preview">
                        {content.valores.map((valor, index) => (
                            <div key={index} className="preview-valor">
                                <strong>{index + 1}.</strong> {valor}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="save-section">
                <button className="btn-primary btn-save" onClick={saveChanges}>
                    💾 Guardar Cambios
                </button>
            </div>
        </div>
    );
};

export default AdminMisionVisionValoresManager;
