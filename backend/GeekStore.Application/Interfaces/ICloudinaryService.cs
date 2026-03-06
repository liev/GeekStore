using System.IO;
using System.Threading.Tasks;

namespace GeekStore.Application.Interfaces
{
    public interface ICloudinaryService
    {
        Task<string> UploadImageAsync(Stream fileStream, string fileName);
    }
}
