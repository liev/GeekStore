using GeekStore.Core.Entities;
using GeekStore.Core.Interfaces;
using GeekStore.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace GeekStore.Infrastructure.Repositories
{
    public class ProductRepository : Repository<Product>, IProductRepository
    {
        public ProductRepository(GeekStoreDbContext dbContext) : base(dbContext)
        {
        }

        public async Task<IReadOnlyList<Product>> GetProductsBySellerAsync(int sellerId)
        {
            return await _dbContext.Products
                .Include(p => p.Seller)
                .Include(p => p.PreferredDeliveryPoint)
                .Where(p => p.SellerId == sellerId)
                .ToListAsync();
        }

        public async Task<IReadOnlyList<Product>> GetAvailableProductsAsync()
        {
            return await _dbContext.Products
                .Include(p => p.Seller)
                .Include(p => p.PreferredDeliveryPoint)
                .Where(p => p.StockStatus == "Available")
                .ToListAsync();
        }
    }
}
