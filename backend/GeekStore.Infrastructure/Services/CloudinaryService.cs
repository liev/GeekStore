using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using GeekStore.Application.Interfaces;
using System.IO;
using System.Threading.Tasks;

namespace GeekStore.Infrastructure.Services
{
    public class CloudinaryService : ICloudinaryService
    {
        private readonly Cloudinary _cloudinary;

        public CloudinaryService()
        {
            // Using the credentials provided by the user
            var account = new Account(
                "dxkwfjt6n",
                "492498338595729",
                "NMFPqao4VV7mk0WHMrsFxQ2T6GA");
                
            _cloudinary = new Cloudinary(account);
            _cloudinary.Api.Secure = true;
        }

        public async Task<string> UploadImageAsync(Stream fileStream, string fileName)
        {
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
