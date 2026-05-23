using System.Text.Json;
using System.Linq;
using BioField.Application.DTOs;
using BioField.Application.Interfaces;
using BioField.Domain.Entities;
using BioField.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BioField.Infrastructure.Services;

public class SyncService(AppDbContext db) : ISyncService
{
    public async Task<SyncPushResponse> PushAsync(SyncPushRequest request, Guid userId)
    {
        var failed = new List<Guid>();
        var processed = 0;

        var sortedItems = request.Items
            .OrderBy(item => 
                item.Operation == "delete" 
                    ? (item.EntityType.Equals("observation", StringComparison.OrdinalIgnoreCase) ? 1 : 2)
                    : (item.EntityType.Equals("route", StringComparison.OrdinalIgnoreCase) ? 3 : 4)
            ).ToList();

        foreach (var item in sortedItems)
        {
            try
            {
                await ProcessItemAsync(item, userId);
                processed++;
            }
            catch
            {
                failed.Add(item.EntityId);
            }
        }

        return new SyncPushResponse(processed, failed);
    }

    public async Task<SyncPullResponse> PullAsync(Guid projectId, DateTime since, Guid userId)
    {
        if (!await db.ProjectMembers.AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == userId))
            throw new UnauthorizedAccessException("Not a project member.");

        var observations = await db.Observations
            .Where(o => o.ProjectId == projectId && o.UpdatedAt > since)
            .Select(o => new ObservationResponse(
                o.Id, o.ProjectId, o.RouteId, o.UserId, o.TaxonId, o.TaxonName,
                o.Title, o.Description, o.Latitude, o.Longitude, o.Altitude,
                o.ObservedAt, o.PhotosJson, o.Notes, o.Quantity,
                o.TagsJson, o.WeatherCondition, o.Temperature, o.Humidity,
                o.SyncStatus.ToString(), o.CreatedAt,
                o.HabitatDescription, o.HabitatPhotoUrl))
            .ToListAsync();

        var routes = await db.Routes
            .Where(r => r.ProjectId == projectId && r.StartedAt > since)
            .Select(r => new RouteResponse(
                r.Id, r.ProjectId, r.UserId, r.Name,
                r.StartedAt, r.EndedAt, r.DistanceMeters, r.GpxFileUrl, r.Notes, r.TrackPointsJson))
            .ToListAsync();

        var notes = await db.Notes
            .Where(n => n.ProjectId == projectId && n.CreatedAt > since)
            .Select(n => new NoteResponse(
                n.Id, n.ProjectId, n.UserId, n.Title, n.Body,
                n.AttachmentsJson, n.Latitude, n.Longitude, n.CreatedAt))
            .ToListAsync();

