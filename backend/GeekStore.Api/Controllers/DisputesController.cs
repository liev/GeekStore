using GoblinSpot.Core.Entities;
using GoblinSpot.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace GoblinSpot.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class DisputesController : ControllerBase
    {
        private readonly GoblinSpotDbContext _context;

        public DisputesController(GoblinSpotDbContext context)
        {
            _context = context;
        }

        public class OpenDisputeRequest
        {
            public int OrderId { get; set; }
            public string Reason { get; set; } = string.Empty;
        }

        [HttpPost]
        public async Task<IActionResult> OpenDispute([FromBody] OpenDisputeRequest request)
        {
            if (request == null || request.OrderId <= 0 || string.IsNullOrWhiteSpace(request.Reason))
                return BadRequest(new { message = "Datos de disputa inválidos. Se requiere OrderId y Reason." });

            try
            {
                var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out int userId)) 
                    return Unauthorized(new { message = "Usuario no autenticado correctamente." });

                // Load order including basic properties
                var order = await _context.Orders.AsNoTracking().FirstOrDefaultAsync(o => o.Id == request.OrderId);
                if (order == null) return NotFound(new { message = $"Orden #{request.OrderId} no encontrada." });

                // Check authorization
                if (order.BuyerId != userId && order.SellerId != userId)
                {
                    return Forbid();
                }

                // Check for existing active dispute
                var existingDispute = await _context.Disputes
                    .AnyAsync(d => d.OrderId == request.OrderId && d.Status != "Closed");
                if (existingDispute)
                {
                    return BadRequest(new { message = "Ya existe una disputa activa para esta orden." });
                }

                var dispute = new Dispute
                {
                    OrderId = request.OrderId,
                    InitiatorUserId = userId,
                    TargetUserId = (userId == order.BuyerId) ? order.SellerId : order.BuyerId,
                    Reason = request.Reason.Trim(),
                    Status = "Open",
                    CreatedAt = System.DateTime.UtcNow
                };

                _context.Disputes.Add(dispute);
                await _context.SaveChangesAsync();
                
                return Ok(new { 
                    message = "Disputa abierta correctamente", 
                    disputeId = dispute.Id,
                    status = dispute.Status 
                });
            }
            catch (System.Exception ex)
            {
                // Log the full exception server-side; never expose internals to clients
                Console.Error.WriteLine($"[DisputesController] OpenDispute error: {ex}");
                return StatusCode(500, new {
                    message = "Error interno al procesar la disputa. Por favor intenta más tarde."
                });
            }
        }

        [HttpGet("my-disputes")]
        public async Task<IActionResult> GetMyDisputes()
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdStr, out int userId)) return Unauthorized();

            var disputes = await _context.Disputes
                .Include(d => d.Order)
                .Include(d => d.InitiatorUser)
                .Include(d => d.TargetUser)
                .Where(d => d.InitiatorUserId == userId || d.TargetUserId == userId)
                .OrderByDescending(d => d.CreatedAt)
                .Select(d => new {
                    id = d.Id,
                    orderId = d.OrderId,
                    initiator = new { id = d.InitiatorUser!.Id, name = d.InitiatorUser.Nickname ?? d.InitiatorUser.Name },
                    target = new { id = d.TargetUser!.Id, name = d.TargetUser.Nickname ?? d.TargetUser.Name },
                    reason = d.Reason,
                    status = d.Status,
                    createdAt = d.CreatedAt,
                    adminResolution = d.AdminResolution,
                    resolvedAt = d.ResolvedAt,
                    orderTotal = d.Order!.TotalAmountCRC
                })
                .ToListAsync();

            return Ok(disputes);
        }

        [HttpGet("my-refunds")]
        public async Task<IActionResult> GetMyRefunds()
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdStr, out int userId)) return Unauthorized();

            var refunds = await _context.Refunds
                .Include(r => r.Dispute)
                .Where(r => r.BeneficiaryUserId == userId)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new {
                    id = r.Id,
                    disputeId = r.DisputeId,
                    orderId = r.Dispute!.OrderId,
                    amount = r.Amount,
                    status = r.Status,
                    createdAt = r.CreatedAt,
                    processedAt = r.ProcessedAt,
                    notes = r.Notes
                })
                .ToListAsync();

            return Ok(refunds);
        }

        [HttpPost("{id}/appeal")]
        public async Task<IActionResult> AppealDispute(int id)
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdStr, out int userId)) return Unauthorized();

            var dispute = await _context.Disputes.FindAsync(id);
            if (dispute == null) return NotFound(new { message = "Disputa no encontrada." });

            if (dispute.InitiatorUserId != userId && dispute.TargetUserId != userId)
                return Forbid();

            if (dispute.Status != "Resolved")
                return BadRequest(new { message = "Solo se pueden apelar disputas resueltas." });

            if (dispute.ResolvedAt.HasValue && DateTime.UtcNow - dispute.ResolvedAt.Value > TimeSpan.FromHours(48))
                return BadRequest(new { message = "El plazo de 48 horas para apelar ha expirado." });

            dispute.Status = "Appealed";
            await _context.SaveChangesAsync();

            return Ok(new { message = "Apelación enviada. Un administrador revisará el caso pronto." });
        }
    }
}
