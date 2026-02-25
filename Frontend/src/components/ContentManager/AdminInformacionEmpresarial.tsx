import React, { useState } from 'react';

interface EmpresaInfo {
    nombre: string;
    direccion: string;
    telefono: string;
    email: string;
    horario: string;
    descripcion: string;
    redesSociales: {
        facebook?: string;
        instagram?: string;
        whatsapp?: string;
        tiktok?: string;
    };
    logoUrl: string;
    logoAltText: string;
    faviconUrl: string;
    colorPrimario: string;
    colorSecundario: string;
    descripcionSitio: string;
    palabrasClaves: string;
}

const AdminInformacionEmpresarial: React.FC = () => {
    const [info, setInfo] = useState<EmpresaInfo>({
        nombre: 'Joyería Diana Laura',
        direccion: 'Calle Principal 123, Ciudad',
        telefono: '+1 234 567 8900',
        email: 'contacto@dianaLaura.com',
        horario: 'Lunes a Viernes: 9:00 AM - 6:00 PM\nSábado: 10:00 AM - 4:00 PM\nDomingo: Cerrado',
        descripcion: 'Joyería premium con más de 20 años de experiencia',
        redesSociales: {
            facebook: 'https://facebook.com/dianaLaura',
            instagram: 'https://instagram.com/dianaLaura',
            whatsapp: '+1 234 567 8900',
            tiktok: 'https://tiktok.com/@dianaLaura'
        },
        logoUrl: '/logo-diana-laura.png',
        logoAltText: 'Joyería Diana Laura',
        faviconUrl: '/favicon.ico',
        colorPrimario: '#ecb2c3',
        colorSecundario: '#0f0f12',
        descripcionSitio: 'Joyería premium con colecciones exclusivas de diamantes y joyas finas',
        palabrasClaves: 'joyas, diamantes, anillos, collares, accesorios'
    });

    const handleInfoChange = (field: keyof EmpresaInfo, value: any) => {
        setInfo({ ...info, [field]: value });
    };

    const handleSocialChange = (platform: keyof typeof info.redesSociales, value: string) => {
        setInfo({
            ...info,
            redesSociales: { ...info.redesSociales, [platform]: value }
        });
    };

    const saveChanges = () => {
        console.log('Información empresarial guardada:', info);
        alert('✓ Cambios guardados exitosamente');
    };

    return (
        <div className="content-page">
            <h2 className="content-page-title">ℹ️ Información Empresarial</h2>
            <p className="content-page-subtitle">Gestiona datos de tu empresa, branding y configuración web</p>

            {/* DATOS DE LA EMPRESA */}
            <div className="manager-subsection">
                <h3 className="subsection-title">🏢 Datos de la Empresa</h3>
                <p className="subsection-description">Información de contacto y detalles generales de tu negocio</p>

                <div className="info-form">
                    <div className="form-group">
                        <label>Nombre de la Empresa:</label>
                        <input
                            type="text"
                            value={info.nombre}
                            onChange={(e) => handleInfoChange('nombre', e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label>Dirección:</label>
                        <input
                            type="text"
                            value={info.direccion}
                            onChange={(e) => handleInfoChange('direccion', e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label>Teléfono:</label>
                        <input
                            type="tel"
                            value={info.telefono}
                            onChange={(e) => handleInfoChange('telefono', e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label>Email:</label>
                        <input
                            type="email"
                            value={info.email}
                            onChange={(e) => handleInfoChange('email', e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label>Horario de Atención:</label>
                        <textarea
                            value={info.horario}
                            onChange={(e) => handleInfoChange('horario', e.target.value)}
                            placeholder="Especifica los horarios de lunes a domingo"
                            rows={4}
                        />
                    </div>

                    <div className="form-group">
                        <label>Descripción de la Empresa:</label>
                        <textarea
                            value={info.descripcion}
                            onChange={(e) => handleInfoChange('descripcion', e.target.value)}
                            placeholder="Breve descripción de tu negocio"
                            rows={3}
                        />
                    </div>
                </div>
            </div>

            {/* REDES SOCIALES */}
            <div className="manager-subsection">
                <h3 className="subsection-title">📱 Redes Sociales</h3>
                <p className="subsection-description">Vincula tus perfiles en redes sociales</p>

                <div className="social-form">
                    <div className="form-group">
                        <label>Facebook:</label>
                        <input
                            type="url"
                            placeholder="https://facebook.com/..."
                            value={info.redesSociales.facebook || ''}
                            onChange={(e) => handleSocialChange('facebook', e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label>Instagram:</label>
                        <input
                            type="url"
                            placeholder="https://instagram.com/..."
                            value={info.redesSociales.instagram || ''}
                            onChange={(e) => handleSocialChange('instagram', e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label>WhatsApp:</label>
                        <input
                            type="tel"
                            placeholder="+1 234 567 8900"
                            value={info.redesSociales.whatsapp || ''}
                            onChange={(e) => handleSocialChange('whatsapp', e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label>TikTok:</label>
                        <input
                            type="url"
                            placeholder="https://tiktok.com/@..."
                            value={info.redesSociales.tiktok || ''}
                            onChange={(e) => handleSocialChange('tiktok', e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* LOGO Y FAVICON */}
            <div className="manager-subsection">
                <h3 className="subsection-title">🎨 Logo y Favicon</h3>
                <p className="subsection-description">Configura el logo y favicon de tu tienda</p>

                <div className="logo-preview-section">
                    <div className="preview-item">
                        <label>Vista Previa del Logo:</label>
                        <div className="logo-preview">
                            <img src={info.logoUrl} alt={info.logoAltText} />
                        </div>
                    </div>

                    <div className="preview-item">
                        <label>Vista Previa del Favicon:</label>
                        <div className="favicon-preview">
                            <img src={info.faviconUrl} alt="Favicon" />
                        </div>
                    </div>
                </div>

                <div className="logo-form">
                    <div className="form-group">
                        <label>URL del Logo:</label>
                        <input
                            type="url"
                            placeholder="/ruta-del-logo.png"
                            value={info.logoUrl}
                            onChange={(e) => handleInfoChange('logoUrl', e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label>Texto Alternativo del Logo:</label>
                        <input
                            type="text"
                            placeholder="Descripción del logo"
                            value={info.logoAltText}
                            onChange={(e) => handleInfoChange('logoAltText', e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label>URL del Favicon:</label>
                        <input
                            type="url"
                            placeholder="/ruta-del-favicon.ico"
                            value={info.faviconUrl}
                            onChange={(e) => handleInfoChange('faviconUrl', e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* COLORES DE LA MARCA */}
            <div className="manager-subsection">
                <h3 className="subsection-title">🎨 Colores de la Marca</h3>
                <p className="subsection-description">Define los colores principales de tu tienda</p>

                <div className="colors-form">
                    <div className="form-group color-group">
                        <label>Color Primario:</label>
                        <div className="color-input-wrapper">
                            <input
                                type="color"
                                value={info.colorPrimario}
                                onChange={(e) => handleInfoChange('colorPrimario', e.target.value)}
                            />
                            <input
                                type="text"
                                placeholder="#ecb2c3"
                                value={info.colorPrimario}
                                onChange={(e) => handleInfoChange('colorPrimario', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="form-group color-group">
                        <label>Color Secundario:</label>
                        <div className="color-input-wrapper">
                            <input
                                type="color"
                                value={info.colorSecundario}
                                onChange={(e) => handleInfoChange('colorSecundario', e.target.value)}
                            />
                            <input
                                type="text"
                                placeholder="#0f0f12"
                                value={info.colorSecundario}
                                onChange={(e) => handleInfoChange('colorSecundario', e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* SEO Y METADATOS */}
            <div className="manager-subsection">
                <h3 className="subsection-title">🔍 SEO y Metadatos</h3>
                <p className="subsection-description">Optimiza tu sitio para buscadores</p>

                <div className="seo-form">
                    <div className="form-group">
                        <label>Descripción del Sitio (Meta Description):</label>
                        <textarea
                            placeholder="Descripción breve del sitio para buscadores"
                            rows={2}
                            maxLength={160}
                            value={info.descripcionSitio}
                            onChange={(e) => handleInfoChange('descripcionSitio', e.target.value)}
                        />
                        <small>{info.descripcionSitio.length}/160 caracteres</small>
                    </div>

                    <div className="form-group">
                        <label>Palabras Clave (Meta Keywords):</label>
                        <input
                            type="text"
                            placeholder="joyas, diamantes, anillos, collares"
                            value={info.palabrasClaves}
                            onChange={(e) => handleInfoChange('palabrasClaves', e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="save-section">
                <button className="btn-primary btn-save" onClick={saveChanges}>
                    💾 Guardar Todos los Cambios
                </button>
            </div>
        </div>
    );
};

export default AdminInformacionEmpresarial;
