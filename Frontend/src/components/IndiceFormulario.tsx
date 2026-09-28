// Índice lateral de un formulario por secciones: lista cada tarjeta (por su <h3>),
// marca las que ya tienen sus campos llenos, muestra el avance y lleva a cada una al tocarla.
import React, { useEffect, useState } from 'react';
import { AiOutlineCheck } from 'react-icons/ai';
import '../styles/IndiceFormulario.css';

interface Props {
    /** Selector del formulario que contiene las tarjetas */
    formulario: string;
    /** Selector de cada tarjeta/sección dentro del formulario */
    tarjeta: string;
    titulo?: string;
}

interface Seccion { id: string; nombre: string; completa: boolean; }

const seccionCompleta = (el: Element) => {
    const campos = Array.from(el.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]), select, textarea')) as (HTMLInputElement)[];
    const obligatorios = campos.filter(c => c.required || c.closest('[class*="field"]')?.querySelector('[class*="req"]'));
    const revisar = obligatorios.length ? obligatorios : campos;
    if (revisar.length === 0) {
        // Secciones sin campos de texto (foto, interruptores): completa si hay imagen o algo activado
        return !!el.querySelector('img') || !!el.querySelector('input[type=checkbox]:checked');
    }
    return obligatorios.length ? revisar.every(c => String(c.value ?? '').trim() !== '') : revisar.some(c => String(c.value ?? '').trim() !== '');
};

const IndiceFormulario: React.FC<Props> = ({ formulario, tarjeta, titulo = 'Tu avance' }) => {
    const [secciones, setSecciones] = useState<Seccion[]>([]);
    const [activa, setActiva] = useState('');

    useEffect(() => {
        const leer = () => {
            const form = document.querySelector(formulario);
            if (!form) return;
            const lista = Array.from(form.querySelectorAll(tarjeta)).map((el, i) => {
                if (!el.id) el.id = `seccion-form-${i + 1}`;
                const nombre = (el.querySelector('h3, h2')?.textContent || `Sección ${i + 1}`).trim();
                return { id: el.id, nombre, completa: seccionCompleta(el) };
            });
            setSecciones(prev => JSON.stringify(prev) === JSON.stringify(lista) ? prev : lista);
        };
        leer();
        const form = document.querySelector(formulario);
        form?.addEventListener('input', leer);
        form?.addEventListener('change', leer);
        const t = setInterval(leer, 1500);

        const obs = new IntersectionObserver(entradas => {
            const visible = entradas.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
            if (visible) setActiva(visible.target.id);
        }, { rootMargin: '-20% 0px -60% 0px' });
        setTimeout(() => form?.querySelectorAll(tarjeta).forEach(el => obs.observe(el)), 300);

        return () => { form?.removeEventListener('input', leer); form?.removeEventListener('change', leer); clearInterval(t); obs.disconnect(); };
    }, [formulario, tarjeta]);

    if (secciones.length === 0) return null;
    const hechas = secciones.filter(s => s.completa).length;
    const pct = Math.round((hechas / secciones.length) * 100);

    const ir = (id: string) => {
        const el = document.getElementById(id);
        if (!el) return;
        window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 90, behavior: 'smooth' });
        (el.querySelector('input:not([type=hidden]), select, textarea') as HTMLElement | null)?.focus({ preventScroll: true });
    };

    return (
        <nav className="ifo" aria-label="Secciones del formulario">
            <div className="ifo-cabeza">
                <span>{titulo}</span>
                <b>{pct}%</b>
            </div>
            <div className="ifo-barra"><i style={{ width: `${pct}%` }} /></div>
            <small className="ifo-resumen">{hechas} de {secciones.length} secciones listas</small>
            <ol className="ifo-lista">
                {secciones.map((s, i) => (
                    <li key={s.id}>
                        <button type="button" className={`${s.completa ? 'lista' : ''} ${activa === s.id ? 'activa' : ''}`} onClick={() => ir(s.id)}>
                            <span className="ifo-num">{s.completa ? <AiOutlineCheck size={13} /> : i + 1}</span>
                            <span className="ifo-nombre">{s.nombre}</span>
                        </button>
                    </li>
                ))}
            </ol>
        </nav>
    );
};

export default IndiceFormulario;
