using GoblinSpot.Core.Entities;
using GoblinSpot.Core.Interfaces;
using GoblinSpot.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace GoblinSpot.Infrastructure.Repositories
{
    public class OrderRepository : Repository<Order>, IOrderRepository
    {
        public OrderRepository(GoblinSpotDbContext dbContext) : base(dbContext)
        {
        }

        public async Task<Order> CreateOrderWithItemsAsync(Order order, IEnumerable<OrderItem> items)
        {
            using var transaction = await _dbContext.Database.BeginTransactionAsync();
            try
            {
                // 1. Add the Order
                _dbContext.Orders.Add(order);
                await _dbContext.SaveChangesAsync(); // Gets the new Order.Id

                // 2. Add Items and Deduct Stock
                foreach (var item in items)
                {
                    item.OrderId = order.Id;
                    _dbContext.OrderItems.Add(item);

                    // Deduct stock
                    var product = await _dbContext.Products.FindAsync(item.ProductId);
                    if (product != null)
                    {
                        if (product.StockCount < item.Quantity)
                            throw new Exception($"Stock insuficiente para el producto {product.Name}");

                        product.StockCount -= item.Quantity;
                        if (product.StockCount == 0)
                        {
                            product.StockStatus = "Sold";
                        }
                        
                        _dbContext.Products.Update(product);
                    }
                }

                await _dbContext.SaveChangesAsync();
                await transaction.CommitAsync();

                return order;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<IReadOnlyList<Order>> GetOrdersByBuyerAsync(int buyerId)
        {
            return await _dbContext.Orders
                .Include(o => o.Seller)
                .Include(o => o.Items)
                    .ThenInclude(i => i.Product)
                .Where(o => o.BuyerId == buyerId)
                .OrderByDescending(o => o.OrderDate)
                .ToListAsync();
        }

        public async Task<IReadOnlyList<Order>> GetOrdersBySellerAsync(int sellerId)
        {
            return await _dbContext.Orders
                .Include(o => o.Buyer)
                .Include(o => o.Items)
                    .ThenInclude(i => i.Product)
                .Where(o => o.SellerId == sellerId)
                .OrderByDescending(o => o.OrderDate)
                .ToListAsync();
        }

        public async Task<Order?> GetOrderByIdAsync(int id)
        {
            return await _dbContext.Orders
                .Include(o => o.Buyer)
                .Include(o => o.Seller)
                .Include(o => o.DeliveryPoint)
                .Include(o => o.Items)
                    .ThenInclude(i => i.Product)
                .FirstOrDefaultAsync(o => o.Id == id);
        }
    }
}
