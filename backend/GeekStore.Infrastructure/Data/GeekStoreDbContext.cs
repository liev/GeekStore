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

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
        }
    }
}
