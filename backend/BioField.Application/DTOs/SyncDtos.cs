namespace BioField.Application.DTOs;

public record SyncItem(
    string EntityType,
    Guid EntityId,
    string Operation,
    string Payload,
    DateTime CreatedAt);

public record SyncPushRequest(IEnumerable<SyncItem> Items);
public record SyncPushResponse(int Processed, IEnumerable<Guid> Failed);
public record SyncPullResponse(
    IEnumerable<ObservationResponse> Observations,
    IEnumerable<RouteResponse> Routes,
    IEnumerable<NoteResponse> Notes,
    DateTime ServerTime);

public record TaxonResponse(long Id, string Name, string? CommonName, string? Rank, string? PhotoUrl);
