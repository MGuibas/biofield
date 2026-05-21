namespace BioField.Application.DTOs;

public record GoogleLoginRequest(string IdToken);
public record RefreshRequest(string RefreshToken);
public record AuthResponse(string AccessToken, string RefreshToken, Guid UserId, string DisplayName, string Role, string? AvatarUrl = null);
public record ProfileResponse(Guid UserId, string Email, string DisplayName, string? AvatarUrl, string? Speciality, string? Institution, DateTime CreatedAt);
public record UpdateProfileRequest(string DisplayName, string? Speciality, string? Institution);
