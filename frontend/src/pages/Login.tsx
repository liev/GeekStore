import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/client';
import { Terminal } from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const token = await authApi.login(email, password);
            if (token) {
                // Store token in localStorage
                localStorage.setItem('geekstore_token', token);
                navigate('/dashboard');
            } else {
                setError('ACCESO DENEGADO: Credenciales inválidas');
            }
        } catch (err) {
            setError('ERROR DE CONEXIÓN');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen p-8 flex flex-col items-center justify-center relative">
            <div className="bg-scanlines" />
            <div className="bg-vaporwave-grid opacity-30 fixed inset-0" />

            <div className="z-10 relative w-full max-w-md">
                {/* Header terminal style */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto bg-neon-blue/10 rounded-full border border-neon-blue flex items-center justify-center mb-4 shadow-lg shadow-neon-blue/20">
                        <Terminal size={32} className="text-neon-blue" />
                    </div>
                    <h1 className="text-3xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-pink tracking-tight">
                        AUTORIZACIÓN
                    </h1>
                    <p className="font-retro text-neon-yellow text-sm mt-2">
                        [ REQUERIDO: ACCESO DE VENDEDOR ]
                    </p>
                </div>

                <div className="glass-panel p-8 rounded-2xl relative shadow-2xl border border-slate-700/50">
                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-lg font-sans text-sm font-medium animate-pulse text-center">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="block text-slate-300 font-sans font-medium text-sm">IDENTIFICACIÓN (Correo)</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full bg-slate-900/50 border border-slate-700 focus:border-neon-blue rounded-lg text-white p-3.5 font-sans outline-none transition-colors shadow-inner"
                                placeholder="vendedor@sistema.com"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-slate-300 font-sans font-medium text-sm">CÓDIGO DE ACCESO (Contraseña)</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full bg-slate-900/50 border border-slate-700 focus:border-neon-pink rounded-lg text-white p-3.5 font-sans outline-none transition-colors shadow-inner"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full bg-gradient-to-r from-neon-blue to-cyan-500 text-slate-900 font-sans font-bold text-lg py-4 rounded-xl shadow-lg transition-all duration-300 transform hover:-translate-y-1 ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-neon-blue/40'}`}
                        >
                            {loading ? 'AUTENTICANDO...' : 'INICIALIZAR SESIÓN'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <button
                            onClick={() => navigate('/catalog')}
                            className="text-slate-400 hover:text-white font-sans text-sm transition-colors"
                        >
                            &larr; Volver al Catálogo Público
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
