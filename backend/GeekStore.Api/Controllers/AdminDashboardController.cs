using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using GeekStore.Application.Interfaces;
using GeekStore.Core.Entities;
using GeekStore.Core.Interfaces;
using GeekStore.Core.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GeekStore.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin")]
    public class AdminDashboardController : ControllerBase
    {
        private readonly IRepository<User> _userRepository;
        private readonly IRepository<Product> _productRepository;
        private readonly ISellerAnalysisService _aiService;

        public AdminDashboardController(
            IRepository<User> userRepository, 
            IRepository<Product> productRepository,
            ISellerAnalysisService aiService)
        {
            _userRepository = userRepository;
            _productRepository = productRepository;
            _aiService = aiService;
        }

        [HttpGet("inventory-stats")]
        public async Task<IActionResult> GetInventoryStats()
        {
            var users = await _userRepository.ListAllAsync();
            var sellers = users.Where(u => u.Role == "Seller").ToList();
            var allProducts = await _productRepository.ListAllAsync();

            var stats = new AdminInventoryStatsDto();
            
            foreach (var seller in sellers)
            {
                var sellerProducts = allProducts.Where(p => p.SellerId == seller.Id).ToList();
                var sellerStat = new SellerStatDto
                {
                    SellerId = seller.Id,
                    SellerName = $"{seller.Name} {seller.Surname}",
                    MonthlyFee = seller.MonthlyFee,
                    Benefits = seller.Benefits,
                    Products = sellerProducts.Select(p => new ProductStatDto
                    {
                        Id = p.Id,
                        Name = p.Name,
                        CartAdditionCount = p.CartAdditionCount,
                        Status = p.StockStatus,
                        DaysOld = (DateTime.UtcNow - p.CreatedAt).Days
                    }).ToList()
                };
                stats.Sellers.Add(sellerStat);
            }

            stats.TotalProducts = allProducts.Count();
            stats.TotalCartAdditions = allProducts.Sum(p => p.CartAdditionCount);

            return Ok(stats);
        }

        [HttpGet("seller-ai-analysis")]
        public async Task<IActionResult> GetAIAnalysis()
        {
            var statsResult = await GetInventoryStats() as OkObjectResult;
            var stats = statsResult?.Value as AdminInventoryStatsDto;

            if (stats == null || !stats.Sellers.Any())
                return Ok(new SellerAIAnalysisDto { GlobalSummary = "No hay data suficiente para el análisis." });

            var analysis = await _aiService.AnalyzeSellersAsync(stats.Sellers);
            return Ok(analysis);
        }

        [HttpPut("update-seller-config/{id}")]
        public async Task<IActionResult> UpdateSellerConfig(int id, [FromBody] SellerConfigUpdateDto dto)
        {
            var user = await _userRepository.GetByIdAsync(id);
            if (user == null) return NotFound();

            user.MonthlyFee = dto.MonthlyFee;
            user.Benefits = dto.Benefits;

            await _userRepository.UpdateAsync(user);
            return Ok(new { message = "Configuración actualizada" });
        }

        public record SellerConfigUpdateDto(decimal? MonthlyFee, string? Benefits);
    }
}
