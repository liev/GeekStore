using System;

namespace GoblinSpot.Core.Models
{
    public class CreateProductReportRequest
    {
        public string ReasonCategory { get; set; } = string.Empty;
        public string? Details { get; set; }
    }

    public class ProductReportDto
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public int ReporterUserId { get; set; }
        public string ReporterName { get; set; } = string.Empty;
        public string ReasonCategory { get; set; } = string.Empty;
        public string? Details { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class ResolveProductReportRequest
    {
        public string? AdminNotes { get; set; }
    }
}
