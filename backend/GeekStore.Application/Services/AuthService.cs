using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using GeekStore.Application.Interfaces;
using GeekStore.Core.Entities;
using GeekStore.Core.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace GeekStore.Application.Services
{
    public class AuthService : IAuthService
    {
        private readonly IRepository<User> _userRepository;
        private readonly IConfiguration _config;

        public AuthService(IRepository<User> userRepository, IConfiguration config)
        {
            _userRepository = userRepository;
            _config = config;
        }

        public async Task<string> LoginAsync(string email, string password)
        {
            var users = await _userRepository.ListAllAsync();
            var user = users.FirstOrDefault(u => u.Email == email);
            
            // For hackathon/testing brevity, if user not found, we auto-create or use a generic one if you type "test"
            if (user == null && email == "vendedor@sistema.com") {
                user = new User { Id = 1, Email = email, Role = "Seller", Name = "Admin" };
            }

            if (user == null) return string.Empty; // Or unauthorized

            // Normally verify password hash here. Assuming password is valid for this prototype.

            return GenerateJwtToken(user);
        }

        public async Task<User> RegisterAsync(User user, string password)
        {
            // Hash password before saving
            // user.PasswordHash = Hash(password);
            return await _userRepository.AddAsync(user);
        }

        private string GenerateJwtToken(User user)
        {
            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"] ?? "ThisIsASecretKeyForJWTTokenGenerationEnsureItIsAtLeast32BytesLong!"));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role),
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString())
            };

            var issuer = _config["Jwt:Issuer"] ?? "GeekStoreApi";

            var token = new JwtSecurityToken(
                issuer: issuer,
                audience: issuer,
                claims: claims,
                expires: DateTime.Now.AddHours(2),
                signingCredentials: credentials);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
