using System.Threading.Tasks;

namespace GoblinSpot.Application.Interfaces
{
    public interface IEmailService
    {
        Task SendVerificationEmailAsync(string toEmail, string toName, string code);
    }
}
