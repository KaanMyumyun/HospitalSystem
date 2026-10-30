FROM --platform=$BUILDPLATFORM mcr.microsoft.com/dotnet/sdk:10.0@sha256:de4fe90a98845d75910b9769662465c84de1a934665c431279d1382b2bddc02b AS build
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

FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine@sha256:254fe017495996d3abcc487ffacdcce2b73affb380d3af87af12c8dff41fe0b0 AS runtime
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
