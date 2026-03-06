using GeekStore.Core.Entities;
using System.Threading.Tasks;

namespace GeekStore.Application.Interfaces
{
    public interface IAuthService
    {
        Task<string> LoginAsync(string email, string password);
        Task<User> RegisterAsync(User user, string password);
    }
}
