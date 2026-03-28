using System;
using System.ComponentModel.DataAnnotations;

namespace GeekStore.Core.Entities
{
    public class UserBlock
    {
        public int BlockerId { get; set; }
        public User? Blocker { get; set; }

        public int BlockedUserId { get; set; }
        public User? BlockedUser { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
