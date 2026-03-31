using System.Collections.Generic;

namespace GoblinSpot.Core.Models
{
    public class CreateOrderItemDto
    {
        public int ProductId { get; set; }
        public int Quantity { get; set; }
    }

    public class CreateOrderDto
    {
        // "Pickup" or "Shipping"
        public string DeliveryMethod { get; set; } = "Pickup"; 
        
        public int? DeliveryPointId { get; set; }
        public string? ShippingAddress { get; set; }
        public string? BuyerPhone { get; set; }
        
        public List<CreateOrderItemDto> Items { get; set; } = new();
    }
}
