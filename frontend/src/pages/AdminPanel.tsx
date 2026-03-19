import { useState, useEffect } from 'react';
import { ShieldAlert, ShieldCheck, ArrowUpDown, Save, Layers, Plus, ChevronDown, ChevronRight, BarChart3, BrainCircuit, TrendingUp, Info } from 'lucide-react';
import { adminApi, settingsApi, categoriesApi, adminDashboardApi, type User, type Category } from '../api/client';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

interface JwtPayload {
    sub?: string;
    role?: string;
    'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'?: string;
    [key: string]: unknown;
}

export default function AdminPanel() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const [token, setToken] = useState<string | null>(null);

    // Sorting State
    const [sortColumn, setSortColumn] = useState<keyof User>('id');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    // Settings State
    const [sellerFee, setSellerFee] = useState<string>('0.00');
    const [isUpdatingFee, setIsUpdatingFee] = useState(false);

    // Categories State
    const [activeTab, setActiveTab] = useState<'usuarios' | 'categorias' | 'dashboard'>('dashboard');
    const [categories, setCategories] = useState<Category[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    // Dashboard State
    const [stats, setStats] = useState<any>(null);
    const [loadingStats, setLoadingStats] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState<any>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Individual Seller Edit State
    const [editingSellerId, setEditingSellerId] = useState<number | null>(null);
    const [editMonthlyFee, setEditMonthlyFee] = useState<number>(0);
    const [editBenefits, setEditBenefits] = useState<string>('');
    const [isSavingSeller, setIsSavingSeller] = useState(false);
    const [isAddingCategory, setIsAddingCategory] = useState(false);

    // Subcategory State
    const [isAddingSubcategory, setIsAddingSubcategory] = useState<{ [key: number]: boolean }>({});

    useEffect(() => {
        const fetchFee = async () => {
            const fee = await settingsApi.getSellerFee();
            setSellerFee(fee);
        };
        fetchFee();
    }, []);

    const handleUpdateFee = async () => {
        if (!token) return;
        setIsUpdatingFee(true);
        try {
            const newFee = await settingsApi.updateSellerFee(sellerFee, token);
            setSellerFee(newFee);
        } finally {
            setIsUpdatingFee(false);
        }
    };

    const handleSort = (column: keyof User) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const sortedUsers = [...users].sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];
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
            const userRole = decoded.role || decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];

            // Allow Seller (Admin impersonation) for hackathon demo purposes
            // In a real app we would check userRole === 'Admin'
            console.log('User Role:', userRole);
            setToken(storedToken);
        } catch {
            localStorage.removeItem('geekstore_token');
            navigate('/login');
        }
    }, [navigate]);

    useEffect(() => {
        const fetchUsers = async () => {
            if (!token) return;
            setLoading(true);
            try {
                const fetchedUsers = await adminApi.getUsers(token);
                setUsers(fetchedUsers);
            } catch (error) {
                console.error("Error fetching users", error);
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, [token]);

    const handleToggleBan = async (userId: number) => {
        if (!token) return;
        try {
            const updatedUser = await adminApi.toggleBan(userId, token);
            if (updatedUser) {
                setUsers(users.map(u => u.id === userId ? { ...u, isActive: updatedUser.isActive } : u));
            }
        } catch (error) {
            console.error("Error toggling ban status", error);
        }
    };

    const fetchCategories = async () => {
        setLoadingCategories(true);
        try {
            const data = await categoriesApi.getCategories();
            setCategories(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingCategories(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'categorias' && categories.length === 0) {
            fetchCategories();
        }
    }, [activeTab, categories.length]);

    const fetchStats = async () => {
        if (!token) return;
        setLoadingStats(true);
        try {
            const data = await adminDashboardApi.getStats(token);
            setStats(data);
        } finally {
            setLoadingStats(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'dashboard') {
            fetchStats();
        }
    }, [activeTab, token]);

    const handleRunAI = async () => {
        if (!token) return;
        setIsAnalyzing(true);
        try {
            const data = await adminDashboardApi.getAIAnalysis(token);
            setAiAnalysis(data);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSaveSellerConfig = async () => {
        if (!token || editingSellerId === null) return;
        setIsSavingSeller(true);
        try {
            await adminDashboardApi.updateSellerConfig(editingSellerId, {
                monthlyFee: editMonthlyFee,
                benefits: editBenefits
            }, token);
            setEditingSellerId(null);
            fetchStats(); // Refresh stats
            const fetchedUsers = await adminApi.getUsers(token);
            setUsers(fetchedUsers);
        } finally {
            setIsSavingSeller(false);
        }
    };

    const handleAddCategory = async () => {
        if (!token || !newCategoryName.trim()) return;
        setIsAddingCategory(true);
        try {
            const newCat = await categoriesApi.addCategory(newCategoryName, token);
            if (newCat) {
                setCategories([...categories, newCat]);
                setNewCategoryName('');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsAddingCategory(false);
        }
    };

    const handleAddSubcategory = async (categoryId: number, subName: string): Promise<boolean> => {
        if (!token || !subName?.trim()) return false;

        setIsAddingSubcategory(prev => ({ ...prev, [categoryId]: true }));
        try {
            const newSubcat = await categoriesApi.addSubcategory(categoryId, subName, token);
            if (newSubcat) {
                // To avoid complex recursive state updating, just re-fetch the entire tree.
                fetchCategories();
                return true;
            }
            return false;
        } catch (error) {
            console.error(error);
            return false;
        } finally {
            setIsAddingSubcategory(prev => ({ ...prev, [categoryId]: false }));
        }
    };

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
                                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div> DB CONECTADA</span>
                                <span className="text-slate-600 hidden sm:inline">|</span>
                                <span className="text-neon-pink uppercase tracking-widest text-[10px] font-retro font-bold">AI MODERATION: ACTIVE</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 items-center md:mb-6 p-4 rounded-xl bg-slate-800/50 border border-slate-700 w-full md:w-auto mt-4 md:mt-0">
                        <span className="text-slate-300 font-sans text-sm font-medium">Cuota Mensual Vendedores:</span>
                        <div className="flex items-center gap-2">
                            <span className="text-neon-blue font-bold">₡</span>
                            <input
                                type="number"
                                value={sellerFee}
                                onChange={(e) => setSellerFee(e.target.value)}
                                className="bg-slate-900 border border-slate-700 focus:border-neon-blue rounded-lg text-white px-3 py-1.5 w-24 outline-none transition-colors"
                            />
                            <button
                                onClick={handleUpdateFee}
                                disabled={isUpdatingFee}
                                className="bg-neon-blue/20 text-neon-blue hover:bg-neon-blue hover:text-white p-2 rounded-lg transition-colors border border-neon-blue/50"
                            >
                                <Save size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="flex w-full md:w-auto mt-4 md:mt-0 items-center">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="w-full md:w-auto glass-panel text-slate-200 font-sans font-medium px-6 py-3 hover:bg-slate-800 hover:text-neon-blue transition-colors rounded-xl border border-slate-600/50 shadow-md hover:shadow-neon-blue/20 flex items-center justify-center h-full"
                        >
                            Volver al Dashboard
                        </button>
                    </div>
                </header>

                {/* Tab Navigation */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 font-sans font-medium text-base sm:text-lg">
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`px-4 py-2 sm:px-6 sm:py-2.5 rounded-xl transition-all duration-300 w-full sm:w-auto text-center ${activeTab === 'dashboard'
                            ? 'glass-panel text-white shadow-lg shadow-neon-blue/20 border-neon-blue'
                            : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700 border border-transparent'
                            }`}
                    >
                        Dashboard IA
                    </button>
                    <button
                        onClick={() => setActiveTab('usuarios')}
                        className={`px-4 py-2 sm:px-6 sm:py-2.5 rounded-xl transition-all duration-300 w-full sm:w-auto text-center ${activeTab === 'usuarios'
                            ? 'glass-panel text-white shadow-lg shadow-neon-pink/20 border-neon-pink'
                            : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700 border border-transparent'
                            }`}
                    >
                        Usuarios
                    </button>
                    <button
                        onClick={() => setActiveTab('categorias')}
                        className={`px-4 py-2 sm:px-6 sm:py-2.5 rounded-xl transition-all duration-300 w-full sm:w-auto text-center ${activeTab === 'categorias'
                            ? 'glass-panel text-white shadow-lg shadow-neon-blue/20 border-neon-blue'
                            : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700 border border-transparent'
                            }`}
                    >
                        Categorías
                    </button>
                </div>

                <div className="glass-panel p-4 sm:p-8 rounded-2xl relative overflow-hidden shadow-2xl border border-slate-700/50">
                    <div className="absolute inset-0 bg-scanlines opacity-20 pointer-events-none"></div>

                    {activeTab === 'dashboard' && (
                        <div className="relative z-10 space-y-8 animate-in fade-in duration-500">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-slate-900/50 border border-slate-700 p-6 rounded-2xl shadow-xl">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-slate-400 text-xs font-retro uppercase tracking-widest">Total Productos</h3>
                                        <div className="w-8 h-8 rounded-lg bg-neon-blue/10 flex items-center justify-center">
                                            <Layers className="w-4 h-4 text-neon-blue" />
                                        </div>
                                    </div>
                                    <p className="text-4xl font-display font-bold text-white">{stats?.totalProducts || 0}</p>
                                    <div className="mt-2 text-xs text-slate-500 font-sans">Global en la plataforma</div>
                                </div>
                                <div className="bg-slate-900/50 border border-slate-700 p-6 rounded-2xl shadow-xl">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-slate-400 text-xs font-retro uppercase tracking-widest">Añadidos a Carrito</h3>
                                        <div className="w-8 h-8 rounded-lg bg-neon-pink/10 flex items-center justify-center">
                                            <TrendingUp className="w-4 h-4 text-neon-pink" />
                                        </div>
                                    </div>
                                    <p className="text-4xl font-display font-bold text-white">{stats?.totalCartAdditions || 0}</p>
                                    <div className="mt-2 text-xs text-slate-500 font-sans">Métrica de intención de compra</div>
                                </div>
                                <div className="bg-slate-900/50 border border-slate-700 p-6 rounded-2xl shadow-xl backdrop-blur-sm relative overflow-hidden group">
                                    <div className="flex items-center justify-between mb-4 relative z-10">
                                        <h3 className="text-slate-200 text-xs font-retro uppercase tracking-widest">Potencia con IA</h3>
                                        <BrainCircuit className="w-5 h-5 text-neon-blue animate-pulse" />
                                    </div>
                                    <button 
                                        onClick={handleRunAI}
                                        disabled={isAnalyzing}
                                        className="w-full relative z-10 bg-neon-blue text-slate-900 font-bold py-3 rounded-xl hover:bg-cyan-400 transition-all font-sans text-sm shadow-lg shadow-neon-blue/20"
                                    >
                                        {isAnalyzing ? 'ANALIZANDO DATA...' : 'OBTENER INSIGHTS IA'}
                                    </button>
                                    <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-neon-blue/10 rounded-full blur-2xl group-hover:bg-neon-blue/20 transition-colors"></div>
                                </div>
                            </div>

                            {/* AI Analysis Result */}
                            {aiAnalysis && (
                                <div className="bg-slate-900/80 border border-neon-blue/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden animate-in slide-in-from-top-4 duration-500">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 rounded-full bg-neon-blue/20 flex items-center justify-center border border-neon-blue/40">
                                            <BrainCircuit className="w-6 h-6 text-neon-blue" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-display font-bold text-white leading-tight">Recomendaciones del Estratega IA</h3>
                                            <p className="text-xs text-slate-400 font-sans">{aiAnalysis.globalSummary}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {aiAnalysis.recommendations.map((rec: any, i: number) => (
                                            <div key={i} className={`p-4 rounded-xl border flex flex-col gap-2 transition-all hover:scale-[1.02] ${
                                                rec.category === 'Best' ? 'bg-emerald-500/10 border-emerald-500/30 shadow-emerald-500/5' :
                                                rec.category === 'Inactive' ? 'bg-red-500/10 border-red-500/30 shadow-red-500/5' :
                                                'bg-neon-blue/10 border-neon-blue/30 shadow-neon-blue/5'
                                            }`}>
                                                <div className="flex justify-between items-start">
                                                    <h4 className="font-bold text-white text-sm">{rec.sellerName}</h4>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter ${
                                                        rec.category === 'Best' ? 'bg-emerald-500 text-white' :
                                                        rec.category === 'Inactive' ? 'bg-red-500 text-white' :
                                                        'bg-neon-blue text-slate-900'
                                                    }`}>
                                                        {rec.category === 'Best' ? 'TOP SELLER' : rec.category === 'Inactive' ? 'INACTIVO' : 'INCENTIVAR'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-300 font-sans italic leading-snug">"{rec.reason}"</p>
                                                <div className="mt-2 pt-2 border-t border-white/5">
                                                    <p className="text-[10px] text-slate-500 font-retro uppercase mb-1">Ventaja Sugerida</p>
                                                    <p className="text-xs text-neon-yellow font-medium">{rec.suggestedBenefits}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Detailed Inventory Stats Table */}
                            <div className="bg-slate-900/50 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
                                <div className="p-6 border-b border-slate-800 bg-slate-800/30 flex items-center justify-between">
                                    <h3 className="text-lg font-display font-bold text-white">Análisis de Inventario por Vendedor</h3>
                                    <BarChart3 className="text-slate-500 w-5 h-5" />
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-900/80 text-slate-400 text-[10px] uppercase font-retro tracking-widest border-b border-slate-800">
                                            <tr>
                                                <th className="p-4">Vendedor</th>
                                                <th className="p-4">Items</th>
                                                <th className="p-4">Vistas/Carrito</th>
                                                <th className="p-4">Antigüedad Prom.</th>
                                                <th className="p-4">Cuota Ind.</th>
                                                <th className="p-4 text-right">Configuración</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loadingStats ? (
                                                <tr><td colSpan={6} className="p-8 text-center text-neon-blue animate-pulse font-retro">SINCRONIZANDO METRICAS...</td></tr>
                                            ) : stats?.sellers.map((seller: any) => {
                                                const totalCart = seller.products.reduce((acc: number, p: any) => acc + p.cartAdditionCount, 0);
                                                const avgDays = seller.products.length > 0 
                                                    ? Math.round(seller.products.reduce((acc: number, p: any) => acc + p.daysOld, 0) / seller.products.length)
                                                    : 0;

                                                return (
                                                    <tr key={seller.sellerId} className="border-b border-slate-800 hover:bg-slate-800/40 transition-colors group">
                                                        <td className="p-4 font-bold text-white text-sm">{seller.sellerName}</td>
                                                        <td className="p-4 text-slate-300 text-sm">{seller.products.length}</td>
                                                        <td className="p-4">
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden max-w-[80px]">
                                                                    <div 
                                                                        className="h-full bg-neon-pink rounded-full shadow-[0_0_8px_rgba(255,0,255,0.4)]" 
                                                                        style={{ width: `${Math.min(100, (totalCart / (stats.totalCartAdditions || 1)) * 500)}%` }}
                                                                    />
                                                                </div>
                                                                <span className="text-xs font-retro text-slate-400">{totalCart}</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-4 text-slate-400 text-xs">{avgDays} días</td>
                                                        <td className="p-4">
                                                            <span className="text-neon-blue font-bold text-sm">₡{(seller.monthlyFee || Number(sellerFee)).toLocaleString('es-CR')}</span>
                                                        </td>
                                                        <td className="p-4 text-right">
                                                            <button 
                                                                onClick={() => {
                                                                    setEditingSellerId(seller.sellerId);
                                                                    setEditMonthlyFee(seller.monthlyFee || Number(sellerFee));
                                                                    setEditBenefits(seller.benefits || '');
                                                                }}
                                                                className="text-xs bg-slate-800 hover:bg-neon-blue hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 transition-all text-slate-400 flex items-center gap-2 ml-auto"
                                                            >
                                                                <Info size={12} /> PERSONALIZAR
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="absolute inset-0 bg-scanlines opacity-20 pointer-events-none"></div>

                    {activeTab === 'usuarios' && (
                        <div className="relative z-10 w-full overflow-x-auto animate-in fade-in duration-300">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-700 text-slate-400 font-sans text-sm tracking-widest uppercase">
                                        <th className="p-4 font-semibold text-slate-300 cursor-pointer hover:text-neon-blue transition-colors group" onClick={() => handleSort('id')}>
                                            <div className="flex items-center gap-1">ID <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-100" /></div>
                                        </th>
                                        <th className="p-4 font-semibold text-slate-300 cursor-pointer hover:text-neon-blue transition-colors group" onClick={() => handleSort('name')}>
                                            <div className="flex items-center gap-1">Usuario <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-100" /></div>
                                        </th>
                                        <th className="p-4 font-semibold text-slate-300 cursor-pointer hover:text-neon-blue transition-colors group" onClick={() => handleSort('email')}>
                                            <div className="flex items-center gap-1">Correo <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-100" /></div>
                                        </th>
                                        <th className="p-4 font-semibold text-slate-300 cursor-pointer hover:text-neon-blue transition-colors group" onClick={() => handleSort('role')}>
                                            <div className="flex items-center gap-1">Rol <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-100" /></div>
                                        </th>
                                        <th className="p-4 font-semibold text-slate-300 text-center cursor-pointer hover:text-neon-blue transition-colors group" onClick={() => handleSort('isActive')}>
                                            <div className="flex items-center justify-center gap-1">Estado <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-100" /></div>
                                        </th>
                                        <th className="p-4 font-semibold text-slate-300 text-right">Acción Diciplinaria</th>
                                    </tr>
                                </thead>
                                <tbody className="font-sans">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-neon-pink font-retro animate-pulse">
                                                LEYENDO REGISTROS...
                                            </td>
                                        </tr>
                                    ) : sortedUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-slate-500 font-sans">
                                                No hay usuarios registrados.
                                            </td>
                                        </tr>
                                    ) : (
                                        sortedUsers.map((user) => (
                                            <tr key={user.id} className={`border-b border-slate-800 hover:bg-slate-800/50 transition-colors group ${!user.isActive ? 'opacity-50' : ''}`}>
                                                <td className="p-4 font-retro text-slate-400 text-sm">{String(user.id).padStart(3, '0')}</td>
                                                <td className="p-4 text-slate-200 font-bold">{user.name}</td>
                                                <td className="p-4 text-slate-400">{user.email}</td>
                                                <td className="p-4">
                                                    <span className="bg-slate-800 text-neon-blue px-3 py-1 rounded-full text-xs font-medium border border-slate-700">{user.role}</span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${user.isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                                        {user.isActive ? 'ACTIVO' : 'BANEADO'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <button
                                                        onClick={() => handleToggleBan(user.id)}
                                                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${user.isActive
                                                            ? 'bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/50'
                                                            : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white border border-emerald-500/50'}`}
                                                    >
                                                        {user.isActive ? (
                                                            <span className="flex items-center gap-2"><ShieldAlert size={16} /> BANEAR</span>
                                                        ) : (
                                                            <span className="flex items-center gap-2"><ShieldCheck size={16} /> REACTIVAR</span>
                                                        )}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                            <div className="mt-8 text-center text-slate-500 font-retro text-sm opacity-50">
                            // MODO ADMINISTRADOR //
                            </div>
                        </div>
                    )}

                    {activeTab === 'categorias' && (
                        <div className="relative z-10 w-full animate-in fade-in duration-300">
                            {/* Create Category Form */}
                            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50 mb-8 flex flex-col sm:flex-row gap-4 items-end">
                                <div className="w-full">
                                    <label className="block text-slate-300 font-sans font-medium text-sm mb-2">Nombre de Nueva Categoría</label>
                                    <input
                                        type="text"
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 focus:border-neon-blue rounded-lg text-white p-3 font-sans outline-none transition-colors"
                                        placeholder="ej. Juegos de Mesa"
                                    />
                                </div>
                                <button
                                    onClick={handleAddCategory}
                                    disabled={isAddingCategory || !newCategoryName.trim()}
                                    className={`w-full sm:w-auto mt-4 sm:mt-0 flex gap-2 items-center justify-center bg-neon-blue text-slate-900 font-sans font-bold px-6 py-3 rounded-lg shadow-lg transition-all ${isAddingCategory || !newCategoryName.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-cyan-400 hover:shadow-neon-blue/40 hover:-translate-y-0.5'}`}
                                >
                                    <Plus size={20} /> AGREGAR
                                </button>
                            </div>

                            {/* Categories Tree Map */}
                            <div className="bg-slate-900/40 p-6 sm:p-8 rounded-2xl border border-slate-700/50 shadow-inner">
                                <h3 className="text-xl font-display font-medium text-slate-200 mb-6 flex items-center gap-2">
                                    <Layers className="text-neon-blue" size={24} />
                                    Estructura del Catálogo
                                </h3>

                                {loadingCategories ? (
                                    <div className="py-12 flex flex-col items-center justify-center text-neon-blue/70 animate-pulse">
                                        <div className="w-10 h-10 border-4 border-neon-blue/30 border-t-neon-blue rounded-full animate-spin mb-4"></div>
                                        <span className="font-sans font-medium tracking-widest text-sm">ESCANEANDO ÍNDICES CATEGÓRICOS...</span>
                                    </div>
                                ) : categories.length === 0 ? (
                                    <div className="py-12 text-center text-slate-500 font-sans border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/30">
                                        <Layers className="mx-auto mb-3 opacity-20" size={40} />
                                        La estructura base no ha sido inicializada.
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-5 font-sans">
                                        {categories.map((cat) => (
                                            <CategoryTreeItem key={cat.id} category={cat} onAddSubcategory={handleAddSubcategory} isAddingSubcategory={isAddingSubcategory} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Recursive component for category tree
function CategoryTreeItem({
    category,
    onAddSubcategory,
    isAddingSubcategory,
    level = 0
}: {
    category: Category,
    onAddSubcategory: (parentId: number, name: string) => Promise<boolean>,
    isAddingSubcategory: { [key: number]: boolean },
    level?: number
}) {
    const [subName, setSubName] = useState('');
    const [isExpanded, setIsExpanded] = useState(true);
    const [isHovered, setIsHovered] = useState(false);

    const hasChildren = category.subcategories && category.subcategories.length > 0;

    const handleAdd = async () => {
        if (!subName.trim()) return;
        const success = await onAddSubcategory(category.id, subName);
        if (success) setSubName('');
    }

    return (
        <div className="flex flex-col relative w-full group/tree">

            {/* Guide line for nested items */}
            {level > 0 && (
                <div className="absolute left-[-22px] top-0 bottom-[-8px] w-px bg-slate-700/50 group-hover/tree:bg-neon-blue/30 transition-colors z-0" />
            )}

            <div
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={`
                    relative z-10 flex gap-4 items-center group transition-all duration-300
                    ${level === 0
                        ? 'bg-gradient-to-r from-slate-800 to-slate-800/60 p-4 rounded-xl border border-slate-700/80 hover:border-neon-blue/50 shadow-md hover:shadow-neon-blue/10 backdrop-blur-sm'
                        : 'py-2 px-3 pl-0 my-0.5 rounded-lg hover:bg-slate-800/40 relative'
                    }
                `}
            >
                {/* Connector dot for nested items */}
                {level > 0 && (
                    <div className="absolute left-[-22px] top-1/2 w-4 h-px bg-slate-700/50 group-hover:bg-neon-blue/50 group-hover:w-5 transition-all" />
                )}

                <div
                    className="flex items-center justify-center cursor-pointer text-slate-400 hover:text-white transition-colors"
                    onClick={() => setIsExpanded(!isExpanded)}
                    style={{ visibility: hasChildren || isHovered ? 'visible' : 'hidden' }}
                >
                    {hasChildren ? (
                        isExpanded ?
                            <ChevronDown size={level === 0 ? 20 : 16} className={`transition-transform duration-300 ${isHovered ? 'text-neon-blue' : ''}`} /> :
                            <ChevronRight size={level === 0 ? 20 : 16} className="transition-transform duration-300" />
                    ) : (
                        <div className={`w-[${level === 0 ? '20px' : '16px'}] h-[${level === 0 ? '20px' : '16px'}]`}></div>
                    )}
                </div>

                <div className="flex items-center gap-3 min-w-0 font-sans">
                    {level === 0 && (
                        <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-700/50 shadow-inner">
                            <Layers size={20} className="text-neon-pink" />
                        </div>
                    )}

                    <span className={`
                        truncate font-medium transition-colors
                        ${level === 0 ? 'text-slate-100 text-lg tracking-wide' : 'text-slate-300 text-base'}
                        ${isHovered ? 'text-neon-blue' : ''}
                    `}>
                        {category.name}
                    </span>

                    {level === 0 && (
                        <span className="text-xs bg-slate-900 px-2 py-0.5 rounded-md border border-slate-700 text-slate-500 font-mono">
                            ID:{String(category.id).padStart(3, '0')}
                        </span>
                    )}
                </div>

                {/* Flexible spacer */}
                <div className="flex-grow border-b border-dashed border-slate-700/30 mx-4 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                {/* Action Section (Input + Add Button) */}
                <div className={`
                    flex bg-slate-900 border border-slate-700 rounded-lg focus-within:border-neon-blue 
                    transition-all duration-300 items-center overflow-hidden h-9 sm:h-10 
                    ${isHovered || subName.length > 0 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none'}
                    shadow-inner
                `}>
                    <input
                        value={subName}
                        onChange={(e) => setSubName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                        placeholder={level === 0 ? "Nueva categoría hija..." : "Nueva rama..."}
                        className="bg-transparent border-none outline-none text-slate-300 text-xs sm:text-sm px-3 py-1.5 flex-grow w-32 sm:w-48 placeholder:text-slate-600 font-medium"
                    />
                    <button
                        onClick={handleAdd}
                        disabled={isAddingSubcategory[category.id] || !subName.trim()}
                        className={`
                            px-3 sm:px-4 h-full border-l border-slate-700 text-neon-blue bg-slate-800/50 
                            transition-all duration-300 focus:outline-none
                            ${isAddingSubcategory[category.id] || !subName.trim()
                                ? 'opacity-40 cursor-not-allowed bg-slate-900 text-slate-600'
                                : 'hover:bg-neon-blue hover:text-slate-900 font-bold'}
                        `}
                    >
                        <Plus size={16} className={`${isAddingSubcategory[category.id] ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Children container with animation */}
            <div
                className={`
                    grid transition-all duration-300 ease-in-out
                    ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}
                `}
            >
                <div className="overflow-hidden">
                    {hasChildren && (
                        <div className={`
                            ${level === 0 ? 'pl-[3.5rem] mt-3' : 'pl-8 mt-1'} 
                            flex flex-col gap-1 relative
                        `}>
                            {category.subcategories!.map(sub => (
                                <CategoryTreeItem
                                    key={sub.id}
                                    category={sub}
                                    onAddSubcategory={onAddSubcategory}
                                    isAddingSubcategory={isAddingSubcategory}
                                    level={level + 1}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Seller Customization Modal */}
            {editingSellerId !== null && (
                <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[60] flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg shadow-2xl shadow-neon-blue/20 flex flex-col relative overflow-hidden">
                        {/* Glow effect */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-gradient-to-r from-transparent via-neon-blue to-transparent blur-sm"></div>
                        
                        <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                            <div>
                                <h2 className="text-2xl font-display font-bold text-white flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-neon-blue/10 flex items-center justify-center border border-neon-blue/30">
                                        <Save className="text-neon-blue" size={20} />
                                    </div>
                                    Ajustes de Vendedor
                                </h2>
                                <p className="text-xs text-slate-500 mt-1 font-sans">ID Interno: {editingSellerId}</p>
                            </div>
                            <button onClick={() => setEditingSellerId(null)} className="text-slate-500 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-full">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="block text-slate-400 font-sans font-bold text-xs uppercase tracking-widest">Cuota Mensual Personalizada (CRC)</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <span className="text-neon-blue font-bold">₡</span>
                                    </div>
                                    <input 
                                        type="number" 
                                        value={editMonthlyFee} 
                                        onChange={(e) => setEditMonthlyFee(Number(e.target.value))} 
                                        className="w-full bg-slate-950 border border-slate-700 focus:border-neon-blue rounded-xl text-white p-4 pl-10 font-retro outline-none transition-all shadow-inner"
                                        placeholder="0"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-600 font-sans italic">Si se deja en 0 o vacío, se usará la cuota global del sistema.</p>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-slate-400 font-sans font-bold text-xs uppercase tracking-widest">Beneficios y Ventajas del Seller</label>
                                <textarea 
                                    rows={4} 
                                    value={editBenefits} 
                                    onChange={(e) => setEditBenefits(e.target.value)} 
                                    className="w-full bg-slate-950 border border-slate-700 focus:border-neon-blue rounded-xl text-white p-4 font-sans outline-none resize-none transition-all shadow-inner"
                                    placeholder="ej. Misión prioritaria en catálogo, Comisiones 0% en TCG, Soporte 24/7..."
                                ></textarea>
                                <p className="text-[10px] text-slate-600 font-sans italic">Estos beneficios pueden ser visibles para el vendedor en su portal.</p>
                            </div>
                        </div>
                        
                        <div className="p-8 border-t border-slate-800 bg-slate-900/80 flex flex-col sm:flex-row gap-3">
                            <button 
                                onClick={() => setEditingSellerId(null)} 
                                className="flex-1 py-4 rounded-xl font-heading font-bold text-slate-500 hover:text-white hover:bg-slate-800 transition-all border border-transparent hover:border-slate-700"
                            >
                                CANCELAR
                            </button>
                            <button 
                                disabled={isSavingSeller}
                                onClick={handleSaveSellerConfig} 
                                className="flex-[2] py-4 rounded-xl font-heading font-bold bg-gradient-to-r from-neon-blue to-cyan-600 text-slate-900 hover:from-cyan-400 hover:to-neon-blue transition-all shadow-xl shadow-neon-blue/20 group"
                            >
                                <span className="flex items-center justify-center gap-2">
                                    {isSavingSeller ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin"></div>
                                            GUARDANDO...
                                        </>
                                    ) : (
                                        <>
                                            <Save size={18} /> APLICAR CAMBIOS
                                        </>
                                    )}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Subcomponent functions ... (rest of CategoryTreeItem)

