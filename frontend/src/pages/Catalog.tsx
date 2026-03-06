import { useState, useEffect } from 'react';
import { Search, ShoppingCart, Box } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { catalogApi, type Product } from '../api/client';

export default function Catalog() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('Todos');

    const navigate = useNavigate();

    useEffect(() => {
        const fetchCatalog = async () => {
            setLoading(true);
            try {
                const prod = await catalogApi.getProducts();
                setProducts(prod);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchCatalog();
    }, []);

    const filteredProducts = products.filter(p =>
        (activeCategory === 'Todos' || p.category === activeCategory) &&
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen p-8 relative flex flex-col">
            {/* Background stays global in App or Layout but let's assume it leaks here */}
            <div className="z-10 relative max-w-7xl mx-auto w-full">

                {/* Header */}
                <header className="flex flex-col md:flex-row justify-between items-center mb-10 border-b border-slate-700/50 pb-6 gap-4">
                    <h1 className="text-4xl md:text-5xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-pink tracking-tight">
                        CATÁLOGO
                    </h1>
                    <div className="flex gap-4">
                        <button onClick={() => navigate('/login')} className="glass-panel text-white font-sans font-medium px-5 py-2.5 rounded-lg hover:bg-slate-800 transition-colors border border-slate-600/50">
                            Acceso a Vendedores
                        </button>
                        <button className="bg-neon-blue text-slate-900 font-sans font-bold px-5 py-2.5 rounded-lg hover:bg-cyan-400 transition-colors flex items-center gap-2 shadow-lg shadow-neon-blue/20">
                            <ShoppingCart size={18} /> Carrito (0)
                        </button>
                    </div>
                </header>

                {/* Filters Bar */}
                <div className="glass-panel rounded-xl p-5 mb-10 flex flex-col md:flex-row gap-6 items-center justify-between shadow-xl">
                    <div className="flex items-center gap-3 w-full md:w-1/2 relative">
                        <Search className="absolute left-4 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar bóvedas de datos..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg text-white p-3 pl-12 font-sans focus:outline-none focus:border-neon-blue transition-colors placeholder-slate-500"
                        />
                    </div>

                    <div className="flex gap-3 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 hide-scrollbar">
                        {['Todos', 'TCG', 'Figuras', 'Moxfield'].map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`px-5 py-2 font-sans font-medium rounded-full whitespace-nowrap transition-all duration-200 ${activeCategory === cat
                                    ? 'bg-neon-pink text-white shadow-lg shadow-neon-pink/20'
                                    : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/50'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Grid */}
                {loading ? (
                    <div className="flex justify-center items-center mt-32">
                        <div className="text-center font-retro text-neon-blue animate-pulse flex flex-col items-center gap-4">
                            <Box className="w-12 h-12 animate-spin-slow" />
                            <p>DESCIFRANDO DATOS...</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
                        {filteredProducts.map(product => (
                            <div key={product.id} className="glass-panel rounded-2xl overflow-hidden hover:-translate-y-2 transition-transform duration-300 shadow-xl group border border-slate-700/40 flex flex-col">

                                <div className="h-56 overflow-hidden relative bg-slate-900 flex-shrink-0">
                                    <img
                                        src={product.imageUrl}
                                        alt={product.name}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-90 group-hover:opacity-100 mix-blend-luminosity hover:mix-blend-normal"
                                    />
                                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-80" />

                                    <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-md border border-slate-700 text-neon-yellow text-xs font-sans font-medium px-3 py-1 rounded-full">
                                        {product.category}
                                    </div>
                                    {product.category === 'Moxfield' && (
                                        <div className="absolute bottom-3 left-3 bg-neon-pink/90 backdrop-blur border border-pink-400 text-white text-xs font-sans font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-lg">
                                            <Box size={14} /> EXPORTAR MAZO
                                        </div>
                                    )}
                                </div>

                                <div className="p-6 flex flex-col flex-grow">
                                    <h3 className="text-xl text-white font-display font-bold mb-2 line-clamp-1">{product.name}</h3>
                                    <p className="text-slate-400 text-sm mb-6 leading-relaxed line-clamp-2 flex-grow">{product.description}</p>

                                    <div className="flex justify-between items-end pt-4 border-t border-slate-700/50">
                                        <div className="text-2xl text-neon-blue font-display font-bold tracking-tight">
                                            ₡{product.priceCRC.toLocaleString('es-CR')}
                                        </div>
                                        <button className="bg-white/10 text-white font-sans font-bold px-4 py-2 hover:bg-white hover:text-slate-900 transition-colors rounded-lg">
                                            Agregar al Carrito
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
