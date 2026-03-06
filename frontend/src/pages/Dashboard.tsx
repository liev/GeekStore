import { useState, useEffect } from 'react';
import { Trash2, Box, Eye, Image as ImageIcon } from 'lucide-react';
import { catalogApi, type Product } from '../api/client';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

interface JwtPayload {
    sub?: string;
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'?: string;
    [key: string]: any;
}

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState<'inventory' | 'upload'>('inventory');
    const [inventory, setInventory] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    const navigate = useNavigate();

    // Seller Auth State
    const [sellerId, setSellerId] = useState<number | null>(null);
    const [token, setToken] = useState<string | null>(null);

    // Form State
    const [name, setName] = useState('');
    const [priceCRC, setPriceCRC] = useState('');
    const [category, setCategory] = useState('TCG');
    const [moxfieldUrl, setMoxfieldUrl] = useState('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const storedToken = localStorage.getItem('geekstore_token');
        if (!storedToken) {
            navigate('/login');
            return;
        }

        try {
            const decoded = jwtDecode<JwtPayload>(storedToken);
            const userId = decoded.sub || decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];
            if (userId) {
                setSellerId(Number(userId));
                setToken(storedToken);
            } else {
                throw new Error("Invalid token format");
            }
        } catch (error) {
            localStorage.removeItem('geekstore_token');
            navigate('/login');
        }
    }, [navigate]);

    useEffect(() => {
        const fetchInventory = async () => {
            if (activeTab === 'inventory' && sellerId !== null) {
                setLoading(true);
                try {
                    const products = await catalogApi.getProductsBySeller(sellerId);
                    setInventory(products);
                } catch (error) {
                    console.error("Error fetching inventory", error);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchInventory();
    }, [activeTab, sellerId]);

    return (
        <div className="min-h-screen p-8 relative flex flex-col">
            <div className="z-10 relative max-w-6xl mx-auto w-full">

                {/* Header */}
                <header className="mb-12 border-b border-slate-700/50 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-pink leading-none mb-3 tracking-tight">
                            SISTEMA DE VENDEDOR
                        </h1>
                        <div className="flex items-center gap-3 text-xs font-sans font-medium text-slate-400">
                            <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div> EN LÍNEA</span>
                            <span className="text-slate-600">|</span>
                            <span>INVENTARIO: 2/50</span>
                            <span className="text-slate-600">|</span>
                            <span className="text-neon-blue">VERIFICADO</span>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            localStorage.removeItem('geekstore_token');
                            navigate('/login');
                        }}
                        className="glass-panel text-white font-sans font-medium px-5 py-2 hover:bg-slate-800 transition-colors rounded-lg border border-slate-600/50"
                    >
                        Cerrar Sesión
                    </button>
                </header>

                {/* Dashboard Nav */}
                <div className="flex gap-4 mb-8 font-sans font-medium text-lg">
                    <button
                        onClick={() => setActiveTab('inventory')}
                        className={`px-8 py-3 rounded-full transition-all duration-300 ${activeTab === 'inventory'
                            ? 'glass-panel text-white shadow-lg shadow-neon-blue/20 border-neon-blue'
                            : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700 border border-transparent'
                            }`}
                    >
                        Inventario
                    </button>
                    <button
                        onClick={() => setActiveTab('upload')}
                        className={`px-8 py-3 rounded-full transition-all duration-300 ${activeTab === 'upload'
                            ? 'glass-panel text-white shadow-lg shadow-neon-pink/20 border-neon-pink'
                            : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700 border border-transparent'
                            }`}
                    >
                        Agregar Cinta de Datos
                    </button>
                </div>

                {/* System Display Panel */}
                <div className="glass-panel p-8 rounded-2xl relative overflow-hidden shadow-2xl border border-slate-700/50">
                    {/* Internal scanlines for the screen effect */}
                    <div className="absolute inset-0 bg-scanlines opacity-20 pointer-events-none"></div>

                    {activeTab === 'inventory' && (
                        <div className="relative z-10 w-full overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-700 text-slate-400 font-sans text-sm tracking-widest uppercase">
                                        <th className="p-4 font-semibold text-slate-300">ID</th>
                                        <th className="p-4 font-semibold text-slate-300">Nombre del Artículo</th>
                                        <th className="p-4 font-semibold text-slate-300">Categoría</th>
                                        <th className="p-4 font-semibold text-slate-300">Precio</th>
                                        <th className="p-4 font-semibold text-slate-300 text-center">Estado</th>
                                        <th className="p-4 font-semibold text-slate-300 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="font-sans">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-neon-blue font-retro animate-pulse">
                                                CARGANDO INVENTARIO...
                                            </td>
                                        </tr>
                                    ) : inventory.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-slate-500 font-sans">
                                                No hay artículos en tu inventario.
                                            </td>
                                        </tr>
                                    ) : (
                                        inventory.map((product) => (
                                            <tr key={product.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors group">
                                                <td className="p-4 font-retro text-cyan-400 text-sm">{String(product.id).padStart(3, '0')}</td>
                                                <td className="p-4 text-slate-200">{product.name}</td>
                                                <td className="p-4">
                                                    <span className="bg-slate-800 text-neon-pink px-3 py-1 rounded-full text-xs font-medium border border-slate-700">{product.category}</span>
                                                </td>
                                                <td className="p-4 font-display font-bold text-white">₡{product.priceCRC.toLocaleString('es-CR')}</td>
                                                <td className="p-4 text-center">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${product.stockStatus === 'Available' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                                                        {product.stockStatus === 'Available' ? 'ACTIVO' : 'NO DISP.'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right flex justify-end gap-2">
                                                    <button className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-700 transition-colors"><Eye size={18} /></button>
                                                    <button className="text-slate-400 hover:text-red-400 p-2 rounded-lg hover:bg-slate-700 transition-colors"><Trash2 size={18} /></button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                            <div className="mt-8 text-center text-slate-500 font-retro text-sm opacity-50">
                                // FIN DEL ARCHIVO //
                            </div>
                        </div>
                    )}

                    {activeTab === 'upload' && (
                        <div className="relative z-10 w-full max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

                            {/* Header Text */}
                            <div className="text-center mb-6">
                                <h2 className="text-2xl font-display font-bold text-white mb-2">Inicializar Nueva Cinta de Datos</h2>
                                <p className="text-slate-400 font-sans text-sm">Llene los parámetros abajo. Se admiten enlaces web a mazos de Moxfield.</p>
                            </div>

                            {/* Image Upload Zone */}
                            <div className="glass-panel border-2 border-dashed border-slate-600 p-10 flex flex-col items-center justify-center cursor-pointer hover:border-neon-blue hover:bg-slate-800/50 transition-all duration-300 rounded-2xl group shadow-lg">
                                <div className="bg-slate-900 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-neon-blue/20">
                                    <ImageIcon size={32} className="text-neon-blue" />
                                </div>
                                <p className="font-display font-bold tracking-wide text-lg text-white mb-2">SUBIR DATOS DEL CORTEX VISUAL</p>
                                <p className="text-sm text-slate-400 font-sans max-w-sm text-center">Arrastre y suelte o haga clic para buscar. AI Moderation activo; datos ilícitos resultarán en bloqueos.</p>
                            </div>

                            {/* Form Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 glass-panel p-8 rounded-2xl shadow-xl border border-slate-700/50">

                                <div className="col-span-1 md:col-span-2 space-y-2">
                                    <label className="block text-slate-300 font-sans font-medium text-sm">Designación del Artículo (Nombre)</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full bg-slate-900/50 border border-slate-700 focus:border-neon-blue rounded-lg text-white p-3.5 font-sans outline-none transition-colors shadow-inner"
                                        placeholder="ej. Master Sword Replica"
                                    />
                                </div>

                                <div className="col-span-1 space-y-2">
                                    <label className="block text-slate-300 font-sans font-medium text-sm">Precio (CRC)</label>
                                    <input
                                        type="number"
                                        value={priceCRC}
                                        onChange={(e) => setPriceCRC(e.target.value)}
                                        className="w-full bg-slate-900/50 border border-slate-700 focus:border-neon-blue rounded-lg text-white p-3.5 font-retro outline-none transition-colors shadow-inner"
                                        placeholder="0.00"
                                    />
                                </div>

                                <div className="col-span-1 space-y-2">
                                    <label className="block text-slate-300 font-sans font-medium text-sm">Categoría</label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="w-full bg-slate-900/50 border border-slate-700 focus:border-neon-blue rounded-lg text-white p-3.5 font-sans outline-none appearance-none transition-colors shadow-inner cursor-pointer"
                                    >
                                        <option value="TCG">TCG</option>
                                        <option value="Figuras">Figuras</option>
                                        <option value="Videojuegos">Videojuegos</option>
                                        <option value="Cómics">Cómics</option>
                                    </select>
                                </div>

                                <div className="col-span-1 md:col-span-2 space-y-2">
                                    <label className="block text-neon-pink font-sans font-medium text-sm flex items-center gap-2">
                                        <Box size={14} /> Enlace de Mazo Moxfield (Opcional)
                                    </label>
                                    <div className="flex relative shadow-inner rounded-lg overflow-hidden border border-slate-700 focus-within:border-neon-pink transition-colors">
                                        <input
                                            type="url"
                                            value={moxfieldUrl}
                                            onChange={(e) => setMoxfieldUrl(e.target.value)}
                                            className="w-full bg-slate-900/50 text-white p-3.5 pl-4 font-sans outline-none"
                                            placeholder="https://moxfield.com/decks/..."
                                        />
                                        <button className="px-6 bg-neon-pink/20 text-neon-pink hover:bg-neon-pink hover:text-white font-sans font-bold transition-colors">
                                            OBTENER
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">Pegue un enlace público de Moxfield. Analizaremos la lista de cartas automáticamente.</p>
                                </div>

                                <div className="col-span-1 md:col-span-2 space-y-2">
                                    <label className="block text-slate-300 font-sans font-medium text-sm">Descripción</label>
                                    <textarea
                                        rows={4}
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="w-full bg-slate-900/50 border border-slate-700 focus:border-neon-blue rounded-lg text-white p-3.5 font-sans outline-none resize-none transition-colors shadow-inner"
                                        placeholder="Ingrese condición, detalles, etc..."
                                    ></textarea>
                                </div>

                                <div className="col-span-1 md:col-span-2 pt-6 mt-2 border-t border-slate-700/50">
                                    <button
                                        onClick={async () => {
                                            setIsSubmitting(true);
                                            try {
                                                const newProduct = {
                                                    name,
                                                    priceCRC: Number(priceCRC),
                                                    category,
                                                    moxfieldDeckUrl: moxfieldUrl,
                                                    description,
                                                    sellerId: sellerId!,
                                                    imageUrl: 'https://via.placeholder.com/300', // placeholder until we handle image upload properly
                                                    stockStatus: 'Available'
                                                };
                                                // Real creation using authenticated token
                                                await catalogApi.createProduct(newProduct, token!);
                                                // Switch back to inventory tab to see the new item
                                                setActiveTab('inventory');
                                                // Reset form
                                                setName('');
                                                setPriceCRC('');
                                                setCategory('TCG');
                                                setMoxfieldUrl('');
                                                setDescription('');
                                            } catch (error) {
                                                console.error("Failed to create product", error);
                                            } finally {
                                                setIsSubmitting(false);
                                            }
                                        }}
                                        disabled={isSubmitting}
                                        className={`w-full bg-neon-blue text-slate-900 font-sans font-bold text-lg py-4 rounded-xl hover:bg-cyan-400 shadow-lg shadow-neon-blue/20 hover:shadow-neon-blue/40 transition-all duration-300 transform hover:-translate-y-1 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {isSubmitting ? 'TRANSMITIENDO...' : 'TRANSMITIR DATOS AL SERVIDOR'}
                                    </button>
                                </div>

                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
