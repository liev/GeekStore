using GoblinSpot.Core.Entities;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace GoblinSpot.Core.Interfaces
{
    public interface IDeliveryPointRepository
    {
        Task<IReadOnlyList<DeliveryPoint>> GetAllAsync();
        Task<DeliveryPoint?> GetByIdAsync(int id);
        Task<DeliveryPoint> AddAsync(DeliveryPoint point);
        Task UpdateAsync(DeliveryPoint point);
    }
}
