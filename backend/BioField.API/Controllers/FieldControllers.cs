using System.Security.Claims;
using BioField.Application.DTOs;
using BioField.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BioField.API.Controllers;

[ApiController]
[Authorize]
[Route("api/projects/{projectId:guid}/routes")]
public class RoutesController(IRouteService routeService) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<IActionResult> GetAll(Guid projectId)
    {
        try { return Ok(await routeService.GetByProjectAsync(projectId, UserId)); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    [HttpPost]
    public async Task<IActionResult> Create(Guid projectId, CreateRouteRequest request)
    {
        try { return Ok(await routeService.CreateAsync(projectId, request, UserId)); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }
}

[ApiController]
[Authorize]
[Route("api/routes")]
public class RouteDetailController(IRouteService routeService) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        try { return Ok(await routeService.GetByIdAsync(id, UserId)); }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateRouteRequest request)
    {
        try { return Ok(await routeService.UpdateAsync(id, request, UserId)); }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        try { await routeService.DeleteAsync(id, UserId); return NoContent(); }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }
}

[ApiController]
[Authorize]
[Route("api/projects/{projectId:guid}/observations")]
public class ObservationsController(IObservationService observationService) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<IActionResult> GetAll(Guid projectId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        try { return Ok(await observationService.GetByProjectAsync(projectId, UserId, page, pageSize)); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    [HttpPost]
    public async Task<IActionResult> Create(Guid projectId, CreateObservationRequest request)
    {
        try { return Ok(await observationService.CreateAsync(projectId, request, UserId)); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    [HttpGet("activity")]
    public async Task<IActionResult> GetActivity(Guid projectId, [FromQuery] int limit = 50)
    {
        try { return Ok(await observationService.GetProjectActivityAsync(projectId, UserId, limit)); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats(Guid projectId)
    {
        try { return Ok(await observationService.GetProjectStatsAsync(projectId, UserId)); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }
}

[ApiController]
[Authorize]
[Route("api/observations")]
public class ObservationDetailController(IObservationService observationService, IStorageService storage) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        try { return Ok(await observationService.GetByIdAsync(id, UserId)); }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateObservationRequest request)
    {
        try { return Ok(await observationService.UpdateAsync(id, request, UserId)); }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        try { await observationService.DeleteAsync(id, UserId); return NoContent(); }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    [HttpPost("{id:guid}/photos")]
    public async Task<IActionResult> AddPhoto(Guid id, IFormFile photo)
    {
        try
        {
            var ext = Path.GetExtension(photo.FileName);
            var objectName = $"photos/{Guid.NewGuid()}{ext}";
            using var stream = photo.OpenReadStream();
            await storage.UploadAsync(stream, objectName, photo.ContentType);
            return Ok(await observationService.AddPhotoAsync(id, objectName, UserId));
        }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    [HttpPost("{id:guid}/habitat-photo")]
    public async Task<IActionResult> UploadHabitatPhoto(Guid id, IFormFile photo)
    {
        try
        {
            var ext = Path.GetExtension(photo.FileName);
            var objectName = $"photos/habitat_{Guid.NewGuid()}{ext}";
            using var stream = photo.OpenReadStream();
            await storage.UploadAsync(stream, objectName, photo.ContentType);
            var obs = await observationService.GetByIdAsync(id, UserId);
            var req = new UpdateObservationRequest(
                obs.RouteId, obs.TaxonId, obs.TaxonName, obs.Title, obs.Description,
                obs.Latitude, obs.Longitude, obs.Altitude, obs.ObservedAt, obs.Notes,
                obs.Quantity, obs.TagsJson, obs.WeatherCondition, obs.Temperature, obs.Humidity,
                obs.HabitatDescription, objectName);
            return Ok(await observationService.UpdateAsync(id, req, UserId));
        }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    // Proxy para servir fotos desde MinIO con autenticación JWT
    [HttpGet("photo")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPhoto([FromQuery] string key)
    {
        try
        {
            var stream = await storage.DownloadAsync(key);
            var ext = Path.GetExtension(key).ToLower();
            var mime = ext switch { ".png" => "image/png", ".gif" => "image/gif", ".webp" => "image/webp", _ => "image/jpeg" };
            return File(stream, mime);
        }
        catch { return NotFound(); }
    }

    [HttpGet("{id:guid}/comments")]
    public async Task<IActionResult> GetComments(Guid id)
    {
        try { return Ok(await observationService.GetCommentsAsync(id, UserId)); }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    [HttpPost("{id:guid}/comments")]
    public async Task<IActionResult> AddComment(Guid id, CreateCommentRequest request)
    {
        try { return Ok(await observationService.AddCommentAsync(id, request, UserId)); }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    [HttpDelete("comments/{commentId:guid}")]
    public async Task<IActionResult> DeleteComment(Guid commentId)
    {
        try { await observationService.DeleteCommentAsync(commentId, UserId); return NoContent(); }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }
}

[ApiController]
[Authorize]
[Route("api/projects/{projectId:guid}/notes")]
public class NotesController(INoteService noteService) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<IActionResult> GetAll(Guid projectId)
    {
        try { return Ok(await noteService.GetByProjectAsync(projectId, UserId)); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    [HttpPost]
    public async Task<IActionResult> Create(Guid projectId, CreateNoteRequest request)
    {
        try { return Ok(await noteService.CreateAsync(projectId, request, UserId)); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }
}

[ApiController]
[Authorize]
[Route("api/notes")]
public class NoteDetailController(INoteService noteService) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateNoteRequest request)
    {
        try { return Ok(await noteService.UpdateAsync(id, request, UserId)); }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        try { await noteService.DeleteAsync(id, UserId); return NoContent(); }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }
}
