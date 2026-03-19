using System.Threading.Tasks;

namespace GeekStore.Application.Interfaces
{
    public interface IImageValidationService
    {
        Task<(bool IsSafe, string Reason)> ValidateImageAsync(byte[] imageBytes, string mimeType);
    }
}
