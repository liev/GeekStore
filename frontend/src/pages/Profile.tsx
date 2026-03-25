import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usersApi, catalogApi, reviewsApi, type UserProfileDto, type Product, type Review, type ReviewSummary } from '../api/client';
import { UserPlus, UserMinus, Package, BadgeCheck, Star, Send } from 'lucide-react';

// ── Reusable StarRating Component ─────────────────────────────────────
function StarRating({ rating, size = 18, interactive = false, onChange }: {
    rating: number;
    size?: number;
    interactive?: boolean;
    onChange?: (r: number) => void;
}) {
    const [hovered, setHovered] = useState(0);

    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map(i => {
                const filled = interactive ? (hovered >= i || (!hovered && rating >= i)) : rating >= i;
                const halfFilled = !interactive && !filled && rating >= i - 0.5;
                return (
                    <button
                        key={i}
                        type="button"
                        disabled={!interactive}
                        onMouseEnter={() => interactive && setHovered(i)}
                        onMouseLeave={() => interactive && setHovered(0)}
                        onClick={() => interactive && onChange?.(i)}
                        className={`transition-all duration-150 ${interactive ? 'cursor-pointer hover:scale-125' : 'cursor-default'}`}
                        style={{ lineHeight: 0 }}
                    >
                        <Star
                            size={size}
                            className={`transition-colors ${
                                filled
                                    ? 'fill-yellow-400 text-yellow-400 drop-shadow-[0_0_4px_rgba(250,204,21,0.5)]'
                                    : halfFilled
                                        ? 'fill-yellow-400/50 text-yellow-400'
                                        : 'fill-transparent text-slate-600'
                            }`}
                        />
                    </button>
                );
            })}
        </div>
    );
}

// ── Compact StarRating for ProductCards ────────────────────────────────
export function StarRatingCompact({ rating, count, size = 12 }: {
    rating: number;
    count: number;
    size?: number;
}) {
    if (count === 0) return null;
    return (
        <div className="flex items-center gap-1">
            <StarRating rating={rating} size={size} />
            <span className="text-[10px] text-slate-500 font-sans">({count})</span>
        </div>
    );
}

