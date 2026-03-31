namespace GoblinSpot.Core.Models
{
    public class ProductQueryParams
    {
        public string? Search { get; set; }
        public int? CategoryId { get; set; }
        public string? Condition { get; set; }
        public decimal? MinPrice { get; set; }
        public decimal? MaxPrice { get; set; }
        public int Page { get; set; } = 1;

        private int _pageSize = 24;
        public int PageSize
        {
            get => _pageSize;
            set => _pageSize = value > 100 ? 100 : value; // Cap at 100
        }
    }
}
