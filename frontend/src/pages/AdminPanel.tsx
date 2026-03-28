import { useState, useEffect } from 'react';
import { ShieldAlert, ShieldCheck, ArrowUpDown, Save, Layers, Plus, ChevronDown, ChevronRight, BarChart3, BrainCircuit, TrendingUp, Info, Search, Filter, X } from 'lucide-react';
import { adminApi, settingsApi, categoriesApi, adminDashboardApi, catalogApi, reviewsApi, disputesApi, deliveryPointsApi, refundsApi, reportsApi, type User, type Category, type Product, type ReviewSummary, type Review, type Dispute, type DeliveryPoint, type SubscriptionPlan, type Refund, type ProductReport } from '../api/client';
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
    const [activeTab, setActiveTab] = useState<'usuarios' | 'categorias' | 'dashboard' | 'productos' | 'reseñas' | 'disputas' | 'puntos' | 'planes' | 'reembolsos' | 'reportes'>('dashboard');

    // Plans State
    const [adminPlans, setAdminPlans] = useState<SubscriptionPlan[]>([]);
    const [loadingPlans, setLoadingPlans] = useState(false);
    const [editingPlanName, setEditingPlanName] = useState<string | null>(null);
    const [editingPlanCrc, setEditingPlanCrc] = useState<string>('');
    const [savingPlan, setSavingPlan] = useState(false);
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

    // Catalog Moderation State
    const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
    const [loadingCatalog, setLoadingCatalog] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [catalogSearch, setCatalogSearch] = useState('');
    const [catalogCondition, setCatalogCondition] = useState('All');
    const [catalogStock, setCatalogStock] = useState('All');
    const [sellerRatings, setSellerRatings] = useState<Record<number, ReviewSummary>>({});

    // Admin Reviews State
    const [adminReviews, setAdminReviews] = useState<(Review & { sellerId: number; sellerNickname: string })[]>([]);
    const [loadingReviews, setLoadingReviews] = useState(false);

    // Admin Disputes State
    const [adminDisputes, setAdminDisputes] = useState<(Dispute & { initiator: {id:number,name:string}, target: {id:number,name:string}, orderTotal?: number })[]>([]);
    const [loadingDisputes, setLoadingDisputes] = useState(false);
    const [resolvingDisputeId, setResolvingDisputeId] = useState<number | null>(null);
    const [disputeResolution, setDisputeResolution] = useState('');
    const [disputeIssueRefund, setDisputeIssueRefund] = useState(false);
    const [disputeRefundAmount, setDisputeRefundAmount] = useState('');

    // Admin Refunds State
    const [adminRefunds, setAdminRefunds] = useState<Refund[]>([]);
    const [loadingRefunds, setLoadingRefunds] = useState(false);

    // Admin Product Reports State
    const [adminReports, setAdminReports] = useState<ProductReport[]>([]);
    const [loadingReports, setLoadingReports] = useState(false);
    const [reportFilter, setReportFilter] = useState<'all' | 'Pending' | 'Reviewed' | 'Dismissed'>('Pending');
    const [reviewingReportId, setReviewingReportId] = useState<number | null>(null);
    const [reportAdminNotes, setReportAdminNotes] = useState('');
    const [reportDeactivate, setReportDeactivate] = useState(false);

    // Delivery Points State
    const [deliveryPoints, setDeliveryPoints] = useState<DeliveryPoint[]>([]);
    const [loadingDeliveryPoints, setLoadingDeliveryPoints] = useState(false);
    const [showAddPointModal, setShowAddPointModal] = useState(false);
    const [newPointName, setNewPointName] = useState('');
    const [newPointDescription, setNewPointDescription] = useState('');
    const [newPointLocationUrl, setNewPointLocationUrl] = useState('');
    const [isSavingPoint, setIsSavingPoint] = useState(false);

    const fetchAdminDisputes = async () => {
        if (!token) return;
        setLoadingDisputes(true);
        try {
            const data = await disputesApi.getAllAdmin(token);
            setAdminDisputes(data);
        } catch (e) { console.error(e); }
        finally { setLoadingDisputes(false); }
    };

    useEffect(() => {
        if (activeTab === 'disputas' && adminDisputes.length === 0) {
            fetchAdminDisputes();
        }
    }, [activeTab, token]);

    const fetchDeliveryPoints = async () => {
        setLoadingDeliveryPoints(true);
        try {
            const data = await deliveryPointsApi.getAll();
            setDeliveryPoints(data);
        } catch (e) { console.error(e); }
        finally { setLoadingDeliveryPoints(false); }
    };

    useEffect(() => {
        if (activeTab === 'puntos' && deliveryPoints.length === 0) {
            fetchDeliveryPoints();
        }
    }, [activeTab, deliveryPoints.length]);

    useEffect(() => {
        if (activeTab === 'planes' && adminPlans.length === 0) {
            setLoadingPlans(true);
            settingsApi.getPlans().then(data => setAdminPlans(data)).finally(() => setLoadingPlans(false));
        }
    }, [activeTab, adminPlans.length]);

    useEffect(() => {
        if (activeTab === 'reembolsos' && token) {
            setLoadingRefunds(true);
            refundsApi.getAllAdmin(token)
                .then(data => setAdminRefunds(data))
                .catch(() => setAdminRefunds([]))
                .finally(() => setLoadingRefunds(false));
        }
        if (activeTab === 'reportes' && token) {
            setLoadingReports(true);
            reportsApi.getAllAdmin(token, reportFilter === 'all' ? undefined : reportFilter)
                .then(data => setAdminReports(data))
                .catch(() => setAdminReports([]))
                .finally(() => setLoadingReports(false));
        }
    }, [activeTab, token, reportFilter]);

    const handleAddPoint = async () => {
        if (!token || !newPointName.trim()) return;
        setIsSavingPoint(true);
        try {
            const created = await deliveryPointsApi.create({
                name: newPointName,
                description: newPointDescription,
                locationUrl: newPointLocationUrl,
                isActive: true
            }, token);
            if (created) {
                setDeliveryPoints(prev => [...prev, created]);
                setNewPointName('');
                setNewPointDescription('');
                setNewPointLocationUrl('');
                setShowAddPointModal(false);
            }
        } catch (e) { console.error(e); }
        finally { setIsSavingPoint(false); }
    };

    const handleDeactivatePoint = async (id: number) => {
        if (!token) return;
        if (!window.confirm('¿Desactivar este punto de entrega?')) return;
        const ok = await deliveryPointsApi.deactivate(id, token);
        if (ok) {
            setDeliveryPoints(prev => prev.map(p => p.id === id ? { ...p, isActive: false } : p));
        }
    };

    const fetchAdminReviews = async () => {
        if (!token) return;
        setLoadingReviews(true);
        try {
            const data = await adminApi.getReviews(token);
            setAdminReviews(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingReviews(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'reseñas' && adminReviews.length === 0) {
            fetchAdminReviews();
        }
    }, [activeTab, token, adminReviews.length]);

    const handleDeleteReview = async (id: number) => {
        if (!token) return;
        if (!window.confirm('¿Deseas eliminar permanentemente esta reseña por presunto incumplimiento de normas?')) return;
        try {
            await adminApi.deleteReview(id, token);
            setAdminReviews(prev => prev.filter(r => r.id !== id));
        } catch (e) {
            console.error(e);
        }
    };

    const fetchCatalog = async () => {
        setLoadingCatalog(true);
        try {
            const res = await catalogApi.getProducts({ page: 1, pageSize: 200 });
            setCatalogProducts(res.items);
            
            const uniqueSellerIds = Array.from(new Set(res.items.map(p => p.sellerId).filter(id => id)));
            const ratingsMap: Record<number, ReviewSummary> = {};
            await Promise.all(uniqueSellerIds.map(async (id) => {
                try {
                    const sum = await reviewsApi.getSellerSummary(id);
                    if (sum) ratingsMap[id] = sum;
                } catch { } // Ignore errors for individual fetch
            }));
            setSellerRatings(ratingsMap);
        } catch(e) {
            console.error(e);
        } finally {
            setLoadingCatalog(false);
        }
    };
    
    useEffect(() => {
        if (activeTab === 'productos' && catalogProducts.length === 0) {
            fetchCatalog();
        }
    }, [activeTab, catalogProducts.length]);

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
        if (aVal === undefined || aVal === null) return sortDirection === 'asc' ? 1 : -1;
        if (bVal === undefined || bVal === null) return sortDirection === 'asc' ? -1 : 1;
        if (aVal! < bVal!) return sortDirection === 'asc' ? -1 : 1;
        if (aVal! > bVal!) return sortDirection === 'asc' ? 1 : -1;
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

            if (userRole !== 'Admin') {
                navigate('/');
                return;
            }
            setToken(storedToken);
        } catch {
            localStorage.removeItem('geekstore_token');
            navigate('/login');
        }
    }, [navigate]);

    useEffect(() => {
        if (activeTab === 'usuarios' && users.length === 0 && token) {
            const fetchUsers = async () => {
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
        }
    }, [activeTab, token, users.length]);

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

    const handleGrantPlan = async (userId: number) => {
        if (!token) return;
        const plan = prompt("Nombre del Plan (ej. Licencia Mercante, Licencia Épica):", "Licencia Mercante");
        if (!plan) return;
        
        const days = prompt("Días de validez (deja en blanco para indefinido):", "30");
        let endDate: string | null = null;
        if (days && !isNaN(Number(days))) {
            const date = new Date();
            date.setDate(date.getDate() + Number(days));
            endDate = date.toISOString();
        }
        
        try {
            const updated = await adminApi.grantPlan(userId, plan, endDate, token);
            if (updated) {
                setUsers(users.map(u => u.id === userId ? updated : u));
            }
        } catch (e) {
            alert("Error al asignar plan");
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

    const filteredCatalog = catalogProducts.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(catalogSearch.toLowerCase()) || 
                              (p.seller?.nickname || p.seller?.name || `id ${p.sellerId}`).toLowerCase().includes(catalogSearch.toLowerCase()) ||
                              (p.sellerNote || '').toLowerCase().includes(catalogSearch.toLowerCase());
        const matchesCondition = catalogCondition === 'All' || p.condition === catalogCondition;
        let matchesStock = true;
        if (catalogStock === 'Available') matchesStock = p.stockStatus === 'Available' && p.stockCount > 0;
        if (catalogStock === 'OutOfStock') matchesStock = p.stockStatus === 'OutOfStock' || p.stockCount === 0;
        
        return matchesSearch && matchesCondition && matchesStock;
    });

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
                    <button
                        onClick={() => setActiveTab('productos')}
                        className={`px-4 py-2 sm:px-6 sm:py-2.5 rounded-xl transition-all duration-300 w-full sm:w-auto text-center ${activeTab === 'productos'
                            ? 'glass-panel text-white shadow-lg shadow-purple-500/20 border-purple-500'
                            : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700 border border-transparent'
                            }`}
                    >
                        Catálogo
                    </button>
                    <button
                        onClick={() => setActiveTab('reseñas')}
                        className={`px-4 py-2 sm:px-6 sm:py-2.5 rounded-xl transition-all duration-300 w-full sm:w-auto text-center ${activeTab === 'reseñas'
                            ? 'glass-panel text-white shadow-lg shadow-yellow-500/20 border-yellow-500'
                            : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700 border border-transparent'
                            }`}
                    >
                        Reseñas
                    </button>
                    <button
                        onClick={() => setActiveTab('disputas')}
                        className={`px-4 py-2 sm:px-6 sm:py-2.5 rounded-xl transition-all duration-300 w-full sm:w-auto text-center ${activeTab === 'disputas'
                            ? 'glass-panel text-white shadow-lg shadow-neon-blue/20 border-neon-blue'
                            : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700 border border-transparent'
                            }`}
                    >
                        Disputas
                        {adminDisputes.filter(d => d.status === 'Appealed').length > 0 && (
                            <span className="ml-2 bg-yellow-400 text-slate-900 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                                {adminDisputes.filter(d => d.status === 'Appealed').length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('reembolsos')}
                        className={`px-4 py-2 sm:px-6 sm:py-2.5 rounded-xl transition-all duration-300 w-full sm:w-auto text-center ${activeTab === 'reembolsos'
                            ? 'glass-panel text-white shadow-lg shadow-emerald-400/20 border-emerald-400'
                            : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700 border border-transparent'
                            }`}
                    >
                        💰 Reembolsos
                    </button>
                    <button
                        onClick={() => setActiveTab('reportes')}
                        className={`px-4 py-2 sm:px-6 sm:py-2.5 rounded-xl transition-all duration-300 w-full sm:w-auto text-center ${activeTab === 'reportes'
                            ? 'glass-panel text-white shadow-lg shadow-red-400/20 border-red-400'
                            : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700 border border-transparent'
                            }`}
                    >
                        🚩 Reportes
                        {adminReports.filter(r => r.status === 'Pending').length > 0 && (
                            <span className="ml-2 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                                {adminReports.filter(r => r.status === 'Pending').length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('puntos')}
                        className={`px-4 py-2 sm:px-6 sm:py-2.5 rounded-xl transition-all duration-300 w-full sm:w-auto text-center ${activeTab === 'puntos'
                            ? 'glass-panel text-white shadow-lg shadow-neon-yellow/20 border-neon-yellow'
                            : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700 border border-transparent'
                            }`}
                    >
                        Puntos de Entrega
                    </button>
                    <button
                        onClick={() => setActiveTab('planes')}
                        className={`px-4 py-2 sm:px-6 sm:py-2.5 rounded-xl transition-all duration-300 w-full sm:w-auto text-center ${activeTab === 'planes'
                            ? 'glass-panel text-white shadow-lg shadow-purple-400/20 border-purple-400'
                            : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700 border border-transparent'
                            }`}
                    >
                        💎 Planes
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
                                        <th className="p-4 font-semibold text-slate-300 text-right">Gestión de Cuenta</th>
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
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${user.isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                                            {user.isActive ? 'ACTIVO' : 'SUSPENDIDO'}
                                                        </span>
                                                        {user.role === 'Seller' && user.subscriptionPlan && (
                                                            <span className="text-[10px] text-neon-pink mt-1">{user.subscriptionPlan}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-right flex flex-col gap-2 items-end">
                                                    <button
                                                        onClick={() => handleToggleBan(user.id)}
                                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all w-32 ${user.isActive
                                                            ? 'bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/50'
                                                            : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white border border-emerald-500/50'}`}
                                                    >
                                                        {user.isActive ? (
                                                            <span className="flex items-center justify-center gap-2"><ShieldAlert size={14} /> SUSPENDER</span>
                                                        ) : (
                                                            <span className="flex items-center justify-center gap-2"><ShieldCheck size={14} /> REACTIVAR</span>
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => handleGrantPlan(user.id)}
                                                        className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all w-32 bg-yellow-400/20 text-yellow-400 hover:bg-yellow-400 hover:text-slate-900 border border-yellow-400/50 flex items-center justify-center gap-2"
                                                    >
                                                        {user.role === 'Seller' ? 'EDITAR PLAN' : 'ASIGNAR PLAN'}
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            if (!token) return;
                                                            if (!window.confirm(`¿Cierrer permanente de cuenta para ${user.nickname || user.name}? Esta acción ocultará todos sus productos y desactivará su acceso definitivamente.`)) return;
                                                            const success = await adminApi.deleteUser(user.id, token);
                                                            if (success) {
                                                                setUsers(users.map(u => u.id === user.id ? { ...u, isActive: false, subscriptionPlan: 'Permanently Closed' } : u));
                                                                alert("Cuenta cerrada permanentemente.");
                                                            }
                                                        }}
                                                        className="px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all w-32 bg-red-900/40 text-red-500 hover:bg-red-600 hover:text-white border border-red-500/30 flex items-center justify-center gap-1 opacity-40 hover:opacity-100"
                                                    >
                                                        CIERRE DEFINITIVO
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

                    {activeTab === 'productos' && (
                        <div className="relative z-10 w-full animate-in fade-in duration-300 space-y-4">
                            {/* Toolbar (Search & Filters) */}
                            <div className="flex flex-col md:flex-row gap-4 justify-between bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input 
                                        type="text" 
                                        placeholder="Buscar producto o vendedor..." 
                                        value={catalogSearch}
                                        onChange={e => setCatalogSearch(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 focus:border-neon-blue rounded-lg text-white py-2.5 pl-10 pr-4 font-sans outline-none transition-colors"
                                    />
                                </div>
                                <div className="flex gap-4">
                                    <div className="relative">
                                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <select 
                                            value={catalogCondition}
                                            onChange={e => setCatalogCondition(e.target.value)}
                                            className="appearance-none bg-slate-900 border border-slate-700 focus:border-neon-blue rounded-lg text-white py-2.5 pl-9 pr-8 font-sans outline-none transition-colors"
                                        >
                                            <option value="All">Cualquier Condición</option>
                                            <option value="NM">NM (Near Mint)</option>
                                            <option value="LP">LP (Lightly Played)</option>
                                            <option value="MP">MP (Moderately Played)</option>
                                            <option value="HP">HP (Heavily Played)</option>
                                            <option value="PO">PO (Poor)</option>
                                            <option value="N/A">N/A</option>
                                        </select>
                                    </div>
                                    <div className="relative">
                                        <Layers className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <select 
                                            value={catalogStock}
                                            onChange={e => setCatalogStock(e.target.value)}
                                            className="appearance-none bg-slate-900 border border-slate-700 focus:border-neon-blue rounded-lg text-white py-2.5 pl-9 pr-8 font-sans outline-none transition-colors"
                                        >
                                            <option value="All">Cualquier Stock</option>
                                            <option value="Available">En Stock</option>
                                            <option value="OutOfStock">Agotados</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-700 text-slate-400 font-sans text-sm tracking-widest uppercase">
                                            <th className="p-4 font-semibold text-slate-300">ID</th>
                                            <th className="p-4 font-semibold text-slate-300">Producto</th>
                                            <th className="p-4 font-semibold text-slate-300">Vendedor</th>
                                            <th className="p-4 font-semibold text-slate-300">Nota</th>
                                            <th className="p-4 font-semibold text-slate-300 text-center">Rating</th>
                                            <th className="p-4 font-semibold text-slate-300 text-center">Stock</th>
                                            <th className="p-4 font-semibold text-slate-300 text-right">Moderación</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loadingCatalog ? (
                                             <tr><td colSpan={6} className="p-8 text-center text-purple-400 font-retro animate-pulse">CARGANDO CATÁLOGO...</td></tr>
                                        ) : filteredCatalog.length === 0 ? (
                                             <tr><td colSpan={6} className="p-8 text-center text-slate-500 font-sans">No se encontraron productos que coincidan.</td></tr>
                                        ) : (
                                            filteredCatalog.map(p => (
                                                <tr key={p.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors group">
                                                    <td className="p-4 font-retro text-slate-400 text-sm">{String(p.id).padStart(3, '0')}</td>
                                                    <td className="p-4 text-white font-bold">{p.name}</td>
                                                    <td className="p-4 text-slate-400">{p.seller?.nickname || p.seller?.name || `ID ${p.sellerId}`}</td>
                                                    <td className="p-4 text-slate-500 text-xs italic truncate max-w-[150px]">{p.sellerNote || '—'}</td>
                                                    <td className="p-4 text-center">
                                                        {sellerRatings[p.sellerId] && sellerRatings[p.sellerId].reviewCount > 0 ? (
                                                            <div className="flex items-center justify-center gap-1 text-yellow-500">
                                                                <span className="font-bold text-sm">{sellerRatings[p.sellerId].averageRating.toFixed(1)}</span>
                                                                <span className="text-xs text-slate-500">({sellerRatings[p.sellerId].reviewCount})</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-slate-600 font-retro uppercase tracking-widest">N/A</span>
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${p.stockStatus === 'Available' && p.stockCount > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                                                            {p.stockCount} {p.stockStatus === 'Available' && p.stockCount > 0 ? 'DISP' : 'AGOT'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <button 
                                                            onClick={() => setSelectedProduct(p)}
                                                            className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white border border-indigo-500/50"
                                                        >
                                                            INSPECCIONAR
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'reseñas' && (
                        <div className="relative z-10 w-full overflow-x-auto animate-in fade-in duration-300">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-700 text-slate-400 font-sans text-sm tracking-widest uppercase">
                                        <th className="p-4 font-semibold text-slate-300">ID</th>
                                        <th className="p-4 font-semibold text-slate-300">Comprador (Autor)</th>
                                        <th className="p-4 font-semibold text-slate-300">Vendedor</th>
                                        <th className="p-4 font-semibold text-slate-300 text-center">Rating</th>
                                        <th className="p-4 font-semibold text-slate-300 w-1/3">Comentario</th>
                                        <th className="p-4 font-semibold text-slate-300 text-right">Moderación</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loadingReviews ? (
                                         <tr><td colSpan={6} className="p-8 text-center text-yellow-500 font-retro animate-pulse">CARGANDO REGISTROS...</td></tr>
                                    ) : adminReviews.length === 0 ? (
                                         <tr><td colSpan={6} className="p-8 text-center text-slate-500 font-sans">No hay reseñas registradas en el sistema.</td></tr>
                                    ) : (
                                        adminReviews.map(r => (
                                            <tr key={r.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors group">
                                                <td className="p-4 font-retro text-slate-400 text-sm">{String(r.id).padStart(3, '0')}</td>
                                                <td className="p-4 text-white font-bold">{r.reviewerNickname || `User ${r.reviewerId}`}</td>
                                                <td className="p-4 text-slate-400">{r.sellerNickname || `Seller ${r.sellerId}`}</td>
                                                <td className="p-4 text-center">
                                                    <span className="text-yellow-500 font-bold">{r.rating} ⭐</span>
                                                </td>
                                                <td className="p-4 text-slate-400 text-sm italic">"{r.comment}"</td>
                                                <td className="p-4 text-right">
                                                    <button 
                                                        onClick={() => handleDeleteReview(r.id)}
                                                        className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/50"
                                                    >
                                                        ELIMINAR
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'disputas' && (
                        <div className="relative z-10 w-full animate-in fade-in duration-300">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-white font-retro">Gestión de Disputas</h2>
                                <button onClick={fetchAdminDisputes} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all">
                                    Actualizar
                                </button>
                            </div>
                            {loadingDisputes ? (
                                <div className="p-8 text-center text-yellow-500 font-retro animate-pulse">CARGANDO DISPUTAS...</div>
                            ) : adminDisputes.length === 0 ? (
                                <div className="p-8 text-center text-slate-500 font-sans">No hay disputas registradas.</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-700">
                                                <th className="p-4 font-semibold text-slate-300 text-left">#</th>
                                                <th className="p-4 font-semibold text-slate-300 text-left">Orden</th>
                                                <th className="p-4 font-semibold text-slate-300">Iniciador</th>
                                                <th className="p-4 font-semibold text-slate-300">Afectado</th>
                                                <th className="p-4 font-semibold text-slate-300 w-1/3">Razón</th>
                                                <th className="p-4 font-semibold text-slate-300 text-center">Status</th>
                                                <th className="p-4 font-semibold text-slate-300 text-right">Acción</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {adminDisputes.map(d => (
                                                <tr key={d.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                                                    <td className="p-4 text-slate-400 font-mono text-xs">{d.id}</td>
                                                    <td className="p-4 text-slate-300">
                                                        <div className="font-semibold">Orden #{d.orderId}</div>
                                                        {d.orderTotal && <div className="text-xs text-slate-500">₡{d.orderTotal.toLocaleString()}</div>}
                                                    </td>
                                                    <td className="p-4 text-slate-300 text-center">{d.initiator.name}</td>
                                                    <td className="p-4 text-slate-300 text-center">{d.target.name}</td>
                                                    <td className="p-4 text-slate-400 text-xs">{d.reason}</td>
                                                    <td className="p-4 text-center">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${d.status === 'Open' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                                                            {d.status === 'Open' ? 'ABIERTA' : 'RESUELTA'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        {d.status === 'Open' && (
                                                            <button
                                                                onClick={() => { setResolvingDisputeId(d.id); setDisputeResolution(''); }}
                                                                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-neon-blue/20 text-neon-blue hover:bg-neon-blue hover:text-white border border-neon-blue/50"
                                                            >
                                                                Resolver
                                                            </button>
                                                        )}
                                                        {d.status === 'Resolved' && d.adminResolution && (
                                                            <span className="text-xs text-slate-500 italic">{d.adminResolution.substring(0, 30)}...</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            {/* Modal de resolución */}
                            {resolvingDisputeId !== null && (
                                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                                    <div className="bg-slate-900 rounded-2xl p-6 w-full max-w-md border border-slate-700">
                                        <h3 className="text-lg font-bold text-white mb-4">Resolver Disputa #{resolvingDisputeId}</h3>
                                        <textarea
                                            value={disputeResolution}
                                            onChange={e => setDisputeResolution(e.target.value)}
                                            placeholder="Describe la resolución y próximos pasos para ambas partes..."
                                            className="w-full h-28 bg-slate-800 text-white rounded-xl p-3 text-sm resize-none border border-slate-600 focus:border-neon-blue focus:outline-none mb-4"
                                        />
                                        {/* Refund option */}
                                        <div className="bg-slate-800/60 rounded-xl p-4 mb-4 space-y-3 border border-slate-700">
                                            <label className="flex items-center gap-3 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={disputeIssueRefund}
                                                    onChange={e => setDisputeIssueRefund(e.target.checked)}
                                                    className="w-4 h-4 accent-emerald-400"
                                                />
                                                <span className="text-sm font-semibold text-white">Emitir reembolso al comprador</span>
                                            </label>
                                            {disputeIssueRefund && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-slate-400 text-sm">₡</span>
                                                    <input
                                                        type="number"
                                                        value={disputeRefundAmount}
                                                        onChange={e => setDisputeRefundAmount(e.target.value)}
                                                        placeholder="Monto del reembolso"
                                                        className="flex-1 bg-slate-900 border border-emerald-400/50 focus:border-emerald-400 rounded-lg text-white p-2 text-sm outline-none"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => { setResolvingDisputeId(null); setDisputeIssueRefund(false); setDisputeRefundAmount(''); setDisputeResolution(''); }}
                                                className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                disabled={!disputeResolution.trim() || (disputeIssueRefund && !disputeRefundAmount)}
                                                onClick={async () => {
                                                    if (!token || !disputeResolution.trim()) return;
                                                    try {
                                                        await disputesApi.resolveAdmin(resolvingDisputeId, disputeResolution, token,
                                                            disputeIssueRefund ? { issueRefund: true, refundAmount: parseFloat(disputeRefundAmount) } : undefined);
                                                        setAdminDisputes(prev => prev.map(d => d.id === resolvingDisputeId ? { ...d, status: 'Resolved', adminResolution: disputeResolution } : d));
                                                        setResolvingDisputeId(null);
                                                        setDisputeIssueRefund(false);
                                                        setDisputeRefundAmount('');
                                                        setDisputeResolution('');
                                                    } catch (e) { alert('Error al resolver la disputa.'); }
                                                }}
                                                className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold bg-neon-blue text-white hover:bg-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Confirmar Resolución
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'reembolsos' && (
                        <div className="relative z-10 w-full animate-in fade-in duration-300">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-white font-retro">💰 Reembolsos</h2>
                                <button
                                    onClick={() => { setLoadingRefunds(true); refundsApi.getAllAdmin(token!).then(data => setAdminRefunds(data)).finally(() => setLoadingRefunds(false)); }}
                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all"
                                >
                                    Actualizar
                                </button>
                            </div>
                            {loadingRefunds ? (
                                <div className="p-8 text-center text-emerald-400 font-retro animate-pulse">CARGANDO REEMBOLSOS...</div>
                            ) : adminRefunds.length === 0 ? (
                                <div className="p-8 text-center text-slate-500 font-sans border-2 border-dashed border-slate-800 rounded-xl">No hay reembolsos registrados.</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-700">
                                                <th className="p-4 text-left text-slate-300 font-semibold">ID</th>
                                                <th className="p-4 text-left text-slate-300 font-semibold">Beneficiario</th>
                                                <th className="p-4 text-left text-slate-300 font-semibold">Disputa / Orden</th>
                                                <th className="p-4 text-right text-slate-300 font-semibold">Monto</th>
                                                <th className="p-4 text-center text-slate-300 font-semibold">Estado</th>
                                                <th className="p-4 text-center text-slate-300 font-semibold">Fecha</th>
                                                <th className="p-4 text-right text-slate-300 font-semibold">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {adminRefunds.map(refund => (
                                                <tr key={refund.id} className="border-b border-slate-800 hover:bg-slate-800/40 transition-colors">
                                                    <td className="p-4 text-slate-400 font-retro text-xs">#{refund.id}</td>
                                                    <td className="p-4 text-white font-medium">{refund.beneficiaryNickname ?? `ID:${refund.beneficiaryId}`}</td>
                                                    <td className="p-4 text-slate-400 text-xs">Disputa #{refund.disputeId} · Orden #{refund.orderId}</td>
                                                    <td className="p-4 text-right text-emerald-400 font-bold">₡{refund.amount.toLocaleString('es-CR')}</td>
                                                    <td className="p-4 text-center">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${
                                                            refund.status === 'Processed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                            refund.status === 'Rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                            'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                                        }`}>
                                                            {refund.status === 'Processed' ? 'Procesado' : refund.status === 'Rejected' ? 'Rechazado' : 'Pendiente'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-center text-slate-500 text-xs">{new Date(refund.createdAt).toLocaleDateString('es-CR')}</td>
                                                    <td className="p-4 text-right">
                                                        {refund.status === 'Pending' && (
                                                            <div className="flex gap-2 justify-end">
                                                                <button
                                                                    onClick={async () => {
                                                                        if (!token) return;
                                                                        try {
                                                                            const ok = await refundsApi.process(refund.id, undefined, token);
                                                                            if (ok) setAdminRefunds(prev => prev.map(r => r.id === refund.id ? { ...r, status: 'Processed' } : r));
                                                                            else alert('Error al procesar el reembolso.');
                                                                        } catch { alert('Error de red al procesar el reembolso.'); }
                                                                    }}
                                                                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white border border-emerald-500/30 transition-all"
                                                                >
                                                                    Procesar
                                                                </button>
                                                                <button
                                                                    onClick={async () => {
                                                                        if (!token) return;
                                                                        try {
                                                                            const ok = await refundsApi.reject(refund.id, undefined, token);
                                                                            if (ok) setAdminRefunds(prev => prev.map(r => r.id === refund.id ? { ...r, status: 'Rejected' } : r));
                                                                            else alert('Error al rechazar el reembolso.');
                                                                        } catch { alert('Error de red al rechazar el reembolso.'); }
                                                                    }}
                                                                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/30 transition-all"
                                                                >
                                                                    Rechazar
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'reportes' && (
                        <div className="relative z-10 w-full animate-in fade-in duration-300">
                            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                                <h2 className="text-xl font-bold text-white font-retro">🚩 Reportes de Contenido</h2>
                                <div className="flex gap-2 flex-wrap">
                                    {(['Pending', 'Reviewed', 'Dismissed', 'all'] as const).map(f => (
                                        <button key={f} onClick={() => setReportFilter(f)}
                                            className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${reportFilter === f ? 'bg-red-500/20 text-red-400 border-red-500/40' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'}`}>
                                            {f === 'Pending' ? 'Pendientes' : f === 'Reviewed' ? 'Revisados' : f === 'Dismissed' ? 'Descartados' : 'Todos'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {loadingReports ? (
                                <div className="p-8 text-center text-red-400 font-retro animate-pulse">CARGANDO REPORTES...</div>
                            ) : adminReports.length === 0 ? (
                                <div className="p-8 text-center text-slate-500 font-sans border-2 border-dashed border-slate-800 rounded-xl">No hay reportes {reportFilter !== 'all' ? `con estado "${reportFilter}"` : ''}.</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-700">
                                                <th className="p-3 text-left text-slate-300 font-semibold">Producto</th>
                                                <th className="p-3 text-left text-slate-300 font-semibold">Reportado por</th>
                                                <th className="p-3 text-left text-slate-300 font-semibold">Razón</th>
                                                <th className="p-3 text-center text-slate-300 font-semibold">Estado</th>
                                                <th className="p-3 text-center text-slate-300 font-semibold">Fecha</th>
                                                <th className="p-3 text-right text-slate-300 font-semibold">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {adminReports.map(report => (
                                                <tr key={report.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                                    <td className="p-3">
                                                        <p className="font-semibold text-white">{report.productName}</p>
                                                        <p className="text-xs text-slate-500">ID #{report.productId} {!report.productIsActive && <span className="text-red-400 ml-1">• Desactivado</span>}</p>
                                                    </td>
                                                    <td className="p-3 text-slate-300">{report.reporterNickname}</td>
                                                    <td className="p-3">
                                                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20">{report.reasonCategory}</span>
                                                        {report.details && <p className="text-xs text-slate-500 mt-1 max-w-[200px] truncate">{report.details}</p>}
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold border ${
                                                            report.status === 'Reviewed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                            report.status === 'Dismissed' ? 'bg-slate-700/50 text-slate-500 border-slate-700' :
                                                            'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                                        }`}>{report.status === 'Reviewed' ? 'Revisado' : report.status === 'Dismissed' ? 'Descartado' : 'Pendiente'}</span>
                                                    </td>
                                                    <td className="p-3 text-center text-slate-400 text-xs">{new Date(report.createdAt).toLocaleDateString('es-CR')}</td>
                                                    <td className="p-3 text-right">
                                                        {report.status === 'Pending' && (
                                                            <div className="flex justify-end gap-2">
                                                                <button
                                                                    onClick={() => { setReviewingReportId(report.id); setReportAdminNotes(''); setReportDeactivate(false); }}
                                                                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white border border-emerald-500/30 transition-all"
                                                                >
                                                                    Revisar
                                                                </button>
                                                                <button
                                                                    onClick={async () => {
                                                                        if (!token) return;
                                                                        const ok = await reportsApi.dismiss(report.id, token);
                                                                        if (ok) setAdminReports(prev => prev.map(r => r.id === report.id ? { ...r, status: 'Dismissed' } : r));
                                                                    }}
                                                                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white border border-slate-600 transition-all"
                                                                >
                                                                    Descartar
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Review Modal */}
                            {reviewingReportId !== null && (() => {
                                const report = adminReports.find(r => r.id === reviewingReportId);
                                if (!report) return null;
                                return (
                                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                                        <div className="bg-slate-900 border border-red-500/30 rounded-2xl w-full max-w-md shadow-[0_0_40px_rgba(239,68,68,0.15)] overflow-hidden">
                                            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-red-500/5">
                                                <h3 className="text-red-400 font-bold font-display text-lg">🚩 Revisar Reporte #{report.id}</h3>
                                                <button onClick={() => setReviewingReportId(null)} className="text-slate-400 hover:text-white transition-colors">✕</button>
                                            </div>
                                            <div className="p-6 space-y-4">
                                                <div>
                                                    <p className="text-slate-400 text-xs uppercase font-bold mb-1">Producto</p>
                                                    <p className="text-white font-semibold">{report.productName} <span className="text-slate-500 font-normal text-xs">(ID #{report.productId})</span></p>
                                                </div>
                                                <div>
                                                    <p className="text-slate-400 text-xs uppercase font-bold mb-1">Motivo</p>
                                                    <p className="text-orange-400 font-semibold">{report.reasonCategory}</p>
                                                    {report.details && <p className="text-slate-300 text-sm mt-1">{report.details}</p>}
                                                </div>
                                                <div>
                                                    <label className="text-slate-400 text-xs uppercase font-bold block mb-1">Notas del Admin</label>
                                                    <textarea
                                                        value={reportAdminNotes}
                                                        onChange={e => setReportAdminNotes(e.target.value)}
                                                        placeholder="Observaciones internas..."
                                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm font-sans focus:border-red-500 outline-none min-h-[80px] resize-none"
                                                    />
                                                </div>
                                                <label className="flex items-center gap-3 cursor-pointer">
                                                    <input type="checkbox" checked={reportDeactivate} onChange={e => setReportDeactivate(e.target.checked)}
                                                        className="w-4 h-4 rounded border-slate-600 accent-red-500" />
                                                    <span className="text-sm text-slate-300">Desactivar publicación y notificar al vendedor</span>
                                                </label>
                                                <div className="flex justify-end gap-3 pt-2">
                                                    <button onClick={() => setReviewingReportId(null)} className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-white transition-colors">Cancelar</button>
                                                    <button
                                                        onClick={async () => {
                                                            if (!token) return;
                                                            const ok = await reportsApi.review(report.id, reportAdminNotes || undefined, reportDeactivate, token);
                                                            if (ok) {
                                                                setAdminReports(prev => prev.map(r => r.id === report.id ? { ...r, status: 'Reviewed', adminNotes: reportAdminNotes, productIsActive: reportDeactivate ? false : r.productIsActive } : r));
                                                                setReviewingReportId(null);
                                                            }
                                                        }}
                                                        className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm px-6 py-2 rounded-xl shadow-lg shadow-emerald-500/20 transition-all"
                                                    >
                                                        Confirmar Revisión
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    {activeTab === 'puntos' && (
                        <div className="relative z-10 w-full animate-in fade-in duration-300">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-white font-retro">Puntos de Entrega</h2>
                                <div className="flex gap-2">
                                    <button onClick={fetchDeliveryPoints} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all">
                                        Actualizar
                                    </button>
                                    <button onClick={() => setShowAddPointModal(true)} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-neon-yellow/20 text-neon-yellow hover:bg-neon-yellow hover:text-slate-900 border border-neon-yellow/50 transition-all flex items-center gap-1">
                                        <Plus size={14} /> Agregar Punto
                                    </button>
                                </div>
                            </div>
                            {loadingDeliveryPoints ? (
                                <div className="p-8 text-center text-neon-yellow font-retro animate-pulse">CARGANDO PUNTOS...</div>
                            ) : deliveryPoints.length === 0 ? (
                                <div className="p-8 text-center text-slate-500 font-sans border-2 border-dashed border-slate-800 rounded-xl">No hay puntos de entrega registrados.</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-700">
                                                <th className="p-4 font-semibold text-slate-300 text-left">Nombre</th>
                                                <th className="p-4 font-semibold text-slate-300 text-left">Descripción</th>
                                                <th className="p-4 font-semibold text-slate-300 text-center">Estado</th>
                                                <th className="p-4 font-semibold text-slate-300 text-right">Acción</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {deliveryPoints.map(pt => (
                                                <tr key={pt.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                                                    <td className="p-4 text-white font-medium">{pt.name}</td>
                                                    <td className="p-4 text-slate-400 text-xs">{pt.description || '—'}</td>
                                                    <td className="p-4 text-center">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${pt.isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                                            {pt.isActive ? 'ACTIVO' : 'INACTIVO'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        {pt.isActive && (
                                                            <button
                                                                onClick={() => handleDeactivatePoint(pt.id)}
                                                                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/30"
                                                            >
                                                                Desactivar
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            {/* Add Point Modal */}
                            {showAddPointModal && (
                                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                                    <div className="bg-slate-900 rounded-2xl p-6 w-full max-w-md border border-slate-700">
                                        <h3 className="text-lg font-bold text-white mb-4 font-retro">Nuevo Punto de Entrega</h3>
                                        <div className="space-y-3 mb-4">
                                            <div>
                                                <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Nombre *</label>
                                                <input
                                                    value={newPointName}
                                                    onChange={e => setNewPointName(e.target.value)}
                                                    placeholder="Tienda Fenix, Vortex..."
                                                    className="w-full bg-slate-800 text-white rounded-xl p-3 text-sm border border-slate-600 focus:border-neon-yellow focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Descripción</label>
                                                <input
                                                    value={newPointDescription}
                                                    onChange={e => setNewPointDescription(e.target.value)}
                                                    placeholder="Dirección o referencia del lugar"
                                                    className="w-full bg-slate-800 text-white rounded-xl p-3 text-sm border border-slate-600 focus:border-neon-yellow focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">URL de Ubicación</label>
                                                <input
                                                    value={newPointLocationUrl}
                                                    onChange={e => setNewPointLocationUrl(e.target.value)}
                                                    placeholder="https://maps.google.com/..."
                                                    className="w-full bg-slate-800 text-white rounded-xl p-3 text-sm border border-slate-600 focus:border-neon-yellow focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-3">
                                            <button onClick={() => setShowAddPointModal(false)} className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all">
                                                Cancelar
                                            </button>
                                            <button
                                                disabled={!newPointName.trim() || isSavingPoint}
                                                onClick={handleAddPoint}
                                                className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold bg-neon-yellow text-slate-900 hover:bg-yellow-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isSavingPoint ? 'Guardando...' : 'Guardar'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'planes' && (
                        <div className="relative z-10 w-full animate-in fade-in duration-300">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-white font-retro">💎 Precios de Planes</h2>
                                <button
                                    onClick={() => {
                                        setLoadingPlans(true);
                                        settingsApi.getPlans().then(data => setAdminPlans(data)).finally(() => setLoadingPlans(false));
                                    }}
                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all"
                                >
                                    Actualizar
                                </button>
                            </div>
                            <p className="text-slate-400 text-sm font-sans mb-6">
                                Modifica los precios en CRC. El tipo de cambio a USD se calcula automáticamente (÷450).
                            </p>
                            {loadingPlans ? (
                                <div className="p-8 text-center text-purple-400 font-retro animate-pulse">CARGANDO PLANES...</div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {adminPlans.map(plan => (
                                        <div key={plan.name} className="glass-panel p-5 rounded-xl border border-slate-700/50 space-y-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-2xl">{plan.emoji}</span>
                                                <div>
                                                    <p className="text-white font-bold text-sm">{plan.name}</p>
                                                    <p className="text-slate-500 text-xs">
                                                        {plan.maxProducts === null ? '∞ productos' : `${plan.maxProducts} productos`}
                                                        {plan.isFounder && <span className="text-yellow-400 ml-2">⭐ {plan.founderSlotsLeft} slots fundador</span>}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className="text-slate-400">Precio actual:</span>
                                                <span className="text-neon-blue font-bold">₡{plan.crcPrice.toLocaleString('es-CR')}</span>
                                                <span className="text-slate-500">· ${plan.usdPrice.toFixed(2)} USD</span>
                                            </div>
                                            {editingPlanName === plan.name ? (
                                                <div className="flex gap-2 items-center">
                                                    <span className="text-slate-400 text-sm">₡</span>
                                                    <input
                                                        type="number"
                                                        value={editingPlanCrc}
                                                        onChange={e => setEditingPlanCrc(e.target.value)}
                                                        className="flex-1 bg-slate-900 border border-purple-400/50 focus:border-purple-400 rounded-lg text-white p-2 text-sm font-sans outline-none"
                                                        placeholder="Nuevo precio CRC"
                                                    />
                                                    <button
                                                        disabled={savingPlan || !editingPlanCrc}
                                                        onClick={async () => {
                                                            if (!token || !editingPlanCrc) return;
                                                            setSavingPlan(true);
                                                            const ok = await settingsApi.updatePlanPrice(plan.name, parseFloat(editingPlanCrc), token);
                                                            if (ok) {
                                                                setAdminPlans(prev => prev.map(p => p.name === plan.name
                                                                    ? { ...p, crcPrice: parseFloat(editingPlanCrc), usdPrice: parseFloat((parseFloat(editingPlanCrc) / 450).toFixed(2)) }
                                                                    : p));
                                                                setEditingPlanName(null);
                                                            }
                                                            setSavingPlan(false);
                                                        }}
                                                        className="px-3 py-2 rounded-lg text-xs font-bold bg-purple-500/20 text-purple-400 hover:bg-purple-500 hover:text-white border border-purple-500/30 transition-all disabled:opacity-50"
                                                    >
                                                        {savingPlan ? '...' : <Save size={14} />}
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingPlanName(null)}
                                                        className="px-3 py-2 rounded-lg text-xs font-bold bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => { setEditingPlanName(plan.name); setEditingPlanCrc(plan.crcPrice.toString()); }}
                                                    className="w-full px-3 py-2 rounded-lg text-xs font-bold bg-slate-700/50 text-slate-300 hover:bg-purple-500/20 hover:text-purple-400 border border-slate-600 hover:border-purple-500/40 transition-all"
                                                >
                                                    Editar Precio
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
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

            {/* Catalog Moderation Modal */}
            {selectedProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
                            <h3 className="text-xl font-display font-bold text-white flex items-center gap-2">
                                <ShieldAlert className="text-neon-pink" size={24} />
                                Inspección de Artículo
                            </h3>
                            <button onClick={() => setSelectedProduct(null)} className="text-slate-400 hover:text-white transition-colors">
                                ✖
                            </button>
                        </div>
                        
                        <div className="overflow-y-auto p-6 flex-1 custom-scrollbar">
                            <div className="flex flex-col md:flex-row gap-6">
                                {/* Image */}
                                <div className="w-full md:w-1/3">
                                    <div className="aspect-square rounded-xl overflow-hidden bg-slate-800 border border-slate-700">
                                        <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-full h-full object-cover" />
                                    </div>
                                    {selectedProduct.imageUrl2 && (
                                        <div className="flex gap-2 mt-2">
                                            <img src={selectedProduct.imageUrl2} alt="Vista 2" className="w-16 h-16 rounded-lg object-cover border border-slate-700" />
                                            {selectedProduct.imageUrl3 && <img src={selectedProduct.imageUrl3} alt="Vista 3" className="w-16 h-16 rounded-lg object-cover border border-slate-700" />}
                                        </div>
                                    )}
                                </div>
                                
                                {/* Details */}
                                <div className="w-full md:w-2/3 space-y-4">
                                    <div>
                                        <h4 className="text-xs font-retro text-slate-500 uppercase tracking-widest mb-1">Nombre del Producto</h4>
                                        <p className="text-xl font-bold text-white">{selectedProduct.name}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-800/40 p-3 rounded-lg border border-slate-700/50">
                                            <span className="block text-[10px] text-slate-500 font-retro uppercase mb-1">Precio</span>
                                            <span className="text-neon-blue font-bold">₡{selectedProduct.priceCRC.toLocaleString('es-CR')}</span>
                                        </div>
                                        <div className="bg-slate-800/40 p-3 rounded-lg border border-slate-700/50">
                                            <span className="block text-[10px] text-slate-500 font-retro uppercase mb-1">Vendedor</span>
                                            <span className="text-slate-200 font-medium font-sans">{selectedProduct.seller?.nickname || selectedProduct.seller?.name || `ID ${selectedProduct.sellerId}`}</span>
                                        </div>
                                        <div className="bg-slate-800/40 p-3 rounded-lg border border-slate-700/50">
                                            <span className="block text-[10px] text-slate-500 font-retro uppercase mb-1">Condición</span>
                                            <span className="text-slate-200 font-medium font-sans">{selectedProduct.condition || 'N/A'}</span>
                                        </div>
                                        <div className="bg-slate-800/40 p-3 rounded-lg border border-slate-700/50">
                                            <span className="block text-[10px] text-slate-500 font-retro uppercase mb-1">Stock</span>
                                            <span className="text-slate-200 font-medium font-sans">{selectedProduct.stockCount} ({selectedProduct.stockStatus})</span>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-xs font-retro text-slate-500 uppercase tracking-widest mb-1 mt-2">Detalles del Vendedor (Notas)</h4>
                                        <div className="bg-neon-blue/5 p-4 rounded-xl border border-neon-blue/20">
                                            <p className="text-sm text-neon-blue font-sans italic">
                                                {selectedProduct.sellerNote || "Sin notas adicionales del vendedor."}
                                            </p>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-xs font-retro text-slate-500 uppercase tracking-widest mb-1 mt-2">Descripción Completa</h4>
                                        <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700">
                                            <p className="text-sm text-slate-300 font-sans leading-relaxed whitespace-pre-wrap">{selectedProduct.description}</p>
                                        </div>
                                    </div>
                                    
                                    {selectedProduct.isMoxfieldCollection && selectedProduct.moxfieldDeckUrl && (
                                        <div className="bg-purple-900/20 border border-purple-500/30 p-3 rounded-lg flex items-center justify-between">
                                            <div>
                                                <span className="block text-[10px] text-purple-400 font-retro uppercase mb-1">Moxfield Link</span>
                                                <a href={selectedProduct.moxfieldDeckUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-purple-300 hover:text-white hover:underline truncate inline-block max-w-[200px]">
                                                    {selectedProduct.moxfieldDeckUrl}
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Actions Footer */}
                        <div className="p-4 border-t border-slate-800 bg-slate-900 grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <button 
                                onClick={async () => {
                                    if (!token) return;
                                    const reason = prompt("Motivo de la moderación:", "Incumplimiento de normas de publicación");
                                    if (!reason) return;
                                    try {
                                        const success = await adminApi.moderateProduct(selectedProduct.id, reason, token);
                                        if(success) {
                                            setCatalogProducts(catalogProducts.filter(cp => cp.id !== selectedProduct.id));
                                            setSelectedProduct(null);
                                            alert("Producto eliminado por moderación. Notificación enviada al vendedor.");
                                        } else {
                                            alert("Error en la solicitud.");
                                        }
                                    } catch(e) {
                                        alert("Error al eliminar producto");
                                    }
                                }}
                                className="w-full px-4 py-2.5 rounded-xl text-xs font-bold transition-all bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/50 flex flex-col items-center gap-1 group"
                            >
                                <span className="uppercase tracking-widest font-retro text-[10px]">Eliminar</span>
                                <span className="text-xs font-sans group-hover:text-white/80 line-clamp-1">Borrar Producto</span>
                            </button>
                            
                            <button 
                                onClick={async () => {
                                    if (!token) return;
                                    const reason = prompt("Mensaje de Advertencia al vendedor:", "Advertencia: Por favor revisa la descripción y condición de tus artículos.");
                                    if (!reason) return;
                                    try {
                                        const success = await adminApi.sendWarning(selectedProduct.sellerId, reason, token);
                                        if(success) {
                                            alert("Se ha enviado la advertencia al Vendedor.");
                                        } else {
                                            alert("No se pudo enviar la advertencia.");
                                        }
                                    } catch(e) {
                                        alert("Error al advertir");
                                    }
                                }}
                                className="w-full px-4 py-2.5 rounded-xl text-xs font-bold transition-all bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500 hover:text-slate-900 border border-yellow-500/50 flex flex-col items-center gap-1 group"
                            >
                                <span className="uppercase tracking-widest font-retro text-[10px]">Advertencia</span>
                                <span className="text-xs font-sans group-hover:text-slate-800/80 line-clamp-1">Notificar Falta</span>
                            </button>
                            
                            <button 
                                onClick={async () => {
                                    if (!token) return;
                                    if (confirm(`¿Estás seguro que deseas bloquear al vendedor ID ${selectedProduct.sellerId}? Esto desactivará todos sus productos automáticamente.`)) {
                                        try {
                                            const updatedUser = await adminApi.toggleBan(selectedProduct.sellerId, token);
                                            if(updatedUser && !updatedUser.isActive) {
                                                setCatalogProducts(catalogProducts.filter(cp => cp.sellerId !== selectedProduct.sellerId));
                                                setUsers(users.map(u => u.id === selectedProduct.sellerId ? { ...u, isActive: false } : u));
                                                setSelectedProduct(null);
                                                alert("Vendedor suspendido y catálogo desactivado.");
                                            }
                                        } catch(e) {
                                            alert("Error al bloquear vendedor.");
                                        }
                                    }
                                }}
                                className="w-full px-4 py-2.5 rounded-xl text-xs font-bold transition-all bg-purple-500/10 text-purple-400 hover:bg-purple-500 hover:text-white border border-purple-500/50 flex flex-col items-center gap-1 group"
                            >
                                <span className="uppercase tracking-widest font-retro text-[10px]">Bloquear Cuenta</span>
                                <span className="text-xs font-sans group-hover:text-white/80 line-clamp-1">Suspender Vendedor</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
        </div>
    );
}

// Subcomponent functions

