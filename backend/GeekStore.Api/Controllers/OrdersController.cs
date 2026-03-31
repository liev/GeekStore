using GoblinSpot.Core.Entities;
using GoblinSpot.Core.Interfaces;
using GoblinSpot.Core.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;

namespace GoblinSpot.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class OrdersController : ControllerBase
    {
        private readonly IOrderRepository _orderRepository;
        private readonly IProductRepository _productRepository;
        private readonly IRepository<User> _userRepository;
        private readonly INotificationRepository _notificationRepository;

        public OrdersController(
            IOrderRepository orderRepository, 
            IProductRepository productRepository,
            IRepository<User> userRepository,
            INotificationRepository notificationRepository)
        {
            _orderRepository = orderRepository;
            _productRepository = productRepository;
            _userRepository = userRepository;
            _notificationRepository = notificationRepository;
        }

        [HttpPost]
        public async Task<ActionResult> CreateOrders([FromBody] CreateOrderDto request)
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdStr, out int buyerId))
                return Unauthorized();

            if (!request.Items.Any())
                return BadRequest("El carrito está vacío.");

            // Resolve all products securely from backend to avoid price/seller spoofing
            var productsDb = new List<GoblinSpot.Core.Entities.Product>();
            foreach (var item in request.Items)
            {
                var prod = await _productRepository.GetByIdAsync(item.ProductId);
                if (prod == null || prod.StockStatus != "Available" || prod.StockCount < item.Quantity)
                    return BadRequest($"Producto con ID {item.ProductId} no está disponible o no tiene suficiente stock.");
                productsDb.Add(prod);
            }

            // Group by SellerId since each order is Peer-to-Peer
            var itemsBySeller = request.Items
                .Join(productsDb, reqItem => reqItem.ProductId, dbProd => dbProd.Id, (reqItem, dbProd) => new { reqItem, dbProd })
                .GroupBy(x => x.dbProd.SellerId);

            var createdOrders = new List<Order>();

            foreach (var sellerGroup in itemsBySeller)
            {
                var orderItems = sellerGroup.Select(x => new OrderItem
                {
                    ProductId = x.dbProd.Id,
                    Quantity = x.reqItem.Quantity,
                    UnitPriceCRC = x.dbProd.PriceCRC
                }).ToList();

                var totalAmount = orderItems.Sum(i => i.UnitPriceCRC * i.Quantity);

                var order = new Order
                {
                    BuyerId = buyerId,
                    SellerId = sellerGroup.Key,
                    TotalAmountCRC = totalAmount,
                    DeliveryMethod = request.DeliveryMethod,
                    DeliveryPointId = request.DeliveryPointId,
                    ShippingAddress = request.ShippingAddress,
                    Status = "Pending",
                    OrderDate = System.DateTime.UtcNow
                };

                // The repository handles the transaction and stock deduction
                try
                {
                    var savedOrder = await _orderRepository.CreateOrderWithItemsAsync(order, orderItems);

                    // Resolve seller info for the response
                    var seller = await _userRepository.GetByIdAsync(sellerGroup.Key);
                    savedOrder.Seller = seller;

                    // If user provides a phone on checkout, update buyer entity for future reference
                    var buyer = await _userRepository.GetByIdAsync(buyerId);
                    if (buyer != null && request.BuyerPhone != null && buyer.PhoneNumber != request.BuyerPhone)
                    {
                        buyer.PhoneNumber = request.BuyerPhone;
                        await _userRepository.UpdateAsync(buyer);
                    }

                    createdOrders.Add(savedOrder);
                }
                catch (DbUpdateConcurrencyException)
                {
                    return Conflict($"Hubo un problema de concurrencia. El producto pudo haber sido vendido a otro usuario hace unos instantes.");
                }
            }

            // Return seller contact info so the frontend can generate wa.me links
            return Ok(new {
                message = "Órdenes creadas con éxito",
                orderCount = createdOrders.Count,
                sellers = createdOrders.Select(o => new {
                    sellerId = o.SellerId,
                    sellerNickname = o.Seller?.Nickname,
                    sellerPhone = o.Seller?.PhoneNumber,
                    totalAmountCRC = o.TotalAmountCRC
                })
            });
        }



        [HttpGet("my-purchases")]
        public async Task<ActionResult<IEnumerable<Order>>> GetMyPurchases()
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdStr, out int buyerId))
                return Unauthorized();

            var orders = await _orderRepository.GetOrdersByBuyerAsync(buyerId);
            return Ok(orders);
        }

        [HttpGet("my-sales")]
        public async Task<ActionResult<IEnumerable<Order>>> GetMySales()
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdStr, out int sellerId))
                return Unauthorized();

            var orders = await _orderRepository.GetOrdersBySellerAsync(sellerId);
            return Ok(orders);
        }

        /// <summary>
        /// PUT /api/orders/{id}/status
        /// Allows the seller to advance the order through the status flow:
        /// Pending → Confirmed → Shipped → Completed
        /// Auto-creates a notification for the buyer on each transition.
        /// </summary>
        [HttpPut("{id}/status")]
        public async Task<ActionResult> UpdateOrderStatus(int id, [FromBody] UpdateStatusDto dto)
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdStr, out int sellerId))
                return Unauthorized();

            var order = await _orderRepository.GetOrderByIdAsync(id);
            if (order == null)
                return NotFound("Orden no encontrada.");

            if (order.SellerId != sellerId)
                return Forbid();

            // Validate status flow
            var validTransitions = new Dictionary<string, string>
            {
                { "Pending", "Confirmed" },
                { "Confirmed", "Shipped" },
                { "Shipped", "Completed" }
            };

            if (!validTransitions.TryGetValue(order.Status, out var expectedNext) || expectedNext != dto.NewStatus)
                return BadRequest($"No se puede cambiar el estado de '{order.Status}' a '{dto.NewStatus}'. El siguiente estado válido es: '{expectedNext ?? "ninguno (ya finalizada)"}'");

            // Apply the transition
            order.Status = dto.NewStatus;
            switch (dto.NewStatus)
            {
                case "Confirmed":
                    order.ConfirmedAt = System.DateTime.UtcNow;
                    break;
                case "Shipped":
                    order.ShippedAt = System.DateTime.UtcNow;
                    break;
                case "Completed":
                    order.CompletedAt = System.DateTime.UtcNow;
                    break;
            }

            await _orderRepository.UpdateAsync(order);

            // Create notification for the buyer
            var seller = await _userRepository.GetByIdAsync(sellerId);
            var statusLabels = new Dictionary<string, string>
            {
                { "Confirmed", "confirmada" },
                { "Shipped", "enviada" },
                { "Completed", "completada" }
            };
            var label = statusLabels.GetValueOrDefault(dto.NewStatus, dto.NewStatus);

            var notification = new Notification
            {
                UserId = order.BuyerId,
                Title = $"Orden #{order.Id} {label}",
                Message = $"{seller?.Nickname ?? "El vendedor"} ha marcado tu orden #{order.Id} (₡{order.TotalAmountCRC:N0}) como {label}.",
                Type = "OrderUpdate",
                RelatedEntityId = order.Id
            };

            await _notificationRepository.AddAsync(notification);

            return Ok(new { message = $"Orden actualizada a {dto.NewStatus}", order.Status });
        }
    }

    public record UpdateStatusDto(string NewStatus);
}
