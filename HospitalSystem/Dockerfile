FROM --platform=$BUILDPLATFORM mcr.microsoft.com/dotnet/sdk:11.0@sha256:65f3c7c6a25a239ab3e6719f2896147e7b68242ff2d8818dd70498bde6ef8bea AS build
ARG TARGETARCH
ENV DOTNET_CLI_TELEMETRY_OPTOUT=1
WORKDIR /src

COPY global.json Directory.Build.props ./
COPY HospitalSystem/*.csproj HospitalSystem/
RUN dotnet restore HospitalSystem/HospitalSystem.csproj --os linux-musl -a $TARGETARCH \
    -p:PublishReadyToRun=true -p:UseAppHost=false

COPY HospitalSystem/ HospitalSystem/
WORKDIR /src/HospitalSystem
RUN dotnet publish -c Release --os linux-musl -a $TARGETARCH --self-contained false --no-restore \
    -p:PublishReadyToRun=true -p:UseAppHost=false -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:11.0-alpine@sha256:d39b72ad1534fa0faf52b488bffb0762df7ba269d120f0338713d4dda2a41bf5 AS runtime
WORKDIR /app

RUN apk upgrade --no-cache \
    && apk add --no-cache tzdata \
    && addgroup -S -g 101 appgroup \
    && adduser -S -u 100 -G appgroup -h /home/appuser appuser

EXPOSE 8080 9091

COPY --from=build /app/publish .

USER 100:101

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1

ENTRYPOINT ["dotnet", "HospitalSystem.dll"]
