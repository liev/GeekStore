using GoblinSpot.Application.Interfaces;
using GoblinSpot.Core.Models;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;

namespace GoblinSpot.Infrastructure.Services
{
    public class MoxfieldService : IMoxfieldService
    {
        private readonly HttpClient _httpClient;

        public MoxfieldService(HttpClient httpClient)
        {
            _httpClient = httpClient;
        }

        public async Task<MoxfieldDeckDto?> GetDeckByPublicIdAsync(string publicId)
        {
            // The public Moxfield v2 deck API endpoint
            var url = $"https://api.moxfield.com/v2/decks/all/{publicId}";
            
            var response = await _httpClient.GetAsync(url);
            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            var jsonString = await response.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<MoxfieldDeckDto>(jsonString);
        }
    }
}
