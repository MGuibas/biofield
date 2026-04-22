using BioField.Application.DTOs;

namespace BioField.Application.Interfaces;

public interface IAuthService
{
    Task<AuthResponse> GoogleLoginAsync(GoogleLoginRequest request);
    Task<AuthResponse> RefreshAsync(RefreshRequest request);
    Task LogoutAsync(Guid userId);
    Task<ProfileResponse> GetProfileAsync(Guid userId);
    Task<ProfileResponse> UpdateProfileAsync(Guid userId, UpdateProfileRequest request);
    Task<string> UploadAvatarAsync(Guid userId, string base64Image, string extension);
}
