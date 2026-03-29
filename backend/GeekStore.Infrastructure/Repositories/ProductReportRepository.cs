using GeekStore.Core.Entities;
using GeekStore.Core.Interfaces;
using GeekStore.Core.Models;
using GeekStore.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Threading.Tasks;

namespace GeekStore.Infrastructure.Repositories
{
    public class ProductReportRepository : Repository<ProductReport>, IProductReportRepository
    {
        public ProductReportRepository(GeekStoreDbContext dbContext) : base(dbContext)
        {
        }

        public async Task<PagedResult<ProductReport>> GetPendingReportsAsync(int page, int pageSize)
        {
            var query = _dbContext.ProductReports
                .Include(r => r.Product)
                .Include(r => r.ReporterUser)
                .Where(r => r.Status == "Pending");

            var totalCount = await query.CountAsync();

            var items = await query
                .OrderByDescending(r => r.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new PagedResult<ProductReport>
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<bool> HasUserReportedProductAsync(int userId, int productId)
        {
            return await _dbContext.ProductReports
                .AnyAsync(r => r.ReporterUserId == userId && r.ProductId == productId);
        }
    }
}
