// Si una pantalla truena al dibujarse, muestra un aviso en lugar de dejar todo en negro.
import React from 'react';

interface Estado { error: Error | null; ruta: string }

class ErrorPantalla extends React.Component<{ children: React.ReactNode }, Estado> {
    state: Estado = { error: null, ruta: window.location.pathname };

    static getDerivedStateFromError(error: Error) {
        return { error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('[ErrorPantalla]', error, info.componentStack);
    }

    componentDidUpdate() {
        // Al cambiar de ruta se limpia el error para que la siguiente pantalla cargue normal
        if (this.state.error && window.location.pathname !== this.state.ruta) {
            this.setState({ error: null, ruta: window.location.pathname });
        }
    }

    render() {
        if (!this.state.error) return this.props.children;
        return (
            <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'var(--font-body)' }}>
                <div style={{ maxWidth: 480, textAlign: 'center', padding: 28, borderRadius: 26, background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
                    <h2 style={{ margin: '0 0 8px', fontSize: 22 }}>Algo salió mal en esta pantalla</h2>
                    <p style={{ margin: '0 0 16px', color: 'var(--color-text-muted)', fontSize: 14.5 }}>
                        No se perdió nada. Recarga la página o vuelve al inicio.
                    </p>
                    <code style={{ display: 'block', marginBottom: 18, padding: 10, borderRadius: 12, background: 'var(--color-surface-2)', fontSize: 12, color: 'var(--color-text-muted)', wordBreak: 'break-word' }}>
                        {this.state.error.message}
                    </code>
                    <button onClick={() => window.location.reload()}
                        style={{ minHeight: 46, padding: '0 22px', border: 0, borderRadius: 14, cursor: 'pointer', background: 'var(--gradient-primary)', color: 'var(--color-on-primary)', fontWeight: 600, fontSize: 14.5 }}>
                        Recargar
                    </button>
                </div>
            </div>
        );
    }
}

export default ErrorPantalla;
