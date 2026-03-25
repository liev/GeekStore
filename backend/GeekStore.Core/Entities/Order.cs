using System;
using System.Collections.Generic;

namespace GeekStore.Core.Entities
{
    public class Order
    {
        public int Id { get; set; }
        
        // El usuario que compra
        public int BuyerId { get; set; }
        public User? Buyer { get; set; }
        
        // El usuario que vende (el marketplace es peer-to-peer, cada orden es entre 1 comprador y 1 vendedor)
        public int SellerId { get; set; }
        public User? Seller { get; set; }
        
        public decimal TotalAmountCRC { get; set; }
        
        // "Pending", "Confirmed", "Shipped", "Completed", "Cancelled"
        public string Status { get; set; } = "Pending";
        
        public DateTime OrderDate { get; set; } = DateTime.UtcNow;
        
        // Status transition timestamps for order timeline
        public DateTime? ConfirmedAt { get; set; }
        public DateTime? ShippedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        
        // P2P / WhatsApp contact info at time of order
        public string? BuyerPhone { get; set; }

        // Información de entrega
        // "Pickup" o "Shipping"
        public string DeliveryMethod { get; set; } = "Pickup"; 
        
        // Si eligen punto de encuentro
        public int? DeliveryPointId { get; set; }
        public DeliveryPoint? DeliveryPoint { get; set; }
        
        // Si eligen envío correos de CR
        public string? ShippingAddress { get; set; }
        
        public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
    }
}
