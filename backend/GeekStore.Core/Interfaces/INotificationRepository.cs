using GoblinSpot.Core.Entities;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace GoblinSpot.Core.Interfaces
{
    /// <summary>
    /// Repository contract for in-app notification operations.
    /// </summary>
    public interface INotificationRepository : IRepository<Notification>
    {
        /// <summary>Returns all notifications for a user, newest first.</summary>
        Task<IReadOnlyList<Notification>> GetByUserIdAsync(int userId, int limit = 50);

        /// <summary>Returns the count of unread notifications for a user.</summary>
        Task<int> GetUnreadCountAsync(int userId);

        /// <summary>Marks a single notification as read.</summary>
        Task MarkAsReadAsync(int notificationId, int userId);

        /// <summary>Marks all notifications for a user as read.</summary>
        Task MarkAllAsReadAsync(int userId);
    }
}
