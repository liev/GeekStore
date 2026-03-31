using GoblinSpot.Core.Entities;
using GoblinSpot.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace GoblinSpot.Api.Controllers
{
    /// <summary>DTO for creating or updating a seller review.</summary>
    public class CreateReviewDto
    {
        [Required]
        public int SellerId { get; set; }

        [Required]
        [Range(1, 5, ErrorMessage = "Rating debe ser entre 1 y 5.")]
        public int Rating { get; set; }

        [MaxLength(500)]
        public string Comment { get; set; } = string.Empty;
    }

    [ApiController]
    [Route("api/[controller]")]
    public class ReviewsController : ControllerBase
    {
        private readonly IReviewRepository _reviewRepository;
        private readonly IOrderRepository _orderRepository;
        private readonly IRepository<User> _userRepository;

        public ReviewsController(
            IReviewRepository reviewRepository,
            IOrderRepository orderRepository,
            IRepository<User> userRepository)
        {
            _reviewRepository = reviewRepository;
            _orderRepository = orderRepository;
            _userRepository = userRepository;
        }

        /// <summary>
        /// Create or update a review for a seller.
        /// Only buyers who have at least 1 order with that seller can review.
        /// </summary>
        [HttpPost]
        [Authorize]
        public async Task<IActionResult> CreateOrUpdateReview([FromBody] CreateReviewDto dto)
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdStr, out int reviewerId))
                return Unauthorized();

            if (reviewerId == dto.SellerId)
                return BadRequest("No puedes calificarte a ti mismo.");

            // Verify the seller exists
            var seller = await _userRepository.GetByIdAsync(dto.SellerId);
            if (seller == null)
                return NotFound("Vendedor no encontrado.");

            // Verify the reviewer has at least 1 order with this seller
            var buyerOrders = await _orderRepository.GetOrdersByBuyerAsync(reviewerId);
            bool hasPurchasedFromSeller = buyerOrders.Any(o => o.SellerId == dto.SellerId);
            if (!hasPurchasedFromSeller)
                return BadRequest("Solo puedes calificar a vendedores de los que hayas comprado.");

            // Check for existing review (upsert pattern)
            var existing = await _reviewRepository.GetByReviewerAndSellerAsync(reviewerId, dto.SellerId);
            if (existing != null)
            {
                existing.Rating = dto.Rating;
                existing.Comment = dto.Comment;
                existing.UpdatedAt = DateTime.UtcNow;
                await _reviewRepository.UpdateAsync(existing);
                return Ok(new { message = "Reseña actualizada exitosamente.", review = existing });
            }

            var review = new Review
            {
                ReviewerId = reviewerId,
                SellerId = dto.SellerId,
                Rating = dto.Rating,
                Comment = dto.Comment,
                CreatedAt = DateTime.UtcNow
            };

            await _reviewRepository.AddAsync(review);
            return Ok(new { message = "Reseña creada exitosamente.", review });
        }

        /// <summary>Returns all reviews for a given seller.</summary>
        [HttpGet("seller/{sellerId}")]
        public async Task<IActionResult> GetSellerReviews(int sellerId)
        {
            var reviews = await _reviewRepository.GetBySellerIdAsync(sellerId);

            var result = reviews.Select(r => new
            {
                r.Id,
                r.Rating,
                r.Comment,
                r.CreatedAt,
                r.UpdatedAt,
                reviewerNickname = r.Reviewer?.Nickname ?? "Anónimo",
                reviewerId = r.ReviewerId
            });

            return Ok(result);
        }

        /// <summary>Returns the average rating and count for a seller.</summary>
        [HttpGet("seller/{sellerId}/summary")]
        public async Task<IActionResult> GetSellerRatingSummary(int sellerId)
        {
            var (averageRating, reviewCount) = await _reviewRepository.GetSellerRatingSummaryAsync(sellerId);
            return Ok(new { averageRating, reviewCount });
        }
    }
}
