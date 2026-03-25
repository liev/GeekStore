using GeekStore.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace GeekStore.Infrastructure.Data
{
    public class GeekStoreDbContext : DbContext
    {
        public GeekStoreDbContext(DbContextOptions<GeekStoreDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<Product> Products { get; set; }
        public DbSet<DeliveryPoint> DeliveryPoints { get; set; }
        public DbSet<SystemSetting> SystemSettings { get; set; }
        public DbSet<Category> Categories { get; set; }
        public DbSet<Order> Orders { get; set; }
        public DbSet<OrderItem> OrderItems { get; set; }
        public DbSet<UserFollow> UserFollows { get; set; }
        public DbSet<Review> Reviews { get; set; }
        public DbSet<Notification> Notifications { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            
            // Configure UserFollows PK and Relationships
            modelBuilder.Entity<UserFollow>()
                .HasKey(uf => new { uf.FollowerId, uf.FollowedId });

            modelBuilder.Entity<UserFollow>()
                .HasOne(uf => uf.Follower)
                .WithMany()
                .HasForeignKey(uf => uf.FollowerId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<UserFollow>()
                .HasOne(uf => uf.Followed)
                .WithMany()
                .HasForeignKey(uf => uf.FollowedId)
                .OnDelete(DeleteBehavior.Restrict);

            // Configure Review -> User relationships
            modelBuilder.Entity<Review>()
                .HasOne(r => r.Reviewer)
                .WithMany()
                .HasForeignKey(r => r.ReviewerId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Review>()
                .HasOne(r => r.Seller)
                .WithMany()
                .HasForeignKey(r => r.SellerId)
                .OnDelete(DeleteBehavior.Restrict);

            // One review per buyer-seller pair
            modelBuilder.Entity<Review>()
                .HasIndex(r => new { r.ReviewerId, r.SellerId })
                .IsUnique();

            // Configure Order -> User relationships to prevent multiple cascade paths
            modelBuilder.Entity<Order>()
                .HasOne(o => o.Buyer)
                .WithMany()
                .HasForeignKey(o => o.BuyerId)
                .OnDelete(DeleteBehavior.Restrict);

            // Configure Notification -> User relationship
            modelBuilder.Entity<Notification>()
                .HasOne(n => n.User)
                .WithMany()
                .HasForeignKey(n => n.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Order>()
                .HasOne(o => o.Seller)
                .WithMany()
                .HasForeignKey(o => o.SellerId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<SystemSetting>().HasData(
                new SystemSetting { Key = "SellerMonthlyFee", Value = "1.00" }
            );

            // Seed Categories
            modelBuilder.Entity<Category>().HasData(
                new Category { Id = 1, Name = "TCG" },
                new Category { Id = 2, Name = "Figuras" },
                new Category { Id = 3, Name = "Videojuegos" },
                new Category { Id = 4, Name = "Cómics" },
                
                // Seed Subcategories as Categories with ParentId
                new Category { Id = 5, Name = "Cartas Sueltas", ParentId = 1 },
                new Category { Id = 6, Name = "Cajas Selladas", ParentId = 1 },
                new Category { Id = 7, Name = "Accesorios TCG", ParentId = 1 },
                new Category { Id = 8, Name = "Anime", ParentId = 2 },
                new Category { Id = 9, Name = "Funko Pop", ParentId = 2 },
                new Category { Id = 10, Name = "Consolas Retro", ParentId = 3 },
                new Category { Id = 11, Name = "Juegos Físicos", ParentId = 3 },
                new Category { Id = 12, Name = "Marvel", ParentId = 4 },
                new Category { Id = 13, Name = "Manga", ParentId = 4 }
            );
        }
    }
}
