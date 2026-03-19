import { useEffect, useState } from 'react';
import { ordersApi, type Order } from '../api/client';
import { useNavigate } from 'react-router-dom';
import { Package, Clock, CheckCircle } from 'lucide-react';

export default function MyPurchases() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('geekstore_token');
        if (!token) {
            navigate('/login');
            return;
        }

        const fetchOrders = async () => {
            try {
                const data = await ordersApi.getMyPurchases(token);
                setOrders(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, [navigate]);

    return (
        <div className="min-h-screen p-4 sm:p-8 flex flex-col items-center">
            <header className="w-full max-w-4xl flex justify-between items-center mb-8 border-b border-slate-700 pb-4">
                <h1 className="text-3xl font-display font-black text-white flex items-center gap-3">
                    <Package className="text-neon-blue" size={32} /> MIS COMPRAS
                </h1>
                <button 
                    onClick={() => navigate('/')}
                    className="text-slate-400 hover:text-white transition-colors"
                >
                    Volver al Catálogo
                </button>
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
                                        <div className="flex items-center gap-2 md:justify-end mb-1">
                                            {order.status === 'Pending' ? <Clock size={16} className="text-yellow-500" /> : <CheckCircle size={16} className="text-green-500" />}
                                            <span className={`text-sm font-bold ${order.status === 'Pending' ? 'text-yellow-500' : 'text-green-500'}`}>
                                                {order.status}
                                            </span>
                                        </div>
                                        <p className="text-2xl font-display font-bold text-neon-blue">
                                            ₡{order.totalAmountCRC.toLocaleString('es-CR')}
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="space-y-3">
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
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
