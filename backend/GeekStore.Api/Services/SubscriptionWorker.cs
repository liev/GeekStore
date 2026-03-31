using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using GoblinSpot.Core.Entities;
using GoblinSpot.Core.Interfaces;
using GoblinSpot.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace GoblinSpot.Api.Services
{
    public class SubscriptionWorker : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<SubscriptionWorker> _logger;

        public SubscriptionWorker(IServiceProvider serviceProvider, ILogger<SubscriptionWorker> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                _logger.LogInformation("SubscriptionWorker is running: {Time}", DateTimeOffset.Now);

                try
                {
                    using (var scope = _serviceProvider.CreateScope())
                    {
                        var dbContext = scope.ServiceProvider.GetRequiredService<GoblinSpotDbContext>();
                        var notificationRepo = scope.ServiceProvider.GetRequiredService<INotificationRepository>();

                        // Find sellers whose subscription has expired
                        var now = DateTime.UtcNow;
                        var expiredSellers = await dbContext.Users
                            .Where(u => u.Role == "Seller" && u.SubscriptionEndDate.HasValue && u.SubscriptionEndDate.Value < now)
                            .ToListAsync(stoppingToken);

                        foreach (var seller in expiredSellers)
                        {
                            _logger.LogInformation("Seller {SellerId} ({Email}) subscription expired. Changing role to Buyer.", seller.Id, seller.Email);
                            
                            // Change Role to Buyer
                            seller.Role = "Buyer";
                            seller.AutoRenew = false;
                            
                            // Suspend products
                            var products = await dbContext.Products.Where(p => p.SellerId == seller.Id).ToListAsync(stoppingToken);
                            int productsHidden = 0;
                            foreach (var product in products)
                            {
                                if (product.IsActive)
                                {
                                    product.IsActive = false;
                                    productsHidden++;
                                }
                            }

                            // Notify user
                            var notification = new Notification
                            {
                                UserId = seller.Id,
                                Title = "Licencia Vencida",
                                Message = $"Tu Licencia de Gremio ha caducado. {productsHidden} producto(s) han sido ocultados temporalmente de nuestro sistema.",
                                Type = "System"
                            };

                            await notificationRepo.AddAsync(notification);
                        }

                        if (expiredSellers.Any())
                        {
                            await dbContext.SaveChangesAsync(stoppingToken);
                            _logger.LogInformation("Processed {Count} expired subscriptions.", expiredSellers.Count);
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing subscriptions");
                }

                // Check every hour (or every minute for testing, let's use 10 mins)
                await Task.Delay(TimeSpan.FromMinutes(10), stoppingToken);
            }
        }
    }
}
