import { useEffect, useState } from 'react';
import { ordersApi, type Order } from '../api/client';
import { useNavigate } from 'react-router-dom';
import { Package, Clock, CheckCircle, MessageCircle, Truck, PackageCheck } from 'lucide-react';
import NotificationBell from '../components/NotificationBell';

export default function MyPurchases() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState<string | null>(null);
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
                const data = await ordersApi.getMyPurchases(storedToken);
                setOrders(data);
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
                            <div key={order.id} className="glass-panel border border-slate-700/50 rounded-2xl p-6 shadow-xl">
                                <div className="flex flex-col md:flex-row justify-between mb-4 pb-4 border-b border-slate-800">
                                    <div>
                                        <p className="text-slate-400 text-xs font-retro mb-1 uppercase tracking-widest">Orden #{order.id}</p>
                                        <p className="text-white text-sm">Fecha: {new Date(order.orderDate).toLocaleDateString()}</p>
                                        <p className="text-slate-400 text-sm mt-1">Vendedor: <span className="text-neon-pink font-bold">{order.seller?.nickname || `ID: ${order.sellerId}`}</span></p>
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
                                        <div key={item.id} className="flex justify-between items-center text-sm">
                                            <span className="text-slate-300">
                                                <span className="text-slate-500 mr-2">{item.quantity}x</span> 
                                                {item.product?.name || `Product #${item.productId}`}
                                            </span>
                                            <span className="text-slate-400">₡{item.unitPriceCRC.toLocaleString('es-CR')}</span>
                                        </div>
                                    ))}
                                </div>
                                
                                <div className="mt-4 pt-4 border-t border-slate-800 text-sm text-slate-400 flex flex-col sm:flex-row gap-4">
                                    <div>
                                        <strong className="text-white text-xs block mb-1 uppercase">Método de entrega</strong>
                                        {order.deliveryMethod === 'Shipping' ? 'Envío por Correos de CR' : 'Punto de Encuentro'}
                                    </div>
                                    {order.shippingAddress && (
                                        <div>
                                            <strong className="text-white text-xs block mb-1 uppercase">Dirección</strong>
                                            {order.shippingAddress}
                                        </div>
                                    )}
                                </div>

                                {/* WhatsApp Contact Button */}
                                {order.seller?.phoneNumber && (() => {
                                    const cleanPhone = order.seller.phoneNumber!.replace(/[^\d]/g, '');
                                    const waMessage = encodeURIComponent(
                                        `¡Hola ${order.seller.nickname || 'vendedor'}! 👋\n` +
                                        `Te escribo sobre mi orden #${order.id} en Goblin Spot por ₡${order.totalAmountCRC.toLocaleString('es-CR')}.\n` +
                                        `¿Podemos coordinar el pago y la entrega?`
                                    );
                                    return (
                                        <div className="mt-4 pt-4 border-t border-slate-800">
                                            <a
                                                href={`https://wa.me/${cleanPhone}?text=${waMessage}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-green-500/20 hover:shadow-green-500/40 hover:-translate-y-0.5"
                                            >
                                                <MessageCircle size={16} />
                                                Contactar por WhatsApp
                                            </a>
                                        </div>
                                    );
                                })()}
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
