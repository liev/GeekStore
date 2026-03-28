using GeekStore.Core.Entities;
using GeekStore.Core.Interfaces;
using GeekStore.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GeekStore.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin")]
    public class AdminController : ControllerBase
    {
        private readonly GeekStoreDbContext _context;
        private readonly INotificationRepository _notificationRepo;

        public AdminController(GeekStoreDbContext context, INotificationRepository notificationRepo)
        {
            _context = context;
            _notificationRepo = notificationRepo;
        }

        [HttpGet("users")]
        public async Task<ActionResult<IEnumerable<object>>> GetUsers()
        {
            var users = await _context.Users.OrderByDescending(u => u.Id).ToListAsync();
            return Ok(users.Select(u => new {
                u.Id, u.Name, u.Surname, u.Nickname, u.Email, u.Role,
                u.IsActive, u.SubscriptionPlan, u.SubscriptionEndDate, u.AutoRenew,
                u.PhoneNumber, u.CreatedAt
            }));
        }

        [HttpPut("users/{id}/toggle-ban")]
        public async Task<IActionResult> ToggleBanState(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound();

            user.IsActive = !user.IsActive;

            // If banned, hide all their products
            if (!user.IsActive)
            {
                var products = await _context.Products.Where(p => p.SellerId == id).ToListAsync();
                foreach (var p in products) p.IsActive = false;
            }

            await _context.SaveChangesAsync();
            return Ok(user);
        }

        public class GrantPlanRequest
        {
            public string Plan { get; set; } = "Licencia Mercante";
            public System.DateTime? EndDate { get; set; }
        }

        [HttpPost("users/{id}/grant-plan")]
        public async Task<IActionResult> GrantPlan(int id, [FromBody] GrantPlanRequest request)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound();

            user.Role = "Seller";
            user.SubscriptionPlan = request.Plan;
            user.SubscriptionEndDate = request.EndDate;
            user.AutoRenew = false;
            
            // Unban if banned
            if (!user.IsActive)
            {
                user.IsActive = true;
                // Reactivate products
                var products = await _context.Products.Where(p => p.SellerId == id).ToListAsync();
                foreach (var p in products) p.IsActive = true;
            }

            await _context.SaveChangesAsync();
            return Ok(user);
        }

        public class UpdateFeeRequest
        {
            public decimal NewFee { get; set; }
        }

        [HttpPut("settings/fees")]
        public async Task<IActionResult> UpdateSellerFee([FromBody] UpdateFeeRequest request)
        {
            var feeSetting = await _context.SystemSettings.FirstOrDefaultAsync(s => s.Key == "SellerMonthlyFee");
            decimal oldFee = 0;
            if (feeSetting == null)
            {
                feeSetting = new SystemSetting { Key = "SellerMonthlyFee", Value = request.NewFee.ToString() };
                _context.SystemSettings.Add(feeSetting);
            }
            else
            {
                if (!decimal.TryParse(feeSetting.Value, out oldFee)) oldFee = 0;
                feeSetting.Value = request.NewFee.ToString();
            }

            // Notification to all sellers if fee increased
            if (request.NewFee > oldFee)
            {
                var sellers = await _context.Users.Where(u => u.Role == "Seller").ToListAsync();
                foreach (var seller in sellers)
                {
                    await _notificationRepo.AddAsync(new Notification
                    {
                        UserId = seller.Id,
                        Title = "Actualización de Tarifas del Gremio",
                        Message = $"Saludos. El coste del Contrato Mercantil ha cambiado a ₡{request.NewFee}. Este cambio aplicará en tu próxima renovación.",
                        Type = "System"
                    });
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new { Fee = request.NewFee });
        }

        public class ModerationRequest
        {
            public string Reason { get; set; } = string.Empty;
        }

        [HttpPost("users/{id}/warn")]
        public async Task<IActionResult> WarnUser(int id, [FromBody] ModerationRequest request)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound();

            await _notificationRepo.AddAsync(new Notification
            {
                UserId = id,
                Title = "Advertencia de la Administración",
                Message = request.Reason,
                Type = "Alert"
            });

            await _context.SaveChangesAsync();
            return Ok(new { message = "Warning sent." });
        }

        [HttpDelete("products/{id}")]
        public async Task<IActionResult> ModerateProduct(int id, [FromBody] ModerationRequest request)
        {
            var product = await _context.Products.FindAsync(id);
            if (product == null) return NotFound();

            product.IsActive = false;
            
            await _notificationRepo.AddAsync(new Notification
            {
                UserId = product.SellerId,
                Title = "Reporte de Moderación",
                Message = $"Tu artículo '{product.Name}' ha sido eliminado por moderación. Razón: {request.Reason}",
                Type = "Alert"
            });

            await _context.SaveChangesAsync();
            return Ok(new { message = "Product soft-deleted and seller notified." });
        }

        [HttpGet("reviews")]
        public async Task<IActionResult> GetAllReviews()
        {
            var reviews = await _context.Reviews
                .Include(r => r.Seller)
                .Include(r => r.Reviewer)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new {
                    id = r.Id,
                    rating = r.Rating,
                    comment = r.Comment,
                    createdAt = r.CreatedAt,
                    sellerId = r.SellerId,
                    sellerNickname = r.Seller!.Nickname,
                    reviewerId = r.ReviewerId,
                    reviewerNickname = r.Reviewer!.Nickname
                })
                .ToListAsync();

            return Ok(reviews);
        }

        [HttpDelete("reviews/{id}")]
        public async Task<IActionResult> DeleteReview(int id)
        {
            var review = await _context.Reviews.FindAsync(id);
            if (review == null) return NotFound();

            _context.Reviews.Remove(review);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpGet("disputes")]
        public async Task<IActionResult> GetAllDisputes()
        {
            var disputes = await _context.Disputes
                .Include(d => d.Order)
                .Include(d => d.InitiatorUser)
                .Include(d => d.TargetUser)
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
                    orderTotal = d.Order!.TotalAmountCRC
                })
                .ToListAsync();

            return Ok(disputes);
        }

        public class ResolveDisputeRequest
        {
            public string Resolution { get; set; } = string.Empty;
            public bool IssueRefund { get; set; } = false;
            public decimal RefundAmount { get; set; } = 0m;
            /// <summary>UserId of the refund beneficiary. Defaults to the dispute initiator if not specified.</summary>
            public int? RefundBeneficiaryUserId { get; set; }
        }

        [HttpPut("disputes/{id}/resolve")]
        public async Task<IActionResult> ResolveDispute(int id, [FromBody] ResolveDisputeRequest request)
        {
            var dispute = await _context.Disputes.FindAsync(id);
            if (dispute == null) return NotFound();
            if (dispute.Status == "Resolved")
                return BadRequest(new { message = "Esta disputa ya fue resuelta. No se puede resolver dos veces." });

            dispute.Status = "Resolved";
            dispute.AdminResolution = request.Resolution;
            dispute.ResolvedAt = System.DateTime.UtcNow;

            // Optionally create a refund
            if (request.IssueRefund && request.RefundAmount > 0)
            {
                var beneficiary = request.RefundBeneficiaryUserId ?? dispute.InitiatorUserId;
                var refund = new GeekStore.Core.Entities.Refund
                {
                    DisputeId = dispute.Id,
                    BeneficiaryUserId = beneficiary,
                    Amount = request.RefundAmount,
                    Status = "Pending",
                    Notes = $"Emitido por resolución de disputa #{dispute.Id}"
                };
                _context.Refunds.Add(refund);

                await _notificationRepo.AddAsync(new Notification
                {
                    UserId = beneficiary,
                    Title = "Reembolso Emitido",
                    Message = $"Se ha emitido un reembolso de ₡{request.RefundAmount:N0} relacionado a la orden #{dispute.OrderId}. El administrador lo procesará en breve.",
                    Type = "System"
                });
            }

            await _notificationRepo.AddAsync(new Notification
            {
                UserId = dispute.InitiatorUserId,
                Title = "Resolución de Disputa P2P",
                Message = $"La disputa que iniciaste por la orden #{dispute.OrderId} recibió un fallo administrativo: {request.Resolution}",
                Type = "Alert"
            });

            await _notificationRepo.AddAsync(new Notification
            {
                UserId = dispute.TargetUserId,
                Title = "Resolución de Disputa P2P",
                Message = $"Una disputa en la que figurabas como contraparte por la orden #{dispute.OrderId} recibió fallo del gremio: {request.Resolution}",
                Type = "Alert"
            });

            await _context.SaveChangesAsync();
            return Ok(new { message = "Disputa resuelta y usuarios notificados.", refundCreated = request.IssueRefund && request.RefundAmount > 0 });
        }

        [HttpGet("refunds")]
        public async Task<IActionResult> GetAllRefunds()
        {
            var refunds = await _context.Refunds
                .Include(r => r.BeneficiaryUser)
                .Include(r => r.Dispute)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new {
                    id = r.Id,
                    disputeId = r.DisputeId,
                    orderId = r.Dispute!.OrderId,
                    beneficiaryId = r.BeneficiaryUserId,
                    beneficiaryNickname = r.BeneficiaryUser!.Nickname ?? r.BeneficiaryUser.Name,
                    amount = r.Amount,
                    status = r.Status,
                    createdAt = r.CreatedAt,
                    processedAt = r.ProcessedAt,
                    notes = r.Notes
                })
                .ToListAsync();

            return Ok(refunds);
        }

        public class ProcessRefundRequest
        {
            public string? Notes { get; set; }
        }

        [HttpPut("refunds/{id}/process")]
        public async Task<IActionResult> ProcessRefund(int id, [FromBody] ProcessRefundRequest? request)
        {
            var refund = await _context.Refunds
                .Include(r => r.BeneficiaryUser)
                .FirstOrDefaultAsync(r => r.Id == id);
            if (refund == null) return NotFound();

            if (refund.Status != "Pending")
                return BadRequest(new { message = $"El reembolso ya fue procesado (estado actual: {refund.Status}). No se puede procesar dos veces." });

            refund.Status = "Processed";
            refund.ProcessedAt = System.DateTime.UtcNow;
            if (!string.IsNullOrWhiteSpace(request?.Notes))
                refund.Notes = request.Notes;

            await _notificationRepo.AddAsync(new Notification
            {
                UserId = refund.BeneficiaryUserId,
                Title = "Reembolso Procesado",
                Message = $"Tu reembolso de ₡{refund.Amount:N0} ha sido procesado. Verifica tu método de pago original.",
                Type = "System"
            });

            await _context.SaveChangesAsync();
            return Ok(new { message = "Reembolso marcado como procesado." });
        }

        [HttpPut("refunds/{id}/reject")]
        public async Task<IActionResult> RejectRefund(int id, [FromBody] ProcessRefundRequest? request)
        {
            var refund = await _context.Refunds.FindAsync(id);
            if (refund == null) return NotFound();

            if (refund.Status != "Pending")
                return BadRequest(new { message = $"El reembolso ya fue procesado (estado actual: {refund.Status}). No se puede modificar." });

            refund.Status = "Rejected";
            refund.ProcessedAt = System.DateTime.UtcNow;
            if (!string.IsNullOrWhiteSpace(request?.Notes))
                refund.Notes = request.Notes;

            await _notificationRepo.AddAsync(new Notification
            {
                UserId = refund.BeneficiaryUserId,
                Title = "Reembolso Rechazado",
                Message = $"Tu solicitud de reembolso de ₡{refund.Amount:N0} fue revisada y no procede en esta ocasión.{(request?.Notes != null ? $" Nota: {request.Notes}" : "")}",
                Type = "Alert"
            });

            await _context.SaveChangesAsync();
            return Ok(new { message = "Reembolso marcado como rechazado." });
        }

        [HttpDelete("users/{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound();

            // Permanent closure (Soft delete logic same as DeleteMe but administrative)
            user.IsActive = false;
            user.SubscriptionPlan = "Permanently Closed";
            user.AutoRenew = false;
            
            var products = await _context.Products.Where(p => p.SellerId == id).ToListAsync();
            foreach (var p in products) p.IsActive = false;

            await _context.SaveChangesAsync();
            return Ok(new { message = "Usuario cerrado permanentemente por la administración." });
        }

        // ── Product Reports ───────────────────────────────────────────────

        [HttpGet("product-reports")]
        public async Task<IActionResult> GetProductReports([FromQuery] string? status = null)
        {
            var query = _context.ProductReports
                .Include(r => r.Product)
                .Include(r => r.ReporterUser)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(r => r.Status == status);

            var reports = await query
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new {
                    r.Id,
                    r.ProductId,
                    productName = r.Product!.Name,
                    productIsActive = r.Product.IsActive,
                    r.ReporterUserId,
                    reporterNickname = r.ReporterUser!.Nickname ?? r.ReporterUser.Name,
                    r.ReasonCategory,
                    r.Details,
                    r.Status,
                    r.CreatedAt,
                    r.ReviewedAt,
                    r.AdminNotes
                })
                .ToListAsync();

            return Ok(reports);
        }

        public class ReviewReportRequest
        {
            public string? AdminNotes { get; set; }
            /// <summary>If true, the reported product will be deactivated.</summary>
            public bool DeactivateProduct { get; set; } = false;
        }

        [HttpPut("product-reports/{id}/review")]
        public async Task<IActionResult> ReviewProductReport(int id, [FromBody] ReviewReportRequest request)
        {
            var report = await _context.ProductReports
                .Include(r => r.Product)
                .Include(r => r.ReporterUser)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (report == null) return NotFound();
            if (report.Status != "Pending") return BadRequest(new { message = "Este reporte ya fue revisado." });

            report.Status = "Reviewed";
            report.ReviewedAt = DateTime.UtcNow;
            report.AdminNotes = request.AdminNotes;

            if (request.DeactivateProduct && report.Product != null)
            {
                report.Product.IsActive = false;

                await _notificationRepo.AddAsync(new Notification
                {
                    UserId = report.Product.SellerId,
                    Title = "Publicación Desactivada",
                    Message = $"Tu publicación \"{report.Product.Name}\" fue desactivada por el equipo de moderación tras recibir un reporte.",
                    Type = "Alert"
                });
            }

            // Notify reporter
            await _notificationRepo.AddAsync(new Notification
            {
                UserId = report.ReporterUserId,
                Title = "Reporte Revisado",
                Message = $"Tu reporte sobre \"{report.Product?.Name ?? $"producto #{report.ProductId}"}\" fue revisado por el equipo de moderación. Gracias por contribuir a la comunidad.",
                Type = "System"
            });

            await _context.SaveChangesAsync();
            return Ok(new { message = "Reporte marcado como revisado." });
        }

        [HttpPut("product-reports/{id}/dismiss")]
        public async Task<IActionResult> DismissProductReport(int id)
        {
            var report = await _context.ProductReports.FindAsync(id);
            if (report == null) return NotFound();
            if (report.Status != "Pending") return BadRequest(new { message = "Este reporte ya fue procesado." });

            report.Status = "Dismissed";
            report.ReviewedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(new { message = "Reporte descartado." });
        }
    }
}
