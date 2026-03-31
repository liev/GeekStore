using GoblinSpot.Core.Entities;
using GoblinSpot.Core.Interfaces;
using GoblinSpot.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace GoblinSpot.Infrastructure.Repositories
{
    public class DeliveryPointRepository : IDeliveryPointRepository
    {
        private readonly GoblinSpotDbContext _db;
        public DeliveryPointRepository(GoblinSpotDbContext db) { _db = db; }

        public async Task<IReadOnlyList<DeliveryPoint>> GetAllAsync() =>
            await _db.DeliveryPoints.ToListAsync();

        public async Task<DeliveryPoint?> GetByIdAsync(int id) =>
            await _db.DeliveryPoints.FindAsync(id);

        public async Task<DeliveryPoint> AddAsync(DeliveryPoint point)
        {
            _db.DeliveryPoints.Add(point);
            await _db.SaveChangesAsync();
            return point;
        }

        public async Task UpdateAsync(DeliveryPoint point)
        {
            _db.DeliveryPoints.Update(point);
            await _db.SaveChangesAsync();
        }
    }
}
