using BioField.Domain.Entities;
using BioField.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace BioField.API.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin")]
public class AdminController(AppDbContext db) : ControllerBase
{
    [HttpGet("users")]
    public async Task<IActionResult> GetUsers()
    {
        var users = await db.Users
            .Select(u => new AdminUserSummaryDto
            {
                Id = u.Id,
                Email = u.Email,
                DisplayName = u.DisplayName,
                AvatarUrl = u.AvatarUrl,
                Speciality = u.Speciality,
                Institution = u.Institution,
                Role = u.Role,
                CreatedAt = u.CreatedAt,
                LastLogin = u.LastLogin,
                ProjectCount = db.ProjectMembers.Count(pm => pm.UserId == u.Id),
                ObservationCount = db.Observations.Count(o => o.UserId == u.Id)
            })
            .OrderByDescending(u => u.CreatedAt)
            .ToListAsync();

        return Ok(users);
    }

    [HttpGet("users/{userId:guid}/details")]
    public async Task<IActionResult> GetUserDetails(Guid userId)
    {
        var user = await db.Users.FindAsync(userId);
        if (user == null) return NotFound("User not found.");

        var projects = await db.ProjectMembers
            .Where(pm => pm.UserId == userId)
            .Include(pm => pm.Project)
            .Select(pm => new AdminUserProjectDto
            {
                Id = pm.Project.Id,
                Name = pm.Project.Name,
                Description = pm.Project.Description,
                Role = pm.Role.ToString(),
                CreatedAt = pm.Project.CreatedAt,
                ObservationCount = db.Observations.Count(o => o.ProjectId == pm.ProjectId && o.UserId == userId),
                CoverImageUrl = pm.Project.CoverImageUrl
            })
            .ToListAsync();

        var observations = await db.Observations
            .Where(o => o.UserId == userId)
            .Include(o => o.Project)
            .Select(o => new AdminUserObservationDto
            {
                Id = o.Id,
                ProjectId = o.ProjectId,
                ProjectName = o.Project.Name,
                TaxonName = o.TaxonName,
                Title = o.Title,
                ObservedAt = o.ObservedAt,
                Quantity = o.Quantity,
                Latitude = o.Latitude,
                Longitude = o.Longitude,
                PhotosJson = o.PhotosJson,
                Description = o.Description,
                Notes = o.Notes,
                TagsJson = o.TagsJson,
                WeatherCondition = o.WeatherCondition,
                Temperature = o.Temperature,
                Humidity = o.Humidity,
                HabitatDescription = o.HabitatDescription,
                HabitatPhotoUrl = o.HabitatPhotoUrl
            })
            .OrderByDescending(o => o.ObservedAt)
            .Take(100) // limit to recent 100 for safety
            .ToListAsync();

        return Ok(new AdminUserDetailDto
        {
            User = new AdminUserSummaryDto
            {
                Id = user.Id,
                Email = user.Email,
                DisplayName = user.DisplayName,
                AvatarUrl = user.AvatarUrl,
                Speciality = user.Speciality,
                Institution = user.Institution,
                Role = user.Role,
                CreatedAt = user.CreatedAt,
                LastLogin = user.LastLogin,
                ProjectCount = projects.Count,
                ObservationCount = db.Observations.Count(o => o.UserId == userId)
            },
            Projects = projects,
            RecentObservations = observations
        });
    }

    [HttpPut("users/{userId:guid}/role")]
    public async Task<IActionResult> UpdateUserRole(Guid userId, [FromBody] UpdateRoleRequest request)
    {
        var user = await db.Users.FindAsync(userId);
        if (user == null) return NotFound("User not found.");

        var currentUserId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        if (user.Id == currentUserId && request.Role.ToLower() != "admin")
        {
            return BadRequest("You cannot remove your own admin privileges.");
        }

        user.Role = request.Role;
        await db.SaveChangesAsync();

        return Ok(new { message = $"User role updated to {request.Role}." });
    }
}

public class UpdateRoleRequest
{
    public string Role { get; set; } = "User";
}

public class AdminUserSummaryDto
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public string? Speciality { get; set; }
    public string? Institution { get; set; }
    public string Role { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? LastLogin { get; set; }
    public int ProjectCount { get; set; }
    public int ObservationCount { get; set; }
}

public class AdminUserProjectDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Role { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public int ObservationCount { get; set; }
    public string? CoverImageUrl { get; set; }
}

public class AdminUserObservationDto
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public string ProjectName { get; set; } = string.Empty;
    public string TaxonName { get; set; } = string.Empty;
    public string? Title { get; set; }
    public DateTime ObservedAt { get; set; }
    public int Quantity { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string? PhotosJson { get; set; }
    public string? Description { get; set; }
    public string? Notes { get; set; }
    public string? TagsJson { get; set; }
    public string? WeatherCondition { get; set; }
    public double? Temperature { get; set; }
    public double? Humidity { get; set; }
    public string? HabitatDescription { get; set; }
    public string? HabitatPhotoUrl { get; set; }
}

public class AdminUserDetailDto
{
    public required AdminUserSummaryDto User { get; set; }
    public List<AdminUserProjectDto> Projects { get; set; } = [];
    public List<AdminUserObservationDto> RecentObservations { get; set; } = [];
}
