using GeekStore.Core.Entities;
using GeekStore.Core.Interfaces;
using GeekStore.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace GeekStore.Infrastructure.Repositories
{
    public class UserFollowRepository : Repository<UserFollow>, IUserFollowRepository
    {
        public UserFollowRepository(GeekStoreDbContext dbContext) : base(dbContext)
        {
        }

        public async Task<bool> IsFollowingAsync(int followerId, int followedId)
        {
            return await _dbContext.UserFollows
                .AnyAsync(uf => uf.FollowerId == followerId && uf.FollowedId == followedId);
        }

        public async Task<IReadOnlyList<UserFollow>> GetFollowingAsync(int followerId)
        {
            return await _dbContext.UserFollows
                .Include(uf => uf.Followed)
                .Where(uf => uf.FollowerId == followerId)
                .ToListAsync();
        }
    }
}
