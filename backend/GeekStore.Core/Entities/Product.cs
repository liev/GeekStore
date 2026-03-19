using System;
using System.ComponentModel.DataAnnotations;

namespace GeekStore.Core.Entities
{
    public class Product
    {
        public int Id { get; set; }
        
        // The individual seller who owns this product
        public int SellerId { get; set; }
        public User? Seller { get; set; }
        
        // Proper Foreign Key to the Category tree
        public int? CategoryId { get; set; }
        
        [System.Text.Json.Serialization.JsonIgnore]
        public Category? CategoryEntity { get; set; }
        
        // Removed `public string Category`
        
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal PriceCRC { get; set; }
        public string ImageUrl { get; set; } = string.Empty;
        public string ImageUrl2 { get; set; } = string.Empty;
        public string ImageUrl3 { get; set; } = string.Empty;
        
        // "Available", "Sold", "Suspended"
        public string StockStatus { get; set; } = "Available";
        
        [ConcurrencyCheck]
        public int StockCount { get; set; } = 1;

        // TCG standard condition: "M" (Mint), "NM" (Near Mint), "LP" (Light Played),
        // "MP" (Moderately Played), "HP" (Heavily Played), "DMG" (Damaged)
        public string Condition { get; set; } = "NM";

        // Which exchange point is preferred (optional)
        public int? PreferredDeliveryPointId { get; set; }
        public DeliveryPoint? PreferredDeliveryPoint { get; set; }
        
        // Metrics for Admin Dashboard
        public int CartAdditionCount { get; set; } = 0;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
