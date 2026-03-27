using System;
using System.ComponentModel.DataAnnotations;

namespace GeekStore.Core.Entities
{
    public class Refund
    {
        public int Id { get; set; }

        public int DisputeId { get; set; }
        public Dispute? Dispute { get; set; }

        /// <summary>The user who should receive the refund (typically the buyer).</summary>
        public int BeneficiaryUserId { get; set; }
        public User? BeneficiaryUser { get; set; }

        public decimal Amount { get; set; }

        /// <summary>Pending | Processed | Rejected</summary>
        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "Pending";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? ProcessedAt { get; set; }

        [MaxLength(500)]
        public string? Notes { get; set; }
    }
}
