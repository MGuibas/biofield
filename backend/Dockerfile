# Base image for runtime
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 8080
EXPOSE 8081

# SDK image for building
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src

# Copy csproj files and restore as distinct layers
COPY ["BioField.API/BioField.API.csproj", "BioField.API/"]
COPY ["BioField.Application/BioField.Application.csproj", "BioField.Application/"]
COPY ["BioField.Domain/BioField.Domain.csproj", "BioField.Domain/"]
COPY ["BioField.Infrastructure/BioField.Infrastructure.csproj", "BioField.Infrastructure/"]

RUN dotnet restore "BioField.API/BioField.API.csproj"

# Copy the rest of the source code
COPY . .
WORKDIR "/src/BioField.API"
RUN dotnet build "BioField.API.csproj" -c $BUILD_CONFIGURATION -o /app/build

# Publish the application
FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "BioField.API.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

# Final stage/image
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "BioField.API.dll"]
