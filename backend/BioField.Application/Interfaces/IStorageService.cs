namespace BioField.Application.Interfaces;

public interface IStorageService
{
    Task<string> UploadAsync(Stream stream, string fileName, string contentType);
    Task<Stream> DownloadAsync(string objectName);
    Task DeleteAsync(string objectName);
}
