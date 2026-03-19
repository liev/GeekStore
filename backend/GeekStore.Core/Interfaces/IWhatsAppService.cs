using System.Threading.Tasks;

namespace GeekStore.Core.Interfaces
{
    public interface IWhatsAppService
    {
        Task<bool> SendMessageAsync(string toPhoneNumber, string message);
    }
}
