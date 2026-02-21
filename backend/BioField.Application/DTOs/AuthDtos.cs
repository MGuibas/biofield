namespace BioField.Application.DTOs;

public record RegisterRequest(string Email, string Password, string DisplayName);
public record LoginRequest(string Email, string Password);
public record RefreshRequest(string RefreshToken);
public record AuthResponse(string AccessToken, string RefreshToken, Guid UserId, string DisplayName, string? AvatarUrl = null);
public record ProfileResponse(Guid UserId, string Email, string DisplayName, string? AvatarUrl, string? Speciality, string? Institution, DateTime CreatedAt);
public record UpdateProfileRequest(string DisplayName, string? Speciality, string? Institution);
