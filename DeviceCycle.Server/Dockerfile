# Stage 1: Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy project files and restore dependencies
COPY ["DeviceCycle.Server.csproj", "./"]
RUN dotnet restore "./DeviceCycle.Server.csproj"

# Copy remaining source code and publish
COPY . .
RUN dotnet publish "DeviceCycle.Server.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Stage 2: Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

# Expose port 8080 (ASP.NET Core 8 default)
EXPOSE 8080

# Run the backend API
ENTRYPOINT ["dotnet", "DeviceCycle.Server.dll"]
