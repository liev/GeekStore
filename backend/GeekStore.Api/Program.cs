using GeekStore.Application.Interfaces;
using GeekStore.Application.Services;
using GeekStore.Core.Interfaces;
using GeekStore.Infrastructure.Data;
using GeekStore.Infrastructure.Repositories;
using GeekStore.Infrastructure.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

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
var jwtKey = builder.Configuration["Jwt:Key"] ?? "ThisIsASecretKeyForJWTTokenGenerationEnsureItIsAtLeast32BytesLong!";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "GeekStoreApi";
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

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy =>
        {
            policy.WithOrigins("http://localhost:5173", "http://127.0.0.1:5173")
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
});

// DI - Database (PostgreSQL)
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? Environment.GetEnvironmentVariable("DATABASE_URL")
    ?? "Host=localhost;Port=5432;Database=geekstore;Username=geekstore;Password=geekstore123";
builder.Services.AddDbContext<GeekStoreDbContext>(options =>
    options.UseNpgsql(connectionString));

// DI - Repositories
builder.Services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
builder.Services.AddScoped<IProductRepository, ProductRepository>();
builder.Services.AddScoped<IOrderRepository, OrderRepository>();
builder.Services.AddScoped<IUserFollowRepository, UserFollowRepository>();
builder.Services.AddScoped<IReviewRepository, ReviewRepository>();
builder.Services.AddScoped<INotificationRepository, NotificationRepository>();

// DI - Business Services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IImageValidationService, GeminiVisionService>();
builder.Services.AddScoped<ISellerAnalysisService, GeminiSellerAnalysisService>();
builder.Services.AddScoped<ICloudinaryService, CloudinaryService>();
builder.Services.AddScoped<IMoxfieldService, MoxfieldService>();
builder.Services.AddHttpClient<GeminiVisionService>();
builder.Services.AddHttpClient<GeminiSellerAnalysisService>();
builder.Services.AddHttpClient<MoxfieldService>();

// Background Workers
builder.Services.AddHostedService<GeekStore.Api.Services.SubscriptionWorker>();

var app = builder.Build();

// Auto-create/migrate the database on startup (dev convenience)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<GeekStoreDbContext>();
    db.Database.EnsureCreated();
}

app.UseHttpsRedirection();

app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
