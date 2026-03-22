namespace BioField.Domain.Entities;

public class Route
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime StartedAt { get; set; }
    public DateTime? EndedAt { get; set; }
    public double DistanceMeters { get; set; }
    public string? TrackPointsJson { get; set; }
    public string? GpxFileUrl { get; set; }
    public string? Notes { get; set; }

    public Project Project { get; set; } = null!;
    public ICollection<Observation> Observations { get; set; } = [];
}
