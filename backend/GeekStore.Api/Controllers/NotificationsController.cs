using GeekStore.Core.Entities;
using GeekStore.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Threading.Tasks;

namespace GeekStore.Api.Controllers
{
    /// <summary>
    /// Manages in-app notifications for authenticated users.
    /// Supports fetching, unread count, and marking as read.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class NotificationsController : ControllerBase
    {
        private readonly INotificationRepository _notificationRepository;

        public NotificationsController(INotificationRepository notificationRepository)
        {
            _notificationRepository = notificationRepository;
        }

        /// <summary>
        /// GET /api/notifications
        /// Returns up to 50 recent notifications for the authenticated user.
        /// </summary>
        [HttpGet]
        public async Task<ActionResult> GetMyNotifications()
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdStr, out int userId))
                return Unauthorized();

            var notifications = await _notificationRepository.GetByUserIdAsync(userId);
            return Ok(notifications);
        }

        /// <summary>
        /// GET /api/notifications/unread-count
        /// Returns the count of unread notifications for badge display.
        /// </summary>
        [HttpGet("unread-count")]
        public async Task<ActionResult> GetUnreadCount()
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdStr, out int userId))
                return Unauthorized();

            var count = await _notificationRepository.GetUnreadCountAsync(userId);
            return Ok(new { count });
        }

        /// <summary>
        /// PUT /api/notifications/{id}/read
        /// Marks a single notification as read.
        /// </summary>
        [HttpPut("{id}/read")]
        public async Task<ActionResult> MarkAsRead(int id)
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdStr, out int userId))
                return Unauthorized();

            await _notificationRepository.MarkAsReadAsync(id, userId);
            return Ok(new { message = "Notificación marcada como leída" });
        }

        /// <summary>
        /// PUT /api/notifications/read-all
        /// Marks all notifications for the authenticated user as read.
        /// </summary>
        [HttpPut("read-all")]
        public async Task<ActionResult> MarkAllAsRead()
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdStr, out int userId))
                return Unauthorized();

            await _notificationRepository.MarkAllAsReadAsync(userId);
            return Ok(new { message = "Todas las notificaciones marcadas como leídas" });
        }
    }
}
