using System;

namespace GeekStore.Core.Entities
{
    public class Product
    {
        public int Id { get; set; }
        
        // The individual seller who owns this product
        public int SellerId { get; set; }
        public User? Seller { get; set; }
        
        // e.g. "Magic", "Pokemon", "Figures", "MoxfieldDeck"
        public string Category { get; set; } = string.Empty;
        
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal PriceCRC { get; set; }
        public string ImageUrl { get; set; } = string.Empty;
        
        // "Available", "Sold", "Suspended"
        public string StockStatus { get; set; } = "Available";

        // Which exchange point is preferred (optional)
        public int? PreferredDeliveryPointId { get; set; }
        public DeliveryPoint? PreferredDeliveryPoint { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
