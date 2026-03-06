using GeekStore.Application.Interfaces;
using GeekStore.Core.Entities;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace GeekStore.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        // DTOs defined inline for scaffolding brevity
        public record LoginDto(string Email, string Password);
        public record RegisterDto(string Name, string Surname, string Nickname, string Email, string Password);

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            var token = await _authService.LoginAsync(dto.Email, dto.Password);
            if (string.IsNullOrEmpty(token)) return Unauthorized();
            return Ok(new { Token = token });
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto dto)
        {
            var user = new User
            {
                Name = dto.Name,
                Surname = dto.Surname,
                Nickname = dto.Nickname,
                Email = dto.Email,
                Role = "Seller"
            };

            var createdUser = await _authService.RegisterAsync(user, dto.Password);
            return Ok(createdUser);
        }
    }
}
