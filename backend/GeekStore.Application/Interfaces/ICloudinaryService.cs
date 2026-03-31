using System.IO;
using System.Threading.Tasks;

namespace GoblinSpot.Application.Interfaces
{
    public interface ICloudinaryService
    {
        Task<string> UploadImageAsync(Stream fileStream, string fileName);
    }
}
