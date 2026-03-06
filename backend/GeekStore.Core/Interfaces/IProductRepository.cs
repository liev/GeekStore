using GeekStore.Core.Entities;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace GeekStore.Core.Interfaces
{
    public interface IProductRepository : IRepository<Product>
    {
        Task<IReadOnlyList<Product>> GetProductsBySellerAsync(int sellerId);
        Task<IReadOnlyList<Product>> GetAvailableProductsAsync();
    }
}
