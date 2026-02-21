namespace BioField.Application.DTOs;

public record CreateProjectRequest(string Name, string? Description, string? CoverImageUrl);
public record UpdateProjectRequest(string Name, string? Description, string? CoverImageUrl, bool IsArchived);
public record AddMemberRequest(Guid UserId, string Role);

public record ProjectResponse(
    Guid Id, string Name, string? Description, Guid OwnerId,
    DateTime CreatedAt, bool IsArchived, string ShareCode, string? CoverImageUrl,
    int MemberCount);

public record ProjectDetailResponse(
    Guid Id, string Name, string? Description, Guid OwnerId,
    DateTime CreatedAt, bool IsArchived, string ShareCode, string? CoverImageUrl,
    IEnumerable<MemberResponse> Members);

public record MemberResponse(Guid UserId, string DisplayName, string? AvatarUrl, string Role, DateTime JoinedAt);
