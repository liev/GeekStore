using GeekStore.Core.Entities;
using GeekStore.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GeekStore.Api.Controllers
{
    /// <summary>
    /// Controlador de desarrollo para regenerar datos de prueba después de
    /// la migración de SQLite → PostgreSQL.
    /// 
    /// ⚠️ SOLO PARA DESARROLLO. Eliminar o proteger antes de producción.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class SeedController : ControllerBase
    {
        private readonly GeekStoreDbContext _db;

        public SeedController(GeekStoreDbContext db)
        {
            _db = db;
        }

        /// <summary>
        /// POST /api/seed
        /// Regenera usuarios de prueba, productos de ejemplo y una orden de demostración.
        /// Requiere que la base de datos ya tenga las categorías sembradas por la migración.
        /// </summary>
        [HttpPost]
        public async Task<ActionResult> SeedDatabase()
        {
            // ── 1. Verificar que no se ejecute sobre datos existentes ────────
            if (await _db.Users.AnyAsync())
                return BadRequest("La base de datos ya contiene datos. Limpia antes de re-sembrar.");

            // ── 2. Usuarios de Prueba ────────────────────────────────────────
            var admin = new User
            {
                Name = "Super",
                Surname = "Admin",
                Nickname = "goblin-admin",
                Email = "admin@goblinspot.com",
                PasswordHash = "admin123",
                Role = "Admin",
                IsActive = true,
                IsVerified = true,
                PhoneNumber = "+50688887777"
            };

            var seller1 = new User
            {
                Name = "Carlos",
                Surname = "Ramírez",
                Nickname = "DragonTrader",
                Email = "carlos@test.com",
                PasswordHash = "test123",
                Role = "Seller",
                IsActive = true,
                IsVerified = true,
                PhoneNumber = "+50687654321",
                SubscriptionPlan = "Licencia Mercante",
                SubscriptionEndDate = System.DateTime.UtcNow.AddDays(30),
                AutoRenew = true
            };

            var seller2 = new User
            {
                Name = "María",
                Surname = "López",
                Nickname = "MagicQueen",
                Email = "maria@test.com",
                PasswordHash = "test123",
                IsActive = true,
                IsVerified = true,
                PhoneNumber = "+50611223344",
                SubscriptionPlan = "Licencia de Prueba",
                SubscriptionEndDate = System.DateTime.UtcNow.AddMinutes(-1), // Expired! Worker should catch this
                AutoRenew = false
            };

            var buyer = new User
            {
                Name = "Luis",
                Surname = "Fernández",
                Nickname = "GoblinBuyer",
                Email = "luis@test.com",
                PasswordHash = "test123",
                Role = "Buyer",
                IsActive = true,
                IsVerified = true,
                PhoneNumber = "+50699998888"
            };

            _db.Users.AddRange(admin, seller1, seller2, buyer);
            await _db.SaveChangesAsync();

            // ── 3. Productos de Ejemplo ──────────────────────────────────────
            var products = new List<Product>
            {
                new Product
                {
                    SellerId = seller1.Id,
                    CategoryId = 5, // Cartas Sueltas (sub de TCG)
                    Name = "Black Lotus (Proxy NM)",
                    Description = "Proxy de alta calidad del icónico Black Lotus de Alpha. Ideal para casual play.",
                    PriceCRC = 15000,
                    ImageUrl = "https://cards.scryfall.io/large/front/b/d/bd8fa327-dd41-4737-8f19-2cf5eb1f7571.jpg",
                    StockStatus = "Available",
                    StockCount = 2,
                    Condition = "NM"
                },
                new Product
                {
                    SellerId = seller1.Id,
                    CategoryId = 5,
                    Name = "Lightning Bolt (4th Edition)",
                    Description = "Carta clásica de Magic: The Gathering en buen estado.",
                    PriceCRC = 3500,
                    ImageUrl = "https://cards.scryfall.io/large/front/f/2/f29ba16f-c8fb-42fe-aabf-87089cb214a7.jpg",
                    StockStatus = "Available",
                    StockCount = 8,
                    Condition = "LP"
                },
                new Product
                {
                    SellerId = seller1.Id,
                    CategoryId = 6, // Cajas Selladas
                    Name = "Booster Box - Aetherdrift",
                    Description = "Caja sellada de 36 sobres de la última expansión de MTG.",
                    PriceCRC = 85000,
                    ImageUrl = "https://images.unsplash.com/photo-1626544827763-d516dce335e2?w=400&q=80",
                    StockStatus = "Available",
                    StockCount = 3,
                    Condition = "M"
                },
                new Product
                {
                    SellerId = seller2.Id,
                    CategoryId = 8, // Anime (sub de Figuras)
                    Name = "Figura Goku Ultra Instinct 25cm",
                    Description = "Figura de acción de Dragon Ball Super. Articulada, base incluida.",
                    PriceCRC = 28000,
                    ImageUrl = "https://images.unsplash.com/photo-1608889825205-eebdb9fc5806?w=400&q=80",
                    StockStatus = "Available",
                    StockCount = 1,
                    Condition = "M"
                },
                new Product
                {
                    SellerId = seller2.Id,
                    CategoryId = 9, // Funko Pop
                    Name = "Funko Pop! Pikachu #353",
                    Description = "Funko Pop de Pokémon, edición regular. Caja en perfecto estado.",
                    PriceCRC = 12000,
                    ImageUrl = "https://images.unsplash.com/photo-1609372332255-611485350f25?w=400&q=80",
                    StockStatus = "Available",
                    StockCount = 4,
                    Condition = "NM"
                },
                new Product
                {
                    SellerId = seller2.Id,
                    CategoryId = 13, // Manga (sub de Cómics)
                    Name = "Manga One Piece Vol. 1-5 Bundle",
                    Description = "Tomos 1 al 5 de One Piece en español. Lomo con uso mínimo.",
                    PriceCRC = 22000,
                    ImageUrl = "https://images.unsplash.com/photo-1613376023733-0a73315d9b06?w=400&q=80",
                    StockStatus = "Available",
                    StockCount = 1,
                    Condition = "LP"
                },
                new Product
                {
                    SellerId = seller1.Id,
                    CategoryId = 10, // Consolas Retro
                    Name = "Game Boy Advance SP (AGS-101)",
                    Description = "Consola Game Boy Advance SP con pantalla retroiluminada. Funcional.",
                    PriceCRC = 45000,
                    ImageUrl = "https://images.unsplash.com/photo-1531525645387-7f14be1bdbbd?w=400&q=80",
                    StockStatus = "Available",
                    StockCount = 1,
                    Condition = "MP"
                },
                new Product
                {
                    SellerId = seller1.Id,
                    CategoryId = 7, //  Accesorios TCG
                    Name = "Deck Box Ultra Pro (Satin Tower)",
                    Description = "Caja para mazos con compartimento para dados. Color negro.",
                    PriceCRC = 9500,
                    ImageUrl = "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=400&q=80",
                    StockStatus = "Available",
                    StockCount = 6,
                    Condition = "M"
                }
            };

            _db.Products.AddRange(products);
            await _db.SaveChangesAsync();

            // ── 4. Orden de Ejemplo ──────────────────────────────────────────
            var sampleOrder = new Order
            {
                BuyerId = buyer.Id,
                SellerId = seller1.Id,
                TotalAmountCRC = 18500, // Black Lotus + Lightning Bolt
                Status = "Pending",
                DeliveryMethod = "Pickup",
                OrderDate = DateTime.UtcNow.AddDays(-1)
            };
            _db.Orders.Add(sampleOrder);
            await _db.SaveChangesAsync();

            var orderItems = new List<OrderItem>
            {
                new OrderItem { OrderId = sampleOrder.Id, ProductId = products[0].Id, Quantity = 1, UnitPriceCRC = 15000 },
                new OrderItem { OrderId = sampleOrder.Id, ProductId = products[1].Id, Quantity = 1, UnitPriceCRC = 3500 }
            };
            _db.OrderItems.AddRange(orderItems);
            await _db.SaveChangesAsync();

            // Order buyer -> seller2 (so buyer can review seller2 too)
            var sampleOrder2 = new Order
            {
                BuyerId = buyer.Id,
                SellerId = seller2.Id,
                TotalAmountCRC = 28000,
                Status = "Completed",
                DeliveryMethod = "Pickup",
                OrderDate = DateTime.UtcNow.AddDays(-3),
                ConfirmedAt = DateTime.UtcNow.AddDays(-3).AddHours(1),
                ShippedAt = DateTime.UtcNow.AddDays(-2),
                CompletedAt = DateTime.UtcNow.AddDays(-1)
            };
            _db.Orders.Add(sampleOrder2);
            await _db.SaveChangesAsync();

            var orderItems2 = new List<OrderItem>
            {
                new OrderItem { OrderId = sampleOrder2.Id, ProductId = products[3].Id, Quantity = 1, UnitPriceCRC = 28000 }
            };
            _db.OrderItems.AddRange(orderItems2);
            await _db.SaveChangesAsync();

            // ── 5. Reseñas de Ejemplo ────────────────────────────────────────
            var reviews = new List<Review>
            {
                new Review
                {
                    ReviewerId = buyer.Id,
                    SellerId = seller1.Id,
                    Rating = 5,
                    Comment = "Excelente vendedor, las cartas llegaron en perfectas condiciones. ¡100% recomendado!",
                    CreatedAt = DateTime.UtcNow.AddDays(-1)
                },
                new Review
                {
                    ReviewerId = buyer.Id,
                    SellerId = seller2.Id,
                    Rating = 4,
                    Comment = "Muy buena figura, empaque seguro. El envío tardó un poco pero todo bien.",
                    CreatedAt = DateTime.UtcNow.AddDays(-2)
                }
            };
            _db.Reviews.AddRange(reviews);
            await _db.SaveChangesAsync();

            // ── 6. Notificaciones de Ejemplo ──────────────────────────────────
            var notifications = new List<Notification>
            {
                new Notification
                {
                    UserId = buyer.Id,
                    Title = $"Orden #{sampleOrder2.Id} completada",
                    Message = $"MagicQueen ha marcado tu orden #{sampleOrder2.Id} (₡28,000) como completada.",
                    Type = "OrderUpdate",
                    RelatedEntityId = sampleOrder2.Id,
                    IsRead = true,
                    CreatedAt = DateTime.UtcNow.AddDays(-1)
                },
                new Notification
                {
                    UserId = seller1.Id,
                    Title = "Nueva orden recibida",
                    Message = $"GoblinBuyer ha realizado una orden #{sampleOrder.Id} por ₡18,500. Revisa tu panel de órdenes.",
                    Type = "OrderUpdate",
                    RelatedEntityId = sampleOrder.Id,
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow.AddDays(-1)
                },
                new Notification
                {
                    UserId = seller2.Id,
                    Title = "Nueva reseña recibida",
                    Message = "GoblinBuyer te ha dejado una reseña de 4 estrellas. ¡Revisa tu perfil!",
                    Type = "ReviewReceived",
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow.AddDays(-2)
                }
            };
            _db.Notifications.AddRange(notifications);
            await _db.SaveChangesAsync();

            return Ok(new
            {
                message = "✅ Base de datos sembrada exitosamente",
                users = new[] { admin.Email, seller1.Email, seller2.Email, buyer.Email },
                password = "test123 (admin: admin123)",
                productsCreated = products.Count,
                ordersCreated = 2,
                reviewsCreated = reviews.Count,
                notificationsCreated = notifications.Count,
                hint = "Usa POST /api/seed/reset para limpiar y volver a sembrar."
            });
        }

        /// <summary>
        /// POST /api/seed/reset
        /// Limpia TODOS los datos y vuelve a sembrar desde cero.
        /// ⚠️ DESTRUCTIVO - Solo para desarrollo.
        /// </summary>
        [HttpPost("reset")]
        public async Task<ActionResult> ResetAndSeed()
        {
            // Limpiar en orden de dependencias (FK)
            _db.Notifications.RemoveRange(_db.Notifications);
            _db.Reviews.RemoveRange(_db.Reviews);
            _db.OrderItems.RemoveRange(_db.OrderItems);
            _db.Orders.RemoveRange(_db.Orders);
            _db.UserFollows.RemoveRange(_db.UserFollows);
            _db.Products.RemoveRange(_db.Products);
            _db.Users.RemoveRange(_db.Users);
            await _db.SaveChangesAsync();

            // Delegar la re-siembra al endpoint principal
            return await SeedDatabase();
        }
    }
}
