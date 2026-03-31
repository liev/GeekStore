using GoblinSpot.Core.Entities;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace GoblinSpot.Core.Interfaces
{
    public interface IUserFollowRepository : IRepository<UserFollow>
    {
        Task<bool> IsFollowingAsync(int followerId, int followedId);
        Task<IReadOnlyList<UserFollow>> GetFollowingAsync(int followerId);
    }
}
