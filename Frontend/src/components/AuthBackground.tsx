// Ruta: Frontend/src/components/AuthBackground.tsx
// Fondo compartido para pantallas de autenticación: carrusel de fotos con
// crossfade + Ken Burns, degradado oscuro, cuadrícula sutil y resplandor flotante.
import React, { useEffect, useState } from "react";
import "../styles/AuthBackground.css";

const CLOUD = 'https://res.cloudinary.com/dltvkwwq4/image/upload/f_auto,q_auto,w_1600';

const DEFAULT_IMAGES = [
    `${CLOUD}/joyeria/imagenes/fondo_pagina.jpg`,
    `${CLOUD}/joyeria/imagenes/imagen_usar_3.jpg`,
    `${CLOUD}/joyeria/imagenes/imagen_usar_7.jpg`,
    `${CLOUD}/joyeria/imagenes/imagen_usar_12.jpg`,
    `${CLOUD}/joyeria/imagenes/imagen_usar_18.jpg`,
];

interface AuthBackgroundProps {
    images?: string[];
    intervalMs?: number;
}

const AuthBackground: React.FC<AuthBackgroundProps> = ({ images = DEFAULT_IMAGES, intervalMs = 7000 }) => {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const t = setInterval(() => setIndex(i => (i + 1) % images.length), intervalMs);
        return () => clearInterval(t);
    }, [images, intervalMs]);

    return (
        <>
            <div className="auth-bg-stack" aria-hidden="true">
                {images.map((src, i) => (
                    <img
                        key={src}
                        src={src}
                        alt=""
                        className={`auth-bg-img${i === index ? ' is-active' : ''}`}
                    />
                ))}
            </div>
            <div className="auth-bg-overlay" aria-hidden="true" />
        </>
    );
};

export default AuthBackground;
