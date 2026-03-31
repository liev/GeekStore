using GoblinSpot.Core.Interfaces;
using GoblinSpot.Core.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace GoblinSpot.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class SellersController : ControllerBase
    {
        private readonly IOrderRepository _orderRepository;
        private readonly IProductRepository _productRepository;

        public SellersController(IOrderRepository orderRepository, IProductRepository productRepository)
        {
            _orderRepository = orderRepository;
            _productRepository = productRepository;
        }

        [HttpGet("metrics")]
        public async Task<ActionResult<SellerAnalyticsDto>> GetMetrics()
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdStr, out int sellerId))
                return Unauthorized();

            // Fetch seller's products
            var products = await _productRepository.GetProductsBySellerAsync(sellerId);
            
            // Fetch seller's sales (orders)
            var orders = await _orderRepository.GetOrdersBySellerAsync(sellerId);

            var analytics = new SellerAnalyticsDto
            {
                TotalActiveProducts = products.Count(p => p.StockStatus == "Available" && p.StockCount > 0),
                TotalSoldProducts = products.Count(p => p.StockStatus == "Sold" || p.StockCount == 0),
                TotalRevenueCRC = orders.Where(o => o.Status != "Cancelled").Sum(o => o.TotalAmountCRC),
                PendingOrders = orders.Count(o => o.Status == "Pending" || o.Status == "Paid"),
                CompletedOrders = orders.Count(o => o.Status == "Completed" || o.Status == "Shipped")
            };

            return Ok(analytics);
        }
    }
}
