using BioField.Application.DTOs;
using BioField.Application.Interfaces;
using BioField.Domain.Entities;
using BioField.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BioField.Infrastructure.Services;

public class ProjectService(AppDbContext db, IStorageService storage) : IProjectService
{
    public async Task<IEnumerable<ProjectResponse>> GetUserProjectsAsync(Guid userId)
    {
        return await db.ProjectMembers
            .Where(pm => pm.UserId == userId)
            .Include(pm => pm.Project).ThenInclude(p => p.Members)
            .Select(pm => ToResponse(pm.Project))
            .ToListAsync();
    }

    public async Task<ProjectDetailResponse> GetByIdAsync(Guid projectId, Guid userId)
    {
        var project = await db.Projects
            .Include(p => p.Members).ThenInclude(m => m.User)
            .FirstOrDefaultAsync(p => p.Id == projectId)
            ?? throw new KeyNotFoundException("Project not found.");

        EnsureMember(project, userId);
        return ToDetailResponse(project);
    }

    public async Task<ProjectResponse> CreateAsync(CreateProjectRequest request, Guid ownerId)
    {
        var project = new Project
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Description = request.Description,
            OwnerId = ownerId,
            CoverImageUrl = request.CoverImageUrl
        };

        project.Members.Add(new ProjectMember { ProjectId = project.Id, UserId = ownerId, Role = ProjectRole.Owner });
        db.Projects.Add(project);
        await db.SaveChangesAsync();
        return ToResponse(project);
    }

    public async Task<ProjectResponse> UpdateAsync(Guid projectId, UpdateProjectRequest request, Guid userId)
    {
        var project = await db.Projects.Include(p => p.Members)
            .FirstOrDefaultAsync(p => p.Id == projectId)
            ?? throw new KeyNotFoundException("Project not found.");

        EnsureRole(project, userId, ProjectRole.Owner, ProjectRole.Editor);
        project.Name = request.Name;
        project.Description = request.Description;
        project.CoverImageUrl = request.CoverImageUrl;
        project.IsArchived = request.IsArchived;
        await db.SaveChangesAsync();
        return ToResponse(project);
    }

    public async Task DeleteAsync(Guid projectId, Guid userId)
    {
        var project = await db.Projects.Include(p => p.Members)
            .FirstOrDefaultAsync(p => p.Id == projectId)
            ?? throw new KeyNotFoundException("Project not found.");

        EnsureRole(project, userId, ProjectRole.Owner);

        // Borrar imagen de portada si existe
        if (!string.IsNullOrEmpty(project.CoverImageUrl))
        {
            await storage.DeleteAsync(project.CoverImageUrl);
        }

        db.Projects.Remove(project);
        await db.SaveChangesAsync();
    }

    public async Task AddMemberAsync(Guid projectId, AddMemberRequest request, Guid requesterId)
    {
        var project = await db.Projects.Include(p => p.Members)
            .FirstOrDefaultAsync(p => p.Id == projectId)
            ?? throw new KeyNotFoundException("Project not found.");

        EnsureRole(project, requesterId, ProjectRole.Owner);

        if (!Enum.TryParse<ProjectRole>(request.Role, true, out var role))
            throw new ArgumentException("Invalid role.");

        var existing = project.Members.FirstOrDefault(m => m.UserId == request.UserId);
        if (existing != null)
        {
            existing.Role = role; // actualizar rol si ya es miembro
        }
        else
        {
            project.Members.Add(new ProjectMember { ProjectId = projectId, UserId = request.UserId, Role = role });
        }
        await db.SaveChangesAsync();
    }

    public async Task RemoveMemberAsync(Guid projectId, Guid targetUserId, Guid requesterId)
    {
        var project = await db.Projects.Include(p => p.Members)
            .FirstOrDefaultAsync(p => p.Id == projectId)
            ?? throw new KeyNotFoundException("Project not found.");

        EnsureRole(project, requesterId, ProjectRole.Owner);
        var member = project.Members.FirstOrDefault(m => m.UserId == targetUserId)
            ?? throw new KeyNotFoundException("Member not found.");

        project.Members.Remove(member);
        await db.SaveChangesAsync();
    }

    public async Task<ProjectDetailResponse> JoinByShareCodeAsync(string shareCode, Guid userId)
    {
        var project = await db.Projects.Include(p => p.Members).ThenInclude(m => m.User)
            .FirstOrDefaultAsync(p => p.ShareCode == shareCode.ToUpper())
            ?? throw new KeyNotFoundException("Invalid share code.");

        if (!project.Members.Any(m => m.UserId == userId))
        {
            project.Members.Add(new ProjectMember { ProjectId = project.Id, UserId = userId, Role = ProjectRole.Viewer });
            await db.SaveChangesAsync();
        }

        return ToDetailResponse(project);
    }

    private static void EnsureMember(Project project, Guid userId)
    {
        if (!project.Members.Any(m => m.UserId == userId))
            throw new UnauthorizedAccessException("Not a project member.");
    }

    private static void EnsureRole(Project project, Guid userId, params ProjectRole[] roles)
    {
        var member = project.Members.FirstOrDefault(m => m.UserId == userId)
            ?? throw new UnauthorizedAccessException("Not a project member.");
        if (!roles.Contains(member.Role))
            throw new UnauthorizedAccessException("Insufficient permissions.");
    }

    private static ProjectResponse ToResponse(Project p) =>
        new(p.Id, p.Name, p.Description, p.OwnerId, p.CreatedAt, p.IsArchived, p.ShareCode, p.CoverImageUrl, p.Members.Count);

    private static ProjectDetailResponse ToDetailResponse(Project p) =>
        new(p.Id, p.Name, p.Description, p.OwnerId, p.CreatedAt, p.IsArchived, p.ShareCode, p.CoverImageUrl,
            p.Members.Select(m => new MemberResponse(m.UserId, m.User.DisplayName, m.User.AvatarUrl, m.Role.ToString(), m.JoinedAt)));
}
