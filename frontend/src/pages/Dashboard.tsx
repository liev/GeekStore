import { useState, useEffect } from 'react';
import { Trash2, Box, Eye, Image as ImageIcon, ArrowUpDown, Pencil, X, Package, CheckCircle, Truck, PackageCheck } from 'lucide-react';
import { catalogApi, sellersApi, settingsApi, usersApi, ordersApi, type Product, type Order, type SellerAnalyticsDto } from '../api/client';
import NotificationBell from '../components/NotificationBell';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

interface JwtPayload {
    sub?: string;
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'?: string;
    [key: string]: unknown;
}

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState<'inventory' | 'upload' | 'subscription' | 'profile' | 'orders'>('inventory');
    const [inventory, setInventory] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState<SellerAnalyticsDto | null>(null);

    const navigate = useNavigate();

    // Seller Auth State
    const [sellerId, setSellerId] = useState<number | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [sellerFee, setSellerFee] = useState<string>('0');
    const [subFeeUSD, setSubFeeUSD] = useState<string>('10.00');
    
    // Profile State
    const [sellerPhone, setSellerPhone] = useState<string>('');
    const [isSavingProfile, setIsSavingProfile] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [priceCRC, setPriceCRC] = useState('');
    const [categoryId, setCategoryId] = useState<number>(1);
    const [moxfieldUrl, setMoxfieldUrl] = useState('');
    const [description, setDescription] = useState('');
    const [stockCount, setStockCount] = useState<number>(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
    const [importIndividually, setImportIndividually] = useState(false); // New state for Moxfield import mode

    // Image Upload
    const [imageUrls, setImageUrls] = useState<string[]>([]);
    const [isUploadingImage, setIsUploadingImage] = useState(false);

    // Sorting State
    const [sortColumn, setSortColumn] = useState<keyof Product>('id');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    // Editing State
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [editName, setEditName] = useState('');
    const [editPrice, setEditPrice] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [editStock, setEditStock] = useState<number>(1);
    const [editCatId, setEditCatId] = useState<number>(1);
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    // Orders State
    const [sellerOrders, setSellerOrders] = useState<Order[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
    
    const openEditModal = (p: Product) => {
        setEditingProduct(p);
        setEditName(p.name);
        setEditPrice(p.priceCRC.toString());
        setEditDesc(p.description);
        setEditStock(p.stockCount);
        setEditCatId(p.categoryId);
    };

    const handleSort = (column: keyof Product) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const sortedInventory = [...inventory].sort((a, b) => {
        const aVal = a[sortColumn] ?? '';
        const bVal = b[sortColumn] ?? '';
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

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
        } catch {
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

        const fetchMetrics = async () => {
            if (sellerId !== null && token) {
                try {
                    const data = await sellersApi.getMetrics(token);
                    setMetrics(data);
                    const fee = await settingsApi.getSellerFee();
                    setSellerFee(fee);
                    // Conversion to USD (approx 500 CRC to 1 USD)
                    const feeUSD = Math.max((parseFloat(fee) / 500), 1).toFixed(2);
                    setSubFeeUSD(feeUSD);

                    // Fetch Profile Data for Phone
                    if (sellerId) {
                        const profile = await usersApi.getProfile(sellerId, token);
                        setSellerPhone(profile.phoneNumber || '');
                    }
                } catch (err) {
                    console.error("Error fetching metrics", err);
                }
            }
        }

        fetchInventory();
        fetchMetrics();

        // Fetch orders for orders tab
        const fetchOrders = async () => {
            if (activeTab === 'orders' && token) {
                setLoadingOrders(true);
                try {
                    const orders = await ordersApi.getMySales(token);
                    setSellerOrders(orders);
                } catch (err) {
                    console.error('Error fetching seller orders', err);
                } finally {
                    setLoadingOrders(false);
                }
            }
        };
        fetchOrders();
    }, [activeTab, sellerId, token]);

    return (
        <div className="min-h-screen p-4 sm:p-8 relative flex flex-col">
            <div className="z-10 relative max-w-6xl mx-auto w-full">

                {/* Header */}
                <header className="mb-8 sm:mb-12 border-b border-slate-700/50 pb-6 flex flex-col md:flex-row justify-between items-center md:items-end gap-6 md:gap-4">
                    <div className="flex items-center gap-4 cursor-pointer group" onClick={() => navigate('/')}>
                        <img src="/logo.png" alt="Goblin Spot Logo" className="h-16 md:h-24 mix-blend-screen drop-shadow-[0_0_12px_rgba(74,222,128,0.5)] transition-transform group-hover:scale-105" />
                        <div className="h-10 w-[2px] bg-slate-700/50 hidden md:block"></div>
                        <div className="text-center md:text-left">
                            <h1 className="text-2xl md:text-3xl font-display font-black tracking-tight">
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500">GOBLIN</span>{' '}
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-pink to-purple-500">SPOT</span>
                            </h1>
                            <div className="flex flex-wrap justify-center md:justify-start items-center gap-3 text-xs sm:text-sm font-sans font-medium text-slate-400">
                                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div> EN LÍNEA</span>
                                <span className="text-slate-600 hidden sm:inline">|</span>
                                <span>INVENTARIO: {inventory.length}/50</span>
                                <span className="text-slate-600 hidden sm:inline">|</span>
                                <span className="text-neon-blue">VERIFICADO</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        <button
                            onClick={() => navigate('/catalog')}
                            className="w-full md:w-auto bg-neon-blue/10 text-neon-blue font-sans font-medium px-5 py-3 sm:py-2 hover:bg-neon-blue hover:text-slate-900 transition-colors rounded-lg border border-neon-blue/50"
                        >
                            Ver Catálogo
                        </button>
                        {token && <NotificationBell token={token} />}
                        <button
                            onClick={() => navigate('/admin')}
                            className="w-full md:w-auto bg-neon-pink/10 text-neon-pink font-sans font-medium px-5 py-3 sm:py-2 hover:bg-neon-pink hover:text-white transition-colors rounded-lg border border-neon-pink/50"
                        >
                            Portal de Admin
                        </button>
                        <button
                            onClick={() => {
                                localStorage.removeItem('geekstore_token');
                                navigate('/login');
                            }}
                            className="w-full md:w-auto glass-panel text-white font-sans font-medium px-5 py-3 sm:py-2 hover:bg-slate-800 transition-colors rounded-lg border border-slate-600/50"
                        >
                            Cerrar Sesión
                        </button>
                    </div>
                </header>

                {/* Seller Metrics Banner */}
                {metrics && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="glass-panel p-4 rounded-xl border border-slate-700/50 shadow-lg text-center">
                            <p className="text-slate-400 text-xs font-retro uppercase mb-1">Ingresos Totales</p>
                            <p className="text-2xl font-display font-bold text-neon-blue">₡{metrics.totalRevenueCRC.toLocaleString('es-CR')}</p>
                        </div>
                        <div className="glass-panel p-4 rounded-xl border border-slate-700/50 shadow-lg text-center">
                            <p className="text-slate-400 text-xs font-retro uppercase mb-1">Órdenes Pendientes</p>
                            <p className="text-2xl font-display font-bold text-yellow-400">{metrics.pendingOrders}</p>
                        </div>
                        <div className="glass-panel p-4 rounded-xl border border-slate-700/50 shadow-lg text-center">
                            <p className="text-slate-400 text-xs font-retro uppercase mb-1">Órdenes Completadas</p>
                            <p className="text-2xl font-display font-bold text-emerald-400">{metrics.completedOrders}</p>
                        </div>
                        <div className="glass-panel p-4 rounded-xl border border-slate-700/50 shadow-lg text-center">
                            <p className="text-slate-400 text-xs font-retro uppercase mb-1">Productos Vendidos</p>
                            <p className="text-2xl font-display font-bold text-neon-pink">{metrics.totalSoldProducts}</p>
                        </div>
                    </div>
                )}

                {/* Dashboard Nav */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-8 font-sans font-medium text-base sm:text-lg">
                    <button
                        onClick={() => setActiveTab('inventory')}
                        className={`px-4 py-3 sm:px-8 sm:py-3 rounded-xl sm:rounded-full transition-all duration-300 w-full sm:w-auto text-center ${activeTab === 'inventory'
                            ? 'glass-panel text-white shadow-lg shadow-neon-blue/20 border-neon-blue'
                            : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700 border border-transparent'
                            }`}
                    >
                        Inventario
                    </button>
                    <button
                        onClick={() => setActiveTab('upload')}
                        className={`px-4 py-3 sm:px-8 sm:py-3 rounded-xl sm:rounded-full transition-all duration-300 w-full sm:w-auto text-center ${activeTab === 'upload'
                            ? 'glass-panel text-white shadow-lg shadow-neon-pink/20 border-neon-pink'
                            : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700 border border-transparent'
                            }`}
                    >
                        Agregar Cinta de Datos
                    </button>
                    <button
                        onClick={() => setActiveTab('subscription')}
                        className={`px-4 py-3 sm:px-8 sm:py-3 rounded-xl sm:rounded-full transition-all duration-300 w-full sm:w-auto text-center ${activeTab === 'subscription'
                            ? 'glass-panel text-white shadow-lg shadow-yellow-400/20 border-yellow-400'
                            : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700 border border-transparent'
                            }`}
                    >
                        Suscripción
                    </button>
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`px-4 py-3 sm:px-8 sm:py-3 rounded-xl sm:rounded-full transition-all duration-300 w-full sm:w-auto text-center ${activeTab === 'profile'
                            ? 'glass-panel text-white shadow-lg shadow-emerald-400/20 border-emerald-400'
                            : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700 border border-transparent'
                            }`}
                    >
                        Perfil de Vendedor
                    </button>
                    <button
                        onClick={() => setActiveTab('orders')}
                        className={`px-4 py-3 sm:px-8 sm:py-3 rounded-xl sm:rounded-full transition-all duration-300 w-full sm:w-auto text-center ${activeTab === 'orders'
                            ? 'glass-panel text-white shadow-lg shadow-orange-400/20 border-orange-400'
                            : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700 border border-transparent'
                            }`}
                    >
                        📦 Órdenes Recibidas
                    </button>
                </div>

                {/* System Display Panel */}
                <div className="glass-panel p-4 sm:p-8 rounded-2xl relative overflow-hidden shadow-2xl border border-slate-700/50">
                    {/* Internal scanlines for the screen effect */}
                    <div className="absolute inset-0 bg-scanlines opacity-20 pointer-events-none"></div>

                    {activeTab === 'inventory' && (
                        <div className="relative z-10 w-full overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-700 text-slate-400 font-sans text-sm tracking-widest uppercase">
                                        <th className="p-4 font-semibold text-slate-300 cursor-pointer hover:text-neon-blue transition-colors group" onClick={() => handleSort('id')}>
                                            <div className="flex items-center gap-1">ID <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-100" /></div>
                                        </th>
                                        <th className="p-4 font-semibold text-slate-300 cursor-pointer hover:text-neon-blue transition-colors group" onClick={() => handleSort('name')}>
                                            <div className="flex items-center gap-1">Nombre <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-100" /></div>
                                        </th>
                                        <th className="p-4 font-semibold text-slate-300 cursor-pointer hover:text-neon-blue transition-colors group" onClick={() => handleSort('categoryId')}>
                                            <div className="flex items-center gap-1">Categoría <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-100" /></div>
                                        </th>
                                        <th className="p-4 font-semibold text-slate-300 cursor-pointer hover:text-neon-blue transition-colors group" onClick={() => handleSort('priceCRC')}>
                                            <div className="flex items-center gap-1">Precio <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-100" /></div>
                                        </th>
                                        <th className="p-4 font-semibold text-slate-300 text-center cursor-pointer hover:text-neon-blue transition-colors group" onClick={() => handleSort('stockStatus')}>
                                            <div className="flex items-center justify-center gap-1">Estado <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-100" /></div>
                                        </th>
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
                                    ) : sortedInventory.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-slate-500 font-sans">
                                                No hay artículos en tu inventario.
                                            </td>
                                        </tr>
                                    ) : (
                                        sortedInventory.map((product) => (
                                            <tr key={product.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors group">
                                                <td className="p-4 font-retro text-cyan-400 text-sm">{String(product.id).padStart(3, '0')}</td>
                                                <td className="p-4 text-slate-200">{product.name}</td>
                                                <td className="p-4">
                                                    <span className="bg-slate-800 text-neon-pink px-3 py-1 rounded-full text-xs font-medium border border-slate-700">{product.categoryEntity?.name || 'Varios'}</span>
                                                </td>
                                                <td className="p-4 font-display font-bold text-white">₡{product.priceCRC.toLocaleString('es-CR')}</td>
                                                <td className="p-4 text-center">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${product.stockStatus === 'Available' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                                                        {product.stockStatus === 'Available' ? 'ACTIVO' : 'NO DISP.'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right flex justify-end gap-2">
                                                    <button onClick={() => openEditModal(product)} className="text-slate-400 hover:text-neon-blue p-2 rounded-lg hover:bg-slate-700 transition-colors"><Pencil size={18} /></button>
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
                                {uploadSuccess && <p className="text-emerald-400 font-sans mt-2">{uploadSuccess}</p>}
                                {uploadError && <p className="text-red-400 font-sans mt-2">{uploadError}</p>}
                            </div>

                            {/* Image Upload Zone */}
                            <label className="glass-panel border-2 border-dashed border-slate-600 p-10 flex flex-col items-center justify-center cursor-pointer hover:border-neon-blue hover:bg-slate-800/50 transition-all duration-300 rounded-2xl group shadow-lg">
                                <input
                                    type="file"
                                    multiple
                                    className="hidden"
                                    onChange={async (e) => {
                                        if (!e.target.files || e.target.files.length === 0) return;
                                        
                                        const selectedFiles = Array.from(e.target.files);
                                        const slotsAvailable = 3 - imageUrls.length;
                                        
                                        if (slotsAvailable <= 0) {
                                            setUploadError("Ya has alcanzado el límite de 3 imágenes.");
                                            return;
                                        }

                                        const filesToProcess = selectedFiles.slice(0, slotsAvailable);
                                        setIsUploadingImage(true);
                                        setUploadError(null);
                                        setUploadSuccess(null);
                                        
                                        let initialError = null;
                                        if (selectedFiles.length > slotsAvailable) {
                                            initialError = `Solo se procesarán ${slotsAvailable} imágenes. El límite es 3.`;
                                        }

                                        try {
                                            const results = await Promise.allSettled(
                                                filesToProcess.map(file => catalogApi.uploadImage(file, token!))
                                            );

                                            const successes: string[] = [];
                                            const errors: string[] = [];

                                            results.forEach((result, index) => {
                                                const fileName = filesToProcess[index].name;
                                                if (result.status === 'fulfilled') {
                                                    successes.push(result.value.url);
                                                } else {
                                                    errors.push(`🚫 ${fileName}: ${result.reason?.message || 'Error desconocido'}`);
                                                }
                                            });

                                            setImageUrls(prev => [...prev, ...successes].slice(0, 3));
                                            
                                            if (errors.length > 0) {
                                                const errorMsg = initialError ? `${initialError}\nResultados:\n${errors.join('\n')}` : `Algunas imágenes fallaron:\n${errors.join('\n')}`;
                                                setUploadError(errorMsg);
                                            } else if (initialError) {
                                                setUploadError(initialError);
                                            }
                                            
                                            if (successes.length > 0) {
                                                setUploadSuccess(`Subidas ${successes.length} imágenes exitosamente. ${errors.length > 0 ? '(Con algunos fallos, revisa abajo)' : ''}`);
                                            }
                                        } catch {
                                            setUploadError("Ocurrió un error general subiendo imágenes.");
                                        } finally {
                                            setIsUploadingImage(false);
                                            e.target.value = ''; // Reset input to allow re-selection
                                        }
                                    }}
                                    accept="image/*"
                                />
                                <div className="bg-slate-900 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-neon-blue/20">
                                    <ImageIcon size={32} className={`text-neon-blue ${isUploadingImage ? 'animate-pulse' : ''}`} />
                                </div>
                                <p className="font-display font-bold tracking-wide text-lg text-white mb-2">
                                    {isUploadingImage ? 'ANALIZANDO IMAGEN...' : (`IMÁGENES CARGADAS: ${imageUrls.length} / 3`)}
                                </p>
                                {imageUrls.length > 0 && (
                                    <div className="flex gap-2 mt-4 mb-2">
                                        {imageUrls.map((url, idx) => (
                                            <img key={idx} src={url} alt={`Preview ${idx + 1}`} className="w-16 h-16 object-cover rounded-md border border-slate-700" />
                                        ))}
                                    </div>
                                )}
                                <p className="text-sm text-slate-400 font-sans max-w-sm text-center">
                                    Arrastre y suelte o haga clic para buscar. AI Moderation activo; datos ilícitos resultarán en bloqueos.
                                </p>
                            </label>

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
                                        value={categoryId}
                                        onChange={(e) => setCategoryId(Number(e.target.value))}
                                        className="w-full bg-slate-900/50 border border-slate-700 focus:border-neon-blue rounded-lg text-white p-3.5 font-sans outline-none appearance-none transition-colors shadow-inner cursor-pointer"
                                    >
                                        <option value={1}>TCG</option>
                                        <option value={2}>Figuras</option>
                                        <option value={3}>Videojuegos</option>
                                        <option value={4}>Cómics</option>
                                    </select>
                                </div>

                                <div className="col-span-1 space-y-2">
                                    <label className="block text-slate-300 font-sans font-medium text-sm">Cantidad (Stock)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={stockCount}
                                        onChange={(e) => setStockCount(Number(e.target.value))}
                                        className="w-full bg-slate-900/50 border border-slate-700 focus:border-neon-blue rounded-lg text-white p-3.5 font-retro outline-none transition-colors shadow-inner"
                                        placeholder="1"
                                    />
                                </div>

                                <div className="col-span-1 md:col-span-2 space-y-2">
                                    <label className="block text-neon-pink font-sans font-medium text-sm flex items-center gap-2">
                                        <Box size={14} /> Enlace de Mazo Moxfield (Opcional)
                                    </label>
                                    <div className="flex relative shadow-inner rounded-lg overflow-hidden border border-slate-700 focus-within:border-neon-pink transition-colors">
                                        <input
                                            type="text"
                                            value={moxfieldUrl}
                                            onChange={(e) => setMoxfieldUrl(e.target.value)}
                                            className="w-full bg-slate-900/50 text-white p-3.5 pl-4 font-sans outline-none"
                                            placeholder="Public ID o URL de Moxfield"
                                        />
                                        <button
                                            onClick={async () => {
                                                if (!moxfieldUrl) return;
                                                setIsSubmitting(true);
                                                setUploadError(null);
                                                try {
                                                    // Extract ID from URL if provided
                                                    const parts = moxfieldUrl.split('/');
                                                    const publicId = parts[parts.length - 1];

                                                    const request = {
                                                        sellerId: sellerId!,
                                                        importIndividually: importIndividually
                                                    };

                                                    await catalogApi.importMoxfieldDeck(publicId, request, token!);
                                                    setUploadSuccess(importIndividually 
                                                        ? "Cartas individuales importadas exitosamente." 
                                                        : "Mazo de Moxfield importado directo al inventario.");
                                                    setMoxfieldUrl('');
                                                    setActiveTab('inventory');
                                                } catch (err) {
                                                    setUploadError(err instanceof Error ? err.message : "Error importando mazo.");
                                                } finally {
                                                    setIsSubmitting(false);
                                                }
                                            }}
                                            disabled={isSubmitting || !moxfieldUrl}
                                            className="px-6 bg-neon-pink/20 text-neon-pink hover:bg-neon-pink hover:text-white font-sans font-bold transition-colors disabled:opacity-50"
                                        >
                                            OBTENER E IMPORTAR
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-4 mt-2 mb-4 p-4 glass-panel border border-slate-700/50 rounded-xl">
                                        <div className="flex-1">
                                            <p className="text-white font-sans font-medium text-sm">Modo de Importación</p>
                                            <p className="text-xs text-slate-500">¿Vender como un solo producto o por separado?</p>
                                        </div>
                                        <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
                                            <button 
                                                onClick={() => setImportIndividually(false)}
                                                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${!importIndividually ? 'bg-neon-pink text-white' : 'text-slate-400 hover:text-white'}`}
                                            >
                                                MAZO UNIFICADO
                                            </button>
                                            <button 
                                                onClick={() => setImportIndividually(true)}
                                                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${importIndividually ? 'bg-neon-pink text-white' : 'text-slate-400 hover:text-white'}`}
                                            >
                                                CARTAS INDIVIDUALES
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">Pegue un enlace público (o ID) de Moxfield. Crearemos el producto automáticamente.</p>
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
                                    {uploadError && (
                                        <div className="mb-4 bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-lg font-sans text-sm font-semibold animate-pulse flex items-start gap-2 whitespace-pre-line">
                                            <Box size={16} className="mt-0.5" />
                                            {uploadError}
                                        </div>
                                    )}
                                    <button
                                        onClick={async () => {
                                            if (!name || !priceCRC) {
                                                setUploadError("El nombre y el precio son obligatorios.");
                                                return;
                                            }
                                            setIsSubmitting(true);
                                            setUploadError(null);
                                            try {
                                                const newProduct = {
                                                    name,
                                                    priceCRC: Number(priceCRC),
                                                    categoryId,
                                                    moxfieldDeckUrl: moxfieldUrl,
                                                    description,
                                                    sellerId: sellerId!,
                                                    imageUrl: imageUrls[0] || '',
                                                    imageUrl2: imageUrls[1] || '',
                                                    imageUrl3: imageUrls[2] || '',
                                                    stockStatus: 'Available',
                                                    stockCount: stockCount
                                                };
                                                // Real creation using authenticated token
                                                const created = await catalogApi.createProduct(newProduct, token!);
                                                setInventory(prev => [...prev, created]);
                                                // Switch back to inventory tab to see the new item
                                                setActiveTab('inventory');
                                                // Reset form
                                                setName('');
                                                setPriceCRC('');
                                                setCategoryId(1);
                                                setMoxfieldUrl('');
                                                setDescription('');
                                                setStockCount(1);
                                                setImageUrls([]);
                                            } catch (error) {
                                                console.error("Failed to create product", error);
                                                setUploadError(error instanceof Error ? error.message : "Error desconocido al procesar la cinta de datos.");
                                            } finally {
                                                setIsSubmitting(false);
                                            }
                                        }}
                                        disabled={isSubmitting || isUploadingImage}
                                        className={`w-full bg-neon-blue text-slate-900 font-sans font-bold text-lg py-4 rounded-xl hover:bg-cyan-400 shadow-lg shadow-neon-blue/20 hover:shadow-neon-blue/40 transition-all duration-300 transform hover:-translate-y-1 ${isSubmitting || isUploadingImage ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {isSubmitting ? 'TRANSMITIENDO...' : 'TRANSMITIR DATOS AL SERVIDOR'}
                                    </button>
                                </div>

                            </div>
                        </div>
                    )}

                    {activeTab === 'subscription' && (
                        <div className="relative z-10 w-full max-w-2xl mx-auto space-y-8 animate-in fade-in flex flex-col items-center">
                            <div className="text-center mb-6">
                                <h2 className="text-3xl font-display font-bold text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.6)] mb-2">Cuota de Vendedor (Suscripción)</h2>
                                <p className="text-slate-300 font-sans text-lg">Mantén tu tienda activa en GeekStore y tu perfil visible para los compradores P2P.</p>
                            </div>

                            <div className="glass-panel p-8 rounded-2xl border border-yellow-400/50 relative overflow-hidden shadow-[0_0_30px_rgba(250,204,21,0.15)] w-full text-center">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/20 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
                                <h3 className="text-xl font-display text-white mb-2">Renovación Mensual</h3>
                                <p className="text-4xl font-black text-neon-blue drop-shadow-[0_0_10px_rgba(0,240,255,0.6)] mb-6">₡{parseFloat(sellerFee).toLocaleString('es-CR')}</p>
                                <p className="text-sm font-retro text-slate-400 tracking-wider mb-8">~ ${subFeeUSD} USD</p>
                                
                                <div className="space-y-4 max-w-sm mx-auto z-20 relative">
                                    <PayPalScriptProvider options={{ clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID || "test", currency: "USD", intent: "capture" }}>
                                        <PayPalButtons 
                                            style={{ layout: "vertical", shape: "pill", color: "gold" }}
                                            createOrder={(_data, actions) => {
                                                return actions.order.create({
                                                    intent: "CAPTURE",
                                                    purchase_units: [
                                                        {
                                                            description: "Suscripción Mensual GeekStore",
                                                            amount: { value: subFeeUSD, currency_code: "USD" }
                                                        }
                                                    ],
                                                });
                                            }}
                                            onApprove={async (_data, actions) => {
                                                if (!actions.order) return;
                                                const order = await actions.order.capture();
                                                try {
                                                    await usersApi.paySubscription(order.id || '', token!);
                                                    alert("¡Pago exitoso! Tu suscripción P2P ha sido renovada. Eres un vendedor verificado de GeekStore.");
                                                } catch (err) {
                                                    alert(err instanceof Error ? err.message : "Hubo un error al validar la suscripción.");
                                                }
                                            }}
                                            onError={(err) => {
                                                console.error("PayPal Error:", err);
                                                alert("Ocurrió un error con el procesador de pagos.");
                                            }}
                                        />
                                    </PayPalScriptProvider>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'profile' && (
                        <div className="relative z-10 w-full max-w-2xl mx-auto space-y-8 animate-in fade-in flex flex-col items-center">
                            <div className="text-center mb-6">
                                <h2 className="text-3xl font-display font-bold text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.6)] mb-2">Perfil y Notificaciones</h2>
                                <p className="text-slate-300 font-sans text-lg">Configura tu contacto de WhatsApp para recibir alertas P2P.</p>
                            </div>

                            <div className="glass-panel p-8 rounded-2xl border border-emerald-400/50 relative shadow-[0_0_30px_rgba(52,211,153,0.15)] w-full text-left">
                                <div className="space-y-4 mb-6">
                                    <label className="block text-slate-300 font-sans font-medium text-sm">Tu Número de WhatsApp (Formato intl. opcional)</label>
                                    <input
                                        type="text"
                                        value={sellerPhone}
                                        onChange={(e) => setSellerPhone(e.target.value)}
                                        className="w-full bg-slate-900/50 border border-slate-700 focus:border-emerald-400 rounded-lg text-white p-3.5 font-sans outline-none transition-colors shadow-inner"
                                        placeholder="+506 8888-8888"
                                    />
                                    <p className="text-xs text-slate-400">
                                        Este número será compartido con los compradores que ordenen tus productos — verán un botón de WhatsApp para contactarte directamente y coordinar el pago y entrega.
                                    </p>
                                </div>

                                <button
                                    disabled={isSavingProfile}
                                    onClick={async () => {
                                        setIsSavingProfile(true);
                                        try {
                                            const msg = await usersApi.updateProfile({ phoneNumber: sellerPhone }, token!);
                                            alert(msg);
                                        } catch (err) {
                                            alert(err instanceof Error ? err.message : "Error al guardar el perfil.");
                                        } finally {
                                            setIsSavingProfile(false);
                                        }
                                    }}
                                    className="w-full bg-emerald-500 text-slate-900 font-sans font-bold text-lg py-3 rounded-xl hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all duration-300 transform disabled:opacity-50"
                                >
                                    {isSavingProfile ? 'GUARDANDO...' : 'GUARDAR CONTACTO DE WHATSAPP'}
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'orders' && (
                        <div className="relative z-10 w-full overflow-x-auto animate-in fade-in duration-300">
                            <h2 className="text-xl font-display font-bold text-white mb-6 flex items-center gap-3">
                                <Package className="text-orange-400" size={24} />
                                Órdenes Recibidas
                                <span className="text-xs bg-slate-800 text-slate-400 px-3 py-1 rounded-full font-sans">{sellerOrders.length} total</span>
                            </h2>

                            {loadingOrders ? (
                                <div className="py-12 text-center text-orange-400 font-retro animate-pulse">CARGANDO ÓRDENES...</div>
                            ) : sellerOrders.length === 0 ? (
                                <div className="py-12 text-center text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
                                    <Package className="mx-auto mb-3 opacity-20" size={48} />
                                    <p className="font-sans">Aún no has recibido órdenes.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {sellerOrders.map(order => {
                                        const statusConfig: Record<string, { color: string; bg: string; border: string; label: string; icon: React.ReactNode }> = {
                                            'Pending': { color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/30', label: 'Pendiente', icon: <Package size={16} /> },
                                            'Confirmed': { color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/30', label: 'Confirmada', icon: <CheckCircle size={16} /> },
                                            'Shipped': { color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/30', label: 'Enviada', icon: <Truck size={16} /> },
                                            'Completed': { color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30', label: 'Completada', icon: <PackageCheck size={16} /> },
                                        };
                                        const sc = statusConfig[order.status] || statusConfig['Pending'];

                                        const nextStatusMap: Record<string, string> = {
                                            'Pending': 'Confirmed',
                                            'Confirmed': 'Shipped',
                                            'Shipped': 'Completed'
                                        };
                                        const nextStatus = nextStatusMap[order.status];
                                        const nextLabel: Record<string, string> = {
                                            'Confirmed': 'Confirmar',
                                            'Shipped': 'Marcar Envío',
                                            'Completed': 'Completar'
                                        };

                                        return (
                                            <div key={order.id} className={`bg-slate-900/60 border ${sc.border} rounded-xl p-5 transition-all hover:shadow-lg`}>
                                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <span className="font-retro text-slate-400 text-sm">#{String(order.id).padStart(4, '0')}</span>
                                                            <span className={`${sc.bg} ${sc.color} ${sc.border} border px-3 py-0.5 rounded-full text-xs font-bold flex items-center gap-1.5`}>
                                                                {sc.icon} {sc.label}
                                                            </span>
                                                            <span className="text-xs text-slate-500 font-sans">{new Date(order.orderDate).toLocaleDateString('es-CR')}</span>
                                                        </div>
                                                        <div className="text-sm text-slate-300 font-sans mb-1">
                                                            <span className="text-slate-500">Comprador:</span>{' '}
                                                            <span className="font-medium text-white">{order.buyer?.nickname || order.buyer?.name || `ID ${order.buyerId}`}</span>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2 mt-2">
                                                            {order.items.map(item => (
                                                                <span key={item.id} className="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700 font-sans">
                                                                    {item.product?.name || `Producto #${item.productId}`} x{item.quantity}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-2">
                                                        <span className="text-lg font-display font-bold text-neon-blue">₡{order.totalAmountCRC.toLocaleString('es-CR')}</span>
                                                        {nextStatus && (
                                                            <button
                                                                disabled={updatingOrderId === order.id}
                                                                onClick={async () => {
                                                                    if (!token || !nextStatus) return;
                                                                    setUpdatingOrderId(order.id);
                                                                    try {
                                                                        await ordersApi.updateStatus(order.id, nextStatus, token);
                                                                        setSellerOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: nextStatus } : o));
                                                                    } catch (err) {
                                                                        alert(err instanceof Error ? err.message : 'Error al actualizar estado');
                                                                    } finally {
                                                                        setUpdatingOrderId(null);
                                                                    }
                                                                }}
                                                                className="px-4 py-2 rounded-lg text-sm font-bold bg-orange-500/20 text-orange-400 hover:bg-orange-500 hover:text-white border border-orange-500/50 transition-all flex items-center gap-2 disabled:opacity-50"
                                                            >
                                                                {updatingOrderId === order.id ? 'Actualizando...' : `→ ${nextLabel[nextStatus]}`}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>

            {/* Edit Modal */}
            {editingProduct && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl shadow-neon-blue/20 flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                            <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
                                <Pencil className="text-neon-blue" size={20} /> Editar Producto
                            </h2>
                            <button onClick={() => setEditingProduct(null)} className="text-slate-400 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto space-y-4">
                            <div className="space-y-2">
                                <label className="block text-slate-300 font-sans font-medium text-sm">Designación (Nombre)</label>
                                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full bg-slate-800 border border-slate-700 focus:border-neon-blue rounded-lg text-white p-3 font-sans outline-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="block text-slate-300 font-sans font-medium text-sm">Precio (CRC)</label>
                                    <input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} className="w-full bg-slate-800 border border-slate-700 focus:border-neon-blue rounded-lg text-white p-3 font-retro outline-none" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-slate-300 font-sans font-medium text-sm">Stock</label>
                                    <input type="number" value={editStock} onChange={(e) => setEditStock(Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 focus:border-neon-blue rounded-lg text-white p-3 font-retro outline-none" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-slate-300 font-sans font-medium text-sm">Categoría</label>
                                <select value={editCatId} onChange={(e) => setEditCatId(Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 focus:border-neon-blue rounded-lg text-white p-3 font-sans outline-none">
                                    <option value={1}>TCG</option>
                                    <option value={2}>Figuras</option>
                                    <option value={3}>Videojuegos</option>
                                    <option value={4}>Cómics</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-slate-300 font-sans font-medium text-sm">Descripción</label>
                                <textarea rows={3} value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="w-full bg-slate-800 border border-slate-700 focus:border-neon-blue rounded-lg text-white p-3 font-sans outline-none resize-none"></textarea>
                            </div>
                            <p className="text-xs text-slate-500 font-sans mt-2">Nota: Actualmente las imágenes no se pueden cambiar tras la inicialización. Debes borrar y recrear el registro.</p>
                        </div>
                        
                        <div className="p-6 border-t border-slate-800 bg-slate-900/80 flex justify-end gap-3">
                            <button onClick={() => setEditingProduct(null)} className="px-6 py-2.5 rounded-lg font-sans font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">Cancelar</button>
                            <button 
                                disabled={isSavingEdit}
                                onClick={async () => {
                                    setIsSavingEdit(true);
                                    try {
                                        const updates = {
                                            name: editName,
                                            priceCRC: Number(editPrice),
                                            description: editDesc,
                                            stockCount: editStock,
                                            categoryId: editCatId,
                                            stockStatus: editStock > 0 ? 'Available' : 'Sold'
                                        };
                                        await catalogApi.updateProduct(editingProduct.id, updates, token!);
                                        setInventory(prev => prev.map(p => p.id === editingProduct.id ? ({ ...p, ...updates } as Product) : p));
                                        setEditingProduct(null);
                                    } catch {
                                        alert("Hubo un error al guardar los cambios.");
                                    } finally {
                                        setIsSavingEdit(false);
                                    }
                                }} 
                                className="px-6 py-2.5 rounded-lg font-sans font-bold bg-neon-blue text-slate-900 hover:bg-cyan-400 transition-colors shadow-lg shadow-neon-blue/20"
                            >
                                {isSavingEdit ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