export default function Profile() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [profile, setProfile] = useState<UserProfileDto | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState<string | null>(null);

    // Reviews state
    const [reviews, setReviews] = useState<Review[]>([]);
    const [ratingSummary, setRatingSummary] = useState<ReviewSummary>({ averageRating: 0, reviewCount: 0 });
    const [reviewRating, setReviewRating] = useState(0);
    const [reviewComment, setReviewComment] = useState('');
    const [reviewSubmitting, setReviewSubmitting] = useState(false);
    const [reviewMessage, setReviewMessage] = useState('');
    const [canReview, setCanReview] = useState(false);

    useEffect(() => {
        const storedToken = localStorage.getItem('geekstore_token');
        setToken(storedToken);

        const fetchData = async () => {
            if (!id) return;
            const sellerId = Number(id);
            try {
                const [profileData, sellerProducts, sellerReviews, summary] = await Promise.all([
                    usersApi.getProfile(sellerId, storedToken || undefined),
                    catalogApi.getProductsBySeller(sellerId),
                    reviewsApi.getSellerReviews(sellerId),
                    reviewsApi.getSellerSummary(sellerId)
                ]);

                setProfile(profileData);
                setProducts(sellerProducts.filter(p => p.stockStatus === 'Available' && p.stockCount > 0));
                setReviews(sellerReviews);
                setRatingSummary(summary);

                // Check if current user already has a review and pre-fill
                if (storedToken) {
                    try {
                        const payload = JSON.parse(atob(storedToken.split('.')[1]));
                        const currentUserId = Number(payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ?? payload.sub);
                        const existing = sellerReviews.find(r => r.reviewerId === currentUserId);
                        if (existing) {
                            setReviewRating(existing.rating);
                            setReviewComment(existing.comment);
                        }
                        // We'll attempt to submit and the backend will validate purchase history
                        if (currentUserId !== sellerId) {
                            setCanReview(true);
                        }
                    } catch { /* ignore parse errors */ }
                }
            } catch (err) {
                console.error("Failed to load profile", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    const handleFollowToggle = async () => {
        if (!token) {
            alert("Debes iniciar sesión para seguir a un vendedor (Seguridad P2P).");
            navigate('/login');
            return;
        }
        if (!profile || !id) return;

        try {
            if (profile.isFollowing) {
                await usersApi.unfollowUser(Number(id), token);
                setProfile({ ...profile, isFollowing: false });
            } else {
                await usersApi.followUser(Number(id), token);
                setProfile({ ...profile, isFollowing: true });
            }
        } catch (err) {
            if (err instanceof Error) alert(err.message);
            else alert("Error al procesar solicitud");
        }
    };

    const handleSubmitReview = async () => {
        if (!token || !id || reviewRating === 0) return;
        setReviewSubmitting(true);
        setReviewMessage('');
        try {
            const result = await reviewsApi.createReview({
                sellerId: Number(id),
                rating: reviewRating,
                comment: reviewComment
            }, token);
            setReviewMessage(result.message);

            // Refresh reviews and summary
            const [updatedReviews, updatedSummary] = await Promise.all([
                reviewsApi.getSellerReviews(Number(id)),
                reviewsApi.getSellerSummary(Number(id))
            ]);
            setReviews(updatedReviews);
            setRatingSummary(updatedSummary);
        } catch (err) {
            setReviewMessage(err instanceof Error ? err.message : 'Error al enviar reseña');
        } finally {
            setReviewSubmitting(false);
        }
    };

    if (loading) return <div className="min-h-screen flex text-neon-blue items-center justify-center animate-pulse tracking-widest font-retro">CARGANDO PERFIL...</div>;
    if (!profile) return <div className="min-h-screen flex text-red-500 items-center justify-center font-display text-2xl">404 VENDEDOR NO ENCONTRADO</div>;

    return (
        <div className="min-h-screen p-4 sm:p-8 flex flex-col items-center">
            <header className="w-full max-w-5xl flex justify-between items-center mb-8 border-b border-slate-700 pb-4">
                <h1 className="text-2xl font-display font-black text-white flex items-center gap-3">
                    <span className="text-neon-pink">PERFIL DEL VENDEDOR</span>
                </h1>
                <button 
                    onClick={() => navigate('/catalog')}
                    className="text-slate-400 hover:text-white transition-colors"
                >
                    Volver al Catálogo
                </button>
            </header>

            <main className="w-full max-w-5xl flex flex-col md:flex-row gap-8">
                {/* Profile Sidebar */}
                <aside className="w-full md:w-1/3 space-y-6">
                    <div className="glass-panel p-8 rounded-2xl text-center border top-0 border-neon-blue/30 shadow-[0_0_30px_rgba(0,240,255,0.1)]">
                        <div className="w-32 h-32 mx-auto bg-gradient-to-br from-neon-blue flex items-center justify-center to-neon-pink rounded-full mb-6 shadow-xl relative">
                            <span className="text-5xl font-black text-white">{profile.nickname.charAt(0).toUpperCase()}</span>
                            <div className="absolute -bottom-2 -right-2 bg-slate-900 rounded-full p-2 border-2 border-slate-800">
                                <BadgeCheck size={24} className="text-neon-blue" />
                            </div>
                        </div>
                        <h2 className="text-3xl font-display font-bold text-white mb-2">{profile.nickname}</h2>
                        
                        {/* Star rating summary */}
                        <div className="flex items-center justify-center gap-2 mb-3">
                            <StarRating rating={Math.round(ratingSummary.averageRating)} size={20} />
                            <span className="text-sm text-slate-400 font-sans">
                                {ratingSummary.reviewCount > 0
                                    ? `${ratingSummary.averageRating.toFixed(1)} (${ratingSummary.reviewCount} reseña${ratingSummary.reviewCount > 1 ? 's' : ''})`
                                    : 'Sin reseñas aún'}
                            </span>
                        </div>

                        <div className="flex items-center justify-center gap-2 text-slate-400 font-sans mb-8 transition-colors">
                            <Package size={16} /> <span className="text-sm">{profile.totalActiveProducts} Productos Activos</span>
                        </div>

                        <button 
                            onClick={handleFollowToggle}
                            className={`w-full py-3 px-4 rounded-xl font-bold font-sans transition-all duration-300 flex items-center justify-center gap-2 ${
                                profile.isFollowing 
                                ? 'bg-slate-800 text-white border border-slate-600 hover:bg-slate-700' 
                                : 'bg-neon-blue text-slate-900 hover:bg-cyan-400 shadow-lg shadow-neon-blue/20'
                            }`}
                        >
                            {profile.isFollowing ? (
                                <><UserMinus size={20} /> Dejar de seguir</>
                            ) : (
                                <><UserPlus size={20} /> Seguir Vendedor</>
                            )}
                        </button>
                    </div>

                    {/* ── Write Review Form ──────────────────────────────── */}
                    {canReview && token && (
                        <div className="glass-panel p-6 rounded-2xl border border-slate-800">
                            <h4 className="text-sm font-display font-bold text-white mb-4 flex items-center gap-2">
                                <Star size={16} className="text-yellow-400" /> CALIFICA A ESTE VENDEDOR
                            </h4>
                            <div className="mb-4">
                                <StarRating rating={reviewRating} size={28} interactive onChange={setReviewRating} />
                            </div>
                            <textarea
                                value={reviewComment}
                                onChange={e => setReviewComment(e.target.value)}
                                placeholder="Cuéntanos tu experiencia con este vendedor..."
                                maxLength={500}
                                rows={3}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg text-white text-sm p-3 mb-3 focus:outline-none focus:border-neon-blue transition-colors placeholder-slate-500 resize-none"
                            />
                            <button
                                onClick={handleSubmitReview}
                                disabled={reviewRating === 0 || reviewSubmitting}
                                className="w-full py-2.5 rounded-xl font-bold font-sans text-sm transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-400 hover:to-orange-400 shadow-lg shadow-yellow-500/20 disabled:opacity-40"
                            >
                                <Send size={14} />
                                {reviewSubmitting ? 'Enviando...' : 'Enviar Reseña'}
                            </button>
                            {reviewMessage && (
                                <p className={`text-xs mt-2 text-center font-sans ${reviewMessage.includes('Error') || reviewMessage.includes('Solo') ? 'text-red-400' : 'text-green-400'}`}>
                                    {reviewMessage}
                                </p>
                            )}
                        </div>
                    )}
                </aside>

                {/* Main Content */}
                <section className="w-full md:w-2/3 space-y-8">
                    {/* Products Grid */}
                    <div>
                        <h3 className="text-xl font-display font-bold text-white mb-6 border-b border-slate-800 pb-2">PRODUCTOS DISPONIBLES</h3>
                        
                        {products.length === 0 ? (
                            <div className="text-slate-500 font-retro text-center py-20 bg-slate-900/50 rounded-xl border border-slate-800 border-dashed">
                                // NO HAY INVENTARIO ACTIVO //
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {products.map(product => (
                                    <div key={product.id} className="glass-panel p-4 rounded-xl border border-slate-800 hover:border-neon-pink/50 transition-colors flex gap-4">
                                        <div className="w-24 h-24 bg-slate-900 rounded-lg overflow-hidden flex-shrink-0">
                                            <img 
                                                src={product.imageUrl || 'https://images.unsplash.com/photo-1605806616949-1e87b487cb2a?w=150&q=80'} 
                                                onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1605806616949-1e87b487cb2a?w=150&q=80'; }}
                                                alt={product.name}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="flex flex-col flex-grow justify-between">
                                            <div>
                                                <p className="text-xs text-neon-pink mb-1">{product.categoryEntity?.name}</p>
                                                <h4 className="text-sm text-white font-bold leading-tight line-clamp-2">{product.name}</h4>
                                            </div>
                                            <p className="text-lg font-display font-bold text-neon-blue mt-2">₡{product.priceCRC.toLocaleString('es-CR')}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ── Reviews Section ──────────────────────────────── */}
                    <div>
                        <h3 className="text-xl font-display font-bold text-white mb-6 border-b border-slate-800 pb-2 flex items-center gap-2">
                            <Star size={20} className="text-yellow-400" /> RESEÑAS
                            {ratingSummary.reviewCount > 0 && (
                                <span className="text-sm font-sans font-normal text-slate-400 ml-2">
                                    ({ratingSummary.averageRating.toFixed(1)} ★ · {ratingSummary.reviewCount} reseña{ratingSummary.reviewCount > 1 ? 's' : ''})
                                </span>
                            )}
                        </h3>

                        {reviews.length === 0 ? (
                            <div className="text-slate-500 font-sans text-center py-12 bg-slate-900/50 rounded-xl border border-slate-800 border-dashed">
                                <Star size={32} className="mx-auto mb-3 text-slate-700" />
                                <p>Este vendedor aún no tiene reseñas.</p>
                                <p className="text-xs mt-1">¡Sé el primero en calificarlo!</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {reviews.map(review => (
                                    <div key={review.id} className="glass-panel p-5 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-pink to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                                                    {review.reviewerNickname.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-white">{review.reviewerNickname}</p>
                                                    <p className="text-[10px] text-slate-500 font-sans">
                                                        {new Date(review.createdAt).toLocaleDateString('es-CR', { year: 'numeric', month: 'short', day: 'numeric' })}
                                                        {review.updatedAt && ' (editada)'}
                                                    </p>
                                                </div>
                                            </div>
                                            <StarRating rating={review.rating} size={14} />
                                        </div>
                                        {review.comment && (
                                            <p className="text-sm text-slate-300 font-sans leading-relaxed mt-2 pl-11">{review.comment}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}
