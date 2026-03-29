using GeekStore.Core.Entities;
using GeekStore.Core.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace GeekStore.Core.Interfaces
{
    public interface IProductReportRepository : IRepository<ProductReport>
    {
        Task<PagedResult<ProductReport>> GetPendingReportsAsync(int page, int pageSize);
        Task<bool> HasUserReportedProductAsync(int userId, int productId);
    }
}
