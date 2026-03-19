using GeekStore.Core.Entities;
using GeekStore.Core.Interfaces;
using GeekStore.Core.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;

namespace GeekStore.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class OrdersController : ControllerBase
    {
        private readonly IOrderRepository _orderRepository;
        private readonly IProductRepository _productRepository;
        private readonly IRepository<User> _userRepository;
        private readonly IWhatsAppService _whatsAppService;

        public OrdersController(
            IOrderRepository orderRepository, 
            IProductRepository productRepository,
            IRepository<User> userRepository,
            IWhatsAppService whatsAppService)
        {
            _orderRepository = orderRepository;
            _productRepository = productRepository;
            _userRepository = userRepository;
            _whatsAppService = whatsAppService;
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
            var productsDb = new List<GeekStore.Core.Entities.Product>();
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
                    createdOrders.Add(savedOrder);
                    
                    // Trigger WhatsApp Notifications
                    var seller = await _userRepository.GetByIdAsync(sellerGroup.Key);
                    var buyer = await _userRepository.GetByIdAsync(buyerId);

                    // If user provides a phone on checkout, optionally ensure the user entity is updated too for the future
                    if (buyer != null && request.BuyerPhone != null && buyer.PhoneNumber != request.BuyerPhone)
                    {
                        buyer.PhoneNumber = request.BuyerPhone;
                        await _userRepository.UpdateAsync(buyer);
                    }

                    if (seller != null && !string.IsNullOrEmpty(seller.PhoneNumber))
                    {
                        await _whatsAppService.SendMessageAsync(seller.PhoneNumber, 
                            $"🛒 ¡Hola {seller.Nickname}! Tienes una nueva orden P2P.\n" +
                            $"👤 {buyer?.Nickname ?? "Un usuario"} quiere comprar artículos por ₡{totalAmount:N0}.\n" +
                            $"📱 Su WhatsApp es: {request.BuyerPhone}\n\n" +
                            $"¡Ponte en contacto para coordinar el pago y envío!");
                    }

                    if (!string.IsNullOrEmpty(request.BuyerPhone))
                    {
                        await _whatsAppService.SendMessageAsync(request.BuyerPhone, 
                            $"✅ ¡Hola {buyer?.Nickname ?? "usuario"}! Tu orden P2P por ₡{totalAmount:N0} fue creada.\n" +
                            $"El vendedor es {seller?.Nickname}.\n" +
                            $"📱 Su WhatsApp es: {seller?.PhoneNumber}\n\n" +
                            $"¡Contacta al vendedor para finalizar tu compra!");
                    }
                }
                catch (DbUpdateConcurrencyException)
                {
                    return Conflict($"Hubo un problema de concurrencia. El producto pudo haber sido vendido a otro usuario hace unos instantes.");
                }
            }

            return Ok(new { message = "Órdenes creadas con éxito", orderCount = createdOrders.Count });
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
    }
}
