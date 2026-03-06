using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace GeekStore.Core.Models
{
    public class MoxfieldDeckDto
    {
        [JsonPropertyName("publicId")]
        public string PublicId { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("description")]
        public string Description { get; set; } = string.Empty;

        [JsonPropertyName("format")]
        public string Format { get; set; } = string.Empty;

        [JsonPropertyName("mainboard")]
        public Dictionary<string, MoxfieldCardDto> Mainboard { get; set; } = new();
    }

    public class MoxfieldCardDto
    {
        [JsonPropertyName("quantity")]
        public int Quantity { get; set; }

        [JsonPropertyName("card")]
        public MoxfieldCardDetailsDto Card { get; set; } = new();
    }

    public class MoxfieldCardDetailsDto
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;
        
        [JsonPropertyName("scryfall_id")]
        public string ScryfallId { get; set; } = string.Empty;
    }
}
