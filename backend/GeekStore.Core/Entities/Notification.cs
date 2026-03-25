using System;

namespace GeekStore.Core.Entities
{
    /// <summary>
    /// Represents an in-app notification for a user.
    /// Created automatically when order status changes, reviews are received, etc.
    /// </summary>
    public class Notification
    {
        public int Id { get; set; }

        /// <summary>The user who receives this notification.</summary>
        public int UserId { get; set; }
        public User? User { get; set; }

        /// <summary>Short title displayed in the notification bell dropdown.</summary>
        public string Title { get; set; } = string.Empty;

        /// <summary>Detailed message body.</summary>
        public string Message { get; set; } = string.Empty;

        /// <summary>
        /// Notification type: "OrderUpdate", "ReviewReceived", "System"
        /// </summary>
        public string Type { get; set; } = "System";

        /// <summary>Whether the user has read/acknowledged this notification.</summary>
        public bool IsRead { get; set; } = false;

        /// <summary>Optional reference to a related entity (orderId, reviewId, etc).</summary>
        public int? RelatedEntityId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
