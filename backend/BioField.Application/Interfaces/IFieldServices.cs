using BioField.Application.DTOs;

namespace BioField.Application.Interfaces;

public interface IProjectService
{
    Task<IEnumerable<ProjectResponse>> GetUserProjectsAsync(Guid userId);
    Task<ProjectDetailResponse> GetByIdAsync(Guid projectId, Guid userId);
    Task<ProjectResponse> CreateAsync(CreateProjectRequest request, Guid ownerId);
    Task<ProjectResponse> UpdateAsync(Guid projectId, UpdateProjectRequest request, Guid userId);
    Task DeleteAsync(Guid projectId, Guid userId);
    Task AddMemberAsync(Guid projectId, AddMemberRequest request, Guid requesterId);
    Task RemoveMemberAsync(Guid projectId, Guid targetUserId, Guid requesterId);
    Task<ProjectDetailResponse> JoinByShareCodeAsync(string shareCode, Guid userId);
}

public interface IRouteService
{
    Task<IEnumerable<RouteResponse>> GetByProjectAsync(Guid projectId, Guid userId);
    Task<RouteResponse> GetByIdAsync(Guid routeId, Guid userId);
    Task<RouteResponse> CreateAsync(Guid projectId, CreateRouteRequest request, Guid userId);
    Task<RouteResponse> UpdateAsync(Guid routeId, UpdateRouteRequest request, Guid userId);
    Task DeleteAsync(Guid routeId, Guid userId);
}

public interface IObservationService
{
    Task<PagedResult<ObservationResponse>> GetByProjectAsync(Guid projectId, Guid userId, int page, int pageSize);
    Task<ObservationResponse> GetByIdAsync(Guid observationId, Guid userId);
    Task<ObservationResponse> CreateAsync(Guid projectId, CreateObservationRequest request, Guid userId);
    Task<ObservationResponse> UpdateAsync(Guid observationId, UpdateObservationRequest request, Guid userId);
    Task DeleteAsync(Guid observationId, Guid userId);
    Task<ObservationResponse> AddPhotoAsync(Guid observationId, string photoUrl, Guid userId);
    // Comentarios
    Task<IEnumerable<CommentResponse>> GetCommentsAsync(Guid observationId, Guid userId);
    Task<CommentResponse> AddCommentAsync(Guid observationId, CreateCommentRequest request, Guid userId);
    Task DeleteCommentAsync(Guid commentId, Guid userId);
    // Actividad
    Task<IEnumerable<ActivityItem>> GetProjectActivityAsync(Guid projectId, Guid userId, int limit);
    // Estadísticas
    Task<ProjectStats> GetProjectStatsAsync(Guid projectId, Guid userId);
}

public interface INoteService
{
    Task<IEnumerable<NoteResponse>> GetByProjectAsync(Guid projectId, Guid userId);
    Task<NoteResponse> CreateAsync(Guid projectId, CreateNoteRequest request, Guid userId);
    Task<NoteResponse> UpdateAsync(Guid noteId, UpdateNoteRequest request, Guid userId);
    Task DeleteAsync(Guid noteId, Guid userId);
}
