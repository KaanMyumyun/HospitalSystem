using Microsoft.OpenApi;

namespace HospitalSystem.Startup;

public static class ApiDocument
{
    // The OpenAPI document Swagger UI shows in Development, which
    // hospital-frontend/openapi.json records for the frontend's types.
    public static IServiceCollection AddApiDocument(this IServiceCollection services)
    {
        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen(c =>
        {
            // string means never null and string? may be null, so the frontend's
            // generated types say which fields can be missing.
            c.SupportNonNullableReferenceTypes();
            // Lets a property that refers to another schema say it may be null.
            c.UseAllOfToExtendReferenceSchemas();
            c.SwaggerDoc("v1", new OpenApiInfo
            {
                Title = "HospitalSystem API",
                Version = "v1"
            });
            c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
            {
                Name = "Authorization",
                Type = SecuritySchemeType.Http,
                Scheme = "Bearer",
                BearerFormat = "JWT",
                In = ParameterLocation.Header,
                Description = "Enter 'Bearer {token}'"
            });

            c.AddSecurityRequirement(document => new OpenApiSecurityRequirement
            {
                { new OpenApiSecuritySchemeReference("Bearer", document), new List<string>() }
            });
        });

        return services;
    }
}
