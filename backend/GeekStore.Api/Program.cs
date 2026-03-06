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
builder.Services.AddControllers();

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

// DI - Database
builder.Services.AddDbContext<GeekStoreDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection") ?? "Data Source=geekstore.db"));

// DI - Repositories
builder.Services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
builder.Services.AddScoped<IProductRepository, ProductRepository>();

// DI - Business Services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IImageValidationService, GeminiVisionService>();
builder.Services.AddScoped<ICloudinaryService, CloudinaryService>();
builder.Services.AddScoped<IMoxfieldService, MoxfieldService>();
builder.Services.AddHttpClient<GeminiVisionService>();
builder.Services.AddHttpClient<MoxfieldService>();

var app = builder.Build();

app.UseHttpsRedirection();

app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
