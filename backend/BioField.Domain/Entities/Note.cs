namespace BioField.Domain.Entities;

public class Note
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public Guid UserId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public string? AttachmentsJson { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Project Project { get; set; } = null!;
}
