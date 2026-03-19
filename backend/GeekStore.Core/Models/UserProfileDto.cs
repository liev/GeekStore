namespace GeekStore.Core.Models
{
    public class UserProfileDto
    {
        public int Id { get; set; }
        public string Nickname { get; set; }
        public string Email { get; set; }
        public int TotalActiveProducts { get; set; }
        public bool IsFollowing { get; set; }
        public string? PhoneNumber { get; set; }
    }
}
