import { Routes, Route, useNavigate } from 'react-router-dom';
import Catalog from './pages/Catalog';
import ProductDetail from './pages/ProductDetail';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import AdminPanel from './pages/AdminPanel';
import MyPurchases from './pages/MyPurchases';
import Profile from './pages/Profile';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';

function Home() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 relative">
      {/* Background Effects */}
      <div className="bg-scanlines" />
      <div className="bg-vaporwave-grid" />

      {/* Content */}
      <div className="z-10 relative text-center">
        {/* Logo + Title */}
        <div className="flex flex-col items-center mb-10">
          <img
            src="/logo.png"
            alt="GOBLIN SPOT Logo"
            className="w-72 sm:w-[22rem] md:w-[28rem] mx-auto drop-shadow-[0_0_30px_rgba(74,222,128,0.6)] animate-pulse-slow mix-blend-screen"
          />
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-display font-black tracking-tight -mt-4">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400 drop-shadow-[0_0_12px_rgba(74,222,128,0.8)]">GOBLIN</span>
            {' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-pink-500 drop-shadow-[0_0_12px_rgba(217,70,239,0.8)]">SPOT</span>
          </h1>
          <p className="text-xs sm:text-sm font-retro text-neon-yellow tracking-[0.25em] uppercase mt-3 opacity-70">
            [ Insertar Moneda para Entrar ]
          </p>
        </div>

        <div
          onClick={() => navigate('/catalog')}
          className="glass-panel p-8 rounded-2xl relative max-w-lg mx-auto transform hover:scale-105 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-neon-blue/20 group"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-blue to-neon-pink rounded-t-2xl opacity-80 group-hover:opacity-100 transition-opacity"></div>
          <h2 className="text-3xl text-white mb-3 font-display font-bold tracking-wide">ENTRAR AL CATÁLOGO</h2>
          <p className="text-slate-300 font-sans leading-relaxed">Descubre el mejor mercado de TCGs, juegos de mesa, figuras de colección, y más en Costa Rica. Compra, vende e intercambia como quieras!!!</p>
        </div>

        <button
          onClick={() => navigate('/login')}
          className="mt-4 max-w-lg mx-auto w-full glass-panel border border-neon-pink/30 text-neon-pink font-sans font-semibold px-6 py-3 rounded-xl hover:bg-neon-pink/10 hover:border-neon-pink transition-all duration-300 tracking-widest uppercase text-sm"
        >
          ⚔ Acceso a Vendedores / Goblins
        </button>
      </div>
    </div>
  );
}


function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/catalog" element={<div className="relative"><div className="bg-scanlines" /><div className="bg-vaporwave-grid opacity-30 fixed inset-0" /><Catalog /></div>} />
        <Route path="/catalog/:id" element={<ProductDetail />} />
        <Route path="/my-purchases" element={<ProtectedRoute><div className="relative"><div className="bg-scanlines" /><div className="bg-vaporwave-grid opacity-30 fixed inset-0" /><MyPurchases /></div></ProtectedRoute>} />
        <Route path="/profile/:id" element={<div className="relative"><div className="bg-scanlines" /><div className="bg-vaporwave-grid opacity-30 fixed inset-0" /><Profile /></div>} />
        <Route path="/dashboard" element={<ProtectedRoute><div className="relative"><div className="bg-scanlines" /><div className="bg-vaporwave-grid opacity-30 fixed inset-0" /><Dashboard /></div></ProtectedRoute>} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<ProtectedRoute requiredRole="Admin"><div className="relative"><div className="bg-scanlines" /><div className="bg-vaporwave-grid opacity-30 fixed inset-0" /><AdminPanel /></div></ProtectedRoute>} />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
