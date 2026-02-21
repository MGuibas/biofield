using System.Text;
using System.Text.Json;
using BioField.Application.Interfaces;
using BioField.Infrastructure.Persistence;
using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace BioField.Infrastructure.Services;

public class ExportService(AppDbContext db, IStorageService storage) : IExportService
{
    public async Task<byte[]> ExportCsvAsync(Guid projectId, Guid userId)
    {
        await EnsureMemberAsync(projectId, userId);
        var observations = await db.Observations
            .Where(o => o.ProjectId == projectId)
            .OrderBy(o => o.ObservedAt)
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("Id,TaxonName,TaxonId,Title,Description,HabitatDescription,Latitude,Longitude,Altitude,ObservedAt,Quantity,Notes,Photos");
        foreach (var o in observations)
        {
            var photos = string.IsNullOrEmpty(o.PhotosJson) ? "" : string.Join("|", System.Text.Json.JsonSerializer.Deserialize<List<string>>(o.PhotosJson)!);
            sb.AppendLine($"{o.Id},{Escape(o.TaxonName)},{o.TaxonId},{Escape(o.Title)},{Escape(o.Description)},{Escape(o.HabitatDescription)},{o.Latitude},{o.Longitude},{o.Altitude},{o.ObservedAt:O},{o.Quantity},{Escape(o.Notes)},{Escape(photos)}");
        }

        return Encoding.UTF8.GetBytes(sb.ToString());
    }

    public async Task<byte[]> ExportGpxAsync(Guid projectId, Guid userId)
    {
        await EnsureMemberAsync(projectId, userId);
        var routes = await db.Routes
            .Where(r => r.ProjectId == projectId)
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
        sb.AppendLine("<gpx version=\"1.1\" creator=\"BioField\" xmlns=\"http://www.topografix.com/GPX/1/1\">");

        foreach (var route in routes)
        {
            sb.AppendLine($"  <trk><name>{Xml(route.Name)}</name><trkseg>");
            if (route.TrackPointsJson != null)
            {
                var points = JsonDocument.Parse(route.TrackPointsJson).RootElement;
                foreach (var pt in points.EnumerateArray())
                {
                    var lat = pt.GetProperty("lat").GetDouble();
                    var lon = pt.GetProperty("lon").GetDouble();
                    var ele = pt.TryGetProperty("alt", out var a) ? $"<ele>{a.GetDouble()}</ele>" : "";
                    sb.AppendLine($"    <trkpt lat=\"{lat}\" lon=\"{lon}\">{ele}</trkpt>");
                }
            }
            sb.AppendLine("  </trkseg></trk>");
        }

        sb.AppendLine("</gpx>");
        return Encoding.UTF8.GetBytes(sb.ToString());
    }

    public async Task<byte[]> ExportGeoJsonAsync(Guid projectId, Guid userId)
    {
        await EnsureMemberAsync(projectId, userId);
        var observations = await db.Observations
            .Where(o => o.ProjectId == projectId)
            .ToListAsync();

        var features = observations.Select(o => new
        {
            type = "Feature",
            geometry = new { type = "Point", coordinates = new[] { o.Longitude, o.Latitude } },
            properties = new
            {
                id = o.Id,
                taxonName = o.TaxonName,
                taxonId = o.TaxonId,
                title = o.Title,
                description = o.Description,
                habitatDescription = o.HabitatDescription,
                observedAt = o.ObservedAt,
                quantity = o.Quantity,
                notes = o.Notes,
                photos = string.IsNullOrEmpty(o.PhotosJson) ? new List<string>() : System.Text.Json.JsonSerializer.Deserialize<List<string>>(o.PhotosJson)!
            }
        });

        var geojson = new { type = "FeatureCollection", features };
        return JsonSerializer.SerializeToUtf8Bytes(geojson, new JsonSerializerOptions { WriteIndented = true });
    }

    public async Task<byte[]> ExportDarwinCoreAsync(Guid projectId, Guid userId)
    {
        await EnsureMemberAsync(projectId, userId);
        var observations = await db.Observations
            .Where(o => o.ProjectId == projectId)
            .Include(o => o.Project)
            .OrderBy(o => o.ObservedAt)
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("occurrenceID,basisOfRecord,scientificName,taxonID,decimalLatitude,decimalLongitude,eventDate,individualCount,occurrenceRemarks,locationRemarks,associatedMedia,datasetName");
        foreach (var o in observations)
        {
            var photos = string.IsNullOrEmpty(o.PhotosJson) ? "" : string.Join("|", System.Text.Json.JsonSerializer.Deserialize<List<string>>(o.PhotosJson)!);
            sb.AppendLine($"{o.Id},HumanObservation,{Escape(o.TaxonName)},{o.TaxonId},{o.Latitude},{o.Longitude},{o.ObservedAt:yyyy-MM-dd},{o.Quantity},{Escape(o.Description)},{Escape(o.HabitatDescription)},{Escape(photos)},{Escape(o.Project.Name)}");
        }

        return Encoding.UTF8.GetBytes(sb.ToString());
    }

