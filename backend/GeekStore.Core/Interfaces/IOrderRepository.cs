using GeekStore.Core.Entities;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace GeekStore.Core.Interfaces
{
    public interface IOrderRepository : IRepository<Order>
    {
        Task<Order> CreateOrderWithItemsAsync(Order order, IEnumerable<OrderItem> items);
        Task<IReadOnlyList<Order>> GetOrdersByBuyerAsync(int buyerId);
        Task<IReadOnlyList<Order>> GetOrdersBySellerAsync(int sellerId);
        Task<Order?> GetOrderByIdAsync(int id);
    }
}
