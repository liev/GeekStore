using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GoblinSpot.Core.Entities
{
    public class Dispute
    {
        [Key]
        public int Id { get; set; }

        public int OrderId { get; set; }
        public Order? Order { get; set; }

        public int InitiatorUserId { get; set; }
        public User? InitiatorUser { get; set; }

        public int TargetUserId { get; set; }
        public User? TargetUser { get; set; }

        [Required]
        [MaxLength(1000)]
        public string Reason { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "Open";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [MaxLength(1000)]
        public string? AdminResolution { get; set; }

        /// <summary>Set when dispute is resolved — used to enforce the 48h appeal window.</summary>
        public DateTime? ResolvedAt { get; set; }
    }
}