    public async Task<byte[]> ExportPdfAsync(Guid projectId, Guid userId)
    {
        await EnsureMemberAsync(projectId, userId);
        var project = await db.Projects.FindAsync(projectId)
            ?? throw new KeyNotFoundException();
        var observations = await db.Observations
            .Where(o => o.ProjectId == projectId)
            .OrderBy(o => o.ObservedAt)
            .ToListAsync();
        var routes = await db.Routes
            .Where(r => r.ProjectId == projectId)
            .ToListAsync();

        // Pre-cargar fotos desde MinIO
        var photoCache = new Dictionary<string, byte[]>();
        foreach (var o in observations)
        {
            var keys = string.IsNullOrEmpty(o.PhotosJson)
                ? new List<string>()
                : JsonSerializer.Deserialize<List<string>>(o.PhotosJson)!;
            if (o.HabitatPhotoUrl != null) keys.Add(o.HabitatPhotoUrl);
            foreach (var key in keys.Where(k => !photoCache.ContainsKey(k)))
            {
                try
                {
                    using var s = await storage.DownloadAsync(key);
                    using var ms = new MemoryStream();
                    await s.CopyToAsync(ms);
                    photoCache[key] = ms.ToArray();
                }
                catch { /* foto no disponible */ }
            }
        }

        QuestPDF.Settings.License = LicenseType.Community;

        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(2, Unit.Centimetre);
                page.DefaultTextStyle(x => x.FontSize(10));

                page.Header().Text($"BioField — {project.Name}")
                    .SemiBold().FontSize(18);

                page.Content().Column(col =>
                {
                    col.Item().Text($"Generado: {DateTime.UtcNow:dd/MM/yyyy HH:mm} UTC").FontSize(9).FontColor(Colors.Grey.Medium);
                    col.Item().PaddingTop(10).Text($"Rutas: {routes.Count}  |  Observaciones: {observations.Count}").SemiBold();

                    if (routes.Count > 0)
                    {
                        col.Item().PaddingTop(15).Text("Rutas GPS").FontSize(13).SemiBold();
                        col.Item().Table(t =>
                        {
                            t.ColumnsDefinition(c => { c.RelativeColumn(3); c.RelativeColumn(2); c.RelativeColumn(2); c.RelativeColumn(2); });
                            t.Header(h =>
                            {
                                foreach (var header in new[] { "Nombre", "Inicio", "Fin", "Distancia (m)" })
                                    h.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text(header).SemiBold();
                            });
                            foreach (var r in routes)
                            {
                                t.Cell().Padding(4).Text(r.Name);
                                t.Cell().Padding(4).Text(r.StartedAt.ToString("dd/MM/yyyy HH:mm"));
                                t.Cell().Padding(4).Text(r.EndedAt?.ToString("dd/MM/yyyy HH:mm") ?? "—");
                                t.Cell().Padding(4).Text(r.DistanceMeters.ToString("F0"));
                            }
                        });
                    }

                    foreach (var o in observations)
                    {
                        var photos = string.IsNullOrEmpty(o.PhotosJson)
                            ? new List<string>()
                            : JsonSerializer.Deserialize<List<string>>(o.PhotosJson)!;

                        col.Item().PaddingTop(16).BorderTop(1).BorderColor(Colors.Grey.Lighten2).Column(obs =>
                        {
                            obs.Item().PaddingTop(8).Text($"{o.TaxonName}{(o.Title != null ? $" — {o.Title}" : "")}").FontSize(12).SemiBold();
                            obs.Item().Text($"{o.ObservedAt:dd/MM/yyyy HH:mm}  ·  {o.Latitude:F5}, {o.Longitude:F5}  ·  ×{o.Quantity}").FontSize(9).FontColor(Colors.Grey.Medium);

                            if (!string.IsNullOrEmpty(o.Description))
                                obs.Item().PaddingTop(4).Text(o.Description).FontSize(10);

                            if (!string.IsNullOrEmpty(o.HabitatDescription))
                                obs.Item().PaddingTop(4).Text($"🌿 Hábitat: {o.HabitatDescription}").FontSize(9).FontColor(Colors.Grey.Darken1);

                            if (!string.IsNullOrEmpty(o.Notes))
                                obs.Item().PaddingTop(4).Text($"📝 {o.Notes}").FontSize(9).Italic();

                            // Fotos en fila
                            var allPhotos = new List<string>(photos);
                            if (o.HabitatPhotoUrl != null) allPhotos.Add(o.HabitatPhotoUrl);
                            var available = allPhotos.Where(k => photoCache.ContainsKey(k)).ToList();
                            if (available.Count > 0)
                            {
                                obs.Item().PaddingTop(6).Row(row =>
                                {
                                    foreach (var key in available.Take(4))
                                    {
                                        row.RelativeItem().MaxWidth(110).MaxHeight(90).Padding(2)
                                            .Image(photoCache[key]).FitArea();
                                    }
                                });
                            }
                        });
                    }
                });

                page.Footer().AlignCenter().Text(x =>
                {
                    x.Span("Página ");
                    x.CurrentPageNumber();
                    x.Span(" de ");
                    x.TotalPages();
                });
            });
        }).GeneratePdf();
    }

    private async Task EnsureMemberAsync(Guid projectId, Guid userId)
    {
        if (!await db.ProjectMembers.AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == userId))
            throw new UnauthorizedAccessException("Not a project member.");
    }

    private static string Escape(string? value) =>
        value == null ? "" : $"\"{value.Replace("\"", "\"\"")}\"";

    private static string Xml(string value) =>
        value.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;");

    public async Task<byte[]> ExportExcelAsync(Guid projectId, Guid userId)
    {
        await EnsureMemberAsync(projectId, userId);
        var project = await db.Projects.FindAsync(projectId) ?? throw new KeyNotFoundException();
        var observations = await db.Observations
            .Where(o => o.ProjectId == projectId).OrderBy(o => o.ObservedAt).ToListAsync();
        var routes = await db.Routes
            .Where(r => r.ProjectId == projectId).OrderBy(r => r.StartedAt).ToListAsync();

        using var wb = new XLWorkbook();

        // Hoja observaciones
        var wsObs = wb.Worksheets.Add("Observaciones");
        var obsHeaders = new[] { "ID","Especie","TaxonID","Título","Descripción","Lugar/Hábitat","Latitud","Longitud","Altitud","Fecha","Cantidad","Clima","Temp(°C)","Humedad(%)","Notas","Fotos" };
        for (int i = 0; i < obsHeaders.Length; i++)
            wsObs.Cell(1, i + 1).Value = obsHeaders[i];
        wsObs.Row(1).Style.Font.Bold = true;
        wsObs.Row(1).Style.Fill.BackgroundColor = XLColor.FromHtml("#2e7d32");
        wsObs.Row(1).Style.Font.FontColor = XLColor.White;
        for (int i = 0; i < observations.Count; i++)
        {
            var o = observations[i]; var row = i + 2;
            var photos = string.IsNullOrEmpty(o.PhotosJson) ? "" : string.Join(" | ", System.Text.Json.JsonSerializer.Deserialize<List<string>>(o.PhotosJson)!);
            wsObs.Cell(row, 1).Value = o.Id.ToString();
            wsObs.Cell(row, 2).Value = o.TaxonName;
            wsObs.Cell(row, 3).Value = o.TaxonId?.ToString() ?? "";
            wsObs.Cell(row, 4).Value = o.Title ?? "";
            wsObs.Cell(row, 5).Value = o.Description ?? "";
            wsObs.Cell(row, 6).Value = o.HabitatDescription ?? "";
            wsObs.Cell(row, 7).Value = o.Latitude;
            wsObs.Cell(row, 8).Value = o.Longitude;
            wsObs.Cell(row, 9).Value = o.Altitude?.ToString() ?? "";
            wsObs.Cell(row, 10).Value = o.ObservedAt.ToString("yyyy-MM-dd HH:mm");
            wsObs.Cell(row, 11).Value = o.Quantity;
            wsObs.Cell(row, 12).Value = o.WeatherCondition ?? "";
            wsObs.Cell(row, 13).Value = o.Temperature?.ToString() ?? "";
            wsObs.Cell(row, 14).Value = o.Humidity?.ToString() ?? "";
            wsObs.Cell(row, 15).Value = o.Notes ?? "";
            wsObs.Cell(row, 16).Value = photos;
        }
        wsObs.Columns().AdjustToContents();

        // Hoja rutas
        var wsRoutes = wb.Worksheets.Add("Rutas");
        var routeHeaders = new[] { "ID","Nombre","Inicio","Fin","Distancia(m)","Notas" };
        for (int i = 0; i < routeHeaders.Length; i++)
            wsRoutes.Cell(1, i + 1).Value = routeHeaders[i];
        wsRoutes.Row(1).Style.Font.Bold = true;
        wsRoutes.Row(1).Style.Fill.BackgroundColor = XLColor.FromHtml("#1565c0");
        wsRoutes.Row(1).Style.Font.FontColor = XLColor.White;
        for (int i = 0; i < routes.Count; i++)
        {
            var r = routes[i]; var row = i + 2;
            wsRoutes.Cell(row, 1).Value = r.Id.ToString();
            wsRoutes.Cell(row, 2).Value = r.Name;
            wsRoutes.Cell(row, 3).Value = r.StartedAt.ToString("yyyy-MM-dd HH:mm");
            wsRoutes.Cell(row, 4).Value = r.EndedAt?.ToString("yyyy-MM-dd HH:mm") ?? "";
            wsRoutes.Cell(row, 5).Value = r.DistanceMeters;
            wsRoutes.Cell(row, 6).Value = r.Notes ?? "";
        }
        wsRoutes.Columns().AdjustToContents();

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }
}
