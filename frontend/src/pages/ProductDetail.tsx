import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, ShoppingCart, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { catalogApi, reviewsApi, type Product, type ReviewSummary } from '../api/client';
import { StarRatingCompact } from './Profile';

/**
 * ProductDetail — Página de detalle de un producto individual.
 * Accesible mediante la ruta /catalog/:id.
 * Muestra galería de imágenes, información completa del producto,
 * datos del vendedor y botón de agregar al carrito.
 */
export default function ProductDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [imgIdx, setImgIdx] = useState(0);
    const [qty, setQty] = useState(1);
    const [added, setAdded] = useState(false);
    const [ratingData, setRatingData] = useState<ReviewSummary | null>(null);

    useEffect(() => {
        if (!id) return;
        const fetchProduct = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await catalogApi.getProduct(Number(id));
                if (!data) {
                    setError('Producto no encontrado');
                } else {
                    setProduct(data);
                    // Fetch seller rating
                    const summary = await reviewsApi.getSellerSummary(data.sellerId);
                    setRatingData(summary);
                }
            } catch {
                setError('Error al cargar el producto');
            } finally {
                setLoading(false);
            }
        };
        fetchProduct();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-neon-blue border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-400 font-sans text-sm">Cargando producto…</p>
                </div>
            </div>
        );
    }

    if (error || !product) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
                <span className="text-6xl">🕳️</span>
                <h1 className="text-2xl font-display font-bold text-white">{error || 'Producto no encontrado'}</h1>
                <button
                    onClick={() => navigate('/catalog')}
                    className="flex items-center gap-2 text-neon-blue hover:text-cyan-300 font-sans font-medium transition-colors"
                >
                    <ArrowLeft size={16} /> Volver al catálogo
                </button>
            </div>
        );
    }

    const images = [product.imageUrl, product.imageUrl2, product.imageUrl3].filter(u => u && u.trim() !== '');
    if (images.length === 0) images.push('');

    const maxStock = product.stockCount || 0;
    const isAvailable = product.stockStatus === 'Available' && maxStock > 0;
    const isLowStock = maxStock <= 3 && maxStock > 0;

    const condition = product.condition || 'NM';
    const conditionLabels: Record<string, string> = {
        'M': 'Mint',
        'NM': 'Near Mint',
        'LP': 'Lightly Played',
        'MP': 'Moderately Played',
        'HP': 'Heavily Played',
        'DMG': 'Damaged'
    };
    const conditionColors: Record<string, string> = {
        'M': 'bg-green-500 text-white',
        'NM': 'bg-emerald-500 text-white',
        'LP': 'bg-cyan-500 text-white',
        'MP': 'bg-yellow-500 text-slate-900',
        'HP': 'bg-orange-500 text-white',
        'DMG': 'bg-red-500 text-white'
    };

    const handleAdd = () => {
        // Dispatch custom event so Catalog can pick it up, or use localStorage
        const cartEvent = new CustomEvent('goblinspot:addToCart', {
            detail: { product, quantity: qty }
        });
        window.dispatchEvent(cartEvent);
        setAdded(true);
        setTimeout(() => setAdded(false), 1800);
    };

    const prevImg = () => setImgIdx(i => (i === 0 ? images.length - 1 : i - 1));
    const nextImg = () => setImgIdx(i => (i === images.length - 1 ? 0 : i + 1));

    return (
        <div className="min-h-screen p-4 sm:p-8 relative">
            <div className="bg-scanlines" />
            <div className="bg-vaporwave-grid opacity-30 fixed inset-0" />

            <div className="z-10 relative max-w-5xl mx-auto">
                {/* Back Button */}
                <button
                    onClick={() => navigate('/catalog')}
                    className="flex items-center gap-2 text-slate-400 hover:text-white font-sans text-sm mb-6 transition-colors group"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    Volver al catálogo
                </button>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                    {/* ── Image Gallery ─────────────────────────────── */}
                    <div className="space-y-3">
                        <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 group">
                            <img
                                src={images[imgIdx]}
                                onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1605806616949-1e87b487cb2a?w=600&q=80'; }}
                                alt={product.name}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            {/* Nav arrows */}
                            {images.length > 1 && (
                                <>
                                    <button
                                        onClick={prevImg}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 border border-slate-700 flex items-center justify-center text-white hover:bg-black/80 hover:border-neon-blue transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <ChevronLeft size={20} />
                                    </button>
                                    <button
                                        onClick={nextImg}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 border border-slate-700 flex items-center justify-center text-white hover:bg-black/80 hover:border-neon-blue transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <ChevronRight size={20} />
                                    </button>
                                </>
                            )}
                            {/* Condition badge */}
                            <span className={`absolute bottom-3 left-3 text-xs font-bold px-2.5 py-1 rounded-lg shadow-lg ${conditionColors[condition] || conditionColors['NM']}`}>
                                {condition}
                            </span>
                            {/* Low stock */}
                            {isLowStock && (
                                <span className="absolute top-3 right-3 text-xs font-bold bg-red-500 text-white px-3 py-1 rounded-full animate-pulse shadow-lg">
                                    ¡Últimas {maxStock}!
                                </span>
                            )}
                        </div>

                        {/* Thumbnails */}
                        {images.length > 1 && (
                            <div className="flex gap-2">
                                {images.map((src, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setImgIdx(i)}
                                        className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${i === imgIdx ? 'border-neon-blue shadow-[0_0_10px_rgba(0,240,255,0.3)]' : 'border-slate-800 hover:border-slate-600 opacity-60 hover:opacity-100'
                                            }`}
                                    >
                                        <img
                                            src={src}
                                            onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1605806616949-1e87b487cb2a?w=100&q=60'; }}
                                            alt={`${product.name} - imagen ${i + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ── Product Info ──────────────────────────────── */}
                    <div className="flex flex-col">
                        {/* Category */}
                        <span className="text-xs font-bold text-neon-yellow bg-slate-900/80 self-start px-3 py-1 rounded-full mb-3 border border-neon-yellow/20">
                            {product.categoryEntity?.name || 'Sin categoría'}
                        </span>

                        {/* Name */}
                        <h1 className="text-2xl sm:text-3xl font-display font-black text-white leading-tight mb-3">
                            {product.name}
                        </h1>

                        {/* Seller */}
                        {product.seller?.nickname && (
                            <button
                                onClick={() => navigate(`/profile/${product.sellerId}`)}
                                className="flex items-center gap-2 text-neon-pink hover:text-pink-300 text-sm font-sans font-medium transition-colors mb-4 self-start group"
                            >
                                <User size={14} />
                                <span className="group-hover:underline">{product.seller.nickname}</span>
                                <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                        )}

                        {/* Rating */}
                        {ratingData && ratingData.reviewCount > 0 && (
                            <div className="mb-4">
                                <StarRatingCompact rating={Math.round(ratingData.averageRating)} count={ratingData.reviewCount} />
                            </div>
                        )}

                        {/* Condition detail */}
                        <div className="flex items-center gap-3 mb-4">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${conditionColors[condition] || conditionColors['NM']}`}>
                                {condition}
                            </span>
                            <span className="text-sm text-slate-400 font-sans">{conditionLabels[condition] || condition}</span>
                        </div>

                        {/* Description */}
                        <div className="glass-panel rounded-xl p-4 mb-6 border border-slate-800">
                            <p className="text-slate-300 font-sans text-sm leading-relaxed whitespace-pre-wrap">
                                {product.description || 'Sin descripción disponible.'}
                            </p>
                        </div>

                        {/* Seller note */}
                        {product.sellerNote && (
                            <div className="bg-neon-yellow/5 border border-neon-yellow/20 rounded-xl p-4 mb-6">
                                <p className="text-xs text-neon-yellow font-bold uppercase tracking-wider mb-1">Nota del vendedor</p>
                                <p className="text-slate-300 font-sans text-sm">{product.sellerNote}</p>
                            </div>
                        )}

                        {/* Moxfield link */}
                        {product.isMoxfieldCollection && product.moxfieldDeckUrl && (
                            <a
                                href={product.moxfieldDeckUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-sans mb-6 transition-colors"
                            >
                                <ExternalLink size={14} /> Ver en Moxfield
                            </a>
                        )}

                        {/* Price + Cart */}
                        <div className="mt-auto glass-panel rounded-xl p-5 border border-slate-700 space-y-4">
                            {/* Price */}
                            <div className="flex items-baseline gap-3">
                                <span className="text-3xl font-display font-black text-neon-blue">
                                    ₡{product.priceCRC.toLocaleString('es-CR')}
                                </span>
                                <span className="text-sm text-slate-500 font-sans">CRC</span>
                            </div>

                            {/* Stock info */}
                            <div className="flex items-center gap-2 text-sm font-sans">
                                {isAvailable ? (
                                    <>
                                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                        <span className="text-green-400">{maxStock} disponible{maxStock > 1 ? 's' : ''}</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="w-2 h-2 rounded-full bg-red-500" />
                                        <span className="text-red-400 font-bold">Agotado</span>
                                    </>
                                )}
                            </div>

                            {/* Quantity + Add to cart */}
                            {isAvailable && (
                                <div className="flex items-center gap-4">
                                    {maxStock > 1 && (
                                        <div className="flex items-center gap-3 bg-slate-950/50 rounded-lg p-1.5 border border-slate-800">
                                            <button
                                                disabled={qty <= 1}
                                                onClick={() => setQty(q => Math.max(1, q - 1))}
                                                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-30 rounded-md hover:bg-slate-800 transition-colors font-bold"
                                            > − </button>
                                            <span className="text-sm font-bold text-white w-6 text-center">{qty}</span>
                                            <button
                                                disabled={qty >= maxStock}
                                                onClick={() => setQty(q => Math.min(maxStock, q + 1))}
                                                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-30 rounded-md hover:bg-slate-800 transition-colors font-bold"
                                            > + </button>
                                        </div>
                                    )}
                                    <button
                                        onClick={handleAdd}
                                        className={`flex-1 flex items-center justify-center gap-2 font-bold py-3 px-6 rounded-xl transition-all duration-300 text-sm ${added
                                            ? 'bg-green-500 text-white scale-95 shadow-lg shadow-green-500/30'
                                            : 'bg-gradient-to-r from-neon-pink to-purple-500 text-white hover:shadow-lg hover:shadow-neon-pink/30 hover:-translate-y-0.5'
                                            }`}
                                    >
                                        <ShoppingCart size={16} />
                                        {added ? '✓ Agregado al carrito' : 'Agregar al carrito'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
