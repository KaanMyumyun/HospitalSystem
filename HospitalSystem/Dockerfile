FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
# amd64 or arm64, set by BuildKit. The runtime image below is Alpine (musl).
ARG TARGETARCH
WORKDIR /src

COPY global.json Directory.Build.props ./
COPY HospitalSystem/*.csproj HospitalSystem/
RUN dotnet restore HospitalSystem/HospitalSystem.csproj --os linux-musl -a $TARGETARCH -p:PublishReadyToRun=true

COPY HospitalSystem/ HospitalSystem/
WORKDIR /src/HospitalSystem
# ReadyToRun compiles ahead of time, so a new container gets ready and answers
# its first requests sooner instead of spending them in the JIT.
RUN dotnet publish -c Release --os linux-musl -a $TARGETARCH --self-contained false --no-restore \
    -p:PublishReadyToRun=true -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine
WORKDIR /app

RUN apk upgrade --no-cache \
    && addgroup -S appgroup \
    && adduser -S -G appgroup -h /home/appuser appuser

EXPOSE 8080
EXPOSE 9091
ENV ASPNETCORE_URLS=http://+:8080

COPY --from=build --chown=appuser:appgroup /app/publish .

USER appuser

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1

ENTRYPOINT ["dotnet", "HospitalSystem.dll"]
