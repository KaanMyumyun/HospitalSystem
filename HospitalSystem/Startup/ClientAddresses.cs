using System.Net;
using Microsoft.AspNetCore.HttpOverrides;

namespace HospitalSystem.Startup;

public static class ClientAddresses
{
    // Behind a proxy every request comes from the proxy's address, and the
    // per-address rate limits would put all users in one bucket. The client's
    // address is read from X-Forwarded-For when the request comes from a proxy
    // listed in KnownProxies or KnownNetworks, or from any proxy when
    // TrustAllProxies is set. That is safe only where the API cannot be reached
    // except through the platform's proxy, as on Render or behind a Kubernetes
    // ingress. ForwardLimit is how many proxies add an entry; with more, a
    // client could choose its own address. LogClientAddress logs the result of
    // every request, to check the setting once after a deploy.
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
            // Empty lists mean any proxy; a listed one would narrow it again.
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
