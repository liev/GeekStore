namespace GeekStore.Core.Models
{
    public class SellerAnalyticsDto
    {
        public int TotalActiveProducts { get; set; }
        public int TotalSoldProducts { get; set; }
        public decimal TotalRevenueCRC { get; set; }
        public int PendingOrders { get; set; }
        public int CompletedOrders { get; set; }
    }
}
