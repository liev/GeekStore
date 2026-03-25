# ── Stage 1: Build ──────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy csproj files first for layer caching
COPY GeekStore.Core/GeekStore.Core.csproj GeekStore.Core/
COPY GeekStore.Application/GeekStore.Application.csproj GeekStore.Application/
COPY GeekStore.Infrastructure/GeekStore.Infrastructure.csproj GeekStore.Infrastructure/
COPY GeekStore.Api/GeekStore.Api.csproj GeekStore.Api/
RUN dotnet restore GeekStore.Api/GeekStore.Api.csproj

# Copy entire source and publish
COPY . .
RUN dotnet publish GeekStore.Api/GeekStore.Api.csproj -c Release -o /app/publish --no-restore

# ── Stage 2: Runtime ────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

EXPOSE 5242
ENV ASPNETCORE_URLS=http://+:5242

ENTRYPOINT ["dotnet", "GeekStore.Api.dll"]
