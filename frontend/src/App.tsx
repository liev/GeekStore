import { Routes, Route, useNavigate } from 'react-router-dom';
import Catalog from './pages/Catalog';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';

function Home() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 relative">
      {/* Background Effects */}
      <div className="bg-scanlines" />
      <div className="bg-vaporwave-grid" />

      {/* Content */}
      <div className="z-10 relative text-center">
        <h1 className="text-6xl md:text-8xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-neon-blue via-white to-neon-pink text-glow-blue tracking-tight mb-6 p-4">
          MERCADITO GEEK
        </h1>
        <p className="text-lg md:text-xl mt-4 font-retro text-neon-yellow tracking-widest uppercase mb-12 opacity-90">
          [ Insertar Moneda para Ver el Catálogo ]
        </p>

        <div
          onClick={() => navigate('/catalog')}
          className="glass-panel p-8 rounded-2xl relative max-w-lg mx-auto transform hover:scale-105 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-neon-blue/20 group"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-blue to-neon-pink rounded-t-2xl opacity-80 group-hover:opacity-100 transition-opacity"></div>
          <h2 className="text-3xl text-white mb-3 font-display font-bold tracking-wide">ENTRAR AL CATÁLOGO</h2>
          <p className="text-slate-300 font-sans leading-relaxed">Descubre TCGs seleccionados, Figuras de colección y Mazos exclusivos de Moxfield en toda Costa Rica.</p>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/catalog" element={<div className="relative"><div className="bg-scanlines" /><div className="bg-vaporwave-grid opacity-30 fixed inset-0" /><Catalog /></div>} />
      <Route path="/dashboard" element={<div className="relative"><div className="bg-scanlines" /><div className="bg-vaporwave-grid opacity-30 fixed inset-0" /><Dashboard /></div>} />
      <Route path="/login" element={<Login />} />
    </Routes>
  );
}

export default App;
