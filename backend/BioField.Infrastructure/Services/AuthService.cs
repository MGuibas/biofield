using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using BioField.Application.DTOs;
using BioField.Application.Interfaces;
using BioField.Domain.Entities;
using BioField.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace BioField.Infrastructure.Services;

public class AuthService(AppDbContext db, IConfiguration config) : IAuthService
{
    public async Task<AuthResponse> GoogleLoginAsync(GoogleLoginRequest request)
    {
        Google.Apis.Auth.GoogleJsonWebSignature.Payload payload;
        try
        {
            var clientIds = string.IsNullOrEmpty(config["Authentication:Google:WebClientId"])
                ? new[] { config["Authentication:Google:ClientId"]! }
                : new[] { config["Authentication:Google:ClientId"]!, config["Authentication:Google:WebClientId"]! };

            payload = await Google.Apis.Auth.GoogleJsonWebSignature.ValidateAsync(request.IdToken, new Google.Apis.Auth.GoogleJsonWebSignature.ValidationSettings
            {
                Audience = clientIds
            });
        }
        catch (Google.Apis.Auth.InvalidJwtException)
        {
            throw new UnauthorizedAccessException("Invalid or expired Google token.");
        }

        var email = payload.Email.ToLower();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email);

        if (user == null)
        {
            user = new User
            {
                Id = Guid.NewGuid(),
                Email = email,
                GoogleId = payload.Subject,
                DisplayName = payload.Name,
                AvatarUrl = payload.Picture,
                Role = email == "marcosguibas@gmail.com" ? "Admin" : "User"
            };
            db.Users.Add(user);
        }
        else
        {
            user.GoogleId = payload.Subject;
            user.LastLogin = DateTime.UtcNow;
            if (string.IsNullOrEmpty(user.AvatarUrl) || user.AvatarUrl.StartsWith("http")) 
            {
                user.AvatarUrl = payload.Picture;
            }
            if (email == "marcosguibas@gmail.com" && user.Role != "Admin")
            {
                user.Role = "Admin";
            }
        }

        await db.SaveChangesAsync();
        return await GenerateTokensAsync(user);
    }

    public async Task<AuthResponse> RefreshAsync(RefreshRequest request)
    {
        var user = await db.Users.FirstOrDefaultAsync(u =>
            u.RefreshToken == request.RefreshToken &&
            u.RefreshTokenExpiry > DateTime.UtcNow)
            ?? throw new UnauthorizedAccessException("Invalid or expired refresh token.");

        return await GenerateTokensAsync(user);
    }

    public async Task LogoutAsync(Guid userId)
    {
        var user = await db.Users.FindAsync(userId);
        if (user is null) return;
        user.RefreshToken = null;
        user.RefreshTokenExpiry = null;
        await db.SaveChangesAsync();
    }

    public async Task<ProfileResponse> GetProfileAsync(Guid userId)
    {
        var user = await db.Users.FindAsync(userId) ?? throw new KeyNotFoundException();
        return new ProfileResponse(user.Id, user.Email, user.DisplayName, user.GetNormalizedAvatarUrl(), user.Speciality, user.Institution, user.CreatedAt);
    }

    public async Task<ProfileResponse> UpdateProfileAsync(Guid userId, UpdateProfileRequest request)
    {
        var user = await db.Users.FindAsync(userId) ?? throw new KeyNotFoundException();
        user.DisplayName = request.DisplayName;
        user.Speciality = request.Speciality;
        user.Institution = request.Institution;
        await db.SaveChangesAsync();
        return new ProfileResponse(user.Id, user.Email, user.DisplayName, user.GetNormalizedAvatarUrl(), user.Speciality, user.Institution, user.CreatedAt);
    }

    public async Task<string> UploadAvatarAsync(Guid userId, string base64Image, string extension)
    {
        var user = await db.Users.FindAsync(userId) ?? throw new KeyNotFoundException();
        var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "avatars");
        Directory.CreateDirectory(uploadsDir);
        
        // Borrar foto antigua por si cambia la extensión (ej. tenía .png y sube .jpg)
        var existingFiles = Directory.GetFiles(uploadsDir, $"{userId}.*");
        foreach (var file in existingFiles)
        {
            File.Delete(file);
        }

        var fileName = $"{userId}{extension}";
        var bytes = Convert.FromBase64String(base64Image);
        await File.WriteAllBytesAsync(Path.Combine(uploadsDir, fileName), bytes);
        user.AvatarUrl = $"/avatars/{fileName}?v={DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";
        await db.SaveChangesAsync();
        return user.GetNormalizedAvatarUrl() ?? user.AvatarUrl;
    }

    private async Task<AuthResponse> GenerateTokensAsync(User user)
    {
        var accessToken = CreateAccessToken(user);
        var refreshToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));

        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(30);
        await db.SaveChangesAsync();

        return new AuthResponse(accessToken, refreshToken, user.Id, user.DisplayName, user.Role, user.GetNormalizedAvatarUrl());
    }

    private string CreateAccessToken(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Key"]!));
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.DisplayName),
            new Claim(ClaimTypes.Role, user.Role)
        };

        var token = new JwtSecurityToken(
            issuer: config["Jwt:Issuer"],
            audience: config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256)
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
