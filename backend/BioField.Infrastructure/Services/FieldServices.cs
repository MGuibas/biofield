using BioField.Application.DTOs;
using BioField.Application.Interfaces;
using BioField.Domain.Entities;
using BioField.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BioField.Infrastructure.Services;

public class RouteService(AppDbContext db) : IRouteService
{
    public async Task<IEnumerable<RouteResponse>> GetByProjectAsync(Guid projectId, Guid userId)
    {
        await EnsureMemberAsync(projectId, userId);
        return await db.Routes.Where(r => r.ProjectId == projectId).Select(r => ToResponse(r)).ToListAsync();
    }

    public async Task<RouteResponse> GetByIdAsync(Guid routeId, Guid userId)
    {
        var route = await db.Routes.FindAsync(routeId) ?? throw new KeyNotFoundException();
        await EnsureMemberAsync(route.ProjectId, userId);
        return ToResponse(route);
    }

    public async Task<RouteResponse> CreateAsync(Guid projectId, CreateRouteRequest request, Guid userId)
    {
        await EnsureMemberAsync(projectId, userId);
        var route = new Route
        {
            Id = Guid.NewGuid(), ProjectId = projectId, UserId = userId,
            Name = request.Name, StartedAt = request.StartedAt, Notes = request.Notes
        };
        db.Routes.Add(route);
        await db.SaveChangesAsync();
        return ToResponse(route);
    }

    public async Task<RouteResponse> UpdateAsync(Guid routeId, UpdateRouteRequest request, Guid userId)
    {
        var route = await db.Routes.FindAsync(routeId) ?? throw new KeyNotFoundException();
        if (route.UserId != userId) throw new UnauthorizedAccessException();
        route.Name = request.Name;
        route.EndedAt = request.EndedAt;
        route.DistanceMeters = request.DistanceMeters;
        route.TrackPointsJson = request.TrackPointsJson;
        route.Notes = request.Notes;
        await db.SaveChangesAsync();
        return ToResponse(route);
    }

    public async Task DeleteAsync(Guid routeId, Guid userId)
    {
        var route = await db.Routes.FindAsync(routeId) ?? throw new KeyNotFoundException();
        if (route.UserId != userId) throw new UnauthorizedAccessException();
        db.Routes.Remove(route);
        await db.SaveChangesAsync();
    }

    private async Task EnsureMemberAsync(Guid projectId, Guid userId)
    {
        if (!await db.ProjectMembers.AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == userId))
            throw new UnauthorizedAccessException("Not a project member.");
    }

    private static RouteResponse ToResponse(Route r) =>
        new(r.Id, r.ProjectId, r.UserId, r.Name, r.StartedAt, r.EndedAt, r.DistanceMeters, r.GpxFileUrl, r.Notes, r.TrackPointsJson);
}

