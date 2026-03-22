using System.Security.Claims;
using BioField.Application.DTOs;
using BioField.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BioField.API.Controllers;

[ApiController]
[Authorize]
[Route("api/projects")]
public class ProjectsController(IProjectService projectService) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(await projectService.GetUserProjectsAsync(UserId));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        try { return Ok(await projectService.GetByIdAsync(id, UserId)); }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateProjectRequest request)
    {
        var result = await projectService.CreateAsync(request, UserId);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateProjectRequest request)
    {
        try { return Ok(await projectService.UpdateAsync(id, request, UserId)); }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        try { await projectService.DeleteAsync(id, UserId); return NoContent(); }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    [HttpPost("{id:guid}/members")]
    public async Task<IActionResult> AddMember(Guid id, AddMemberRequest request)
    {
        try { await projectService.AddMemberAsync(id, request, UserId); return NoContent(); }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (InvalidOperationException ex) { return Conflict(ex.Message); }
    }

    [HttpDelete("{id:guid}/members/{userId:guid}")]
    public async Task<IActionResult> RemoveMember(Guid id, Guid userId)
    {
        try { await projectService.RemoveMemberAsync(id, userId, UserId); return NoContent(); }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    [HttpGet("join/{shareCode}")]
    public async Task<IActionResult> Join(string shareCode)
    {
        try { return Ok(await projectService.JoinByShareCodeAsync(shareCode, UserId)); }
        catch (KeyNotFoundException) { return NotFound("Invalid share code."); }
    }
}
