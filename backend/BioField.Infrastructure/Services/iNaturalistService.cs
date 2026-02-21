using System.Text.Json;
using BioField.Application.DTOs;
using BioField.Application.Interfaces;

namespace BioField.Infrastructure.Services;

public class iNaturalistService(HttpClient http) : IiNaturalistService
{
    private static readonly JsonSerializerOptions Opts = new() { PropertyNameCaseInsensitive = true };

    public async Task<IEnumerable<TaxonResponse>> AutocompleteAsync(string query)
    {
        var response = await http.GetAsync($"taxa/autocomplete?q={Uri.EscapeDataString(query)}&per_page=10");
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadAsStringAsync();
        var doc = JsonDocument.Parse(json);
        var results = doc.RootElement.GetProperty("results");

        return results.EnumerateArray().Select(ParseTaxon).ToList();
    }

    public async Task<TaxonResponse?> GetTaxonAsync(long id)
    {
        var response = await http.GetAsync($"taxa/{id}");
        if (!response.IsSuccessStatusCode) return null;

        var json = await response.Content.ReadAsStringAsync();
        var doc = JsonDocument.Parse(json);
        var results = doc.RootElement.GetProperty("results");

        return results.GetArrayLength() > 0 ? ParseTaxon(results[0]) : null;
    }

    private static TaxonResponse ParseTaxon(JsonElement t)
    {
        var id = t.GetProperty("id").GetInt64();
        var name = t.GetProperty("name").GetString() ?? "";
        var commonName = t.TryGetProperty("preferred_common_name", out var cn) ? cn.GetString() : null;
        var rank = t.TryGetProperty("rank", out var r) ? r.GetString() : null;
        string? photoUrl = null;

        if (t.TryGetProperty("default_photo", out var photo) && photo.ValueKind != JsonValueKind.Null)
            photoUrl = photo.TryGetProperty("medium_url", out var url) ? url.GetString() : null;

        return new TaxonResponse(id, name, commonName, rank, photoUrl);
    }
}
