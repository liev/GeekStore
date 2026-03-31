using GoblinSpot.Core.Entities;
using System.Threading.Tasks;

namespace GoblinSpot.Application.Interfaces
{
    public interface IAuthService
    {
        Task<string> LoginAsync(string email, string password);
        Task<User> RegisterAsync(User user, string password);
    }
}
