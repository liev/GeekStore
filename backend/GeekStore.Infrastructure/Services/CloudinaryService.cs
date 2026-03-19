using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using GeekStore.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using System.IO;
using System.Threading.Tasks;

namespace GeekStore.Infrastructure.Services
{
    public class CloudinaryService : ICloudinaryService
    {
        private readonly Cloudinary _cloudinary;

        public CloudinaryService(IConfiguration configuration)
        {
            var cloudName = configuration["Cloudinary:CloudName"]
                ?? throw new InvalidOperationException("Cloudinary:CloudName is not configured.");
            var apiKey = configuration["Cloudinary:ApiKey"]
                ?? throw new InvalidOperationException("Cloudinary:ApiKey is not configured.");
            var apiSecret = configuration["Cloudinary:ApiSecret"]
                ?? throw new InvalidOperationException("Cloudinary:ApiSecret is not configured.");

            var account = new Account(cloudName, apiKey, apiSecret);
            _cloudinary = new Cloudinary(account);
            _cloudinary.Api.Secure = true;
        }

        public async Task<string> UploadImageAsync(Stream fileStream, string fileName)
        {
            if (_cloudinary.Api.Account.Cloud.Contains("SET_VIA_ENV_VAR"))
            {
                // Simulate upload for local dev without credentials
                await Task.Delay(500);
                return $"https://images.unsplash.com/photo-1605806616949-1e87b487cb2a?w=400&q=80&r={System.Guid.NewGuid().ToString().Substring(0, 5)}";
            }

            var uploadParams = new ImageUploadParams()
            {
                File = new FileDescription(fileName, fileStream),
                Folder = "geekstore_flea_market"
            };

            var uploadResult = await _cloudinary.UploadAsync(uploadParams);
            return uploadResult.SecureUrl.ToString();
        }
    }
}
