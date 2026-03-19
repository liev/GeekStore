namespace GeekStore.Core.Models
{
    public class PagedResult<T>
    {
        public System.Collections.Generic.List<T> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages => (int)System.Math.Ceiling(TotalCount / (double)PageSize);
    }
}
