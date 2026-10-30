using System.Net;
using Microsoft.AspNetCore.HttpOverrides;

namespace HospitalSystem.Startup;

public static class ClientAddresses
{
    public static WebApplication UseClientAddresses(this WebApplication app)
    {
        var forwardedHeaders = app.Configuration.GetSection("ForwardedHeaders");
        var forwardLimit = forwardedHeaders.GetValue("ForwardLimit", 1);
        if (forwardLimit < 1)
            throw new InvalidOperationException("ForwardedHeaders:ForwardLimit must be at least 1");
        var options = new ForwardedHeadersOptions
        {
            ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto,
            ForwardLimit = forwardLimit
        };
        if (forwardedHeaders.GetValue<bool>("TrustAllProxies"))
        {
            options.KnownProxies.Clear();
            options.KnownIPNetworks.Clear();
            app.Logger.LogInformation("Reading client addresses from X-Forwarded-For through {ForwardLimit} proxies", forwardLimit);
        }
        else
        {
            foreach (var proxy in forwardedHeaders.GetSection("KnownProxies").Get<string[]>() ?? [])
            {
                if (IPAddress.TryParse(proxy, out var proxyIp))
                    options.KnownProxies.Add(proxyIp);
            }
            foreach (var network in forwardedHeaders.GetSection("KnownNetworks").Get<string[]>() ?? [])
            {
                if (System.Net.IPNetwork.TryParse(network, out var ipNetwork))
                    options.KnownIPNetworks.Add(ipNetwork);
            }
        }
        app.UseForwardedHeaders(options);

        if (forwardedHeaders.GetValue<bool>("LogClientAddress"))
        {
            app.Use(async (context, next) =>
            {
                app.Logger.LogInformation(
                    "Client address {ClientAddress} for {Method} {Path}; X-Forwarded-For entries not used: {Unused}",
                    context.Connection.RemoteIpAddress, context.Request.Method, context.Request.Path,
                    context.Request.Headers["X-Forwarded-For"].ToString());
                await next();
            });
        }

        return app;
    }
}
