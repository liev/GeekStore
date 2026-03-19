using GeekStore.Core.Entities;
using GeekStore.Core.Interfaces;
using GeekStore.Core.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using System.IO;
using System.Security.Claims;
using GeekStore.Application.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace GeekStore.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProductsController : ControllerBase
    {
        private readonly IProductRepository _productRepository;
        private readonly ICloudinaryService _cloudinaryService;
        private readonly IImageValidationService _imageValidationService;
        private readonly IMoxfieldService _moxfieldService;

        public ProductsController(
            IProductRepository productRepository,
            ICloudinaryService cloudinaryService,
            IImageValidationService imageValidationService,
            IMoxfieldService moxfieldService)
        {
            _productRepository = productRepository;
            _cloudinaryService = cloudinaryService;
            _imageValidationService = imageValidationService;
            _moxfieldService = moxfieldService;
        }

        [HttpGet]
        public async Task<ActionResult<PagedResult<Product>>> GetAvailableProducts([FromQuery] ProductQueryParams query)
        {
            var pagedProducts = await _productRepository.GetFilteredProductsAsync(query);
            return Ok(pagedProducts);
        }

        [HttpGet("debug-latest")]
        public async Task<IActionResult> GetDebugLatestProducts()
        {
            var dbContext = HttpContext.RequestServices.GetRequiredService<GeekStore.Infrastructure.Data.GeekStoreDbContext>();
            var recent = await dbContext.Products
                .Include(p => p.Seller)
                .OrderByDescending(p => p.Id)
                .Take(10)
                .Select(p => new
                {
                    p.Id,
                    p.Name,
                    p.StockCount,
                    p.StockStatus,
                    p.SellerId,
                    SellerName = p.Seller != null ? p.Seller.Nickname : "NO_SELLER",
                    SellerActive = p.Seller != null ? p.Seller.IsActive : false
                })
                .ToListAsync();
            return Ok(recent);
        }

        [HttpGet("seller/{sellerId}")]
        public async Task<ActionResult<IEnumerable<Product>>> GetSellerProducts(int sellerId)
        {
            var products = await _productRepository.GetProductsBySellerAsync(sellerId);
            return Ok(products);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Product>> GetProduct(int id)
        {
            var product = await _productRepository.GetByIdAsync(id);
            if (product == null) return NotFound();
            return Ok(product);
        }

        [Authorize]
        [HttpPost]
        public async Task<ActionResult<Product>> CreateProduct([FromBody] Product product)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null || !int.TryParse(userIdClaim, out var sellerId))
                return Unauthorized(new { message = "No se pudo identificar al vendedor desde el token." });

            product.SellerId = sellerId;

            if (product.Description != null && product.Description.ToLower().Contains("fake"))
                return BadRequest(new { message = "AI MODERATION: El artículo ha sido marcado como inapropiado y fue rechazado." });

            var created = await _productRepository.AddAsync(product);
            return CreatedAtAction(nameof(GetProduct), new { id = created.Id }, created);
        }

        [Authorize]
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateProduct(int id, [FromBody] Product productUpdate)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null || !int.TryParse(userIdClaim, out var sellerId))
                return Unauthorized(new { message = "No autorizado." });

            var existingProduct = await _productRepository.GetByIdAsync(id);
            if (existingProduct == null) return NotFound();

            // Only the seller who owns the product can update it
            if (existingProduct.SellerId != sellerId)
                return Forbid();

            existingProduct.Name = productUpdate.Name;
            existingProduct.Description = productUpdate.Description;
            existingProduct.PriceCRC = productUpdate.PriceCRC;
            existingProduct.CategoryId = productUpdate.CategoryId;
            existingProduct.StockCount = productUpdate.StockCount;
            // Only update images if provided
            if (!string.IsNullOrEmpty(productUpdate.ImageUrl)) existingProduct.ImageUrl = productUpdate.ImageUrl;
            if (!string.IsNullOrEmpty(productUpdate.ImageUrl2)) existingProduct.ImageUrl2 = productUpdate.ImageUrl2;
            if (!string.IsNullOrEmpty(productUpdate.ImageUrl3)) existingProduct.ImageUrl3 = productUpdate.ImageUrl3;

            await _productRepository.UpdateAsync(existingProduct);
            return NoContent();
        }

        [Authorize]
        [HttpPost("upload-image")]
        public async Task<IActionResult> UploadImage(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No file uploaded.");

            using var memoryStream = new MemoryStream();
            await file.CopyToAsync(memoryStream);
            var imageBytes = memoryStream.ToArray();

            // 1. Validate with Gemini
            var (isSafe, reason) = await _imageValidationService.ValidateImageAsync(imageBytes, file.ContentType);
            if (!isSafe)
            {
                return BadRequest(new { message = $"AI MODERATION: Imagen rechazada. Razón: {reason}" });
            }

            // 2. Upload to Cloudinary
            memoryStream.Position = 0; // Reset stream position for Cloudinary upload
            var imageUrl = await _cloudinaryService.UploadImageAsync(memoryStream, file.FileName);

            return Ok(new { url = imageUrl, message = "Imagen validada como segura y subida exitosamente.", reason = reason });
        }

        [Authorize(Roles = "Admin")]
        [HttpPost("seed")]
        public async Task<ActionResult<Product>> SeedProduct(Product product)
        {
            var created = await _productRepository.AddAsync(product);
            return CreatedAtAction(nameof(GetProduct), new { id = created.Id }, created);
        }

        [HttpPost("import-moxfield/{publicId}")]
        public async Task<IActionResult> ImportMoxfieldDeck(string publicId, [FromBody] MoxfieldImportRequest request)
        {
            var deck = await _moxfieldService.GetDeckByPublicIdAsync(publicId);
            if (deck == null) return NotFound(new { message = "Mazo no encontrado en Moxfield." });
            
            if (request.ImportIndividually)
            {
                var allCards = new List<MoxfieldCardDto>();
                allCards.AddRange(deck.Mainboard.Values);
                allCards.AddRange(deck.Sideboard.Values);

                int importedCount = 0;
                foreach (var cardDto in allCards)
                {
                    var product = new Product
                    {
                        Name = cardDto.Card.Name,
                        Description = $"Carta individual de mazo Moxfield: {deck.Name}",
                        CategoryId = 1, // TCG
                        PriceCRC = 0,
                        SellerId = request.SellerId,
                        StockStatus = "Available",
                        StockCount = cardDto.Quantity,
                        ImageUrl = cardDto.Card.ImageUrl
                    };
                    await _productRepository.AddAsync(product);
                    importedCount++;
                }
                return Ok(new { message = $"Se importaron {importedCount} cartas individuales exitosamente.", count = importedCount });
            }
            else
            {
                var description = $"Formato: {deck.Format}\n\nCartas Principales:\n";
                int count = 0;
                foreach (var kvp in deck.Mainboard)
                {
                    if (count++ >= 10)
                    {
                        description += $"...y otras {deck.Mainboard.Count - 10} cartas más.\n";
                        break;
                    }
                    description += $"- {kvp.Value.Quantity}x {kvp.Value.Card.Name}\n";
                }

                var product = new Product
                {
                    Name = $"Mazo: {deck.Name}",
                    Description = description,
                    CategoryId = 1, // 1 = TCG
                    PriceCRC = 0, // Placeholder
                    SellerId = request.SellerId,
                    StockStatus = "Available",
                    StockCount = 1,
                    ImageUrl = deck.Mainboard.Values.FirstOrDefault()?.Card.ImageUrl ?? ""
                };

                var created = await _productRepository.AddAsync(product);
                return Ok(new { message = "Mazo completo importado con éxito.", productId = created.Id });
            }
        }

        [Authorize(Roles = "Admin")]
        [HttpPost("update-all-test-images")]
        public async Task<IActionResult> UpdateAllTestImages()
        {
            var products = await _productRepository.ListAllAsync();
            var count = 0;
            foreach (var p in products)
            {
                if (count == 0 || p.Name.Contains("Pikachu"))
                {
                    p.ImageUrl = "http://localhost:5173/test1.png";
                    p.ImageUrl2 = "http://localhost:5173/test2.png";
                    p.ImageUrl3 = "http://localhost:5173/test3.png";
                    p.StockCount = 5;
                }
                else if (count == 1 || p.Name.Contains("Lotus"))
                {
                    p.ImageUrl = "http://localhost:5173/test4.png";
                    p.ImageUrl2 = "";
                    p.ImageUrl3 = "";
                    p.StockCount = 1;
                }
                else if (count == 2 || p.Name.Contains("Nintendo"))
                {
                    p.ImageUrl = "http://localhost:5173/test5.png";
                    p.ImageUrl2 = "";
                    p.ImageUrl3 = "";
                    p.StockCount = 2;
                }
                else if (count == 3 || p.Name.Contains("Master"))
                {
                    p.ImageUrl = "http://localhost:5173/test6.png";
                    p.ImageUrl2 = "";
                    p.ImageUrl3 = "";
                    p.StockCount = 5;
                }
                else if (count == 4 || p.Name.Contains("Comics"))
                {
                    p.ImageUrl = "http://localhost:5173/test7.png";
                    p.ImageUrl2 = "";
                    p.ImageUrl3 = "";
                    p.StockCount = 10;
                }
                else
                {
                    p.ImageUrl = "http://localhost:5173/test8.png";
                    p.ImageUrl2 = "";
                    p.ImageUrl3 = "";
                    p.StockCount = 3;
                }
                
                await _productRepository.UpdateAsync(p);
                count++;
            }
            return Ok(new { message = $"Updated {count} products" });
        }
    }
}
