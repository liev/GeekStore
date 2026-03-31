using GoblinSpot.Core.Entities;
using GoblinSpot.Core.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace GoblinSpot.Core.Interfaces
{
    public interface IProductRepository : IRepository<Product>
    {
        Task<IReadOnlyList<Product>> GetProductsBySellerAsync(int sellerId);
        Task<IReadOnlyList<Product>> GetAvailableProductsAsync();
        Task<PagedResult<Product>> GetFilteredProductsAsync(ProductQueryParams query);
        Task<PagedResult<Product>> GetProductsBySellersAsync(IReadOnlyList<int> sellerIds, int page, int pageSize);
    }
}
