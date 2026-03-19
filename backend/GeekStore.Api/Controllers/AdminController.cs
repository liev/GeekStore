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
    // [Authorize(Roles = "Admin")] // In a production app you'd enforce roles, here we'll simplify but keep Authorize
    [Authorize]
    public class AdminController : ControllerBase
    {
        private readonly IRepository<User> _userRepository;

        public AdminController(IRepository<User> userRepository)
        {
            _userRepository = userRepository;
        }

        [HttpGet("users")]
        public async Task<ActionResult<IEnumerable<User>>> GetUsers()
        {
            var users = await _userRepository.ListAllAsync();
            return Ok(users);
        }

        [HttpPut("users/{id}/toggle-ban")]
        public async Task<IActionResult> ToggleBanState(int id)
        {
            var user = await _userRepository.GetByIdAsync(id);
            if (user == null) return NotFound();

            // Toggle IsActive flag
            user.IsActive = !user.IsActive;

            await _userRepository.UpdateAsync(user);

            return Ok(user);
        }
    }
}
