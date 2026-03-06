using System.Threading.Tasks;

namespace GeekStore.Application.Interfaces
{
    public interface IImageValidationService
    {
        Task<(bool IsSafe, string Reason)> ValidateImageAsync(string imageUrl);
    }
}
