import { useEffect, useState } from 'react';
import { ordersApi, disputesApi, reviewsApi, type Order, type Dispute } from '../api/client';
import { useNavigate } from 'react-router-dom';
import { Package, Clock, CheckCircle, MessageCircle, Truck, PackageCheck, AlertTriangle, X, Star } from 'lucide-react';
import NotificationBell from '../components/NotificationBell';

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
                                    : 'fill-transparent text-slate-600'
                            }`}
                        />
                    </button>
                );
            })}
        </div>
    );
}

export default function MyPurchases() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [myDisputes, setMyDisputes] = useState<Dispute[]>([]);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState<string | null>(null);
    
    // Dispute states
    const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
    const [disputeReason, setDisputeReason] = useState('');
    const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);

    // Review states
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [selectedSellerId, setSelectedSellerId] = useState<number | null>(null);
    const [reviewRating, setReviewRating] = useState(0);
    const [reviewComment, setReviewComment] = useState('');
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    
    const navigate = useNavigate();

    useEffect(() => {
        const storedToken = localStorage.getItem('geekstore_token');
        if (!storedToken) {
            navigate('/login');
            return;
        }
        setToken(storedToken);

        const fetchOrders = async () => {
            try {
                const [data, disputes] = await Promise.all([
                    ordersApi.getMyPurchases(storedToken),
                    disputesApi.getMyDisputes(storedToken)
                ]);
                setOrders(data);
                setMyDisputes(disputes);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, [navigate]);

    /** Timeline step component */
    const TimelineStep = ({ label, date, isActive, isCompleted }: { label: string; date?: string; isActive: boolean; isCompleted: boolean }) => (
        <div className="flex flex-col items-center gap-1 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                isCompleted ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/30' :
                isActive ? 'bg-neon-blue/20 border-neon-blue text-neon-blue animate-pulse shadow-lg shadow-neon-blue/20' :
                'bg-slate-800 border-slate-700 text-slate-600'
            }`}>
                {isCompleted ? <CheckCircle size={16} /> : 
                 label === 'Pendiente' ? <Clock size={14} /> :
                 label === 'Confirmada' ? <CheckCircle size={14} /> :
                 label === 'Enviada' ? <Truck size={14} /> :
                 <PackageCheck size={14} />}
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${
                isCompleted ? 'text-emerald-400' : isActive ? 'text-neon-blue' : 'text-slate-600'
            }`}>{label}</span>
            {date && (
                <span className="text-[9px] text-slate-500 font-mono">{new Date(date).toLocaleDateString('es-CR', { day: '2-digit', month: 'short' })}</span>
            )}
        </div>
    );

    /** Connector line between timeline steps */
    const TimelineConnector = ({ isCompleted }: { isCompleted: boolean }) => (
        <div className={`flex-1 h-0.5 mt-[-20px] self-start ${
            isCompleted ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.3)]' : 'bg-slate-800'
        }`} style={{ marginTop: '15px' }} />
    );

    /** Build timeline for an order */
    const OrderTimeline = ({ order }: { order: Order }) => {
        const steps = [
            { label: 'Pendiente', date: order.orderDate, status: 'Pending' },
            { label: 'Confirmada', date: order.confirmedAt, status: 'Confirmed' },
            { label: 'Enviada', date: order.shippedAt, status: 'Shipped' },
            { label: 'Completada', date: order.completedAt, status: 'Completed' },
        ];

        const statusOrder = ['Pending', 'Confirmed', 'Shipped', 'Completed'];
        const currentIndex = statusOrder.indexOf(order.status);

        return (
            <div className="flex items-start gap-0 mt-4 mb-2">
                {steps.map((step, i) => (
                    <div key={step.status} className="contents">
                        <TimelineStep
                            label={step.label}
                            date={step.date || undefined}
                            isActive={i === currentIndex}
                            isCompleted={i < currentIndex}
                        />
                        {i < steps.length - 1 && (
                            <TimelineConnector isCompleted={i < currentIndex} />
                        )}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="min-h-screen p-4 sm:p-8 flex flex-col items-center">
            <header className="w-full max-w-4xl flex justify-between items-center mb-8 border-b border-slate-700 pb-4">
                <h1 className="text-3xl font-display font-black text-white flex items-center gap-3">
                    <Package className="text-neon-blue" size={32} /> MIS COMPRAS
                </h1>
                <div className="flex items-center gap-3">
                    {token && <NotificationBell token={token} />}
                    <button 
                        onClick={() => navigate('/')}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        Volver al Catálogo
                    </button>
                </div>
            </header>

            <main className="w-full max-w-4xl">
                {loading ? (
                    <div className="text-center text-neon-blue animate-pulse py-10">Cargando compras...</div>
                ) : orders.length === 0 ? (
                    <div className="glass-panel text-center py-20 rounded-2xl">
                        <Package size={48} className="mx-auto text-slate-600 mb-4" />
                        <h2 className="text-xl text-white font-bold mb-2">Aún no has comprado nada</h2>
                        <p className="text-slate-400">Descubre productos increíbles en el catálogo.</p>
                        <button 
                            onClick={() => navigate('/')}
                            className="mt-6 bg-neon-pink text-white px-6 py-2 rounded-lg font-bold hover:shadow-lg hover:shadow-neon-pink/20"
                        >
                            Ir de Compras
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {orders.map(order => (
                            <div key={order.id} className="glass-panel border border-slate-700/50 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                                {order.status === 'Completed' && (
                                    <div className="absolute top-0 right-0 bg-emerald-500/10 text-emerald-400 text-[10px] font-black px-3 py-1 uppercase tracking-tighter border-b border-l border-emerald-500/20 rounded-bl-lg">
                                        Venta Finalizada
                                    </div>
                                )}
                                <div className="flex flex-col md:flex-row justify-between mb-4 pb-4 border-b border-slate-800">
                                    <div>
                                        <p className="text-slate-400 text-xs font-retro mb-1 uppercase tracking-widest">Orden #{order.id.toString().padStart(4, '0')}</p>
                                        <p className="text-white text-sm font-sans">Fecha: {new Date(order.orderDate).toLocaleDateString()}</p>
                                        <p className="text-slate-400 text-sm mt-1 font-sans">Vendedor: <span className="text-neon-pink font-bold">{order.seller?.nickname || `ID: ${order.sellerId}`}</span></p>
                                    </div>
                                    <div className="mt-4 md:mt-0 md:text-right">
                                        <p className="text-2xl font-display font-bold text-neon-blue">
                                            ₡{order.totalAmountCRC.toLocaleString('es-CR')}
                                        </p>
                                    </div>
                                </div>

                                {/* Order Timeline */}
                                <OrderTimeline order={order} />
                                
                                <div className="space-y-3 mt-4 pt-4 border-t border-slate-800">
                                    <p className="text-xs text-slate-500 font-retro uppercase">Productos</p>
                                    {order.items.map(item => (
                                        <div key={item.id} className="flex justify-between items-center text-sm font-sans">
                                            <span className="text-slate-300">
                                                <span className="text-slate-500 mr-2">{item.quantity}x</span> 
                                                {item.product?.name || `Product #${item.productId}`}
                                            </span>
                                            <span className="text-slate-400">₡{item.unitPriceCRC.toLocaleString('es-CR')}</span>
                                        </div>
                                    ))}
                                </div>
                                
                                <div className="mt-4 pt-4 border-t border-slate-800 text-sm text-slate-400 flex flex-col sm:flex-row gap-4 font-sans">
                                    <div>
                                        <strong className="text-white text-xs block mb-1 uppercase font-retro tracking-tighter text-slate-500">Método de entrega</strong>
                                        {order.deliveryMethod === 'Shipping' ? 'Envío por Correos de CR' : 'Punto de Encuentro'}
                                    </div>
                                    {order.shippingAddress && (
                                        <div>
                                            <strong className="text-white text-xs block mb-1 uppercase font-retro tracking-tighter text-slate-500">Dirección</strong>
                                            {order.shippingAddress}
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="mt-6 pt-4 border-t border-slate-800 flex flex-wrap gap-3 items-center justify-between">
                                    <div className="flex gap-3">
                                        {/* WhatsApp Contact Button */}
                                        {order.seller?.phoneNumber && (() => {
                                            const cleanPhone = order.seller.phoneNumber!.replace(/[^\d]/g, '');
                                            const waMessage = encodeURIComponent(
                                                `¡Hola ${order.seller.nickname || 'vendedor'}! 👋\n` +
                                                `Te escribo sobre mi orden #${order.id} en Goblin Spot por ₡${order.totalAmountCRC.toLocaleString('es-CR')}.\n` +
                                                `¿Podemos coordinar el pago y la entrega?`
                                            );
                                            return (
                                                <a
                                                    href={`https://wa.me/${cleanPhone}?text=${waMessage}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-lg shadow-green-500/20 hover:shadow-green-500/40 hover:-translate-y-0.5"
                                                >
                                                    <MessageCircle size={14} />
                                                    WhatsApp
                                                </a>
                                            );
                                        })()}

                                        {/* Rating Button */}
                                        {order.status === 'Completed' && (
                                            <button
                                                onClick={() => { setSelectedSellerId(order.sellerId); setIsReviewModalOpen(true); }}
                                                className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-lg shadow-yellow-500/20 hover:-translate-y-0.5"
                                            >
                                                <Star size={14} className="fill-white" />
                                                Calificar Vendedor
                                            </button>
                                        )}
                                    </div>

                                    {/* Dispute Button */}
                                    <div className="flex-grow md:text-right flex justify-end">
                                        {myDisputes.some(d => d.orderId === order.id && d.status !== 'Closed') ? (
                                            <span className="inline-flex items-center gap-2 bg-red-500/10 text-red-400 font-bold text-[10px] px-3 py-1.5 rounded-xl border border-red-500/20 uppercase tracking-wider">
                                                <AlertTriangle size={12} /> Disputa Abierta
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => { setSelectedOrderId(order.id); setIsDisputeModalOpen(true); }}
                                                className="inline-flex items-center gap-2 bg-slate-900/50 hover:bg-red-500/10 text-slate-500 hover:text-red-400 font-bold text-[10px] px-3 py-1.5 rounded-xl border border-slate-800 hover:border-red-500/30 transition-all font-sans uppercase tracking-wider"
                                            >
                                                <AlertTriangle size={12} /> Reportar Problema
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Dispute Modal */}
            {isDisputeModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-red-500/30 rounded-2xl w-full max-w-md shadow-[0_0_40px_rgba(239,68,68,0.15)] overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-red-500/5">
                            <h3 className="text-red-400 font-bold flex items-center gap-2 font-display text-lg">
                                <AlertTriangle size={20} /> Reportar Problema
                            </h3>
                            <button onClick={() => setIsDisputeModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-slate-300 text-sm mb-4 font-sans">
                                ¿Tuviste inconvenientes con la orden <strong>#{selectedOrderId}</strong>? Describe el problema detalladamente. Nuestro equipo moderador revisará tu caso.
                            </p>
                            <textarea
                                value={disputeReason}
                                onChange={e => setDisputeReason(e.target.value)}
                                placeholder="Ej: El producto nunca llegó, la condición no era la descrita..."
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm font-sans focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none min-h-[120px] transition-colors resize-none"
                            ></textarea>
                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    onClick={() => setIsDisputeModalOpen(false)}
                                    className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-white transition-colors font-sans"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={async () => {
                                        if(!disputeReason.trim() || !token || !selectedOrderId) return;
                                        setIsSubmittingDispute(true);
                                        const success = await disputesApi.open(selectedOrderId, disputeReason, token);
                                        setIsSubmittingDispute(false);
                                        if(success) {
                                            alert('Disputa enviada. El Gremio revisará el caso.');
                                            setMyDisputes(prev => [...prev, {
                                                id: 0,
                                                orderId: selectedOrderId!,
                                                initiator: { id: 0, name: '' },
                                                target: { id: 0, name: '' },
                                                reason: disputeReason,
                                                status: 'Open',
                                                createdAt: new Date().toISOString()
                                            }]);
                                            setIsDisputeModalOpen(false);
                                            setDisputeReason('');
                                        } else {
                                            alert('Error al abrir la disputa. Inténtalo más tarde.');
                                        }
                                    }}
                                    disabled={!disputeReason.trim() || isSubmittingDispute}
                                    className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold text-sm px-6 py-2 rounded-xl shadow-lg shadow-red-500/20 transition-all font-sans"
                                >
                                    {isSubmittingDispute ? 'Enviando...' : 'Enviar Reporte'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Review Modal */}
            {isReviewModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-yellow-500/30 rounded-2xl w-full max-w-md shadow-[0_0_40px_rgba(250,204,21,0.1)] overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-yellow-500/5">
                            <h3 className="text-yellow-400 font-bold flex items-center gap-2 font-display text-lg">
                                <Star size={20} className="fill-yellow-400" /> Calificar Vendedor
                            </h3>
                            <button onClick={() => setIsReviewModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="flex justify-center mb-6">
                                <StarRating rating={reviewRating} size={40} interactive onChange={setReviewRating} />
                            </div>
                            <textarea
                                value={reviewComment}
                                onChange={e => setReviewComment(e.target.value)}
                                placeholder="Comparte tu experiencia con este vendedor..."
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-sm font-sans focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none min-h-[100px] transition-colors resize-none"
                            ></textarea>
                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    onClick={() => setIsReviewModalOpen(false)}
                                    className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-white transition-colors font-sans"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={async () => {
                                        if(reviewRating === 0 || !token || !selectedSellerId) return;
                                        setIsSubmittingReview(true);
                                        const success = await reviewsApi.createReview(selectedSellerId, reviewRating, reviewComment, token);
                                        setIsSubmittingReview(false);
                                        if(success) {
                                            alert('¡Gracias por tu reseña!');
                                            setIsReviewModalOpen(false);
                                            setReviewRating(0);
                                            setReviewComment('');
                                        } else {
                                            alert('Error al enviar la reseña.');
                                        }
                                    }}
                                    disabled={reviewRating === 0 || isSubmittingReview}
                                    className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 disabled:opacity-50 text-white font-bold text-sm px-6 py-2 rounded-xl shadow-lg shadow-yellow-500/20 transition-all font-sans"
                                >
                                    {isSubmittingReview ? 'Enviando...' : 'Publicar Reseña'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
