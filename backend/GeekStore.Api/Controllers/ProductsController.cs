using GeekStore.Core.Entities;
using GeekStore.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace GeekStore.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProductsController : ControllerBase
    {
        private readonly IProductRepository _productRepository;

        public ProductsController(IProductRepository productRepository)
        {
            _productRepository = productRepository;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Product>>> GetAvailableProducts()
        {
            var products = await _productRepository.GetAvailableProductsAsync();
            return Ok(products);
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

        // Only authenticated users (Sellers/Admins) can add products
        [Authorize]
        [HttpPost]
        public async Task<ActionResult<Product>> CreateProduct(Product product)
        {
            // In a real scenario, SellerId comes from User.FindFirst(ClaimTypes.NameIdentifier)
            var created = await _productRepository.AddAsync(product);
            return CreatedAtAction(nameof(GetProduct), new { id = created.Id }, created);
        }

        [HttpPost("seed")]
        public async Task<ActionResult<Product>> SeedProduct(Product product)
        {
            // Temporary open endpoint for seeding
            var created = await _productRepository.AddAsync(product);
            return CreatedAtAction(nameof(GetProduct), new { id = created.Id }, created);
        }
    }
}
