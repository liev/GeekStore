using GeekStore.Core.Entities;
using GeekStore.Core.Interfaces;
using GeekStore.Core.Models;
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
                .Where(p => p.StockStatus == "Available" && p.Seller != null && p.Seller.IsActive && p.IsActive)
                .ToListAsync();
        }

        public async Task<PagedResult<Product>> GetFilteredProductsAsync(ProductQueryParams query)
        {
            var queryable = _dbContext.Products
                .Include(p => p.Seller)
                .Include(p => p.PreferredDeliveryPoint)
                .Include(p => p.CategoryEntity)
                .Where(p => p.StockStatus == "Available" && p.Seller != null && p.Seller.IsActive && p.IsActive)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(query.Search))
            {
                var lowerSearch = query.Search.ToLower();
                queryable = queryable.Where(p => p.Name.ToLower().Contains(lowerSearch));
            }

            if (query.CategoryId.HasValue)
            {
                var categoryIds = await _dbContext.Categories
                    .Where(c => c.Id == query.CategoryId.Value || c.ParentId == query.CategoryId.Value)
                    .Select(c => c.Id)
                    .ToListAsync();
                queryable = queryable.Where(p => p.CategoryId.HasValue && categoryIds.Contains(p.CategoryId.Value));
            }

            if (!string.IsNullOrWhiteSpace(query.Condition))
            {
                queryable = queryable.Where(p => p.Condition == query.Condition);
            }

            if (query.MinPrice.HasValue)
            {
                queryable = queryable.Where(p => p.PriceCRC >= query.MinPrice.Value);
            }

            if (query.MaxPrice.HasValue)
            {
                queryable = queryable.Where(p => p.PriceCRC <= query.MaxPrice.Value);
            }

            // Get total count for pagination math
            var totalCount = await queryable.CountAsync();

            // Always order by Id desc (newest first) to ensure stable pagination
            queryable = queryable.OrderByDescending(p => p.Id);

            var items = await queryable
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .ToListAsync();

            return new PagedResult<Product>
            {
                Items = items,
                TotalCount = totalCount,
                Page = query.Page,
                PageSize = query.PageSize
            };
        }

        public async Task<PagedResult<Product>> GetProductsBySellersAsync(IReadOnlyList<int> sellerIds, int page, int pageSize)
        {
            var queryable = _dbContext.Products
                .Include(p => p.Seller)
                .Include(p => p.PreferredDeliveryPoint)
                .Include(p => p.CategoryEntity)
                .Where(p => p.StockStatus == "Available" && p.StockCount > 0 && p.Seller != null && p.Seller.IsActive && p.IsActive)
                .Where(p => sellerIds.Contains(p.SellerId));

            var totalCount = await queryable.CountAsync();

            var items = await queryable
                .OrderByDescending(p => p.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new PagedResult<Product>
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            };
        }
    }
}
