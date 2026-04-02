using GoblinSpot.Core.Constants;
using GoblinSpot.Core.Entities;
using GoblinSpot.Core.Interfaces;
using GoblinSpot.Core.Models;
using GoblinSpot.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace GoblinSpot.Api.Controllers
{
    public class UpgradeToSellerDto
    {
        public string OrderId { get; set; } = string.Empty;
        public string Plan { get; set; } = "Licencia Mercante";
    }

    public class UpdateProfileDto
    {
        public string? PhoneNumber { get; set; }
    }

    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly IRepository<User> _userRepository;
        private readonly IUserFollowRepository _userFollowRepository;
        private readonly IProductRepository _productRepository;
        private readonly IPayPalService _payPalService;
        private readonly GoblinSpotDbContext _context;
        private readonly ILogger<UsersController> _logger;

        public UsersController(
            IRepository<User> userRepository,
            IUserFollowRepository userFollowRepository,
            IProductRepository productRepository,
            IPayPalService payPalService,
            GoblinSpotDbContext context,
            ILogger<UsersController> logger)
        {
            _userRepository = userRepository;
            _userFollowRepository = userFollowRepository;
            _productRepository = productRepository;
            _payPalService = payPalService;
            _context = context;
            _logger = logger;
        }

        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> GetMe()
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdStr, out int userId)) return Unauthorized();

            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null) return NotFound("User not found.");

            return Ok(new
            {
                user.Id,
                user.Name,
                user.Surname,
                user.Nickname,
                user.Email,
                user.Role,
                user.IsActive,
                user.SubscriptionPlan,
                user.SubscriptionEndDate,
                user.AutoRenew
            });
        }

        [HttpGet("{id}/profile")]
        public async Task<ActionResult<UserProfileDto>> GetProfile(int id)
        {
            var user = await _userRepository.GetByIdAsync(id);
            if (user == null)
                return NotFound();

            bool isFollowing = false;
            if (User.Identity?.IsAuthenticated == true)
            {
                var currentUserIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (int.TryParse(currentUserIdStr, out int currentUserId))
                {
                    isFollowing = await _userFollowRepository.IsFollowingAsync(currentUserId, id);
                }
            }

            var products = await _productRepository.GetProductsBySellerAsync(id);
            int activeProducts = products.Count(p => p.StockStatus == "Available" && p.StockCount > 0);

            return Ok(new UserProfileDto
            {
                Id = user.Id,
                Nickname = user.Nickname,
                Email = user.Email,
                PhoneNumber = User.Identity?.IsAuthenticated == true ? user.PhoneNumber : null,
                TotalActiveProducts = activeProducts,
                IsFollowing = isFollowing
            });
        }

        [HttpPost("{id}/follow")]
        [Authorize]
        public async Task<IActionResult> FollowUser(int id)
        {
            var followerIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(followerIdStr, out int followerId)) return Unauthorized();

            if (followerId == id) return BadRequest("Cannot follow yourself.");

            var followedUser = await _userRepository.GetByIdAsync(id);
            if (followedUser == null) return NotFound("User not found.");

            bool alreadyFollowing = await _userFollowRepository.IsFollowingAsync(followerId, id);
            if (alreadyFollowing) return Ok(new { message = "Already following" });

            await _userFollowRepository.AddAsync(new UserFollow
            {
                FollowerId = followerId,
                FollowedId = id
            });

            return Ok(new { message = "Successfully followed user." });
        }

        [HttpDelete("{id}/unfollow")]
        [Authorize]
        public async Task<IActionResult> UnfollowUser(int id)
        {
            var followerIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(followerIdStr, out int followerId)) return Unauthorized();

            var follows = await _userFollowRepository.GetFollowingAsync(followerId);
            var followRelation = follows.FirstOrDefault(f => f.FollowedId == id);
            
            if (followRelation == null) return Ok(new { message = "Not following this user." });

            await _userFollowRepository.DeleteAsync(followRelation);
            return Ok(new { message = "Successfully unfollowed user." });
        }

        [HttpPost("upgrade-to-seller")]
        [Authorize]
        public async Task<IActionResult> UpgradeToSeller([FromBody] UpgradeToSellerDto request)
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdStr, out int userId)) return Unauthorized();

            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null) return NotFound("User not found.");

            // Validate plan
            if (!SubscriptionPlans.IsValid(request.Plan))
                return BadRequest(new { message = "Plan no reconocido." });

            var planInfo = SubscriptionPlans.Catalog[request.Plan];

            // Resolve actual price (Worker founder logic)
            decimal crcPrice = planInfo.CrcPrice;
            decimal usdPrice = planInfo.UsdPrice;
            bool isFounder = false;

            if (request.Plan == SubscriptionPlans.Worker)
            {
                var now = DateTime.UtcNow;
                var activeWorkers = await _context.Users.CountAsync(u =>
                    u.SubscriptionPlan == SubscriptionPlans.Worker &&
                    u.SubscriptionEndDate.HasValue &&
                    u.SubscriptionEndDate.Value > now);

                if (activeWorkers < SubscriptionPlans.WorkerFounderLimit)
                {
                    crcPrice = SubscriptionPlans.WorkerFounderCrc;
                    usdPrice = SubscriptionPlans.WorkerFounderUsd;
                    isFounder = true;
                }
                else
                {
                    crcPrice = SubscriptionPlans.WorkerRegularCrc;
                    usdPrice = SubscriptionPlans.WorkerRegularUsd;
                }
            }

            // Verify PayPal order
            if (string.IsNullOrWhiteSpace(request.OrderId))
                return BadRequest(new { message = "Se requiere un OrderId de PayPal válido." });

            var paypalVerified = await _payPalService.VerifyOrderAsync(request.OrderId);
            if (!paypalVerified)
            {
                _logger.LogWarning("PayPal order {OrderId} verification failed for user {UserId}", request.OrderId, userId);
                return BadRequest(new { message = "No se pudo verificar el pago con PayPal. Intenta de nuevo o contacta soporte." });
            }

            // El rol es el nombre del plan de suscripción (ej. "Goblin Worker")
            user.Role = request.Plan;
            user.SubscriptionPlan = request.Plan;
            user.MonthlyFee = crcPrice;          // Store actual CRC price (preserves founder rate)
            user.SubscriptionEndDate = DateTime.UtcNow.AddDays(30);
            user.AutoRenew = true;
            user.IsActive = true;

            await _userRepository.UpdateAsync(user);

            var msg = isFounder
                ? $"¡Felicidades! Eres Goblin Fundador con precio de ₡{crcPrice:N0}/mes de por vida."
                : $"¡Bienvenido al Gremio! Tu plan {request.Plan} está activo.";

            return Ok(new { message = msg, plan = request.Plan, crcPrice, isFounder });
        }

        [HttpPost("cancel-subscription")]
        [Authorize]
        public async Task<IActionResult> CancelSubscription()
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdStr, out int userId)) return Unauthorized();

            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null) return NotFound("User not found.");

            user.AutoRenew = false;
            
            await _userRepository.UpdateAsync(user);

            return Ok(new { message = "Alerta: Tu auto-renovación ha sido cancelada. Tu plan actual se mantendrá hasta su fecha de vencimiento." });
        }

        [HttpPut("profile")]
        [Authorize]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto request)
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdStr, out int userId)) return Unauthorized();

            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null) return NotFound("User not found.");

            user.PhoneNumber = request.PhoneNumber;
            
            await _userRepository.UpdateAsync(user);
            return Ok(new { message = "Perfil actualizado exitosamente." });
        }
        [HttpDelete("me")]
        [Authorize]
        public async Task<IActionResult> DeleteMe()
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdStr, out int userId)) return Unauthorized();

            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null) return NotFound("User not found.");

            user.IsActive = false;
            user.AutoRenew = false;
            user.SubscriptionPlan = "Deleted";
            
            // Hide all products
            var products = await _productRepository.GetProductsBySellerAsync(userId);
            foreach (var p in products)
            {
                p.IsActive = false;
            }

            await _userRepository.UpdateAsync(user);
            return Ok(new { message = "Cuenta cerrada exitosamente. Todos tus productos han sido ocultados." });
        }
    }
}
