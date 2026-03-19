using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace GeekStore.Core.Entities
{
    public class Category
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        public int? ParentId { get; set; }
        
        [System.Text.Json.Serialization.JsonIgnore]
        public Category? Parent { get; set; }

        public ICollection<Category> Subcategories { get; set; } = new List<Category>();
    }
}
