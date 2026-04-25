namespace BioField.Application.DTOs;

public record CreateRouteRequest(string Name, DateTime StartedAt, string? Notes);
public record UpdateRouteRequest(string Name, DateTime? EndedAt, double DistanceMeters, string? TrackPointsJson, string? Notes);
public record RouteResponse(
    Guid Id, Guid ProjectId, Guid UserId, string Name,
    DateTime StartedAt, DateTime? EndedAt, double DistanceMeters,
    string? GpxFileUrl, string? Notes, string? TrackPointsJson);

public record CreateObservationRequest(
    Guid? RouteId, long? TaxonId, string TaxonName,
    string? Title, string? Description,
    double Latitude, double Longitude, double? Altitude,
    DateTime ObservedAt, string? Notes, int Quantity,
    string? TagsJson, string? WeatherCondition,
    double? Temperature, double? Humidity,
    string? HabitatDescription, string? HabitatPhotoUrl);

public record UpdateObservationRequest(
    Guid? RouteId, long? TaxonId, string TaxonName,
    string? Title, string? Description,
    double Latitude, double Longitude, double? Altitude,
    DateTime ObservedAt, string? Notes, int Quantity,
    string? TagsJson, string? WeatherCondition,
    double? Temperature, double? Humidity,
    string? HabitatDescription, string? HabitatPhotoUrl);

public record ObservationResponse(
    Guid Id, Guid ProjectId, Guid? RouteId, Guid UserId,
    long? TaxonId, string TaxonName, string? Title, string? Description,
    double Latitude, double Longitude, double? Altitude,
    DateTime ObservedAt, string? PhotosJson, string? Notes,
    int Quantity, string? TagsJson, string? WeatherCondition,
    double? Temperature, double? Humidity,
    string SyncStatus, DateTime CreatedAt,
    string? HabitatDescription, string? HabitatPhotoUrl);

public record CreateNoteRequest(string Title, string Body, double? Latitude, double? Longitude);
public record UpdateNoteRequest(string Title, string Body, double? Latitude, double? Longitude);
public record NoteResponse(
    Guid Id, Guid ProjectId, Guid UserId, string Title,
    string Body, string? AttachmentsJson, double? Latitude, double? Longitude, DateTime CreatedAt);

// Paginación
public record PagedResult<T>(IEnumerable<T> Items, int Total, int Page, int PageSize);

// Comentarios
public record CreateCommentRequest(string Body);
public record CommentResponse(Guid Id, Guid ObservationId, Guid UserId, string DisplayName, string? AvatarUrl, string Body, DateTime CreatedAt);

// Actividad
public record ActivityItem(string Type, Guid? ItemId, string ActorName, string? AvatarUrl, string Description, DateTime OccurredAt, string? PhotoUrl = null);

// Estadísticas
public record TaxonStat(string TaxonName, int Count);
public record DayStat(string Date, int Count);
public record MemberStat(string DisplayName, int ObservationCount);
public record ProjectStats(
    int TotalObservations,
    int TotalRoutes,
    int TotalNotes,
    int UniqueSpecies,
    double TotalDistanceKm,
    double TotalFieldHours,
    IEnumerable<TaxonStat> TopSpecies,
    IEnumerable<DayStat> ObsByDay,
    IEnumerable<MemberStat> ObsByMember,
    IEnumerable<double[]> HeatmapPoints
);
