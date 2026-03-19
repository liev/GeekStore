using System;
using System.Collections.Generic;

namespace GeekStore.Core.Models
{
    public class AdminInventoryStatsDto
    {
        public List<SellerStatDto> Sellers { get; set; } = new();
        public int TotalProducts { get; set; }
        public int TotalCartAdditions { get; set; }
    }

    public class SellerStatDto
    {
        public int SellerId { get; set; }
        public string SellerName { get; set; } = string.Empty;
        public List<ProductStatDto> Products { get; set; } = new();
        public decimal? MonthlyFee { get; set; }
        public string? Benefits { get; set; }
    }

    public class ProductStatDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public int CartAdditionCount { get; set; }
        public string Status { get; set; } = string.Empty;
        public int DaysOld { get; set; }
    }

    public class SellerAIAnalysisDto
    {
        public List<SellerRecommendationDto> Recommendations { get; set; } = new();
        public string GlobalSummary { get; set; } = string.Empty;
    }

    public class SellerRecommendationDto
    {
        public int SellerId { get; set; }
        public string SellerName { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty; // "Best", "Inactive", "Incentivize"
        public string Reason { get; set; } = string.Empty;
        public string SuggestedBenefits { get; set; } = string.Empty;
    }
}
