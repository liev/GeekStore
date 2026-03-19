using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using GeekStore.Application.Interfaces;
using GeekStore.Core.Models;
using Microsoft.Extensions.Configuration;

namespace GeekStore.Infrastructure.Services
{
    public class GeminiSellerAnalysisService : ISellerAnalysisService
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiKey;

        public GeminiSellerAnalysisService(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _apiKey = configuration["Gemini:ApiKey"] ?? string.Empty;
        }

        public async Task<SellerAIAnalysisDto> AnalyzeSellersAsync(List<SellerStatDto> sellers)
        {
            if (string.IsNullOrEmpty(_apiKey) || _apiKey.Contains("SET_VIA_ENV_VAR"))
            {
                return new SellerAIAnalysisDto
                {
                    GlobalSummary = "IA en modo demo (Sin API Key configurada).",
                    Recommendations = new List<SellerRecommendationDto>()
                };
            }

            try
            {
                var prompt = "Eres un consultor experto en E-commerce de cultura Geek. Analiza los siguientes vendedores y su inventario:\n";
                foreach (var s in sellers)
                {
                    prompt += $"- Vendedor: {s.SellerName} (ID: {s.SellerId}). Productos: {s.Products.Count}. Total Vistas/Carrito: {GetTotalCartCount(s.Products)}.\n";
                }
                prompt += "\nBasado en esto, devuelve un JSON con:\n" +
                          "1. 'Recommendations': una lista de objetos con SellerId, SellerName, Category ('Best', 'Inactive', 'Incentivize'), Reason (por qué se eligió) y SuggestedBenefits (qué ventajas darle).\n" +
                          "2. 'GlobalSummary': un resumen corto de la salud de la plataforma.\n" +
                          "Responde ÚNICAMENTE con el JSON válido.";

                var requestUrl = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={_apiKey}";
                var payload = new
                {
                    contents = new[] { new { parts = new[] { new { text = prompt } } } },
                    generationConfig = new { responseMimeType = "application/json" }
                };

                var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                var response = await _httpClient.PostAsync(requestUrl, content);

                if (!response.IsSuccessStatusCode)
                    return new SellerAIAnalysisDto { GlobalSummary = "Error contactando a la IA." };

                var responseString = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(responseString);
                var textResponse = doc.RootElement.GetProperty("candidates")[0]
                                    .GetProperty("content")
                                    .GetProperty("parts")[0]
                                    .GetProperty("text").GetString();

                return JsonSerializer.Deserialize<SellerAIAnalysisDto>(textResponse!, new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) 
                       ?? new SellerAIAnalysisDto { GlobalSummary = "Error procesando respuesta de IA." };
            }
            catch (Exception ex)
            {
                return new SellerAIAnalysisDto { GlobalSummary = $"Excepción IA: {ex.Message}" };
            }
        }

        private int GetTotalCartCount(List<ProductStatDto> products)
        {
            int total = 0;
            foreach (var p in products) total += p.CartAdditionCount;
            return total;
        }
    }
}
