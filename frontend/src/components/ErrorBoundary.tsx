import { Component } from 'react';
import type { ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; }

export default class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false };
    static getDerivedStateFromError(): State { return { hasError: true }; }
    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold mb-2">Algo salió mal</h1>
                        <p className="text-slate-400 mb-4">Ocurrió un error inesperado.</p>
                        <button onClick={() => window.location.href = '/'} className="px-4 py-2 bg-neon-blue rounded-lg">
                            Volver al inicio
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}
