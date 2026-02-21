using BioField.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BioField.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<ProjectMember> ProjectMembers => Set<ProjectMember>();
    public DbSet<Route> Routes => Set<Route>();
    public DbSet<Observation> Observations => Set<Observation>();
    public DbSet<Note> Notes => Set<Note>();
    public DbSet<Comment> Comments => Set<Comment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ProjectMember>()
            .HasKey(pm => new { pm.ProjectId, pm.UserId });

        modelBuilder.Entity<ProjectMember>()
            .HasOne(pm => pm.Project)
            .WithMany(p => p.Members)
            .HasForeignKey(pm => pm.ProjectId);

        modelBuilder.Entity<ProjectMember>()
            .HasOne(pm => pm.User)
            .WithMany(u => u.ProjectMemberships)
            .HasForeignKey(pm => pm.UserId);

        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email).IsUnique();

        modelBuilder.Entity<Project>()
            .HasIndex(p => p.ShareCode).IsUnique();

        modelBuilder.Entity<Observation>()
            .Property(o => o.SyncStatus)
            .HasConversion<string>();

        modelBuilder.Entity<ProjectMember>()
            .Property(pm => pm.Role)
            .HasConversion<string>();
    }
}
