namespace BioField.Domain.Entities;

public class Project
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid OwnerId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsArchived { get; set; }
    public string ShareCode { get; set; } = Guid.NewGuid().ToString("N")[..8].ToUpper();
    public string? CoverImageUrl { get; set; }

    public ICollection<ProjectMember> Members { get; set; } = [];
    public ICollection<Route> Routes { get; set; } = [];
    public ICollection<Observation> Observations { get; set; } = [];
    public ICollection<Note> Notes { get; set; } = [];
}
