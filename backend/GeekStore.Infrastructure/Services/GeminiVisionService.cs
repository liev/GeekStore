using System;
using System.Text.Json;
using System.Threading.Tasks;
using GeekStore.Application.Interfaces;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using Microsoft.Extensions.Configuration;

namespace GeekStore.Infrastructure.Services
{
    public class GeminiVisionService : IImageValidationService
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiKey;

        public GeminiVisionService(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _apiKey = configuration["Gemini:ApiKey"]
                ?? throw new InvalidOperationException("Gemini:ApiKey is not configured. Set it via environment variable Gemini__ApiKey.");
        }


        public async Task<(bool IsSafe, string Reason)> ValidateImageAsync(byte[] imageBytes, string mimeType)
        {
            if (_apiKey.Contains("SET_VIA_ENV_VAR"))
            {
                // Bypass for development if no key is provided
                return (true, "Auto-aprobado (Modo Desarrollo/Sin API Key)");
            }

            try
            {
                // 1. Convert to base64
                var base64Image = Convert.ToBase64String(imageBytes);

                // 2. Construct Gemini Request
                var requestUrl = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={_apiKey}";
                
                var payload = new
                {
                    contents = new[]
                    {
                        new
                        {
                            parts = new object[]
                            {
                                new { text = "Analyze this image. Determine if it is related to Geek culture (trading cards like Magic Pokemon, anime figures, video games). If it is NSFW (+18) or completely unrelated (like a picture of a regular mug or car), return IsSafe: false. Otherwise return IsSafe: true. Respond ONLY in valid JSON format: {\"IsSafe\": true/false, \"Reason\": \"short explanation\"}." },
                                new
                                {
                                    inlineData = new
                                    {
                                        mimeType = mimeType,
                                        data = base64Image
                                    }
                                }
                            }
                        }
                    },
                    generationConfig = new
                    {
                        responseMimeType = "application/json"
                    }
                };

                var jsonPayload = JsonSerializer.Serialize(payload);
                var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

                // 3. Send Request
                var response = await _httpClient.PostAsync(requestUrl, content);
                
                if (!response.IsSuccessStatusCode)
                {
                    var err = await response.Content.ReadAsStringAsync();
                    Console.WriteLine($"Gemini API Error: {err}");
                    // Fallback gracefullly allowing upload if AI is down
                    return (true, "AI Moderation service unavailable (Bypassed).");
                }

                var responseString = await response.Content.ReadAsStringAsync();
                
                // 4. Parse Response
                using var document = JsonDocument.Parse(responseString);
                var root = document.RootElement;
                
                var candidates = root.GetProperty("candidates");
                if (candidates.GetArrayLength() > 0)
                {
                    var textResponse = candidates[0]
                        .GetProperty("content")
                        .GetProperty("parts")[0]
                        .GetProperty("text")
                        .GetString();

                    if (!string.IsNullOrEmpty(textResponse))
                    {
                        // Clean markdown formatting if any
                        textResponse = textResponse.Trim().Trim('`');
                        if (textResponse.StartsWith("json"))
                        {
                            textResponse = textResponse.Substring(4).Trim();
                        }

                        using var resultDoc = JsonDocument.Parse(textResponse);
                        var isSafe = resultDoc.RootElement.GetProperty("IsSafe").GetBoolean();
                        var reason = resultDoc.RootElement.GetProperty("Reason").GetString() ?? "";
                        
                        return (isSafe, reason);
                    }
                }

                return (true, "Could not parse AI response (Bypassed).");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error validating image: {ex.Message}");
                // Fallback gracefully on exception to not block sellers
                return (true, "Error occurred during AI validation (Bypassed).");
            }
        }
    }
}
