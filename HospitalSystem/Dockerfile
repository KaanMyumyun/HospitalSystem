# Base images are pinned by digest, so a rebuild uses the same image until
# Dependabot proposes a newer one; the runtime stage still upgrades its
# Alpine packages on every build.
FROM mcr.microsoft.com/dotnet/sdk:10.0@sha256:de4fe90a98845d75910b9769662465c84de1a934665c431279d1382b2bddc02b AS build
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

FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine@sha256:254fe017495996d3abcc487ffacdcce2b73affb380d3af87af12c8dff41fe0b0 AS runtime
WORKDIR /app

# tzdata: the clinic's time zone (Clinic:TimeZone) is an IANA name such as
# Europe/Sofia, and the base image has no zoneinfo files.
RUN apk upgrade --no-cache \
    && apk add --no-cache tzdata \
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
