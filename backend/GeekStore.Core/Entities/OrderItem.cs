namespace GoblinSpot.Core.Entities
{
    public class OrderItem
    {
        public int Id { get; set; }
        
        public int OrderId { get; set; }
        public Order? Order { get; set; }
        
        public int ProductId { get; set; }
        public Product? Product { get; set; }
        
        public int Quantity { get; set; }
        
        // Precio al momento de la compra para historial inmutable
        public decimal UnitPriceCRC { get; set; }
    }
}
