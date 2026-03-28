using GeekStore.Core.Entities;
using GeekStore.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace GeekStore.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class UserBlocksController : ControllerBase
    {
        private readonly GeekStoreDbContext _context;

        public UserBlocksController(GeekStoreDbContext context)
        {
            _context = context;
        }

        [HttpPost("{targetId}")]
        public async Task<IActionResult> BlockUser(int targetId)
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdStr, out int userId)) return Unauthorized();
            if (userId == targetId) return BadRequest(new { message = "No puedes bloquearte a ti mismo." });

            var target = await _context.Users.FindAsync(targetId);
            if (target == null) return NotFound(new { message = "Usuario no encontrado." });

            var existing = await _context.UserBlocks
                .FirstOrDefaultAsync(ub => ub.BlockerId == userId && ub.BlockedUserId == targetId);
            if (existing != null) return Conflict(new { message = "Ya tienes a este usuario bloqueado." });

            _context.UserBlocks.Add(new UserBlock
            {
                BlockerId = userId,
                BlockedUserId = targetId,
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
            return Ok(new { message = $"Usuario {target.Nickname ?? target.Name} bloqueado correctamente." });
        }

        [HttpDelete("{targetId}")]
        public async Task<IActionResult> UnblockUser(int targetId)
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdStr, out int userId)) return Unauthorized();

            var block = await _context.UserBlocks
                .FirstOrDefaultAsync(ub => ub.BlockerId == userId && ub.BlockedUserId == targetId);
            if (block == null) return NotFound(new { message = "No tienes a este usuario bloqueado." });

            _context.UserBlocks.Remove(block);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Usuario desbloqueado." });
        }

        [HttpGet("my-blocks")]
        public async Task<IActionResult> GetMyBlocks()
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdStr, out int userId)) return Unauthorized();

            var blocks = await _context.UserBlocks
                .Include(ub => ub.BlockedUser)
                .Where(ub => ub.BlockerId == userId)
                .OrderByDescending(ub => ub.CreatedAt)
                .Select(ub => new {
                    blockedUserId = ub.BlockedUserId,
                    nickname = ub.BlockedUser!.Nickname ?? ub.BlockedUser.Name,
                    blockedAt = ub.CreatedAt
                })
                .ToListAsync();

            return Ok(blocks);
        }

        /// <summary>Returns IDs of users the caller has blocked — used by catalog to filter products.</summary>
        [HttpGet("my-block-ids")]
        public async Task<IActionResult> GetMyBlockIds()
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdStr, out int userId)) return Unauthorized();

            var ids = await _context.UserBlocks
                .Where(ub => ub.BlockerId == userId)
                .Select(ub => ub.BlockedUserId)
                .ToListAsync();

            return Ok(ids);
        }
    }
}
