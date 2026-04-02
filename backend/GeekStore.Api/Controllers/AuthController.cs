using GoblinSpot.Application.Interfaces;
using GoblinSpot.Core.Entities;
using GoblinSpot.Core.Interfaces;
using GoblinSpot.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using OtpNet;
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace GoblinSpot.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly IEmailService _emailService;
        private readonly IRepository<User> _userRepository;
        private readonly GoblinSpotDbContext _context;
        private readonly IConfiguration _config;

        public AuthController(IAuthService authService, IEmailService emailService, IRepository<User> userRepository, GoblinSpotDbContext context, IConfiguration config)
        {
            _authService = authService;
            _emailService = emailService;
            _userRepository = userRepository;
            _context = context;
            _config = config;
        }

        public record LoginDto(string Email, string Password);
        public record RegisterDto(string Name, string Surname, string Nickname, string Email, string Password, string? Role);
        public record VerifyDto(string Email, string Code);

        [HttpPost("login")]
        [EnableRateLimiting("auth")]
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);

            if (user != null && !user.IsVerified)
                return BadRequest(new { message = "EMAIL_NOT_VERIFIED" });

            if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
                return Unauthorized();

            if (!user.IsActive)
                return Unauthorized(new { message = "Cuenta desactivada." });

            if (user.TwoFactorEnabled && !string.IsNullOrEmpty(user.TwoFactorSecret))
                return Ok(new { requiresTwoFactor = true, userId = user.Id });

            return Ok(new { Token = GenerateJwtToken(user) });
        }

        [HttpPost("register")]
        [EnableRateLimiting("auth")]
        public async Task<IActionResult> Register([FromBody] RegisterDto dto)
        {
            if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
                return BadRequest(new { message = "Este correo ya está registrado." });

            var code = RandomNumberGenerator.GetInt32(100000, 999999).ToString();

            var user = new User
            {
                Name = dto.Name,
                Surname = dto.Surname,
                Nickname = dto.Nickname,
                Email = dto.Email,
                Role = dto.Role ?? "Forastero",
                IsVerified = false,
                VerificationCode = code,
                VerificationCodeExpiry = DateTime.UtcNow.AddMinutes(15)
            };

            var createdUser = await _authService.RegisterAsync(user, dto.Password);

            try { await _emailService.SendVerificationEmailAsync(dto.Email, dto.Name, code); }
            catch (Exception ex)
            {
                Console.WriteLine($"[Email] Failed to send verification: {ex.Message}");
                Console.WriteLine($"[DEV] Verification code for {dto.Email}: {code}");
            }

            return Ok(new { message = "Registro exitoso. Revisa tu correo para verificar tu cuenta.", userId = createdUser.Id });
        }

        [HttpPost("verify-email")]
        public async Task<IActionResult> VerifyEmail([FromBody] VerifyDto dto)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
            if (user == null) return NotFound(new { message = "Usuario no encontrado." });
            if (user.IsVerified) return Ok(new { message = "La cuenta ya está verificada." });
            if (user.VerificationCode != dto.Code) return BadRequest(new { message = "Código incorrecto." });
            if (user.VerificationCodeExpiry < DateTime.UtcNow) return BadRequest(new { message = "El código ha expirado. Solicita uno nuevo." });

            user.IsVerified = true;
            user.VerificationCode = null;
            user.VerificationCodeExpiry = null;
            await _userRepository.UpdateAsync(user);

            return Ok(new { message = "¡Cuenta verificada! Ya puedes iniciar sesión." });
        }

        [HttpPost("resend-code")]
        public async Task<IActionResult> ResendCode([FromBody] string email)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user == null || user.IsVerified) return BadRequest(new { message = "No se puede reenviar el código." });

            var code = RandomNumberGenerator.GetInt32(100000, 999999).ToString();
            user.VerificationCode = code;
            user.VerificationCodeExpiry = DateTime.UtcNow.AddMinutes(15);
            await _userRepository.UpdateAsync(user);

            try { await _emailService.SendVerificationEmailAsync(user.Email, user.Name, code); }
            catch (Exception ex) { Console.WriteLine($"[Email] {ex.Message}\n[DEV] Code: {code}"); }

            return Ok(new { message = "Código reenviado." });
        }

        // ── Two-Factor Authentication ──────────────────────────────────────

        [Authorize]
        [HttpPost("2fa/setup")]
        public async Task<IActionResult> Setup2FA()
        {
            if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out int userId)) return Unauthorized();
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return Unauthorized();
            if (user.TwoFactorEnabled) return BadRequest(new { message = "El 2FA ya está activado." });

            var secretBytes = KeyGeneration.GenerateRandomKey(20);
            var base32Secret = Base32Encoding.ToString(secretBytes);
            user.TwoFactorSecret = base32Secret;
            await _context.SaveChangesAsync();

            var issuer = "GoblinSpot";
            var otpAuthUrl = $"otpauth://totp/{issuer}:{Uri.EscapeDataString(user.Email)}?secret={base32Secret}&issuer={issuer}&algorithm=SHA1&digits=6&period=30";
            return Ok(new { secret = base32Secret, otpAuthUrl });
        }

        [Authorize]
        [HttpPost("2fa/activate")]
        public async Task<IActionResult> Activate2FA([FromBody] TwoFACodeRequest request)
        {
            if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out int userId)) return Unauthorized();
            var user = await _context.Users.FindAsync(userId);
            if (user == null || string.IsNullOrEmpty(user.TwoFactorSecret))
                return BadRequest(new { message = "Primero ejecuta el setup de 2FA." });

            var totp = new Totp(Base32Encoding.ToBytes(user.TwoFactorSecret));
            if (!totp.VerifyTotp(request.Code, out _, new VerificationWindow(1, 1)))
                return BadRequest(new { message = "Código inválido. Verifica que tu autenticador esté sincronizado." });

            user.TwoFactorEnabled = true;
            var backupCodes = Enumerable.Range(0, 8)
                .Select(_ => Guid.NewGuid().ToString("N")[..8].ToUpper()).ToList();
            user.TwoFactorBackupCodes = JsonSerializer.Serialize(
                backupCodes.Select(c => BCrypt.Net.BCrypt.HashPassword(c)).ToList());

            await _context.SaveChangesAsync();
            return Ok(new { message = "2FA activado correctamente.", backupCodes });
        }

        [Authorize]
        [HttpPost("2fa/disable")]
        public async Task<IActionResult> Disable2FA([FromBody] DisableTwoFARequest request)
        {
            if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out int userId)) return Unauthorized();
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return Unauthorized();
            if (!user.TwoFactorEnabled) return BadRequest(new { message = "El 2FA no está activado." });
            if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
                return BadRequest(new { message = "Contraseña incorrecta." });

            user.TwoFactorEnabled = false;
            user.TwoFactorSecret = null;
            user.TwoFactorBackupCodes = null;
            await _context.SaveChangesAsync();
            return Ok(new { message = "2FA desactivado correctamente." });
        }

        [HttpPost("2fa/complete-login")]
        public async Task<IActionResult> CompleteTwoFALogin([FromBody] CompleteTwoFALoginRequest request)
        {
            var user = await _context.Users.FindAsync(request.UserId);
            if (user == null || !user.TwoFactorEnabled || string.IsNullOrEmpty(user.TwoFactorSecret))
                return BadRequest(new { message = "Solicitud inválida." });
            if (!user.IsActive) return Unauthorized(new { message = "Cuenta desactivada." });

            var totp = new Totp(Base32Encoding.ToBytes(user.TwoFactorSecret));
            bool valid = totp.VerifyTotp(request.Code, out _, new VerificationWindow(1, 1));

            if (!valid && !string.IsNullOrEmpty(user.TwoFactorBackupCodes))
            {
                var hashed = JsonSerializer.Deserialize<List<string>>(user.TwoFactorBackupCodes) ?? new();
                var idx = hashed.FindIndex(h => BCrypt.Net.BCrypt.Verify(request.Code, h));
                if (idx >= 0) { hashed.RemoveAt(idx); user.TwoFactorBackupCodes = JsonSerializer.Serialize(hashed); valid = true; }
            }

            if (!valid) return BadRequest(new { message = "Código inválido o expirado." });

            await _context.SaveChangesAsync();
            var token = GenerateJwtToken(user);
            return Ok(new { token, userId = user.Id, name = user.Name, nickname = user.Nickname, role = user.Role, email = user.Email, twoFactorEnabled = user.TwoFactorEnabled });
        }

        // ── DTOs ──────────────────────────────────────────────────────────
        public class TwoFACodeRequest { public string Code { get; set; } = string.Empty; }
        public class DisableTwoFARequest { public string Password { get; set; } = string.Empty; }
        public class CompleteTwoFALoginRequest { public int UserId { get; set; } public string Code { get; set; } = string.Empty; }

        // ── JWT (mirrors AuthService.GenerateJwtToken) ────────────────────
        private string GenerateJwtToken(User user)
        {
            var jwtKey = _config["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key must be configured.");
            var credentials = new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)), SecurityAlgorithms.HmacSha256);
            var issuer = _config["Jwt:Issuer"] ?? "GoblinSpotApi";
            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role),
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString())
            };
            var jwt = new JwtSecurityToken(issuer, issuer, claims, expires: DateTime.UtcNow.AddHours(2), signingCredentials: credentials);
            return new JwtSecurityTokenHandler().WriteToken(jwt);
        }
    }
}
