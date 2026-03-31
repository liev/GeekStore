using System;

namespace GoblinSpot.Core.Entities
{
    /// <summary>
    /// Represents a buyer's review of a seller (1-5 stars + optional comment).
    /// One review per buyer-seller pair is allowed; updates overwrite the existing one.
    /// </summary>
    public class Review
    {
        public int Id { get; set; }

        /// <summary>FK to the buyer who writes the review.</summary>
        public int ReviewerId { get; set; }
        public User? Reviewer { get; set; }

        /// <summary>FK to the seller being reviewed.</summary>
        public int SellerId { get; set; }
        public User? Seller { get; set; }

        /// <summary>Star rating, constrained to 1-5.</summary>
        public int Rating { get; set; }

        /// <summary>Optional free-text comment from the buyer.</summary>
        public string Comment { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }
}
