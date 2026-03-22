using BioField.Application.DTOs;

namespace BioField.Application.Interfaces;

public interface ISyncService
{
    Task<SyncPushResponse> PushAsync(SyncPushRequest request, Guid userId);
    Task<SyncPullResponse> PullAsync(Guid projectId, DateTime since, Guid userId);
}

public interface IiNaturalistService
{
    Task<IEnumerable<TaxonResponse>> AutocompleteAsync(string query);
    Task<TaxonResponse?> GetTaxonAsync(long id);
}
