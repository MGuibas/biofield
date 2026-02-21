using System.Security.Claims;
using BioField.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BioField.API.Controllers;

[ApiController]
[Authorize]
[Route("api/projects/{projectId:guid}/export")]
public class ExportController(IExportService exportService) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<IActionResult> Export(Guid projectId, [FromQuery] string format)
    {
        try
        {
            return format.ToLower() switch
            {
                "csv"     => File(await exportService.ExportCsvAsync(projectId, UserId),        "text/csv",                                                          "observations.csv"),
                "gpx"     => File(await exportService.ExportGpxAsync(projectId, UserId),        "application/gpx+xml",                                               "routes.gpx"),
                "geojson" => File(await exportService.ExportGeoJsonAsync(projectId, UserId),    "application/geo+json",                                              "observations.geojson"),
                "dwc"     => File(await exportService.ExportDarwinCoreAsync(projectId, UserId), "text/csv",                                                          "darwin_core.csv"),
                "pdf"     => File(await exportService.ExportPdfAsync(projectId, UserId),        "application/pdf",                                                   "report.pdf"),
                "excel"   => File(await exportService.ExportExcelAsync(projectId, UserId),      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "biofield.xlsx"),
                _         => BadRequest("Formats: csv, gpx, geojson, dwc, pdf, excel")
            };
        }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }
}
