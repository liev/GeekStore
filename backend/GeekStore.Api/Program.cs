using GoblinSpot.Application.Interfaces;
using GoblinSpot.Application.Services;
using GoblinSpot.Core.Interfaces;
using GoblinSpot.Infrastructure.Data;
using GoblinSpot.Infrastructure.Repositories;
using GoblinSpot.Infrastructure.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler =
            System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.DefaultIgnoreCondition =
            System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
    });

// Configure JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key must be configured. Set it in appsettings or environment variables.");
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "GoblinSpotApi";
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
        ValidAudience = jwtIssuer, // Use issuer as audience for simplicity
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };
});

// Configure CORS — origins read from configuration, fallback to localhost:5173
var allowedOriginsRaw = builder.Configuration["AllowedOrigins"];
var allowedOrigins = string.IsNullOrWhiteSpace(allowedOriginsRaw)
    ? new[] { "http://localhost:5173", "http://localhost:5174" }
    : allowedOriginsRaw.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy =>
        {
            policy.WithOrigins(allowedOrigins)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        });
});

// Configure Rate Limiting
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("auth", limiterOptions =>
    {
        limiterOptions.PermitLimit = 5;
        limiterOptions.Window = TimeSpan.FromMinutes(1);
        limiterOptions.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        limiterOptions.QueueLimit = 0;
    });
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

// Health Checks
builder.Services.AddHealthChecks();

// DI - Database (PostgreSQL)
var connectionString = Environment.GetEnvironmentVariable("DATABASE_URL");
if (string.IsNullOrEmpty(connectionString))
{
    connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
}
if (string.IsNullOrEmpty(connectionString) || connectionString.StartsWith("SET_VIA_ENV_VAR__"))
{
    throw new InvalidOperationException("DATABASE_URL environment variable must be set, or DefaultConnection in appsettings must not be a placeholder.");
}
builder.Services.AddDbContext<GoblinSpotDbContext>(options =>
    options.UseNpgsql(connectionString));

// DI - Repositories
builder.Services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
builder.Services.AddScoped<IProductRepository, ProductRepository>();
builder.Services.AddScoped<IOrderRepository, OrderRepository>();
builder.Services.AddScoped<IUserFollowRepository, UserFollowRepository>();
builder.Services.AddScoped<IReviewRepository, ReviewRepository>();
builder.Services.AddScoped<INotificationRepository, NotificationRepository>();
builder.Services.AddScoped<IDeliveryPointRepository, DeliveryPointRepository>();

// DI - Business Services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IImageValidationService, GeminiVisionService>();
builder.Services.AddScoped<ISellerAnalysisService, GeminiSellerAnalysisService>();
builder.Services.AddScoped<ICloudinaryService, CloudinaryService>();
builder.Services.AddScoped<IMoxfieldService, MoxfieldService>();
builder.Services.AddScoped<GoblinSpot.Core.Interfaces.IPayPalService, GoblinSpot.Infrastructure.Services.PayPalService>();
builder.Services.AddHttpClient<GeminiVisionService>();
builder.Services.AddHttpClient<GeminiSellerAnalysisService>();
builder.Services.AddHttpClient<MoxfieldService>();
builder.Services.AddHttpClient<GoblinSpot.Infrastructure.Services.PayPalService>();

// Background Workers
builder.Services.AddHostedService<GoblinSpot.Api.Services.SubscriptionWorker>();

var app = builder.Build();

// Auto-create/migrate the database on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<GoblinSpotDbContext>();
    if (app.Environment.IsDevelopment())
        db.Database.EnsureCreated();
    else
        db.Database.Migrate();
}

// Forward headers from Nginx/Cloudflare so rate limiting uses real client IP
app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
});

// Only redirect to HTTPS in development; in production Nginx/Cloudflare handle SSL
if (app.Environment.IsDevelopment())
    app.UseHttpsRedirection();

app.UseCors("AllowFrontend");

app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.MapHealthChecks("/health");

app.Run();
