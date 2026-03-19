import { useState, useEffect, useRef } from 'react';
import { Search, ShoppingCart, Box, User, SlidersHorizontal, ChevronDown, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AdsBar from '../components/AdsBar';
import { catalogApi, categoriesApi, ordersApi, type Product, type Category as ApiCategory } from '../api/client';
export interface CartItem {
    product: Product;
    quantity: number;
}

// ── Interest tags available for personalization ──────────────────────────
const INTEREST_TAGS = [
    { id: 'TCG', label: 'Cartas TCG', emoji: '🃏' },
    { id: 'Figuras', label: 'Figuras & Estatuas', emoji: '🗿' },
    { id: 'Moxfield', label: 'Magic: The Gathering', emoji: '🧙' },
    { id: 'Manga', label: 'Manga & Anime', emoji: '📚' },
    { id: 'Videojuegos', label: 'Videojuegos', emoji: '🎮' },
    { id: 'Comics', label: 'Cómics & Novelas', emoji: '💥' },
    { id: 'Cosplay', label: 'Cosplay & Accesorios', emoji: '🎭' },
    { id: 'Boardgames', label: 'Juegos de Mesa', emoji: '♟' },
];

// ── Compact Temu-style ProductCard ───────────────────────────────────────
function ProductCard({ product, onAddToCart }: { product: Product; onAddToCart: (p: Product, q: number) => void }) {
    const navigate = useNavigate();
    const images = [product.imageUrl, product.imageUrl2, product.imageUrl3].filter(u => u && u.trim() !== '');
    if (images.length === 0) images.push('');
    const [imgIdx, setImgIdx] = useState(0);
    const [added, setAdded] = useState(false);
    const [qty, setQty] = useState(1); // New quantity state
    const maxStock = product.stockCount || 1;
    const isLowStock = maxStock <= 3 && product.stockStatus === 'Available';

    // Type the condition to handle missing or undefined softly
    const condition = product.condition || 'NM';
    const conditionColors: Record<string, string> = {
        'M': 'bg-green-500 text-white',
        'NM': 'bg-emerald-500 text-white',
        'LP': 'bg-cyan-500 text-white',
        'MP': 'bg-yellow-500 text-slate-900',
        'HP': 'bg-orange-500 text-white',
        'DMG': 'bg-red-500 text-white'
    };
    const cColor = conditionColors[condition] || conditionColors['NM'];

    const handleAdd = () => {
        onAddToCart(product, qty);
        setAdded(true);
        setTimeout(() => setAdded(false), 1400);
    };

    return (
        <div className="bg-slate-900/80 rounded-xl overflow-hidden border border-slate-800 hover:border-slate-600 transition-all duration-200 group flex flex-col">
            {/* Image area */}
            <div className="relative aspect-square overflow-hidden bg-slate-950 flex-shrink-0"
                onMouseEnter={() => images.length > 1 && setImgIdx(1)}
                onMouseLeave={() => setImgIdx(0)}>
                <img
                    src={images[imgIdx]}
                    onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1605806616949-1e87b487cb2a?w=150&q=80'; }}
                    alt={product.name}
                    className="w-full h-full object-cover rounded-t-xl group-hover:scale-110 transition-transform duration-500"
                />
                {/* Category badge */}
                <span className="absolute top-1.5 left-1.5 text-[10px] font-bold bg-slate-900/80 text-neon-yellow px-2 py-0.5 rounded-full">
                    {product.categoryEntity?.name || 'Varios'}
                </span>
                {/* Low-stock flash */}
                {isLowStock && (
                    <span className="absolute top-1.5 right-1.5 text-[10px] font-bold bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                        ¡Últimas {maxStock}!
                    </span>
                )}
                {/* Condition Badge */}
                <span className={`absolute bottom-1.5 left-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-lg ${cColor}`}>
                    {condition}
                </span>
            </div>

            {/* Info area */}
            <div className="p-3 flex flex-col flex-grow">
                <p className="text-white text-sm font-semibold line-clamp-2 leading-tight mb-1">{product.name}</p>
                {product.seller?.nickname && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); navigate(`/profile/${product.sellerId}`); }} 
                        className="text-[11px] hover:text-white transition-colors text-neon-pink mb-1 flex items-center gap-1 hover:underline text-left pointer-events-auto"
                    >
                        <User size={10} /> {product.seller.nickname}
                    </button>
                )}
                <p className="text-xs text-slate-500 line-clamp-1 flex-grow mb-2">{product.description}</p>

                <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-800">
                    <span className="text-neon-blue font-display font-bold text-base">
                        ₡{product.priceCRC.toLocaleString('es-CR')}
                    </span>
                    {product.stockStatus === 'Available' && maxStock > 0 ? (
                        <div className="flex flex-col items-end gap-2">
                            {maxStock > 1 && (
                                <div className="flex items-center gap-2 bg-slate-950/50 rounded-lg p-1 border border-slate-800">
                                    <button 
                                        disabled={qty <= 1}
                                        onClick={() => setQty(q => Math.max(1, q - 1))}
                                        className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-30"
                                    > - </button>
                                    <span className="text-[11px] font-bold text-slate-200 w-4 text-center">{qty}</span>
                                    <button 
                                        disabled={qty >= maxStock}
                                        onClick={() => setQty(q => Math.min(maxStock, q + 1))}
                                        className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-30"
                                    > + </button>
                                </div>
                            )}
                            <button
                                onClick={handleAdd}
                                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all duration-200 ${added
                                    ? 'bg-green-500 text-white scale-95'
                                    : 'bg-neon-pink/10 text-neon-pink border border-neon-pink/40 hover:bg-neon-pink hover:text-white'
                                    }`}
                            >
                                {added ? '✓ Agregado' : '+Agregar'}
                            </button>
                            <span className="text-[10px] text-slate-500 font-sans">{maxStock} disponibles</span>
                        </div>
                    ) : (
                        <span className="text-xs text-red-400 font-bold">Agotado</span>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function Catalog() {
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [showCheckout, setShowCheckout] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState(false);
    const [buyerName, setBuyerName] = useState('');
    const [buyerEmail, setBuyerEmail] = useState('');
    const [buyerPhone, setBuyerPhone] = useState('');
    const [buyerAddress, setBuyerAddress] = useState('');
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sellerFilter, setSellerFilter] = useState<Set<string>>(new Set());
    const [sellerSearch, setSellerSearch] = useState('');
    const [sellerOpen, setSellerOpen] = useState(false);
    const sellerRef = useRef<HTMLDivElement>(null);
    const [sortOrder, setSortOrder] = useState('default');
    const [showFilters, setShowFilters] = useState(false);

    // ── Interests system ──────────────────────────────────────────────────
    const storedInterests = (): Set<string> => {
        try { return new Set(JSON.parse(localStorage.getItem('gs_interests') ?? '[]')); }
        catch { return new Set(); }
    };
    const [userInterests, setUserInterests] = useState<Set<string>>(storedInterests);
    const [showInterestModal, setShowInterestModal] = useState(
        !localStorage.getItem('gs_interests')
    );
    const [tempInterests, setTempInterests] = useState<Set<string>>(storedInterests);

    const saveInterests = () => {
        localStorage.setItem('gs_interests', JSON.stringify([...tempInterests]));
        setUserInterests(new Set(tempInterests));
        setShowInterestModal(false);
    };

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (sellerRef.current && !sellerRef.current.contains(e.target as Node))
                setSellerOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const navigate = useNavigate();

    // ── Catalog State ────────────────────────────────────────────────────────
    const [categories, setCategories] = useState<ApiCategory[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
    const [conditionFilter, setConditionFilter] = useState(''); // "" means all
    const [activeCategory, setActiveCategory] = useState<number | null | 'following'>(null); // null means "Todos"

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setPage(1); // Reset page on new search
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Reset page when category or condition changes
    useEffect(() => {
        setPage(1);
    }, [activeCategory, conditionFilter]);

    // Fetch dynamic categories
    useEffect(() => {
        categoriesApi.getCategories().then(cats => setCategories(cats));
    }, []);

    // Main fetch
    useEffect(() => {
        let isMounted = true;
        const fetchCatalog = async () => {
            setLoading(true);
            try {
                let res;
                if (activeCategory === 'following') {
                    const token = localStorage.getItem('geekstore_token');
                    if (!token) {
                        alert("Debes iniciar sesión para ver tu feed personalizado.");
                        setActiveCategory(null);
                        setLoading(false);
                        return;
                    }
                    res = await catalogApi.getFollowingFeed(token, page, 24);
                } else {
                    res = await catalogApi.getProducts({
                        search: debouncedSearch || undefined,
                        categoryId: activeCategory === null ? undefined : activeCategory,
                        condition: conditionFilter || undefined,
                        page: page,
                        pageSize: 24
                    });
                }
                
                if (isMounted) {
                    setProducts(res.items);
                    setTotalPages(res.totalPages);
                }
            } catch (error) {
                console.error(error);
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        fetchCatalog();
        return () => { isMounted = false; };
    }, [debouncedSearch, activeCategory, conditionFilter, page]);

    // Pre-fill buyer info from logged-in seller JWT if available
    const openCheckout = () => {
        const token = localStorage.getItem('geekstore_token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const email = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] ?? payload.email ?? payload.Email ?? '';
                if (email) setBuyerEmail(email);
            } catch { /* ignore */ }
        }
        setShowCheckout(true);
    };

    const handlePlaceOrder = async () => {
        if (!buyerName.trim() || !buyerEmail.trim()) return;
        
        const token = localStorage.getItem('geekstore_token');
        if (!token) {
            alert("Debes tener una sesión activa o crear una cuenta para comprar (Seguridad P2P).");
            return;
        }

        try {
            await ordersApi.createOrder({
                deliveryMethod: buyerAddress ? 'Shipping' : 'Pickup',
                shippingAddress: buyerAddress,
                buyerPhone: buyerPhone,
                items: cart.map(c => ({
                    productId: c.product.id,
                    quantity: c.quantity
                }))
            }, token);

            setOrderSuccess(true);
            setTimeout(() => {
                setOrderSuccess(false);
                setShowCheckout(false);
                setCart([]);
                setIsCartOpen(false);
                setBuyerName(''); setBuyerEmail(''); setBuyerPhone(''); setBuyerAddress('');
            }, 2500);
        } catch (e) {
            if (e instanceof Error) {
                alert(e.message);
            } else {
                alert("Ocurrió un error.");
            }
        }
    };

    // Unique sellers from loaded products
    const sellers = Array.from(new Set(
        products.map(p => p.seller?.nickname).filter(Boolean) as string[]
    )).sort();

    const visibleSellers = sellers.filter(s =>
        s.toLowerCase().includes(sellerSearch.toLowerCase())
    );

    const toggleSeller = (nick: string) => {
        setSellerFilter(prev => {
            const next = new Set(prev);
            if (next.has(nick)) { next.delete(nick); } else { next.add(nick); }
            return next;
        });
    };

    // Sort products locally (only affects the current page)
    const sortedProducts = [...products].sort((a, b) => {
        if (sortOrder === 'price-asc') return a.priceCRC - b.priceCRC;
        if (sortOrder === 'price-desc') return b.priceCRC - a.priceCRC;
        if (sortOrder === 'date-new') return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
        if (sortOrder === 'date-old') return new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime();
        if (sortOrder === 'default' && userInterests.size > 0) {
            const scoreA = (a.categoryEntity?.name && userInterests.has(a.categoryEntity.name)) ? 1 : 0;
            const scoreB = (b.categoryEntity?.name && userInterests.has(b.categoryEntity.name)) ? 1 : 0;
            return scoreB - scoreA;
        }
        return 0;
    });

    // Root categories for pills
    const rootCategories = categories.filter(c => !c.parentId);

    return (
        <div className="min-h-screen p-4 sm:p-8 relative flex flex-col">
            {/* Background stays global in App or Layout but let's assume it leaks here */}
            <div className="z-10 relative max-w-7xl mx-auto w-full">

                {/* Header */}
                <header className="flex flex-col md:flex-row justify-between items-center mb-8 sm:mb-10 border-b border-slate-700/50 pb-6 gap-6 md:gap-4 text-center md:text-left">
                    <div className="flex items-center gap-4 cursor-pointer group" onClick={() => navigate('/')}>
                        <img src="/logo.png" alt="Goblin Spot Logo" className="h-16 md:h-24 drop-shadow-[0_0_12px_rgba(74,222,128,0.5)] transition-transform group-hover:scale-105 mix-blend-screen" />
                        <div className="h-10 w-[2px] bg-slate-700/50 hidden md:block"></div>
                        <h1 className="text-3xl md:text-4xl font-display font-black tracking-tight">
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500">GOBLIN</span>{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-pink to-purple-500">SPOT</span>
                        </h1>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full md:w-auto">
                        <button
                            onClick={() => setShowInterestModal(true)}
                            className="w-full sm:w-auto glass-panel text-neon-yellow font-sans font-medium px-4 py-2.5 rounded-lg hover:bg-slate-800 transition-colors border border-neon-yellow/30 text-sm flex items-center gap-2"
                        >
                            ✦ {userInterests.size > 0 ? `Mis intereses (${userInterests.size})` : 'Personalizar'}
                        </button>
                        <button onClick={() => navigate('/login')} className="w-full sm:w-auto glass-panel text-white font-sans font-medium px-5 py-2.5 rounded-lg hover:bg-slate-800 transition-colors border border-slate-600/50">
                            Acceso a Vendedores
                        </button>
                        <button
                            onClick={() => setIsCartOpen(true)}
                            className="w-full sm:w-auto bg-neon-blue text-slate-900 font-sans font-bold px-5 py-2.5 rounded-lg hover:bg-cyan-400 transition-colors flex justify-center items-center gap-2 shadow-lg shadow-neon-blue/20"
                        >
                            <ShoppingCart size={18} /> Carrito ({cart.reduce((acc, item) => acc + item.quantity, 0)})
                        </button>
                    </div>
                </header>

                <div className="mb-6 -mx-4 sm:-mx-8">
                    <AdsBar />
                </div>

                {/* Filters Bar */}
                <div className="glass-panel rounded-xl p-4 mb-10 shadow-xl space-y-4">
                    {/* Row 1: Search + Toggle */}
                    <div className="flex gap-3 items-center">
                        <div className="flex items-center gap-3 flex-1 relative">
                            <Search className="absolute left-4 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar productos..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg text-white p-3 pl-12 font-sans focus:outline-none focus:border-neon-blue transition-colors placeholder-slate-500 text-sm"
                            />
                        </div>
                        <button
                            onClick={() => setShowFilters(v => !v)}
                            className={`flex items-center gap-2 px-4 py-3 rounded-lg border font-sans text-sm font-medium transition-all whitespace-nowrap ${showFilters ? 'bg-neon-blue/20 border-neon-blue text-neon-blue' : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'
                                }`}
                        >
                            <SlidersHorizontal size={16} /> Filtros
                        </button>
                    </div>

                    {/* Row 2: Category pills (fetched dynamically) */}
                    <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                        <button
                            onClick={() => setActiveCategory(null)}
                            className={`px-4 py-1.5 font-sans font-medium rounded-full whitespace-nowrap transition-all duration-200 text-sm ${activeCategory === null
                                ? 'bg-neon-pink text-white shadow-lg shadow-neon-pink/20'
                                : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/50'
                                }`}
                        >
                            Todos
                        </button>
                        <button
                            onClick={() => setActiveCategory('following')}
                            className={`px-4 py-1.5 font-sans font-medium rounded-full whitespace-nowrap transition-all duration-200 text-sm flex items-center gap-1.5 ${activeCategory === 'following'
                                ? 'bg-gradient-to-r from-neon-blue to-purple-500 text-white shadow-lg shadow-neon-blue/20'
                                : 'bg-slate-800/50 text-emerald-400 hover:bg-slate-700 hover:text-emerald-300 border border-emerald-500/30'
                                }`}
                        >
                            <User size={14} /> Siguiendo
                        </button>
                        {rootCategories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`px-4 py-1.5 font-sans font-medium rounded-full whitespace-nowrap transition-all duration-200 text-sm ${activeCategory === cat.id
                                    ? 'bg-neon-pink text-white shadow-lg shadow-neon-pink/20'
                                    : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/50'
                                    }`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>

                    {/* Row 3: Advanced filters (collapsible) */}
                    {showFilters && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-700/50">
                            {/* Sort */}
                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-slate-500 font-retro uppercase tracking-wider">Ordenar por</label>
                                <select
                                    value={sortOrder}
                                    onChange={e => setSortOrder(e.target.value)}
                                    className="bg-slate-900 border border-slate-700 rounded-lg text-white text-sm p-2.5 focus:outline-none focus:border-neon-blue transition-colors"
                                >
                                    <option value="default">Por defecto</option>
                                    <option value="price-asc">Precio: menor a mayor</option>
                                    <option value="price-desc">Precio: mayor a menor</option>
                                    <option value="date-new">Más recientes primero</option>
                                    <option value="date-old">Más antiguos primero</option>
                                </select>
                            </div>
                            {/* Seller multi-select */}
                            <div className="flex flex-col gap-1" ref={sellerRef}>
                                <label className="text-xs text-slate-500 font-retro uppercase tracking-wider">Vendedor</label>
                                {/* Trigger */}
                                <button
                                    onClick={() => setSellerOpen(v => !v)}
                                    className="flex items-center justify-between bg-slate-900 border border-slate-700 rounded-lg text-sm p-2.5 text-white focus:outline-none hover:border-neon-pink transition-colors"
                                >
                                    <span className={sellerFilter.size === 0 ? 'text-slate-500' : 'text-neon-pink font-semibold'}>
                                        {sellerFilter.size === 0
                                            ? 'Todos los vendedores'
                                            : sellerFilter.size === 1
                                                ? [...sellerFilter][0]
                                                : `${sellerFilter.size} vendedores`}
                                    </span>
                                    <ChevronDown size={14} className={`transition-transform ${sellerOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {/* Dropdown */}
                                {sellerOpen && (
                                    <div className="absolute z-50 mt-1 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
                                        {/* Search */}
                                        <div className="p-2 border-b border-slate-800">
                                            <div className="relative">
                                                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                                <input
                                                    autoFocus
                                                    type="text"
                                                    placeholder="Buscar vendedor..."
                                                    value={sellerSearch}
                                                    onChange={e => setSellerSearch(e.target.value)}
                                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-7 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-neon-pink"
                                                />
                                            </div>
                                        </div>
                                        {/* Clear all */}
                                        {sellerFilter.size > 0 && (
                                            <button
                                                onClick={() => setSellerFilter(new Set())}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-slate-800 transition-colors border-b border-slate-800"
                                            >
                                                <X size={10} /> Limpiar selección ({sellerFilter.size})
                                            </button>
                                        )}
                                        {/* Options */}
                                        <div className="max-h-52 overflow-y-auto">
                                            {visibleSellers.length === 0 ? (
                                                <p className="text-xs text-slate-500 text-center py-4">Sin resultados</p>
                                            ) : visibleSellers.map(nick => (
                                                <label key={nick} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-800 cursor-pointer transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        checked={sellerFilter.has(nick)}
                                                        onChange={() => toggleSeller(nick)}
                                                        className="accent-pink-500 w-3.5 h-3.5"
                                                    />
                                                    <span className="text-sm text-white">{nick}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            {/* Condition Filter */}
                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-slate-500 font-retro uppercase tracking-wider">Condición</label>
                                <select
                                    value={conditionFilter}
                                    onChange={e => setConditionFilter(e.target.value)}
                                    className="bg-slate-900 border border-slate-700 rounded-lg text-white text-sm p-2.5 focus:outline-none focus:border-neon-blue transition-colors"
                                >
                                    <option value="">Cualquier condición</option>
                                    <option value="M">Mint (M)</option>
                                    <option value="NM">Near Mint (NM)</option>
                                    <option value="LP">Light Played (LP)</option>
                                    <option value="MP">Moderately Played (MP)</option>
                                    <option value="HP">Heavily Played (HP)</option>
                                    <option value="DMG">Damaged (DMG)</option>
                                </select>
                            </div>
                            {/* Reset */}
                            {(sortOrder !== 'default' || sellerFilter.size > 0 || conditionFilter) && (
                                <button
                                    onClick={() => { setSortOrder('default'); setSellerFilter(new Set()); setConditionFilter(''); }}
                                    className="sm:col-span-2 text-xs text-slate-500 hover:text-red-400 transition-colors font-sans text-left"
                                >
                                    ✕ Limpiar filtros
                                </button>
                            )}
                        </div>
                    )}
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
                    <>
                        {/* Interest context banner */}
                        {userInterests.size > 0 && sortOrder === 'default' && (
                            <div className="mb-4 flex items-center gap-2 text-xs text-neon-yellow/70 font-sans">
                                <span>✦</span>
                                <span>Mostrando primero: {[...userInterests].join(', ')}</span>
                                <button onClick={() => setShowInterestModal(true)} className="text-slate-500 hover:text-neon-yellow transition-colors ml-1">· Editar</button>
                            </div>
                        )}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 pb-6">
                            {sortedProducts.length === 0 ? (
                                <div className="col-span-full py-12 text-center text-slate-500 font-sans flex flex-col items-center gap-4 bg-slate-900/50 rounded-xl border border-slate-800 border-dashed">
                                    {activeCategory === 'following' ? (
                                        <>
                                            <span className="text-5xl mb-2">👥</span>
                                            <p className="text-lg text-slate-300">Aún no sigues a nadie o no tienen inventario disponible hoy.</p>
                                            <p className="text-sm">¡Explora nuestro catálogo general y busca a tus vendedores favoritos!</p>
                                            <button 
                                                onClick={() => setActiveCategory(null)} 
                                                className="mt-4 px-6 py-2.5 rounded-xl border border-neon-blue text-neon-blue font-bold hover:bg-neon-blue/10 transition-colors shadow-[0_0_15px_rgba(0,240,255,0.2)]"
                                            >
                                                Ver Catálogo Completo
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-4xl mb-2">🔍</span>
                                            <p>No se encontraron productos que coincidan con tu búsqueda.</p>
                                        </>
                                    )}
                                </div>
                            ) : sortedProducts.map(product => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                    onAddToCart={(p, q) => {
                                        setCart(prev => {
                                            const existing = prev.find(item => item.product.id === p.id);
                                            if (existing) {
                                                const newQty = Math.min(existing.quantity + q, p.stockCount || 1);
                                                return prev.map(item => item.product.id === p.id ? { ...item, quantity: newQty } : item);
                                            }
                                            return [...prev, { product: p, quantity: q }];
                                        });
                                    }}
                                />
                            ))}
                        </div>
                        
                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="flex justify-center items-center gap-4 py-8 border-t border-slate-800/60 mt-4">
                                <button 
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-4 py-2 rounded-lg bg-slate-800/80 text-white font-semibold hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    ⟵ Anterior
                                </button>
                                <span className="text-slate-400 font-sans text-sm">
                                    Página <strong className="text-white">{page}</strong> de {totalPages}
                                </span>
                                <button 
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="px-4 py-2 rounded-lg bg-slate-800/80 text-white font-semibold hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    Siguiente ⟶
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Cart Modal */}
            {isCartOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="glass-panel w-full max-w-lg rounded-2xl p-6 relative border border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <button onClick={() => { setIsCartOpen(false); setShowCheckout(false); setOrderSuccess(false); }}
                            className="absolute top-4 right-4 text-slate-400 hover:text-white">✕</button>

                        {orderSuccess ? (
                            /* ✅ Success */
                            <div className="text-center py-10">
                                <div className="text-6xl mb-4">🎉</div>
                                <h2 className="text-2xl font-display font-bold text-green-400 mb-2">¡Pedido Confirmado!</h2>
                                <p className="text-slate-300 font-sans">Pronto recibirás información de contacto del vendedor.</p>
                            </div>
                        ) : showCheckout ? (
                            /* 🧾 Checkout form */
                            <>
                                <h2 className="text-xl font-display font-bold text-white mb-1 flex items-center gap-2">
                                    🧾 DATOS DE CONTACTO
                                </h2>
                                <p className="text-xs text-slate-500 font-sans mb-5">Completa tus datos para coordinar la entrega con el vendedor.</p>

                                <div className="space-y-3 mb-5">
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Nombre completo *</label>
                                        <input value={buyerName} onChange={e => setBuyerName(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg text-white p-3 text-sm focus:outline-none focus:border-neon-blue transition-colors"
                                            placeholder="Tu nombre" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Correo electrónico *</label>
                                        <input type="email" value={buyerEmail} onChange={e => setBuyerEmail(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg text-white p-3 text-sm focus:outline-none focus:border-neon-blue transition-colors"
                                            placeholder="tu@correo.com" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Teléfono / WhatsApp *</label>
                                        <input value={buyerPhone} onChange={e => setBuyerPhone(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg text-white p-3 text-sm focus:outline-none focus:border-neon-blue transition-colors"
                                            placeholder="+506 8888-8888" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Provincia / Cantón para entrega</label>
                                        <input value={buyerAddress} onChange={e => setBuyerAddress(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg text-white p-3 text-sm focus:outline-none focus:border-neon-blue transition-colors"
                                            placeholder="San José, Escazú" />
                                    </div>
                                </div>

                                {/* Order summary mini */}
                                <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 mb-5">
                                    <p className="text-xs text-slate-500 mb-2 font-retro uppercase">Resumen del pedido</p>
                                    {cart.map((item, i) => (
                                        <div key={i} className="flex justify-between text-sm text-slate-300 py-1">
                                            <span className="line-clamp-1 flex-1">{item.product.name} ×{item.quantity}</span>
                                            <span className="ml-3 text-neon-blue font-semibold">₡{(item.quantity * item.product.priceCRC).toLocaleString('es-CR')}</span>
                                        </div>
                                    ))}
                                    <div className="border-t border-slate-700 mt-2 pt-2 flex justify-between font-bold text-white">
                                        <span>TOTAL</span>
                                        <span>₡{cart.reduce((acc, item) => acc + item.quantity * item.product.priceCRC, 0).toLocaleString('es-CR')}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={handlePlaceOrder}
                                    disabled={!buyerName.trim() || !buyerEmail.trim() || !buyerPhone.trim()}
                                    className="w-full bg-gradient-to-r from-neon-pink to-pink-600 text-white font-display font-bold py-3.5 rounded-xl shadow-lg hover:shadow-neon-pink/30 transition-all disabled:opacity-40"
                                >
                                    CONFIRMAR PEDIDO
                                </button>
                                <button onClick={() => setShowCheckout(false)}
                                    className="w-full mt-3 text-slate-500 hover:text-white text-sm font-sans transition-colors">
                                    ← Volver al carrito
                                </button>
                            </>
                        ) : (
                            /* 🛒 Cart items */
                            <>
                                <h2 className="text-2xl font-display font-bold text-white mb-6 flex items-center gap-2">
                                    <ShoppingCart className="text-neon-blue" /> TU CARRITO
                                </h2>
                                {cart.length === 0 ? (
                                    <p className="text-slate-400 text-center py-8">El carrito está vacío.</p>
                                ) : (
                                    <div className="space-y-4 max-h-72 overflow-y-auto pr-2">
                                        {cart.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center border-b border-slate-800 pb-4">
                                                <div className="flex-1">
                                                    <p className="font-bold text-white line-clamp-1">{item.product.name}</p>
                                                    {item.product.seller?.nickname && (
                                                        <p className="text-xs text-neon-pink mt-0.5">por {item.product.seller.nickname}</p>
                                                    )}
                                                    <div className="flex items-center gap-3 mt-2">
                                                        <button className="w-6 h-6 rounded bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 flex items-center justify-center font-bold"
                                                            onClick={() => { const c = [...cart]; c[idx].quantity = Math.max(1, c[idx].quantity - 1); setCart(c); }}>-</button>
                                                        <span className="text-sm text-slate-300 font-retro w-4 text-center">{item.quantity}</span>
                                                        <button className="w-6 h-6 rounded bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 flex items-center justify-center font-bold"
                                                            onClick={() => { const c = [...cart]; if (c[idx].quantity < (item.product.stockCount || 1)) c[idx].quantity++; setCart(c); }}>+</button>
                                                        <p className="text-sm text-slate-400 ml-2">x ₡{item.product.priceCRC.toLocaleString('es-CR')}</p>
                                                        <span className="text-[10px] text-slate-600 ml-auto">({item.product.stockCount || 1} disp.)</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    <button className="text-slate-500 hover:text-red-400 text-xs font-bold"
                                                        onClick={() => setCart(prev => prev.filter((_, i) => i !== idx))}>ELIMINAR</button>
                                                    <div className="font-display text-neon-blue font-bold tracking-tight">
                                                        ₡{(item.quantity * item.product.priceCRC).toLocaleString('es-CR')}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        <div className="pt-4 flex justify-between items-center font-bold text-xl text-white">
                                            <span>TOTAL:</span>
                                            <span>₡{cart.reduce((acc, item) => acc + item.quantity * item.product.priceCRC, 0).toLocaleString('es-CR')}</span>
                                        </div>
                                        <button
                                            className="w-full mt-4 bg-neon-pink text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-neon-pink/30 hover:bg-pink-500 transition-all font-display tracking-wider"
                                            onClick={openCheckout}
                                        >
                                            PROCEDER AL PAGO
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ✦ Interest Personalization Modal */}
            {showInterestModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="glass-panel w-full max-w-sm rounded-2xl p-7 border border-neon-yellow/30 shadow-2xl shadow-neon-yellow/10">
                        <div className="text-center mb-5">
                            <div className="text-4xl mb-2">✨</div>
                            <h2 className="text-2xl font-display font-bold text-white">Tus Intereses</h2>
                            <p className="text-sm text-slate-400 font-sans mt-1">Selecciona qué te gusta y lo mostraremos primero</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-6">
                            {INTEREST_TAGS.map(tag => (
                                <button
                                    key={tag.id}
                                    onClick={() => setTempInterests(prev => {
                                        const next = new Set(prev);
                                        if (next.has(tag.id)) { next.delete(tag.id); } else { next.add(tag.id); }
                                        return next;
                                    })}
                                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all ${tempInterests.has(tag.id)
                                            ? 'border-neon-yellow bg-neon-yellow/10 text-neon-yellow'
                                            : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'
                                        }`}
                                >
                                    <span>{tag.emoji}</span>
                                    <span className="text-xs leading-tight">{tag.label}</span>
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={saveInterests}
                            className="w-full bg-neon-yellow text-slate-900 font-display font-bold py-3 rounded-xl hover:bg-yellow-300 transition-colors mb-2"
                        >
                            APLICAR INTERESES
                        </button>
                        <button
                            onClick={() => { localStorage.setItem('gs_interests', '[]'); setUserInterests(new Set()); setTempInterests(new Set()); setShowInterestModal(false); }}
                            className="w-full text-slate-500 hover:text-white text-sm font-sans transition-colors"
                        >
                            Ver todo sin personalizar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