public class ObservationService(AppDbContext db) : IObservationService
{
    public async Task<PagedResult<ObservationResponse>> GetByProjectAsync(Guid projectId, Guid userId, int page, int pageSize)
    {
        await EnsureMemberAsync(projectId, userId);
        var query = db.Observations.Where(o => o.ProjectId == projectId).OrderByDescending(o => o.ObservedAt);
        var total = await query.CountAsync();
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).Select(o => ToResponse(o)).ToListAsync();
        return new PagedResult<ObservationResponse>(items, total, page, pageSize);
    }

    public async Task<ObservationResponse> GetByIdAsync(Guid observationId, Guid userId)
    {
        var obs = await db.Observations.FindAsync(observationId) ?? throw new KeyNotFoundException();
        await EnsureMemberAsync(obs.ProjectId, userId);
        return ToResponse(obs);
    }

    public async Task<ObservationResponse> CreateAsync(Guid projectId, CreateObservationRequest request, Guid userId)
    {
        await EnsureMemberAsync(projectId, userId);
        var obs = new Observation
        {
            Id = Guid.NewGuid(), ProjectId = projectId, UserId = userId,
            RouteId = request.RouteId, TaxonId = request.TaxonId, TaxonName = request.TaxonName,
            Title = request.Title, Description = request.Description,
            Latitude = request.Latitude, Longitude = request.Longitude, Altitude = request.Altitude,
            ObservedAt = request.ObservedAt, Notes = request.Notes, Quantity = request.Quantity,
            TagsJson = request.TagsJson, WeatherCondition = request.WeatherCondition,
            Temperature = request.Temperature, Humidity = request.Humidity,
            HabitatDescription = request.HabitatDescription, HabitatPhotoUrl = request.HabitatPhotoUrl,
            SyncStatus = SyncStatus.Synced
        };
        db.Observations.Add(obs);
        await db.SaveChangesAsync();
        return ToResponse(obs);
    }

    public async Task<ObservationResponse> UpdateAsync(Guid observationId, UpdateObservationRequest request, Guid userId)
    {
        var obs = await db.Observations.FindAsync(observationId) ?? throw new KeyNotFoundException();
        if (obs.UserId != userId) throw new UnauthorizedAccessException();
        obs.RouteId = request.RouteId;
        obs.TaxonId = request.TaxonId; obs.TaxonName = request.TaxonName;
        obs.Title = request.Title; obs.Description = request.Description;
        obs.Latitude = request.Latitude; obs.Longitude = request.Longitude;
        obs.Altitude = request.Altitude; obs.ObservedAt = request.ObservedAt;
        obs.Notes = request.Notes; obs.Quantity = request.Quantity;
        obs.TagsJson = request.TagsJson; obs.WeatherCondition = request.WeatherCondition;
        obs.Temperature = request.Temperature; obs.Humidity = request.Humidity;
        obs.HabitatDescription = request.HabitatDescription; obs.HabitatPhotoUrl = request.HabitatPhotoUrl;
        obs.UpdatedAt = DateTime.UtcNow; obs.SyncStatus = SyncStatus.Synced;
        await db.SaveChangesAsync();
        return ToResponse(obs);
    }

    public async Task DeleteAsync(Guid observationId, Guid userId)
    {
        var obs = await db.Observations.FindAsync(observationId) ?? throw new KeyNotFoundException();
        if (obs.UserId != userId) throw new UnauthorizedAccessException();
        db.Observations.Remove(obs);
        await db.SaveChangesAsync();
    }

    public async Task<ObservationResponse> AddPhotoAsync(Guid observationId, string photoUrl, Guid userId)
    {
        var obs = await db.Observations.FindAsync(observationId) ?? throw new KeyNotFoundException();
        if (obs.UserId != userId) throw new UnauthorizedAccessException();
        var photos = string.IsNullOrEmpty(obs.PhotosJson)
            ? new List<string>()
            : System.Text.Json.JsonSerializer.Deserialize<List<string>>(obs.PhotosJson)!;
        photos.Add(photoUrl);
        obs.PhotosJson = System.Text.Json.JsonSerializer.Serialize(photos);
        obs.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return ToResponse(obs);
    }

    private async Task EnsureMemberAsync(Guid projectId, Guid userId)
    {
        if (!await db.ProjectMembers.AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == userId))
            throw new UnauthorizedAccessException("Not a project member.");
    }

    private static ObservationResponse ToResponse(Observation o) =>
        new(o.Id, o.ProjectId, o.RouteId, o.UserId, o.TaxonId, o.TaxonName,
            o.Title, o.Description, o.Latitude, o.Longitude, o.Altitude,
            o.ObservedAt, o.PhotosJson, o.Notes, o.Quantity,
            o.TagsJson, o.WeatherCondition, o.Temperature, o.Humidity,
            o.SyncStatus.ToString(), o.CreatedAt,
            o.HabitatDescription, o.HabitatPhotoUrl);

    public async Task<IEnumerable<CommentResponse>> GetCommentsAsync(Guid observationId, Guid userId)
    {
        var obs = await db.Observations.FindAsync(observationId) ?? throw new KeyNotFoundException();
        await EnsureMemberAsync(obs.ProjectId, userId);
        return await db.Comments
            .Where(c => c.ObservationId == observationId)
            .Include(c => c.User)
            .OrderBy(c => c.CreatedAt)
            .Select(c => new CommentResponse(c.Id, c.ObservationId, c.UserId, c.User.DisplayName, c.User.AvatarUrl, c.Body, c.CreatedAt))
            .ToListAsync();
    }

    public async Task<CommentResponse> AddCommentAsync(Guid observationId, CreateCommentRequest request, Guid userId)
    {
        var obs = await db.Observations.FindAsync(observationId) ?? throw new KeyNotFoundException();
        await EnsureMemberAsync(obs.ProjectId, userId);
        var user = await db.Users.FindAsync(userId) ?? throw new KeyNotFoundException();
        var comment = new Comment { Id = Guid.NewGuid(), ObservationId = observationId, UserId = userId, Body = request.Body };
        db.Comments.Add(comment);
        await db.SaveChangesAsync();
        return new CommentResponse(comment.Id, observationId, userId, user.DisplayName, user.AvatarUrl, comment.Body, comment.CreatedAt);
    }

    public async Task DeleteCommentAsync(Guid commentId, Guid userId)
    {
        var comment = await db.Comments.FindAsync(commentId) ?? throw new KeyNotFoundException();
        if (comment.UserId != userId) throw new UnauthorizedAccessException();
        db.Comments.Remove(comment);
        await db.SaveChangesAsync();
    }

    public async Task<IEnumerable<ActivityItem>> GetProjectActivityAsync(Guid projectId, Guid userId, int limit)
    {
        await EnsureMemberAsync(projectId, userId);

        var obsActivity = await db.Observations
            .Where(o => o.ProjectId == projectId)
            .Include(o => o.Project)
            .Join(db.Users, o => o.UserId, u => u.Id, (o, u) => new ActivityItem(
                "observation", u.DisplayName, u.AvatarUrl,
                $"añadió {o.TaxonName}{(o.Title != null ? $" ({o.Title})" : "")}",
                o.CreatedAt))
            .ToListAsync();

        var noteActivity = await db.Notes
            .Where(n => n.ProjectId == projectId)
            .Join(db.Users, n => n.UserId, u => u.Id, (n, u) => new ActivityItem(
                "note", u.DisplayName, u.AvatarUrl,
                $"creó la nota \"{n.Title}\"",
                n.CreatedAt))
            .ToListAsync();

        var routeActivity = await db.Routes
            .Where(r => r.ProjectId == projectId)
            .Join(db.Users, r => r.UserId, u => u.Id, (r, u) => new ActivityItem(
                "route", u.DisplayName, u.AvatarUrl,
                $"grabó la ruta \"{r.Name}\"",
                r.StartedAt))
            .ToListAsync();

        var commentActivity = await db.Comments
            .Include(c => c.Observation)
            .Where(c => c.Observation.ProjectId == projectId)
            .Join(db.Users, c => c.UserId, u => u.Id, (c, u) => new ActivityItem(
                "comment", u.DisplayName, u.AvatarUrl,
                $"comentó en {c.Observation.TaxonName}",
                c.CreatedAt))
            .ToListAsync();

        return obsActivity.Concat(noteActivity).Concat(routeActivity).Concat(commentActivity)
            .OrderByDescending(a => a.OccurredAt)
            .Take(limit);
    }

    public async Task<ProjectStats> GetProjectStatsAsync(Guid projectId, Guid userId)
    {
        await EnsureMemberAsync(projectId, userId);

        var observations = await db.Observations.Where(o => o.ProjectId == projectId).ToListAsync();
        var routes       = await db.Routes.Where(r => r.ProjectId == projectId).ToListAsync();
        var notes        = await db.Notes.Where(n => n.ProjectId == projectId).CountAsync();

        var topSpecies = observations
            .Where(o => !string.IsNullOrEmpty(o.TaxonName))
            .GroupBy(o => o.TaxonName!)
            .OrderByDescending(g => g.Count())
            .Take(10)
            .Select(g => new TaxonStat(g.Key, g.Count()));

        var obsByDay = observations
            .GroupBy(o => o.ObservedAt.Date)
            .OrderBy(g => g.Key)
            .Select(g => new DayStat(g.Key.ToString("yyyy-MM-dd"), g.Count()));

        var obsByMember = await db.Observations
            .Where(o => o.ProjectId == projectId)
            .Join(db.Users, o => o.UserId, u => u.Id, (o, u) => new { u.DisplayName })
            .GroupBy(x => x.DisplayName)
            .Select(g => new MemberStat(g.Key, g.Count()))
            .OrderByDescending(m => m.ObservationCount)
            .ToListAsync();

        var totalDistanceKm = routes.Sum(r => r.DistanceMeters) / 1000.0;
        var totalFieldHours = routes
            .Where(r => r.EndedAt.HasValue)
            .Sum(r => (r.EndedAt!.Value - r.StartedAt).TotalHours);

        var heatmapPoints = observations
            .Select(o => new double[] { o.Latitude, o.Longitude })
            .ToList();

        return new ProjectStats(
            observations.Count, routes.Count, notes,
            observations.Select(o => o.TaxonName).Distinct().Count(),
            Math.Round(totalDistanceKm, 2),
            Math.Round(totalFieldHours, 1),
            topSpecies, obsByDay, obsByMember, heatmapPoints
        );
    }
}

