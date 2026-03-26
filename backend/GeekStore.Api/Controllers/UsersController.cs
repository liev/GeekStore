using GeekStore.Core.Entities;
using GeekStore.Core.Interfaces;
using GeekStore.Core.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace GeekStore.Api.Controllers
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

        public UsersController(
            IRepository<User> userRepository, 
            IUserFollowRepository userFollowRepository,
            IProductRepository productRepository)
        {
            _userRepository = userRepository;
            _userFollowRepository = userFollowRepository;
            _productRepository = productRepository;
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
                PhoneNumber = user.PhoneNumber,
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

            // PayPal verification would happen here. Assumed successful for MVP.
            user.Role = "Seller";
            user.SubscriptionPlan = request.Plan;
            user.SubscriptionEndDate = System.DateTime.UtcNow.AddDays(30);
            user.AutoRenew = true;
            user.IsActive = true; 

            await _userRepository.UpdateAsync(user);

            return Ok(new { message = "¡Felicidades! Ahora tienes Licencia de Vendedor." });
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
    }
}
