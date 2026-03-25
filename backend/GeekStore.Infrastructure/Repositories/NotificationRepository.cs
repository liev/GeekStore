using GeekStore.Core.Entities;
using GeekStore.Core.Interfaces;
using GeekStore.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace GeekStore.Infrastructure.Repositories
{
    /// <summary>
    /// EF Core implementation of INotificationRepository.
    /// </summary>
    public class NotificationRepository : Repository<Notification>, INotificationRepository
    {
        public NotificationRepository(GeekStoreDbContext dbContext) : base(dbContext)
        {
        }

        /// <inheritdoc />
        public async Task<IReadOnlyList<Notification>> GetByUserIdAsync(int userId, int limit = 50)
        {
            return await _dbContext.Notifications
                .Where(n => n.UserId == userId)
                .OrderByDescending(n => n.CreatedAt)
                .Take(limit)
                .ToListAsync();
        }

        /// <inheritdoc />
        public async Task<int> GetUnreadCountAsync(int userId)
        {
            return await _dbContext.Notifications
                .CountAsync(n => n.UserId == userId && !n.IsRead);
        }

        /// <inheritdoc />
        public async Task MarkAsReadAsync(int notificationId, int userId)
        {
            var notification = await _dbContext.Notifications
                .FirstOrDefaultAsync(n => n.Id == notificationId && n.UserId == userId);

            if (notification != null)
            {
                notification.IsRead = true;
                await _dbContext.SaveChangesAsync();
            }
        }

        /// <inheritdoc />
        public async Task MarkAllAsReadAsync(int userId)
        {
            var unread = await _dbContext.Notifications
                .Where(n => n.UserId == userId && !n.IsRead)
                .ToListAsync();

            foreach (var n in unread)
            {
                n.IsRead = true;
            }

            await _dbContext.SaveChangesAsync();
        }
    }
}
