using System.Security.Claims;
using BioField.Application.DTOs;
using BioField.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BioField.API.Controllers;

[ApiController]
[Authorize]
[Route("api/sync")]
public class SyncController(ISyncService syncService) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpPost("push")]
    public async Task<IActionResult> Push(SyncPushRequest request) =>
        Ok(await syncService.PushAsync(request, UserId));

    [HttpGet("pull")]
    public async Task<IActionResult> Pull([FromQuery] Guid projectId, [FromQuery] DateTime since)
    {
        try { return Ok(await syncService.PullAsync(projectId, since, UserId)); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }
}

[ApiController]
[Authorize]
[Route("api/inaturalist")]
public class iNaturalistController(IiNaturalistService inatService) : ControllerBase
{
    [HttpGet("taxa")]
    public async Task<IActionResult> Autocomplete([FromQuery] string q)
    {
        if (string.IsNullOrWhiteSpace(q)) return BadRequest("Query required.");
        return Ok(await inatService.AutocompleteAsync(q));
    }

    [HttpGet("taxa/{id:long}")]
    public async Task<IActionResult> GetTaxon(long id)
    {
        var result = await inatService.GetTaxonAsync(id);
        return result is null ? NotFound() : Ok(result);
    }
}
