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
    public class DeliveryPointsController : ControllerBase
    {
        private readonly IDeliveryPointRepository _repo;
        public DeliveryPointsController(IDeliveryPointRepository repo) { _repo = repo; }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<DeliveryPoint>>> GetAll()
        {
            var points = await _repo.GetAllAsync();
            return Ok(points);
        }

        [Authorize(Roles = "Admin")]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] DeliveryPoint point)
        {
            point.IsActive = true;
            var created = await _repo.AddAsync(point);
            return CreatedAtAction(nameof(GetAll), new { id = created.Id }, created);
        }

        [Authorize(Roles = "Admin")]
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] DeliveryPoint update)
        {
            var existing = await _repo.GetByIdAsync(id);
            if (existing == null) return NotFound();
            existing.Name = update.Name;
            existing.Description = update.Description;
            existing.LocationUrl = update.LocationUrl;
            existing.IsActive = update.IsActive;
            await _repo.UpdateAsync(existing);
            return NoContent();
        }

        [Authorize(Roles = "Admin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> Deactivate(int id)
        {
            var existing = await _repo.GetByIdAsync(id);
            if (existing == null) return NotFound();
            existing.IsActive = false;
            await _repo.UpdateAsync(existing);
            return NoContent();
        }
    }
}
