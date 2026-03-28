using System.ComponentModel.DataAnnotations;

namespace GeekStore.Core.Entities
{
    public class ProductReport
    {
        [Key]
        public int Id { get; set; }

        public int ProductId { get; set; }
        public Product? Product { get; set; }

        public int ReporterUserId { get; set; }
        public User? ReporterUser { get; set; }

        [Required]
        [MaxLength(100)]
        public string ReasonCategory { get; set; } = string.Empty; // Spam | Fake | Inappropriate | Counterfeit | Other

        [MaxLength(1000)]
        public string? Details { get; set; }

        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "Pending"; // Pending | Reviewed | Dismissed

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ReviewedAt { get; set; }

        [MaxLength(500)]
        public string? AdminNotes { get; set; }
    }
}
