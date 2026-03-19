using System.ComponentModel.DataAnnotations;

namespace GeekStore.Core.Entities
{
    public class SystemSetting
    {
        [Key]
        public string Key { get; set; } = string.Empty;
        public string Value { get; set; } = string.Empty;
    }
}
