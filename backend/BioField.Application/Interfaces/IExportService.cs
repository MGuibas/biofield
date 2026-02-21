namespace BioField.Application.Interfaces;

public interface IExportService
{
    Task<byte[]> ExportCsvAsync(Guid projectId, Guid userId);
    Task<byte[]> ExportGpxAsync(Guid projectId, Guid userId);
    Task<byte[]> ExportGeoJsonAsync(Guid projectId, Guid userId);
    Task<byte[]> ExportDarwinCoreAsync(Guid projectId, Guid userId);
    Task<byte[]> ExportPdfAsync(Guid projectId, Guid userId);
    Task<byte[]> ExportExcelAsync(Guid projectId, Guid userId);
}
