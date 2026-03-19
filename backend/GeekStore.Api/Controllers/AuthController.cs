using GeekStore.Application.Interfaces;
using GeekStore.Core.Entities;
using GeekStore.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace GeekStore.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly IEmailService _emailService;
        private readonly IRepository<User> _userRepository;

        public AuthController(IAuthService authService, IEmailService emailService, IRepository<User> userRepository)
        {
            _authService = authService;
            _emailService = emailService;
            _userRepository = userRepository;
        }

        public record LoginDto(string Email, string Password);
        public record RegisterDto(string Name, string Surname, string Nickname, string Email, string Password);
        public record VerifyDto(string Email, string Code);

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            var users = await _userRepository.ListAllAsync();
            var user = users.FirstOrDefault(u => u.Email == dto.Email);

            if (user != null && !user.IsVerified)
                return BadRequest(new { message = "EMAIL_NOT_VERIFIED" });

            var token = await _authService.LoginAsync(dto.Email, dto.Password);
            if (string.IsNullOrEmpty(token)) return Unauthorized();
            return Ok(new { Token = token });
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto dto)
        {
            // Check if email already exists
            var existing = await _userRepository.ListAllAsync();
            if (existing.Any(u => u.Email == dto.Email))
                return BadRequest(new { message = "Este correo ya está registrado." });

            // Generate 6-digit code
            var code = new Random().Next(100000, 999999).ToString();

            var user = new User
            {
                Name = dto.Name,
                Surname = dto.Surname,
                Nickname = dto.Nickname,
                Email = dto.Email,
                Role = "Seller",
                IsVerified = false,
                VerificationCode = code,
                VerificationCodeExpiry = DateTime.UtcNow.AddMinutes(15)
            };

            var createdUser = await _authService.RegisterAsync(user, dto.Password);

            // Send verification email (fire-and-forget on error to not block registration)
            try
            {
                await _emailService.SendVerificationEmailAsync(dto.Email, dto.Name, code);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Email] Failed to send verification: {ex.Message}");
                // In dev: log the code to console so we can verify manually
                Console.WriteLine($"[DEV] Verification code for {dto.Email}: {code}");
            }

            return Ok(new { message = "Registro exitoso. Revisa tu correo para verificar tu cuenta.", userId = createdUser.Id });
        }

        [HttpPost("verify-email")]
        public async Task<IActionResult> VerifyEmail([FromBody] VerifyDto dto)
        {
            var users = await _userRepository.ListAllAsync();
            var user = users.FirstOrDefault(u => u.Email == dto.Email);

            if (user == null)
                return NotFound(new { message = "Usuario no encontrado." });

            if (user.IsVerified)
                return Ok(new { message = "La cuenta ya está verificada." });

            if (user.VerificationCode != dto.Code)
                return BadRequest(new { message = "Código incorrecto." });

            if (user.VerificationCodeExpiry < DateTime.UtcNow)
                return BadRequest(new { message = "El código ha expirado. Solicita uno nuevo." });

            user.IsVerified = true;
            user.VerificationCode = null;
            user.VerificationCodeExpiry = null;
            await _userRepository.UpdateAsync(user);

            return Ok(new { message = "¡Cuenta verificada! Ya puedes iniciar sesión." });
        }

        [HttpPost("resend-code")]
        public async Task<IActionResult> ResendCode([FromBody] string email)
        {
            var users = await _userRepository.ListAllAsync();
            var user = users.FirstOrDefault(u => u.Email == email);

            if (user == null || user.IsVerified)
                return BadRequest(new { message = "No se puede reenviar el código." });

            var code = new Random().Next(100000, 999999).ToString();
            user.VerificationCode = code;
            user.VerificationCodeExpiry = DateTime.UtcNow.AddMinutes(15);
            await _userRepository.UpdateAsync(user);

            try { await _emailService.SendVerificationEmailAsync(user.Email, user.Name, code); }
            catch (Exception ex) { Console.WriteLine($"[Email] {ex.Message}\n[DEV] Code: {code}"); }

            return Ok(new { message = "Código reenviado." });
        }
    }
}