        return new SyncPullResponse(observations, routes, notes, DateTime.UtcNow);
    }

    private async Task ProcessItemAsync(SyncItem item, Guid userId)
    {
        switch (item.EntityType.ToLower())
        {
            case "observation":
                await SyncObservationAsync(item, userId);
                break;
            case "route":
                await SyncRouteAsync(item, userId);
                break;
            case "note":
                await SyncNoteAsync(item, userId);
                break;
        }
    }

    private async Task SyncObservationAsync(SyncItem item, Guid userId)
    {
        var data = JsonSerializer.Deserialize<JsonElement>(item.Payload);

        if (item.Operation == "delete")
        {
            var obs = await db.Observations.FindAsync(item.EntityId);
            if (obs != null && obs.UserId == userId) db.Observations.Remove(obs);
        }
        else
        {
            var existing = await db.Observations.FindAsync(item.EntityId);
            if (existing == null)
            {
                var projectId = data.GetProperty("projectId").GetGuid();
                var routeId = data.TryGetProperty("routeId", out var r) && r.ValueKind != JsonValueKind.Null ? (Guid?)r.GetGuid() : null;
                if (routeId.HasValue && !await db.Routes.AnyAsync(rt => rt.Id == routeId.Value))
                {
                    db.Routes.Add(new Route
                    {
                        Id = routeId.Value,
                        ProjectId = projectId,
                        UserId = userId,
                        Name = "Ruta en grabación",
                        StartedAt = DateTime.UtcNow
                    });
                    await db.SaveChangesAsync();
                }

                db.Observations.Add(new Observation
                {
                    Id = item.EntityId,
                    ProjectId = projectId,
                    RouteId = routeId,
                    UserId = userId,
                    TaxonName = data.GetProperty("taxonName").GetString() ?? "",
                    Latitude = data.GetProperty("latitude").GetDouble(),
                    Longitude = data.GetProperty("longitude").GetDouble(),
                    ObservedAt = data.GetProperty("observedAt").GetDateTime(),
                    Notes = data.TryGetProperty("notes", out var n) ? n.GetString() : null,
                    Quantity = data.TryGetProperty("quantity", out var q) ? q.GetInt32() : 1,
                    SyncStatus = SyncStatus.Synced
                });
            }
            else if (existing.UserId == userId)
            {
                var routeId = data.TryGetProperty("routeId", out var r) && r.ValueKind != JsonValueKind.Null ? (Guid?)r.GetGuid() : null;
                if (routeId.HasValue && !await db.Routes.AnyAsync(rt => rt.Id == routeId.Value))
                {
                    db.Routes.Add(new Route
                    {
                        Id = routeId.Value,
                        ProjectId = existing.ProjectId,
                        UserId = userId,
                        Name = "Ruta en grabación",
                        StartedAt = DateTime.UtcNow
                    });
                    await db.SaveChangesAsync();
                }

                existing.RouteId = routeId ?? existing.RouteId;
                existing.TaxonName = data.GetProperty("taxonName").GetString() ?? existing.TaxonName;
                existing.Notes = data.TryGetProperty("notes", out var n) ? n.GetString() : existing.Notes;
                existing.UpdatedAt = DateTime.UtcNow;
                existing.SyncStatus = SyncStatus.Synced;
            }
        }

        await db.SaveChangesAsync();
    }

    private async Task SyncRouteAsync(SyncItem item, Guid userId)
    {
        var data = JsonSerializer.Deserialize<JsonElement>(item.Payload);

        if (item.Operation == "delete")
        {
            var route = await db.Routes.FindAsync(item.EntityId);
            if (route != null && route.UserId == userId) db.Routes.Remove(route);
        }
        else
        {
            var existing = await db.Routes.FindAsync(item.EntityId);
            if (existing == null)
            {
                db.Routes.Add(new Route
                {
                    Id = item.EntityId,
                    ProjectId = data.GetProperty("projectId").GetGuid(),
                    UserId = userId,
                    Name = data.GetProperty("name").GetString() ?? "Ruta",
                    StartedAt = data.GetProperty("startedAt").GetDateTime(),
                    EndedAt = data.TryGetProperty("endedAt", out var e) && e.ValueKind != JsonValueKind.Null ? e.GetDateTime() : null,
                    DistanceMeters = data.TryGetProperty("distanceMeters", out var d) ? d.GetDouble() : 0,
                    TrackPointsJson = data.TryGetProperty("trackPointsJson", out var t) ? t.GetString() : null,
                    Notes = data.TryGetProperty("notes", out var n) ? n.GetString() : null
                });
            }
            else if (existing.UserId == userId)
            {
                existing.EndedAt = data.TryGetProperty("endedAt", out var e) && e.ValueKind != JsonValueKind.Null ? e.GetDateTime() : existing.EndedAt;
                existing.DistanceMeters = data.TryGetProperty("distanceMeters", out var d) ? d.GetDouble() : existing.DistanceMeters;
                existing.TrackPointsJson = data.TryGetProperty("trackPointsJson", out var t) ? t.GetString() : existing.TrackPointsJson;
            }
        }

        await db.SaveChangesAsync();
    }

    private async Task SyncNoteAsync(SyncItem item, Guid userId)
    {
        var data = JsonSerializer.Deserialize<JsonElement>(item.Payload);

        if (item.Operation == "delete")
        {
            var note = await db.Notes.FindAsync(item.EntityId);
            if (note != null && note.UserId == userId) db.Notes.Remove(note);
        }
        else
        {
            var existing = await db.Notes.FindAsync(item.EntityId);
            if (existing == null)
            {
                db.Notes.Add(new Note
                {
                    Id = item.EntityId,
                    ProjectId = data.GetProperty("projectId").GetGuid(),
                    UserId = userId,
                    Title = data.GetProperty("title").GetString() ?? "",
                    Body = data.GetProperty("body").GetString() ?? "",
                    Latitude = data.TryGetProperty("latitude", out var lat) && lat.ValueKind != JsonValueKind.Null ? lat.GetDouble() : null,
                    Longitude = data.TryGetProperty("longitude", out var lon) && lon.ValueKind != JsonValueKind.Null ? lon.GetDouble() : null
                });
            }
            else if (existing.UserId == userId)
            {
                existing.Title = data.GetProperty("title").GetString() ?? existing.Title;
                existing.Body = data.GetProperty("body").GetString() ?? existing.Body;
            }
        }

        await db.SaveChangesAsync();
    }
}
