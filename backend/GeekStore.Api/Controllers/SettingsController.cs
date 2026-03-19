using GeekStore.Core.Entities;
using GeekStore.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;

namespace GeekStore.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SettingsController : ControllerBase
    {
        private readonly GeekStoreDbContext _context;

        public SettingsController(GeekStoreDbContext context)
        {
            _context = context;
        }

        [HttpGet("seller-fee")]
        public async Task<ActionResult<string>> GetSellerFee()
        {
            var fee = await _context.SystemSettings.FirstOrDefaultAsync(s => s.Key == "SellerMonthlyFee");
            return Ok(fee?.Value ?? "1.00");
        }

        [Authorize]
        [HttpPut("seller-fee")]
        public async Task<IActionResult> UpdateSellerFee([FromBody] UpdateFeeRequest request)
        {
            var feeSetting = await _context.SystemSettings.FirstOrDefaultAsync(s => s.Key == "SellerMonthlyFee");
            if (feeSetting == null)
            {
                feeSetting = new SystemSetting { Key = "SellerMonthlyFee", Value = request.NewFee };
                _context.SystemSettings.Add(feeSetting);
            }
            else
            {
                feeSetting.Value = request.NewFee;
            }
            await _context.SaveChangesAsync();
            return Ok(new { Fee = feeSetting.Value });
        }
    }

    public class UpdateFeeRequest
    {
        public string NewFee { get; set; } = string.Empty;
    }
}
