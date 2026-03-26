using GeekStore.Core.Entities;
using GeekStore.Core.Interfaces;
using GeekStore.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace GeekStore.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    // [Authorize(Roles = "Admin")] // Kept simplified for now, as asked
    [Authorize]
    public class AdminController : ControllerBase
    {
        private readonly GeekStoreDbContext _context;
        private readonly INotificationRepository _notificationRepo;

        public AdminController(GeekStoreDbContext context, INotificationRepository notificationRepo)
        {
            _context = context;
            _notificationRepo = notificationRepo;
        }

        [HttpGet("users")]
        public async Task<ActionResult<IEnumerable<User>>> GetUsers()
        {
            var users = await _context.Users.OrderByDescending(u => u.Id).ToListAsync();
            return Ok(users);
        }

        [HttpPut("users/{id}/toggle-ban")]
        public async Task<IActionResult> ToggleBanState(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound();

            user.IsActive = !user.IsActive;

            // If banned, hide all their products
            if (!user.IsActive)
            {
                var products = await _context.Products.Where(p => p.SellerId == id).ToListAsync();
                foreach (var p in products) p.IsActive = false;
            }

            await _context.SaveChangesAsync();
            return Ok(user);
        }

        public class GrantPlanRequest
        {
            public string Plan { get; set; } = "Licencia Mercante";
            public System.DateTime? EndDate { get; set; }
        }

        [HttpPost("users/{id}/grant-plan")]
        public async Task<IActionResult> GrantPlan(int id, [FromBody] GrantPlanRequest request)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound();

            user.Role = "Seller";
            user.SubscriptionPlan = request.Plan;
            user.SubscriptionEndDate = request.EndDate;
            user.AutoRenew = false;
            
            // Unban if banned
            if (!user.IsActive)
            {
                user.IsActive = true;
                // Reactivate products
                var products = await _context.Products.Where(p => p.SellerId == id).ToListAsync();
                foreach (var p in products) p.IsActive = true;
            }

            await _context.SaveChangesAsync();
            return Ok(user);
        }

        public class UpdateFeeRequest
        {
            public decimal NewFee { get; set; }
        }

        [HttpPut("settings/fees")]
        public async Task<IActionResult> UpdateSellerFee([FromBody] UpdateFeeRequest request)
        {
            var feeSetting = await _context.SystemSettings.FirstOrDefaultAsync(s => s.Key == "SellerMonthlyFee");
            decimal oldFee = 0;
            if (feeSetting == null)
            {
                feeSetting = new SystemSetting { Key = "SellerMonthlyFee", Value = request.NewFee.ToString() };
                _context.SystemSettings.Add(feeSetting);
            }
            else
            {
                if (!decimal.TryParse(feeSetting.Value, out oldFee)) oldFee = 0;
                feeSetting.Value = request.NewFee.ToString();
            }

            // Notification to all sellers if fee increased
            if (request.NewFee > oldFee)
            {
                var sellers = await _context.Users.Where(u => u.Role == "Seller").ToListAsync();
                foreach (var seller in sellers)
                {
                    await _notificationRepo.AddAsync(new Notification
                    {
                        UserId = seller.Id,
                        Title = "Actualización de Tarifas del Gremio",
                        Message = $"Saludos. El coste del Contrato Mercantil ha cambiado a ₡{request.NewFee}. Este cambio aplicará en tu próxima renovación.",
                        Type = "System"
                    });
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new { Fee = request.NewFee });
        }

        public class ModerationRequest
        {
            public string Reason { get; set; } = string.Empty;
        }

        [HttpPost("users/{id}/warn")]
        public async Task<IActionResult> WarnUser(int id, [FromBody] ModerationRequest request)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound();

            await _notificationRepo.AddAsync(new Notification
            {
                UserId = id,
                Title = "Advertencia de la Administración",
                Message = request.Reason,
                Type = "Alert"
            });

            await _context.SaveChangesAsync();
            return Ok(new { message = "Warning sent." });
        }

        [HttpDelete("products/{id}")]
        public async Task<IActionResult> ModerateProduct(int id, [FromBody] ModerationRequest request)
        {
            var product = await _context.Products.FindAsync(id);
            if (product == null) return NotFound();

            product.IsActive = false;
            
            await _notificationRepo.AddAsync(new Notification
            {
                UserId = product.SellerId,
                Title = "Reporte de Inquisición",
                Message = $"Tu artículo '{product.Name}' ha sido confiscado del mercado. Razón: {request.Reason}",
                Type = "Alert"
            });

            await _context.SaveChangesAsync();
            return Ok(new { message = "Product soft-deleted and seller notified." });
        }

        [HttpGet("reviews")]
        public async Task<IActionResult> GetAllReviews()
        {
            var reviews = await _context.Reviews
                .Include(r => r.Seller)
                .Include(r => r.Reviewer)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new {
                    id = r.Id,
                    rating = r.Rating,
                    comment = r.Comment,
                    createdAt = r.CreatedAt,
                    sellerId = r.SellerId,
                    sellerNickname = r.Seller!.Nickname,
                    reviewerId = r.ReviewerId,
                    reviewerNickname = r.Reviewer!.Nickname
                })
                .ToListAsync();

            return Ok(reviews);
        }

        [HttpDelete("reviews/{id}")]
        public async Task<IActionResult> DeleteReview(int id)
        {
            var review = await _context.Reviews.FindAsync(id);
            if (review == null) return NotFound();

            _context.Reviews.Remove(review);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
