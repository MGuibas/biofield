namespace BioField.Domain.Entities;

public class Comment
{
    public Guid Id { get; set; }
    public Guid ObservationId { get; set; }
    public Guid UserId { get; set; }
    public string Body { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Observation Observation { get; set; } = null!;
    public User User { get; set; } = null!;
}
