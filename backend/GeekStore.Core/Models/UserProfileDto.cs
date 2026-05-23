namespace GoblinSpot.Core.Models
{
    public class UserProfileDto
    {
        public int Id { get; set; }
        public required string Nickname { get; set; }
        public required string Email { get; set; }
        public int TotalActiveProducts { get; set; }
        public bool IsFollowing { get; set; }
        public string? PhoneNumber { get; set; }
    }
}
