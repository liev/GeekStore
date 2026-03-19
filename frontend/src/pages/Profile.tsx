import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usersApi, catalogApi, type UserProfileDto, type Product } from '../api/client';
import { UserPlus, UserMinus, Package, BadgeCheck } from 'lucide-react';

export default function Profile() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [profile, setProfile] = useState<UserProfileDto | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        const storedToken = localStorage.getItem('geekstore_token');
        setToken(storedToken);

        const fetchData = async () => {
            if (!id) return;
            try {
                const profileData = await usersApi.getProfile(Number(id), storedToken || undefined);
                setProfile(profileData);

                const sellerProducts = await catalogApi.getProductsBySeller(Number(id));
                setProducts(sellerProducts.filter(p => p.stockStatus === 'Available' && p.stockCount > 0));
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
                </aside>

                {/* Products Grid */}
                <section className="w-full md:w-2/3">
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
                </section>
            </main>
        </div>
    );
}
