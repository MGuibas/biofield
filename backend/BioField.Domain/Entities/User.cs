namespace BioField.Domain.Entities;

public class User
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string GoogleId { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public string? GetNormalizedAvatarUrl()
    {
        if (string.IsNullOrEmpty(AvatarUrl)) return null;
        if (AvatarUrl.StartsWith("http", System.StringComparison.OrdinalIgnoreCase)) return AvatarUrl;
        if (AvatarUrl.StartsWith("/avatars/", System.StringComparison.OrdinalIgnoreCase))
            return $"/api{AvatarUrl}";
        return AvatarUrl;
    }
    public string? Speciality { get; set; }
    public string? Institution { get; set; }
    public string Role { get; set; } = "User";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastLogin { get; set; }
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiry { get; set; }

    public ICollection<ProjectMember> ProjectMemberships { get; set; } = [];
    public ICollection<Comment> Comments { get; set; } = [];
}
