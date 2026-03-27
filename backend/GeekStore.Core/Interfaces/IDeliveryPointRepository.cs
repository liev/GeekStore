using GeekStore.Core.Entities;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace GeekStore.Core.Interfaces
{
    public interface IDeliveryPointRepository
    {
        Task<IReadOnlyList<DeliveryPoint>> GetAllAsync();
        Task<DeliveryPoint?> GetByIdAsync(int id);
        Task<DeliveryPoint> AddAsync(DeliveryPoint point);
        Task UpdateAsync(DeliveryPoint point);
    }
}
