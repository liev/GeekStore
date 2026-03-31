using GoblinSpot.Core.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace GoblinSpot.Infrastructure.Services
{
    public class PayPalService : IPayPalService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _config;
        private readonly ILogger<PayPalService> _logger;

        public PayPalService(HttpClient httpClient, IConfiguration config, ILogger<PayPalService> logger)
        {
            _httpClient = httpClient;
            _config = config;
            _logger = logger;
        }

        private string BaseUrl => _config["PayPal:Mode"]?.ToLower() == "live"
            ? "https://api-m.paypal.com"
            : "https://api-m.sandbox.paypal.com";

        private async Task<string?> GetAccessTokenAsync()
        {
            var clientId = _config["PayPal:ClientId"];
            var clientSecret = _config["PayPal:ClientSecret"];

            if (string.IsNullOrWhiteSpace(clientId) || string.IsNullOrWhiteSpace(clientSecret))
            {
                _logger.LogWarning("PayPal:ClientId or PayPal:ClientSecret not configured.");
                return null;
            }

            var credentials = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{clientId}:{clientSecret}"));
            var request = new HttpRequestMessage(HttpMethod.Post, $"{BaseUrl}/v1/oauth2/token");
            request.Headers.Authorization = new AuthenticationHeaderValue("Basic", credentials);
            request.Content = new StringContent("grant_type=client_credentials", Encoding.UTF8, "application/x-www-form-urlencoded");

            var response = await _httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("PayPal OAuth failed: {Status}", response.StatusCode);
                return null;
            }

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            return doc.RootElement.GetProperty("access_token").GetString();
        }

        public async Task<bool> VerifyOrderAsync(string orderId)
        {
            if (string.IsNullOrWhiteSpace(orderId))
                return false;

            try
            {
                var token = await GetAccessTokenAsync();
                if (token == null) return false;

                var request = new HttpRequestMessage(HttpMethod.Get, $"{BaseUrl}/v2/checkout/orders/{orderId}");
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

                var response = await _httpClient.SendAsync(request);
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("PayPal order lookup failed: {Status}", response.StatusCode);
                    return false;
                }

                var json = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);
                var status = doc.RootElement.GetProperty("status").GetString();

                return string.Equals(status, "COMPLETED", StringComparison.OrdinalIgnoreCase);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "PayPal verification error for order {OrderId}", orderId);
                return false;
            }
        }
    }
}
