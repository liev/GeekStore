import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi, settingsApi } from '../api/client';
import { UserPlus } from 'lucide-react';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    // Registration State
    const [isRegistering, setIsRegistering] = useState(false);
    const [regName, setRegName] = useState('');
    const [regSurname, setRegSurname] = useState('');
    const [regNickname, setRegNickname] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regRole, setRegRole] = useState<'Seller' | 'Buyer'>('Seller');
    const [sellerFee, setSellerFee] = useState('0.00');

    // Payment State
    const [showPayment, setShowPayment] = useState(false);

    // Email Verification State
    const [showVerification, setShowVerification] = useState(false);
    const [verifyEmail, setVerifyEmail] = useState('');
    const [verifyCode, setVerifyCode] = useState('');
    const [verifySuccess, setVerifySuccess] = useState(false);

    useEffect(() => {
        const fetchFee = async () => {
            const fee = await settingsApi.getSellerFee();
            setSellerFee(fee);
        };
        fetchFee();
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const token = await authApi.login(email, password);
            if (token) {
                localStorage.setItem('geekstore_token', token);
                navigate('/dashboard');
            } else {
                setError('ACCESO DENEGADO: Credenciales inválidas');
            }
        } catch (err: unknown) {
            // Handle unverified account
            const msg = (err as { message?: string })?.message ?? '';
            if (msg.includes('EMAIL_NOT_VERIFIED') || msg.includes('400')) {
                setVerifyEmail(email);
                setShowVerification(true);
                setError('');
            } else {
                setError('ERROR DE CONEXIÓN');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyCode = async () => {
        if (verifyCode.length !== 6) { setError('Ingresa el código de 6 dígitos'); return; }
        setError('');
        setLoading(true);
        try {
            const res = await fetch('http://localhost:5242/api/Auth/verify-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: verifyEmail, code: verifyCode })
            });
            const data = await res.json();
            if (res.ok) {
                setVerifySuccess(true);
                setError('');
                setTimeout(() => {
                    setShowVerification(false);
                    setVerifySuccess(false);
                    setIsRegistering(false);
                    setEmail(verifyEmail);
                }, 2500);
            } else {
                setError(data.message ?? 'Código incorrecto');
            }
        } catch { setError('Error de conexión'); }
        finally { setLoading(false); }
    };

    const handleResendCode = async () => {
        setError('');
        try {
            await fetch('http://localhost:5242/api/Auth/resend-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(verifyEmail)
            });
            setError('Código reenviado. Revisa tu correo.');
        } catch { setError('No se pudo reenviar el código.'); }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!regName || !regEmail || !regPassword) {
            setError('Faltan campos obligatorios');
            return;
        }
        // Sellers go through payment; buyers register directly
        if (regRole === 'Seller') {
            setShowPayment(true);
        } else {
            // Buyer: register immediately (no payment)
            setLoading(true);
            try {
                const success = await authApi.register({
                    Name: regName,
                    Surname: regSurname,
                    Nickname: regNickname,
                    Email: regEmail,
                    Password: regPassword,
                    Role: regRole
                });
                if (success) {
                    setVerifyEmail(regEmail);
                    setShowVerification(true);
                } else {
                    setError('ERROR EN EL REGISTRO. INTENTE DE NUEVO.');
                }
            } catch { setError('ERROR DE CONEXIÓN.'); }
            finally { setLoading(false); }
        }
    };

    const handlePayment = async () => {
        setError('');
        setLoading(true);

        try {
            const success = await authApi.register({
                Name: regName,
                Surname: regSurname,
                Nickname: regNickname,
                Email: regEmail,
                Password: regPassword,
                Role: regRole
            });

            if (success) {
                setShowPayment(false);
                setVerifyEmail(regEmail);
                setShowVerification(true);
            } else {
                setError('ERROR EN EL REGISTRO. INTENTE DE NUEVO.');
                setShowPayment(false);
            }
        } catch {
            setError('ERROR DE CONEXIÓN');
            setShowPayment(false);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen p-4 sm:p-8 flex flex-col items-center justify-center relative">
            <div className="bg-scanlines" />
            <div className="bg-vaporwave-grid opacity-30 fixed inset-0" />

            <div className="z-10 relative w-full max-w-md">
                {/* Header terminal style */}
                <div className="text-center mb-8" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                    <img src="/logo.png" alt="Goblin Spot Logo" className="h-28 mx-auto mb-4 mix-blend-screen drop-shadow-[0_0_14px_rgba(74,222,128,0.5)] hover:scale-105 transition-transform" />
                    <h1 className="text-3xl font-display font-black tracking-tight uppercase">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500">Goblin</span>{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-pink to-purple-500">Spot</span>
                    </h1>
                    <p className="font-retro text-neon-yellow text-sm mt-2">
                        [ REQUERIDO: ACCESO DE VENDEDOR ]
                    </p>
                </div>

                {/* ── Email Verification Screen ───────────────────────── */}
                {showVerification && (
                    <div className="glass-panel p-6 sm:p-8 rounded-2xl relative shadow-2xl border border-neon-blue/40 text-center">
                        {verifySuccess ? (
                            <>
                                <div className="text-5xl mb-4">✅</div>
                                <h2 className="text-2xl font-display font-bold text-green-400 mb-2">¡Cuenta Verificada!</h2>
                                <p className="text-slate-300 font-sans">Serás redirigido al login...</p>
                            </>
                        ) : (
                            <>
                                <div className="text-4xl mb-4">📧</div>
                                <h2 className="text-2xl font-display font-bold text-white mb-2">Verifica tu Goblin</h2>
                                <p className="text-slate-300 font-sans text-sm mb-6">
                                    Enviamos un código de 6 dígitos a<br />
                                    <span className="text-neon-blue font-semibold">{verifyEmail}</span>
                                </p>
                                {error && (
                                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-sm mb-4">{error}</div>
                                )}
                                <input
                                    type="text"
                                    maxLength={6}
                                    placeholder="000000"
                                    value={verifyCode}
                                    onChange={e => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    className="w-full text-center bg-slate-900 border-2 border-neon-blue/50 focus:border-neon-blue rounded-xl text-white font-retro text-3xl tracking-[0.5em] p-4 mb-4 focus:outline-none transition-colors"
                                />
                                <button
                                    onClick={handleVerifyCode}
                                    disabled={loading || verifyCode.length !== 6}
                                    className="w-full bg-neon-blue text-slate-900 font-display font-bold py-3 rounded-xl hover:bg-cyan-400 transition-colors disabled:opacity-50 mb-3"
                                >
                                    {loading ? 'VERIFICANDO...' : 'VERIFICAR CUENTA'}
                                </button>
                                <button
                                    onClick={handleResendCode}
                                    className="text-slate-400 font-sans text-sm hover:text-neon-blue transition-colors"
                                >
                                    ¿No llegó el código? Reenviar
                                </button>
                            </>
                        )}
                    </div>
                )}

                {!showVerification && <div className="glass-panel p-6 sm:p-8 rounded-2xl relative shadow-2xl border border-slate-700/50">
                    <div className="flex justify-center mb-6 border-b border-slate-700 pb-2">
                        <button
                            className={`px-4 py-2 font-display font-bold ${!isRegistering ? 'text-neon-blue border-b-2 border-neon-blue' : 'text-slate-500 hover:text-white'}`}
                            onClick={() => { setIsRegistering(false); setShowPayment(false); setError(''); }}
                        >
                            INICIAR SESIÓN
                        </button>
                        <button
                            className={`px-4 py-2 font-display font-bold ${isRegistering ? 'text-neon-pink border-b-2 border-neon-pink' : 'text-slate-500 hover:text-white'}`}
                            onClick={() => { setIsRegistering(true); setShowPayment(false); setError(''); }}
                        >
                            CONVIÉRTETE EN GOBLIN
                        </button>
                    </div>

                    {!isRegistering ? (
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
                                    autoComplete="email"
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
                                    autoComplete="current-password"
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
                    ) : showPayment ? (
                        /* ── Seller Payment ── */
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-lg font-sans text-sm font-medium animate-pulse text-center">
                                    {error}
                                </div>
                            )}
                            <div className="bg-slate-900/50 border border-neon-blue/50 p-4 rounded-xl text-center">
                                <p className="text-slate-400 font-sans text-sm mb-1">Costo Mensual de Indentificación:</p>
                                <p className="text-3xl font-display font-bold text-white">₡{sellerFee}</p>
                                <p className="text-sm font-retro text-slate-400 tracking-wider mb-2">~ ${(parseFloat(sellerFee) / 500).toFixed(2)} USD</p>
                                <p className="text-xs text-neon-pink mt-2">* Membresía auto-renovable mensualmente</p>
                            </div>

                            <div className="space-y-4 max-w-sm mx-auto z-20 relative mt-6">
                                <PayPalScriptProvider options={{ clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID || "test", currency: "USD", intent: "capture" }}>
                                    <PayPalButtons
                                        style={{ layout: "vertical", shape: "pill", color: "gold" }}
                                        createOrder={(_data, actions) => {
                                            return actions.order.create({
                                                intent: "CAPTURE",
                                                purchase_units: [
                                                    {
                                                        description: "Suscripción Instalación Vendedor GeekStore",
                                                        amount: { value: (parseFloat(sellerFee) / 500).toFixed(2), currency_code: "USD" }
                                                    }
                                                ],
                                            });
                                        }}
                                        onApprove={async (_data, actions) => {
                                            if (!actions.order) return;
                                            try {
                                                await actions.order.capture();
                                                await handlePayment();
                                            } catch (err) {
                                                setError(err instanceof Error ? err.message : "Error al procesar el pago con PayPal.");
                                            }
                                        }}
                                        onError={() => {
                                            setError("Hubo un error al conectar con PayPal.");
                                        }}
                                    />
                                </PayPalScriptProvider>
                            </div>

                            <button
                                onClick={() => setShowPayment(false)}
                                disabled={loading}
                                className="w-full text-slate-400 hover:text-white font-sans text-sm mt-4 tracking-wide"
                            >
                                CANCELAR REGISTRO
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleRegister} className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-lg font-sans text-sm font-medium animate-pulse text-center">
                                    {error}
                                </div>
                            )}

                            {/* Role chooser */}
                            <div className="space-y-1.5">
                                <label className="block text-slate-300 font-sans font-medium text-xs uppercase tracking-wider">TIPO DE CUENTA</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button type="button" onClick={() => setRegRole('Buyer')}
                                        className={`flex flex-col items-center py-3 px-2 rounded-xl border-2 transition-all text-xs font-bold ${regRole === 'Buyer' ? 'border-neon-blue bg-neon-blue/10 text-neon-blue' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                                        <span className="text-xl mb-1">🛒</span>
                                        <span>COMPRADOR</span>
                                        <span className="font-sans font-normal text-green-400 text-[10px] mt-0.5">Gratis</span>
                                    </button>
                                    <button type="button" onClick={() => setRegRole('Seller')}
                                        className={`flex flex-col items-center py-3 px-2 rounded-xl border-2 transition-all text-xs font-bold ${regRole === 'Seller' ? 'border-neon-pink bg-neon-pink/10 text-neon-pink' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                                        <span className="text-xl mb-1">⚔</span>
                                        <span>VENDEDOR</span>
                                        <span className="font-sans font-normal text-neon-pink text-[10px] mt-0.5">₡{sellerFee}/mes</span>
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="block text-slate-300 font-sans font-medium text-sm text-xs">NOMBRE</label>
                                    <input
                                        type="text"
                                        value={regName}
                                        onChange={(e) => setRegName(e.target.value)}
                                        required
                                        className="w-full bg-slate-900/50 border border-slate-700 focus:border-neon-pink rounded-lg text-white p-2.5 font-sans outline-none transition-colors text-sm shadow-inner"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-slate-300 font-sans font-medium text-sm text-xs">APELLIDO</label>
                                    <input
                                        type="text"
                                        value={regSurname}
                                        onChange={(e) => setRegSurname(e.target.value)}
                                        required
                                        className="w-full bg-slate-900/50 border border-slate-700 focus:border-neon-pink rounded-lg text-white p-2.5 font-sans outline-none transition-colors text-sm shadow-inner"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-slate-300 font-sans font-medium text-sm text-xs">ALIAS DE USUARIO</label>
                                <input
                                    type="text"
                                    value={regNickname}
                                    onChange={(e) => setRegNickname(e.target.value)}
                                    required
                                    className="w-full bg-slate-900/50 border border-slate-700 focus:border-neon-pink rounded-lg text-white p-2.5 font-sans outline-none transition-colors text-sm shadow-inner"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-slate-300 font-sans font-medium text-sm text-xs">CORREO DE CONTACTO</label>
                                <input
                                    type="email"
                                    value={regEmail}
                                    onChange={(e) => setRegEmail(e.target.value)}
                                    required
                                    autoComplete="email"
                                    className="w-full bg-slate-900/50 border border-slate-700 focus:border-neon-pink rounded-lg text-white p-2.5 font-sans outline-none transition-colors text-sm shadow-inner"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-slate-300 font-sans font-medium text-sm text-xs">CONTRASEÑA</label>
                                <input
                                    type="password"
                                    value={regPassword}
                                    onChange={(e) => setRegPassword(e.target.value)}
                                    required
                                    autoComplete="new-password"
                                    className="w-full bg-slate-900/50 border border-slate-700 focus:border-neon-pink rounded-lg text-white p-2.5 font-sans outline-none transition-colors text-sm shadow-inner"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full mt-6 flex justify-center items-center gap-2 bg-gradient-to-r from-neon-pink to-purple-600 text-white font-sans font-bold text-lg py-3 rounded-xl shadow-lg transition-all duration-300 transform hover:-translate-y-1 hover:shadow-neon-pink/40"
                            >
                                <UserPlus size={20} /> INICIAR REGISTRO ACUERDO
                            </button>
                        </form>
                    )}

                    <div className="mt-6 text-center">
                        <button
                            onClick={() => navigate('/catalog')}
                            className="text-slate-400 hover:text-white font-sans text-sm transition-colors"
                        >
                            &larr; Volver al Catálogo Público
                        </button>
                    </div>
                </div>}
            </div>
        </div>
    );
}
