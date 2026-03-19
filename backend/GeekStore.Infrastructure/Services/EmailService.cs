using System;
using System.Net;
using System.Net.Mail;
using System.Threading.Tasks;
using GeekStore.Application.Interfaces;
using Microsoft.Extensions.Configuration;

namespace GeekStore.Infrastructure.Services
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _config;

        public EmailService(IConfiguration config)
        {
            _config = config;
        }

        public async Task SendVerificationEmailAsync(string toEmail, string toName, string code)
        {
            var smtpHost = _config["Email:SmtpHost"] ?? "smtp.gmail.com";
            var smtpPort = int.Parse(_config["Email:SmtpPort"] ?? "587");
            var smtpUser = _config["Email:SmtpUser"] ?? "";
            var smtpPass = _config["Email:SmtpPass"] ?? "";
            var fromEmail = _config["Email:FromEmail"] ?? smtpUser;
            var fromName = _config["Email:FromName"] ?? "Goblin Spot";

            var body = $@"
<!DOCTYPE html>
<html>
<body style='background:#0f172a;color:#f8fafc;font-family:sans-serif;padding:40px'>
  <div style='max-width:500px;margin:auto;background:#1e293b;border-radius:16px;padding:32px;border:1px solid #334155'>
    <h1 style='color:#4ade80;font-size:28px;margin-bottom:8px'>🧌 GOBLIN SPOT</h1>
    <p style='color:#94a3b8;font-size:14px;margin-bottom:32px'>Portal de Vendedores</p>
    
    <h2 style='color:#f8fafc;margin-bottom:16px'>¡Bienvenido, {toName}!</h2>
    <p style='color:#cbd5e1;margin-bottom:24px'>
      Tu código de verificación es:
    </p>
    
    <div style='background:#0f172a;border:2px solid #06b6d4;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px'>
      <span style='font-family:monospace;font-size:36px;font-weight:bold;letter-spacing:12px;color:#06b6d4'>{code}</span>
    </div>
    
    <p style='color:#64748b;font-size:13px'>
      Este código expira en <strong style='color:#f8fafc'>15 minutos</strong>.<br/>
      Si no creaste esta cuenta, ignora este correo.
    </p>
    
    <hr style='border-color:#334155;margin:24px 0'/>
    <p style='color:#475569;font-size:12px;text-align:center'>© 2026 Goblin Spot · Costa Rica</p>
  </div>
</body>
</html>";

            using var client = new SmtpClient(smtpHost, smtpPort)
            {
                EnableSsl = true,
                Credentials = new NetworkCredential(smtpUser, smtpPass)
            };

            var message = new MailMessage
            {
                From = new MailAddress(fromEmail, fromName),
                Subject = $"🧌 Tu código Goblin Spot: {code}",
                Body = body,
                IsBodyHtml = true
            };
            message.To.Add(new MailAddress(toEmail, toName));

            await client.SendMailAsync(message);
        }
    }
}
