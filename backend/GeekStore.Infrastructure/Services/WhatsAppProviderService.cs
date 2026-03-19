using GeekStore.Core.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace GeekStore.Infrastructure.Services
{
    public class WhatsAppProviderService : IWhatsAppService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;
        private readonly ILogger<WhatsAppProviderService> _logger;

        public WhatsAppProviderService(HttpClient httpClient, IConfiguration configuration, ILogger<WhatsAppProviderService> logger)
        {
            _httpClient = httpClient;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<bool> SendMessageAsync(string toPhoneNumber, string message)
        {
            var accessToken = _configuration["Meta:AccessToken"];
            var phoneNumberId = _configuration["Meta:PhoneNumberId"];

            if (string.IsNullOrEmpty(accessToken) || string.IsNullOrEmpty(phoneNumberId))
            {
                _logger.LogWarning("WhatsApp Meta credentials are not configured. Skipping message sending.");
                return false;
            }

            // Simple text message via Meta Cloud API
            // Note: In production without session 24h windows, free-form text might be rejected in favor of templates.
            // But for simple sandbox sending to verified numbers, it works if a session is open or using a pre-approved template.
            // For MVP purposes, sending text:
            var payload = new
            {
                messaging_product = "whatsapp",
                recipient_type = "individual",
                to = toPhoneNumber.Replace("+", ""), // Meta expects without +
                type = "text",
                text = new
                {
                    preview_url = false,
                    body = message
                }
            };

            var jsonPayload = JsonSerializer.Serialize(payload);
            var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

            _httpClient.DefaultRequestHeaders.Clear();
            _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {accessToken}");

            var response = await _httpClient.PostAsync($"https://graph.facebook.com/v18.0/{phoneNumberId}/messages", content);

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync();
                _logger.LogError($"Failed to send WhatsApp message. Status: {response.StatusCode}, Body: {errorBody}");
                return false;
            }

            return true;
        }
    }
}
