using GeekStore.Core.Entities;
using GeekStore.Core.Interfaces;
using GeekStore.Core.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace GeekStore.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ReportsController : ControllerBase
    {
        private readonly IProductReportRepository _reportRepo;
        private readonly IProductRepository _productRepo;
        private readonly INotificationRepository _notificationRepo;

        public ReportsController(
            IProductReportRepository reportRepo,
            IProductRepository productRepo,
            INotificationRepository notificationRepo)
        {
            _reportRepo = reportRepo;
            _productRepo = productRepo;
            _notificationRepo = notificationRepo;
        }

        [Authorize]
        [HttpPost("{productId}")]
        public async Task<IActionResult> CreateReport(int productId, [FromBody] CreateProductReportRequest request)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null || !int.TryParse(userIdClaim, out int reporterId))
                return Unauthorized();

            var product = await _productRepo.GetByIdAsync(productId);
            if (product == null)
                return NotFound(new { message = "Producto no encontrado." });

            // Ensure a user cannot report the same product twice
            var alreadyReported = await _reportRepo.HasUserReportedProductAsync(reporterId, productId);
            if (alreadyReported)
                return BadRequest(new { message = "Ya has reportado este producto anteriormente." });

            var report = new ProductReport
            {
                ProductId = productId,
                ReporterUserId = reporterId,
                ReasonCategory = request.ReasonCategory,
                Details = request.Details,
                Status = "Pending",
                CreatedAt = DateTime.UtcNow
            };

            await _reportRepo.AddAsync(report);
            return Ok(new { message = "Reporte enviado exitosamente." });
        }

        [Authorize(Roles = "Admin")]
        [HttpGet("admin")]
        public async Task<IActionResult> GetPendingReports([FromQuery] int page = 1, [FromQuery] int pageSize = 50)
        {
            var pagedResult = await _reportRepo.GetPendingReportsAsync(page, pageSize);

            var dtos = pagedResult.Items.Select(r => new ProductReportDto
            {
                Id = r.Id,
                ProductId = r.ProductId,
                ProductName = r.Product?.Name ?? "Desconocido",
                ReporterUserId = r.ReporterUserId,
                ReporterName = r.ReporterUser?.Nickname ?? "Desconocido",
                ReasonCategory = r.ReasonCategory,
                Details = r.Details,
                Status = r.Status,
                CreatedAt = r.CreatedAt
            }).ToList();

            return Ok(new PagedResult<ProductReportDto>
            {
                Items = dtos,
                TotalCount = pagedResult.TotalCount,
                Page = pagedResult.Page,
                PageSize = pagedResult.PageSize
            });
        }

        [Authorize(Roles = "Admin")]
        [HttpPut("admin/{id}/resolve")]
        public async Task<IActionResult> ResolveReport(int id, [FromBody] ResolveProductReportRequest request)
        {
            var report = await _reportRepo.GetByIdAsync(id);
            if (report == null) return NotFound(new { message = "Reporte no encontrado." });
            if (report.Status != "Pending") return BadRequest(new { message = "Solo se pueden resolver reportes pendientes." });

            var product = await _productRepo.GetByIdAsync(report.ProductId);
            if (product != null)
            {
                // Deactivate the product
                product.IsActive = false;
                product.StockStatus = "Suspended";
                await _productRepo.UpdateAsync(product);

                // Send notification to the seller
                var notification = new Notification
                {
                    UserId = product.SellerId,
                    Title = "Producto Desactivado",
                    Message = $"Tu producto '{product.Name}' ha sido desactivado tras la revisión de un reporte por: {report.ReasonCategory}.",
                    Type = "System",
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                };
                await _notificationRepo.AddAsync(notification);
            }

            report.Status = "ActionTaken";
            report.AdminNotes = request.AdminNotes;
            report.ReviewedAt = DateTime.UtcNow;
            await _reportRepo.UpdateAsync(report);

            return Ok(new { message = "Reporte resuelto y producto desactivado." });
        }

        [Authorize(Roles = "Admin")]
        [HttpPut("admin/{id}/dismiss")]
        public async Task<IActionResult> DismissReport(int id, [FromBody] ResolveProductReportRequest request)
        {
            var report = await _reportRepo.GetByIdAsync(id);
            if (report == null) return NotFound(new { message = "Reporte no encontrado." });
            if (report.Status != "Pending") return BadRequest(new { message = "Solo se pueden desestimar reportes pendientes." });

            report.Status = "Dismissed";
            report.AdminNotes = request.AdminNotes;
            report.ReviewedAt = DateTime.UtcNow;
            await _reportRepo.UpdateAsync(report);

            return Ok(new { message = "Reporte desestimado." });
        }
    }
}
