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
    /// EF Core implementation of IReviewRepository.
    /// </summary>
    public class ReviewRepository : Repository<Review>, IReviewRepository
    {
        public ReviewRepository(GeekStoreDbContext dbContext) : base(dbContext)
        {
        }

        /// <inheritdoc />
        public async Task<IReadOnlyList<Review>> GetBySellerIdAsync(int sellerId)
        {
            return await _dbContext.Reviews
                .Where(r => r.SellerId == sellerId)
                .Include(r => r.Reviewer)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();
        }

        /// <inheritdoc />
        public async Task<Review?> GetByReviewerAndSellerAsync(int reviewerId, int sellerId)
        {
            return await _dbContext.Reviews
                .FirstOrDefaultAsync(r => r.ReviewerId == reviewerId && r.SellerId == sellerId);
        }

        /// <inheritdoc />
        public async Task<(double AverageRating, int ReviewCount)> GetSellerRatingSummaryAsync(int sellerId)
        {
            var reviews = await _dbContext.Reviews
                .Where(r => r.SellerId == sellerId)
                .ToListAsync();

            if (reviews.Count == 0)
                return (0, 0);

            double average = reviews.Average(r => r.Rating);
            return (Math.Round(average, 1), reviews.Count);
        }
    }
}
