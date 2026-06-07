using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using DeviceCycle.Server.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// Register controllers with a custom DateTime converter to always serialize as UTC
builder.Services.AddControllers()
    .AddJsonOptions(opts =>
        opts.JsonSerializerOptions.Converters.Add(new UtcDateTimeConverter()));
builder.Services.AddEndpointsApiExplorer();

// Swagger with JWT bearer support
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "DeviceCycle API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter: Bearer {your JWT token}"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

// Allow requests from React dev server and deployed frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// EF Core with PostgreSQL
var connectionString = Environment.GetEnvironmentVariable("DATABASE_URL") ?? builder.Configuration.GetConnectionString("dbcs");
if (!string.IsNullOrEmpty(connectionString) && connectionString.StartsWith("postgres", StringComparison.OrdinalIgnoreCase))
{
    var uri = new Uri(connectionString);
    var userInfo = uri.UserInfo.Split(':');
    var user = userInfo[0];
    var password = userInfo.Length > 1 ? userInfo[1] : "";
    var host = uri.Host;
    var port = uri.Port > 0 ? uri.Port : 5432;
    var database = uri.AbsolutePath.TrimStart('/');
    
    connectionString = $"Host={host};Port={port};Database={database};Username={user};Password={password};SSL Mode=Require;Trust Server Certificate=true;";
}

builder.Services.AddDbContext<DeviceRegistrationLifecycleContext>(options =>
    options.UseNpgsql(connectionString));

// ASP.NET Identity — password rules and user storage
builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
{
    options.Password.RequireDigit = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireUppercase = false;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequiredLength = 6;
    options.User.RequireUniqueEmail = true;
})
.AddEntityFrameworkStores<DeviceRegistrationLifecycleContext>()
.AddDefaultTokenProviders();

// JWT authentication
var jwtKey = builder.Configuration["Jwt:Key"]!;
var jwtIssuer = builder.Configuration["Jwt:Issuer"]!;
var jwtAudience = builder.Configuration["Jwt:Audience"]!;

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };
});

builder.Services.AddAuthorization();

var app = builder.Build();

// Seed default roles on startup
try
{
    using var scope = app.Services.CreateScope();
    var context = scope.ServiceProvider.GetRequiredService<DeviceRegistrationLifecycleContext>();
    await context.Database.MigrateAsync();

    var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
    foreach (var role in new[] { "Admin", "User" })
    {
        if (!await roleManager.RoleExistsAsync(role))
            await roleManager.CreateAsync(new IdentityRole(role));
    }
    
    // Seed Firmware Versions
    var firmwares = new List<FirmwareVersion>
    {
        new FirmwareVersion { Version = "v1.0.0", Notes = "Initial release firmware version.", ReleasedAt = DateTime.UtcNow.AddDays(-120) },
        new FirmwareVersion { Version = "v2.0.0", Notes = "Added battery optimization and general bug fixes.", ReleasedAt = DateTime.UtcNow.AddDays(-90) },
        new FirmwareVersion { Version = "v3.0.0", Notes = "Security patches and performance improvements.", ReleasedAt = DateTime.UtcNow.AddDays(-45) },
        new FirmwareVersion { Version = "v4.0.0", Notes = "Latest firmware version. Added support for newer protocols.", ReleasedAt = DateTime.UtcNow.AddDays(-5) }
    };

    foreach (var fw in firmwares)
    {
        if (!await context.FirmwareVersions.AnyAsync(f => f.Version == fw.Version))
        {
            await context.FirmwareVersions.AddAsync(fw);
        }
    }
    await context.SaveChangesAsync();

    // Cover all the devices and assign their firmware versions
    var devices = await context.Devices.ToListAsync();
    if (devices.Any())
    {
        int index = 0;
        foreach (var device in devices)
        {
            string? targetFw;
            if (index % 5 == 0)
            {
                targetFw = null; // None
            }
            else if (index % 5 == 1)
            {
                targetFw = "v1.0.0";
            }
            else if (index % 5 == 2)
            {
                targetFw = "v2.0.0";
            }
            else if (index % 5 == 3)
            {
                targetFw = "v3.0.0";
            }
            else
            {
                targetFw = "v4.0.0"; // Latest
            }

            if (device.FirmwareVersion != targetFw)
            {
                var oldFw = device.FirmwareVersion ?? "(none)";
                device.FirmwareVersion = targetFw;
                device.UpdatedAt = DateTime.UtcNow;

                // Add a change log entry for this firmware upgrade/assignment
                context.ChangeLogs.Add(new ChangeLog
                {
                    DeviceId = device.Id,
                    Action = $"FIRMWARE_UPGRADED: {oldFw} → {(targetFw ?? "(none)")}",
                    CreatedAt = DateTime.UtcNow
                });
            }
            index++;
        }
        await context.SaveChangesAsync();
    }
}
catch (Exception ex)
{
    var logger = app.Services.GetRequiredService<ILogger<Program>>();
    logger.LogError(ex, "Role seeding failed - server will still start");
}

app.UseDefaultFiles();
app.UseStaticFiles();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// CORS must come before auth
app.UseCors("AllowReactApp");
app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapFallbackToFile("/index.html");

app.Run();

// Ensures all DateTime values are serialized as UTC in JSON responses
public class UtcDateTimeConverter : JsonConverter<DateTime>
{
    public override DateTime Read(ref Utf8JsonReader reader, Type t, JsonSerializerOptions o)
        => DateTime.SpecifyKind(reader.GetDateTime(), DateTimeKind.Utc);

    public override void Write(Utf8JsonWriter writer, DateTime value, JsonSerializerOptions o)
        => writer.WriteStringValue(DateTime.SpecifyKind(value, DateTimeKind.Utc));
}
