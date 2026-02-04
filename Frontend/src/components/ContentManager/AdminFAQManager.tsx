import React, { useState } from 'react';

interface FAQ {
    id: string;
    pregunta: string;
    respuesta: string;
    orden: number;
    activa: boolean;
}

const AdminFAQManager: React.FC = () => {
    const [faqs, setFaqs] = useState<FAQ[]>([
        {
            id: '1',
            pregunta: '¿Cuál es el tiempo de entrega?',
            respuesta: 'El tiempo de entrega es de 5 a 7 días hábiles en la mayoría de casos.',
            orden: 1,
            activa: true
        },
        {
            id: '2',
            pregunta: '¿Aceptan devoluciones?',
            respuesta: 'Sí, aceptamos devoluciones dentro de 30 días después de la compra.',
            orden: 2,
            activa: true
        }
    ]);

    const [newFAQ, setNewFAQ] = useState<Partial<FAQ>>({});

    const addFAQ = () => {
        if (newFAQ.pregunta && newFAQ.respuesta) {
            const faq: FAQ = {
                id: Date.now().toString(),
                pregunta: newFAQ.pregunta,
                respuesta: newFAQ.respuesta,
                orden: faqs.length + 1,
                activa: true
            };
            setFaqs([...faqs, faq]);
            setNewFAQ({});
        }
    };

    const deleteFAQ = (id: string) => {
        setFaqs(faqs.filter(f => f.id !== id));
    };

    const toggleFAQ = (id: string) => {
        setFaqs(faqs.map(f =>
            f.id === id ? { ...f, activa: !f.activa } : f
        ));
    };

    const editFAQ = (id: string, field: keyof FAQ, value: any) => {
        setFaqs(faqs.map(f =>
            f.id === id ? { ...f, [field]: value } : f
        ));
    };

    const moveUp = (id: string) => {
        const index = faqs.findIndex(f => f.id === id);
        if (index > 0) {
            const newFaqs = [...faqs];
            [newFaqs[index].orden, newFaqs[index - 1].orden] = [newFaqs[index - 1].orden, newFaqs[index].orden];
            newFaqs.sort((a, b) => a.orden - b.orden);
            setFaqs(newFaqs);
        }
    };

    const moveDown = (id: string) => {
        const index = faqs.findIndex(f => f.id === id);
        if (index < faqs.length - 1) {
            const newFaqs = [...faqs];
            [newFaqs[index].orden, newFaqs[index + 1].orden] = [newFaqs[index + 1].orden, newFaqs[index].orden];
            newFaqs.sort((a, b) => a.orden - b.orden);
            setFaqs(newFaqs);
        }
    };

    return (
        <div className="content-page">
            <h2 className="content-page-title">❓ Preguntas Frecuentes (FAQ)</h2>
            <p className="content-page-subtitle">Gestiona las preguntas y respuestas más comunes de tus clientes</p>

            <div className="manager-subsection">
                <h3 className="subsection-title">➕ Agregar Nueva Pregunta</h3>
                <p className="subsection-description">Agrega preguntas frecuentes para ayudar a tus clientes</p>

                <div className="faq-form">
                    <div className="form-group">
                        <label>Pregunta:</label>
                        <input
                            type="text"
                            placeholder="Ej: ¿Cuál es el tiempo de entrega?"
                            value={newFAQ.pregunta || ''}
                            onChange={(e) => setNewFAQ({ ...newFAQ, pregunta: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label>Respuesta:</label>
                        <textarea
                            placeholder="Escribe la respuesta completa..."
                            rows={4}
                            value={newFAQ.respuesta || ''}
                            onChange={(e) => setNewFAQ({ ...newFAQ, respuesta: e.target.value })}
                        />
                    </div>

                    <button className="btn-primary" onClick={addFAQ}>
                        + Agregar Pregunta
                    </button>
                </div>
            </div>

            <div className="manager-subsection">
                <h3 className="subsection-title">📋 Preguntas Frecuentes ({faqs.length})</h3>
                <p className="subsection-description">Organiza y gestiona todas tus FAQs</p>

                <div className="faq-list">
                    {faqs.length === 0 ? (
                        <p className="empty-state">No hay preguntas. ¡Agrega la primera!</p>
                    ) : (
                        faqs.map((faq, index) => (
                            <div key={faq.id} className="faq-card item-card">
                                <div className="faq-header">
                                    <div className="faq-order-badge">{index + 1}</div>
                                    <h5>{faq.pregunta}</h5>
                                    <span className={`badge ${faq.activa ? 'active' : 'inactive'}`}>
                                        {faq.activa ? '✓ Visible' : '✗ Oculta'}
                                    </span>
                                </div>

                                <p className="faq-answer">{faq.respuesta}</p>

                                <div className="faq-actions">
                                    <button 
                                        className="btn-small" 
                                        onClick={() => moveUp(faq.id)}
                                        disabled={index === 0}
                                        title="Mover hacia arriba"
                                    >
                                        ⬆️
                                    </button>
                                    <button 
                                        className="btn-small" 
                                        onClick={() => moveDown(faq.id)}
                                        disabled={index === faqs.length - 1}
                                        title="Mover hacia abajo"
                                    >
                                        ⬇️
                                    </button>
                                    <button 
                                        className="btn-toggle" 
                                        onClick={() => toggleFAQ(faq.id)}
                                    >
                                        {faq.activa ? '👁️ Ocultar' : '🔍 Mostrar'}
                                    </button>
                                    <button 
                                        className="btn-delete" 
                                        onClick={() => deleteFAQ(faq.id)}
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

export default AdminFAQManager;
