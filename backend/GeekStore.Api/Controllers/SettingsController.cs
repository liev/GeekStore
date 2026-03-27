using GeekStore.Core.Constants;
using GeekStore.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace GeekStore.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SettingsController : ControllerBase
    {
        private readonly GeekStoreDbContext _context;
        private readonly IConfiguration _config;

        public SettingsController(GeekStoreDbContext context, IConfiguration config)
        {
            _context = context;
            _config = config;
        }

        /// <summary>Legacy endpoint — kept for compatibility.</summary>
        [HttpGet("seller-fee")]
        public async Task<ActionResult<string>> GetSellerFee()
        {
            // Return Worker founder price as the "entry level" fee
            return await Task.FromResult(Ok(SubscriptionPlans.WorkerFounderCrc.ToString("0")));
        }

        [HttpGet("paypal-client-id")]
        public ActionResult<string> GetPayPalClientId()
        {
            var clientId = _config["PayPal:ClientId"];
            if (string.IsNullOrWhiteSpace(clientId) || clientId.StartsWith("SET_VIA"))
                return Ok(new { clientId = "test" });
            return Ok(new { clientId });
        }

        /// <summary>
        /// Returns all subscription plans with live pricing.
        /// Prices are read from SystemSettings (admin-configurable); defaults from SubscriptionPlans constants.
        /// Worker price reflects founder availability.
        /// </summary>
        [HttpGet("plans")]
        public async Task<IActionResult> GetPlans()
        {
            var now = DateTime.UtcNow;

            // Load all plan price overrides from SystemSettings
            var settingKeys = SubscriptionPlans.Catalog.Keys
                .Select(name => $"Plan_{name.Replace(" ", "_")}_CRC")
                .ToList();
            var settings = await _context.SystemSettings
                .Where(s => settingKeys.Contains(s.Key))
                .ToDictionaryAsync(s => s.Key, s => s.Value);

            // Founder Worker availability
            var activeWorkerCount = await _context.Users
                .CountAsync(u => u.SubscriptionPlan == SubscriptionPlans.Worker
                              && u.SubscriptionEndDate.HasValue
                              && u.SubscriptionEndDate.Value > now);
            var founderSlotsLeft = Math.Max(0, SubscriptionPlans.WorkerFounderLimit - activeWorkerCount);
            var isFounderAvailable = founderSlotsLeft > 0;

            var plans = SubscriptionPlans.Catalog.Values.Select(p =>
            {
                var settingKey = $"Plan_{p.Name.Replace(" ", "_")}_CRC";
                var baseCrc = settings.TryGetValue(settingKey, out var stored) && decimal.TryParse(stored, out var v)
                    ? v
                    : p.CrcPrice;

                decimal crc, usd;
                if (p.Name == SubscriptionPlans.Worker)
                {
                    if (isFounderAvailable)
                    {
                        crc = baseCrc;                            // Founder price (admin-set or default ₡1,000)
                        usd = Math.Round(crc / 450m, 2);
                    }
                    else
                    {
                        // After founder slots: read regular price or double the base
                        var regularKey = "Plan_Goblin_Worker_Regular_CRC";
                        var regularCrc = settings.TryGetValue(regularKey, out var rv) && decimal.TryParse(rv, out var rval)
                            ? rval
                            : SubscriptionPlans.WorkerRegularCrc;
                        crc = regularCrc;
                        usd = Math.Round(crc / 450m, 2);
                    }
                }
                else
                {
                    crc = baseCrc;
                    usd = Math.Round(crc / 450m, 2);
                }

                return new
                {
                    name             = p.Name,
                    emoji            = p.Emoji,
                    crcPrice         = crc,
                    usdPrice         = usd,
                    maxProducts      = p.MaxProducts == int.MaxValue ? (int?)null : p.MaxProducts,
                    isFounder        = p.Name == SubscriptionPlans.Worker && isFounderAvailable,
                    founderSlotsLeft = p.Name == SubscriptionPlans.Worker ? (int?)founderSlotsLeft : null
                };
            });

            return Ok(plans);
        }

        /// <summary>Admin — update a plan's CRC price.</summary>
        [HttpPut("plans/{planName}/price")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdatePlanPrice(string planName, [FromBody] UpdatePlanPriceRequest request)
        {
            var key = $"Plan_{planName.Replace(" ", "_")}_CRC";
            var setting = await _context.SystemSettings.FirstOrDefaultAsync(s => s.Key == key);
            if (setting == null)
            {
                setting = new GeekStore.Core.Entities.SystemSetting { Key = key, Value = request.CrcPrice.ToString() };
                _context.SystemSettings.Add(setting);
            }
            else
            {
                setting.Value = request.CrcPrice.ToString();
            }
            await _context.SaveChangesAsync();
            return Ok(new { planName, crcPrice = request.CrcPrice });
        }

        public class UpdatePlanPriceRequest
        {
            public decimal CrcPrice { get; set; }
        }
    }
}
