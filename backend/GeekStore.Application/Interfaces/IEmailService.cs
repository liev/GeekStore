using System.Threading.Tasks;

namespace GeekStore.Application.Interfaces
{
    public interface IEmailService
    {
        Task SendVerificationEmailAsync(string toEmail, string toName, string code);
    }
}
