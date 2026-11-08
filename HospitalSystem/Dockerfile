FROM --platform=$BUILDPLATFORM mcr.microsoft.com/dotnet/sdk:10.0@sha256:212fe4cb74627d5adf9817a4088906ae3edff1bd853bb27565d4b46731efe61e AS build
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

FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine@sha256:486297ae006e95ee2ee3112a2c03e3d26e41fbbc64b7a29e28e7a18cc36b12bb AS runtime
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