public class NoteService(AppDbContext db) : INoteService
{
    public async Task<IEnumerable<NoteResponse>> GetByProjectAsync(Guid projectId, Guid userId)
    {
        await EnsureMemberAsync(projectId, userId);
        return await db.Notes.Where(n => n.ProjectId == projectId).Select(n => ToResponse(n)).ToListAsync();
    }

    public async Task<NoteResponse> CreateAsync(Guid projectId, CreateNoteRequest request, Guid userId)
    {
        await EnsureMemberAsync(projectId, userId);
        var note = new Note
        {
            Id = Guid.NewGuid(), ProjectId = projectId, UserId = userId,
            Title = request.Title, Body = request.Body,
            Latitude = request.Latitude, Longitude = request.Longitude
        };
        db.Notes.Add(note);
        await db.SaveChangesAsync();
        return ToResponse(note);
    }

    public async Task<NoteResponse> UpdateAsync(Guid noteId, UpdateNoteRequest request, Guid userId)
    {
        var note = await db.Notes.FindAsync(noteId) ?? throw new KeyNotFoundException();
        if (note.UserId != userId) throw new UnauthorizedAccessException();
        note.Title = request.Title; note.Body = request.Body;
        note.Latitude = request.Latitude; note.Longitude = request.Longitude;
        await db.SaveChangesAsync();
        return ToResponse(note);
    }

    public async Task DeleteAsync(Guid noteId, Guid userId)
    {
        var note = await db.Notes.FindAsync(noteId) ?? throw new KeyNotFoundException();
        if (note.UserId != userId) throw new UnauthorizedAccessException();
        db.Notes.Remove(note);
        await db.SaveChangesAsync();
    }

    private async Task EnsureMemberAsync(Guid projectId, Guid userId)
    {
        if (!await db.ProjectMembers.AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == userId))
            throw new UnauthorizedAccessException("Not a project member.");
    }

    private static NoteResponse ToResponse(Note n) =>
        new(n.Id, n.ProjectId, n.UserId, n.Title, n.Body, n.AttachmentsJson, n.Latitude, n.Longitude, n.CreatedAt);
}
