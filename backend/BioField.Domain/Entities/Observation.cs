namespace BioField.Domain.Entities;

public enum SyncStatus { Local, Synced, Conflict }

public class Observation
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public Guid? RouteId { get; set; }
    public Guid UserId { get; set; }
    public long? TaxonId { get; set; }
    public string TaxonName { get; set; } = string.Empty;
    public string? Title { get; set; }
    public string? Description { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public double? Altitude { get; set; }
    public DateTime ObservedAt { get; set; }
    public string? PhotosJson { get; set; }
    public string? Notes { get; set; }
    public int Quantity { get; set; } = 1;
    public string? TagsJson { get; set; }
    public string? WeatherCondition { get; set; }
    public double? Temperature { get; set; }
    public double? Humidity { get; set; }
    public string? HabitatDescription { get; set; }
    public string? HabitatPhotoUrl { get; set; }
    public SyncStatus SyncStatus { get; set; } = SyncStatus.Local;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Project Project { get; set; } = null!;
    public Route? Route { get; set; }
    public ICollection<Comment> Comments { get; set; } = [];
}
