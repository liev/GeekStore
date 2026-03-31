using System.Threading.Tasks;

namespace GoblinSpot.Application.Interfaces
{
    public interface IImageValidationService
    {
        Task<(bool IsSafe, string Reason)> ValidateImageAsync(byte[] imageBytes, string mimeType);
    }
}
