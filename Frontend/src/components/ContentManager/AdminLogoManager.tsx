import React, { useState } from 'react';

interface LogoSettings {
    logoUrl: string;
    logoAltText: string;
    faviconUrl: string;
    colorPrimario: string;
    colorSecundario: string;
    descripcionSitio: string;
    palabrasClaves: string;
}

const AdminLogoManager: React.FC = () => {
    const [settings, setSettings] = useState<LogoSettings>({
        logoUrl: '/logo-diana-laura.png',
        logoAltText: 'Joyería Diana Laura',
        faviconUrl: '/favicon.ico',
        colorPrimario: '#ecb2c3',
        colorSecundario: '#0f0f12',
        descripcionSitio: 'Joyería premium con colecciones exclusivas de diamantes y joyas finas',
        palabrasClaves: 'joyas, diamantes, anillos, collares, accesorios'
    });

    const handleChange = (field: keyof LogoSettings, value: string) => {
        setSettings({ ...settings, [field]: value });
    };

    const saveSettings = () => {
        console.log('Configuración de diseño guardada:', settings);
        alert('✓ Configuración de logo y diseño guardada exitosamente');
    };

    return (
        <div className="content-section">
            <h3 className="section-title">🎨 Logo y Configuración de Diseño</h3>

            <div className="manager-subsection">
                <h4 className="subsection-title">Logo y Favicon</h4>

                <div className="logo-preview-section">
                    <div className="preview-item">
                        <label>Vista Previa del Logo:</label>
                        <div className="logo-preview">
                            <img src={settings.logoUrl} alt={settings.logoAltText} />
                        </div>
                    </div>

                    <div className="preview-item">
                        <label>Vista Previa del Favicon:</label>
                        <div className="favicon-preview">
                            <img src={settings.faviconUrl} alt="Favicon" />
                        </div>
                    </div>
                </div>

                <div className="logo-form">
                    <div className="form-group">
                        <label>URL del Logo:</label>
                        <input
                            type="url"
                            placeholder="/ruta-del-logo.png"
                            value={settings.logoUrl}
                            onChange={(e) => handleChange('logoUrl', e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label>Texto Alternativo del Logo:</label>
                        <input
                            type="text"
                            placeholder="Descripción del logo"
                            value={settings.logoAltText}
                            onChange={(e) => handleChange('logoAltText', e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label>URL del Favicon:</label>
                        <input
                            type="url"
                            placeholder="/ruta-del-favicon.ico"
                            value={settings.faviconUrl}
                            onChange={(e) => handleChange('faviconUrl', e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="manager-subsection">
                <h4 className="subsection-title">Colores de la Marca</h4>

                <div className="colors-form">
                    <div className="form-group color-group">
                        <label>Color Primario:</label>
                        <div className="color-input-wrapper">
                            <input
                                type="color"
                                value={settings.colorPrimario}
                                onChange={(e) => handleChange('colorPrimario', e.target.value)}
                            />
                            <input
                                type="text"
                                placeholder="#ecb2c3"
                                value={settings.colorPrimario}
                                onChange={(e) => handleChange('colorPrimario', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="form-group color-group">
                        <label>Color Secundario:</label>
                        <div className="color-input-wrapper">
                            <input
                                type="color"
                                value={settings.colorSecundario}
                                onChange={(e) => handleChange('colorSecundario', e.target.value)}
                            />
                            <input
                                type="text"
                                placeholder="#0f0f12"
                                value={settings.colorSecundario}
                                onChange={(e) => handleChange('colorSecundario', e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="manager-subsection">
                <h4 className="subsection-title">SEO y Metadatos</h4>

                <div className="seo-form">
                    <div className="form-group">
                        <label>Descripción del Sitio (Meta Description):</label>
                        <textarea
                            placeholder="Descripción breve del sitio para buscadores"
                            rows={2}
                            maxLength={160}
                            value={settings.descripcionSitio}
                            onChange={(e) => handleChange('descripcionSitio', e.target.value)}
                        />
                        <small>{settings.descripcionSitio.length}/160 caracteres</small>
                    </div>

                    <div className="form-group">
                        <label>Palabras Clave (Meta Keywords):</label>
                        <input
                            type="text"
                            placeholder="joyas, diamantes, anillos, collares"
                            value={settings.palabrasClaves}
                            onChange={(e) => handleChange('palabrasClaves', e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="save-section">
                <button className="btn-primary btn-save" onClick={saveSettings}>
                    💾 Guardar Configuración de Diseño
                </button>
            </div>
        </div>
    );
};

export default AdminLogoManager;
