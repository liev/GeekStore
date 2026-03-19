using System;

namespace GeekStore.Core.Entities
{
    public class User
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Surname { get; set; } = string.Empty;
        public string Nickname { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        
        // Roles: "Admin", "Seller"
        public string Role { get; set; } = "Seller";
        
        // To suspend/ban users manually
        public bool IsActive { get; set; } = true;
        
        // Email verification
        public bool IsVerified { get; set; } = false;
        public string? VerificationCode { get; set; }
        public DateTime? VerificationCodeExpiry { get; set; }
        
        // P2P / WhatsApp integration
        public string? PhoneNumber { get; set; }
        
        // Individual customization for Admin Dashboard
        public decimal? MonthlyFee { get; set; }
        public string? Benefits { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
