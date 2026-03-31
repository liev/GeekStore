using GoblinSpot.Core.Entities;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace GoblinSpot.Core.Interfaces
{
    /// <summary>
    /// Repository contract for seller review operations.
    /// </summary>
    public interface IReviewRepository : IRepository<Review>
    {
        /// <summary>Returns all reviews for a given seller, including reviewer info.</summary>
        Task<IReadOnlyList<Review>> GetBySellerIdAsync(int sellerId);

        /// <summary>Returns the existing review from a specific reviewer to a specific seller, or null.</summary>
        Task<Review?> GetByReviewerAndSellerAsync(int reviewerId, int sellerId);

        /// <summary>Returns the average rating and total review count for a seller.</summary>
        Task<(double AverageRating, int ReviewCount)> GetSellerRatingSummaryAsync(int sellerId);
    }
}
