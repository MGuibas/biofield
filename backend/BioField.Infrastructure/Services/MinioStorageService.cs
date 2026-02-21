using BioField.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Minio;
using Minio.DataModel.Args;
using Minio.DataModel.ILM;
using System.Text.Json;

namespace BioField.Infrastructure.Services;

public class MinioStorageService : IStorageService
{
    private readonly IMinioClient _minio;
    private readonly string _bucket;
    private readonly string _publicBase; // http://host:9000/bucket

    public MinioStorageService(IConfiguration config)
    {
        var endpoint = config["Minio:Endpoint"]!;
        var access   = config["Minio:AccessKey"]!;
        var secret   = config["Minio:SecretKey"]!;
        _bucket      = config["Minio:Bucket"]!;
        _publicBase  = $"http://{endpoint}/{_bucket}";

        _minio = new MinioClient()
            .WithEndpoint(endpoint)
            .WithCredentials(access, secret)
            .Build();
    }

    // Devuelve la URL pública completa
    public async Task<string> UploadAsync(Stream stream, string fileName, string contentType)
    {
        await EnsureBucketAsync();
        var args = new PutObjectArgs()
            .WithBucket(_bucket)
            .WithObject(fileName)
            .WithStreamData(stream)
            .WithObjectSize(stream.Length)
            .WithContentType(contentType);
        await _minio.PutObjectAsync(args);
        return $"{_publicBase}/{fileName}";
    }

    public async Task<Stream> DownloadAsync(string objectName)
    {
        // objectName puede ser URL completa o solo el path
        var key = objectName.StartsWith("http") ? new Uri(objectName).AbsolutePath.TrimStart('/').Replace($"{_bucket}/", "") : objectName;
        var ms = new MemoryStream();
        var args = new GetObjectArgs()
            .WithBucket(_bucket)
            .WithObject(key)
            .WithCallbackStream(s => s.CopyTo(ms));
        await _minio.GetObjectAsync(args);
        ms.Position = 0;
        return ms;
    }

    public async Task DeleteAsync(string objectName)
    {
        var key = objectName.StartsWith("http") ? new Uri(objectName).AbsolutePath.TrimStart('/').Replace($"{_bucket}/", "") : objectName;
        var args = new RemoveObjectArgs()
            .WithBucket(_bucket)
            .WithObject(key);
        await _minio.RemoveObjectAsync(args);
    }

    private async Task EnsureBucketAsync()
    {
        var exists = await _minio.BucketExistsAsync(new BucketExistsArgs().WithBucket(_bucket));
        if (!exists)
            await _minio.MakeBucketAsync(new MakeBucketArgs().WithBucket(_bucket));
        // Política pública de solo lectura
        var policy = JsonSerializer.Serialize(new
        {
            Version = "2012-10-17",
            Statement = new[] { new {
                Effect = "Allow",
                Principal = new { AWS = new[] { "*" } },
                Action = new[] { "s3:GetObject" },
                Resource = new[] { $"arn:aws:s3:::{_bucket}/*" }
            }}
        });
        await _minio.SetPolicyAsync(new SetPolicyArgs().WithBucket(_bucket).WithPolicy(policy));
    }
}
