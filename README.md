# Hospital Management System

[![Live Demo](https://img.shields.io/badge/Live_Demo-Click_Here-success?style=for-the-badge&logo=cloudflare)](https://hospitalsystem.pages.dev/)

A full-stack **Hospital Management System** built with **ASP.NET Core Web API** and a **React + TypeScript + Vite** frontend.

---

## Live Demo

The project is live on free-tier cloud infrastructure — no setup needed:

| Layer | Service | Detail |
| ----- | ------- | ------ |
| Frontend | Cloudflare Pages | [hospitalsystem.pages.dev](https://hospitalsystem.pages.dev/) |
| Backend API | Render | Auto-deployed on merge to main |
| Database | Neon (Serverless PostgreSQL) | Persistent, always on |

> The backend runs on a free Render instance. If inactive, it may take **30–60 seconds to spin up** on first request. The sign-in page wakes it as soon as it opens.

This is the only deployment that runs permanently. The AWS deployments described under [Deployment](#deployment) are brought up only when needed.

---
## DevOps & Infrastructure

### CI/CD Pipeline (GitHub Actions)

The application uses a three-stage GitHub Actions pipeline:

1. `CI` workflow
   - Runs on pull requests, pushes to `main`, and weekly (Mondays 03:00 UTC)
     so published images pick up Alpine security fixes
   - Restores, builds and tests the backend
   - Lints, tests and builds the frontend (the build type-checks it), and
     checks that its generated API types match `openapi.json` (see
     [API contract](#api-contract))

2. `Docker Image CI` workflow
   - Runs after the `CI` workflow succeeds on `main`
   - Builds the backend and frontend images once each with Buildx, reusing
     build-stage layers from the GitHub Actions cache. The runtime stage is
     always rebuilt, so its `apk upgrade` picks up Alpine security fixes on
     every build; the weekly run skips the cache altogether
   - Scans those images with Trivy; a fixable `HIGH` or `CRITICAL`
     vulnerability stops the run before anything is pushed
   - Tags images with `latest` and a tag that is unique to the build,
     `YYYY-MM-DD-<short sha>-<run number>-<run attempt>`, so the weekly
     rebuild of an unchanged commit gets a new tag instead of overwriting the
     old image, and a re-run pushes under a new tag instead of failing on the
     immutable one it already pushed
   - Pushes the scanned images to Docker Hub and Amazon ECR
   - Uses GitHub Actions OIDC to assume an AWS IAM role for ECR access
   - Saves the pushed tag and commit as a `release` artifact for the deploy
     workflow

3. `Deploy to EKS` workflow
   - Runs after the Docker workflow succeeds
   - Waits for approval in the `production` environment
   - Reads the tag and commit from the Docker run's `release` artifact, and
     skips the deploy if that commit is no longer the tip of `main`
   - Assumes a separate AWS IAM deployment role through OIDC
   - Sends the deploy SSM document to the ops instance inside the VPC, because
     the EKS API endpoint is private
   - On the instance, the document sets backend and frontend Deployment images
     to that tag and waits for rollout completion when the app is scaled up

If the Kubernetes deployments are scaled to `0`, the deploy workflow skips the
rollout wait, but still updates the Deployment image fields. The next manual
scale-up runs the exact image tag built from the commit that passed CI.

Every action is pinned to a full commit SHA, because a version tag can be
moved to different code. For the same reason the Dockerfiles pin each base
image by digest as well as tag. Dependabot (`.github/dependabot.yml`) opens
weekly pull requests that update both kinds of pin.

The workflows read these repository variables. All but the last two can be
secrets instead. Docker Image CI also needs the `DOCKER_USERNAME` and
`DOCKER_PASSWORD` secrets.

| Variable | Used by | Value |
| --- | --- | --- |
| `AWS_REGION` | Docker Image CI, Deploy | AWS region of the ECR registry and EKS cluster |
| `AWS_ROLE_TO_ASSUME` | Docker Image CI | `github_actions_ecr_push_role_arn` Terraform output |
| `AWS_DEPLOY_ROLE_TO_ASSUME` | Deploy | `github_actions_deploy_role_arn` Terraform output |
| `ECR_REGISTRY` | Docker Image CI | `ecr_registry` Terraform output |
| `ECR_BACKEND_REPOSITORY` | Docker Image CI | `hospital-backend` |
| `ECR_FRONTEND_REPOSITORY` | Docker Image CI | `hospital-frontend` |
| `VITE_API_URL` | Docker Image CI | Public API URL baked into the frontend |
| `DEPLOY_SSM_DOCUMENT` | Deploy | `deploy_ssm_document_name` Terraform output |
| `DEPLOY_INSTANCE_NAME` | Deploy | `ops_instance_name` Terraform output |

The `production` environment (Settings, Environments) needs two protection
rules:

- Required reviewers: whoever may approve a deploy. Leave "Prevent
  self-review" off if you approve your own deploys.
- Deployment branches: selected branches, `main` only. The deploy role trusts
  any job that uses this environment, so this rule is what keeps other
  branches out of the cluster.

---

## Deployment

### Live demo: Cloudflare Pages, Render and Neon (always on)

* **Frontend:** Hosted on [Cloudflare Pages](https://pages.cloudflare.com/)
* **Backend API:** Hosted on [Render](https://render.com/)
* **Database:** Serverless PostgreSQL hosted on [Neon](https://neon.tech/)

Render deploys every merge to main. With these in the service's environment,
each new release brings Neon up to date before it serves:

* `Database__RunMigrationsOnStartup` = `true`
* `ConnectionStrings__Migrations` = the Neon connection string with the direct
  host (the endpoint name without `-pooler`)

If a migration fails, the release exits before it listens, the deploy fails,
and the previous release keeps serving. Migrations run while that previous
release is still up, which is why they must keep it working (see
[Create the database schema](#3-create-the-database-schema)). A free instance
runs the check on every cold start; with nothing to apply it is one quick
query.

The frontend build adds a `404.html` copy of the app shell, so Pages answers
unknown paths with a real 404, and `hospital-frontend/public/_headers` sets the
same cache and security headers that `nginx.conf` sets for the Docker image.
The Content-Security-Policy is part of the page itself (see [Security](#security)),
so both hosts serve the same one.

### AWS EKS (on demand)

The CI/CD pipeline above builds images for, and deploys to, AWS using EKS, ECR, ACM, an AWS Application Load Balancer, and Kubernetes manifests. This environment is not kept running; it is provisioned from the infrastructure repository when needed.

Infrastructure, deployment notes, operational commands, and Kubernetes configuration are maintained in a separate repository:

[KaanMyumyun/HospitalSystem-infrastructure](https://github.com/KaanMyumyun/HospitalSystem-infrastructure)

While the environment is running:

- Public app URL: `https://app.hospitalsyst.cc`
- Frontend API base: `/api`
- Container registry: Amazon ECR
- Runtime platform: AWS EKS
- Database: Neon PostgreSQL

The infrastructure repository contains:

- Kubernetes manifests
- cost scale-up / scale-down workflow
- Terraform configuration for AWS infrastructure
- future Ansible automation work

### Self-hosted AWS EC2 (on demand)

* **Frontend:** React build served via Nginx container
* **Backend API:** ASP.NET Core container on port 8080
* **Database:** Serverless PostgreSQL hosted on [Neon](https://neon.tech/) *(Shared with the free tier — data persists across deployments)*
* **Web Server:** Nginx reverse proxy with SSL/HTTPS via Let's Encrypt
* **Dynamic DNS:** No-IP — hostname stays stable across EC2 restarts
* **Monitoring:** Prometheus + Grafana (see Monitoring below)
* **Instance:** Amazon Linux 2023
* **URL:** [hostpitalsyst.servebeer.com](https://hostpitalsyst.servebeer.com) *(only reachable while the EC2 instance is running)*

Infrastructure as code for this deployment:

- [IaC](https://github.com/KaanMyumyun/IaC) — Terraform-only EC2 deployment. It provisions the AWS network, security group, and EC2 instance, then uses a bootstrap script to install Docker, Nginx, Certbot, No-IP, Prometheus, Grafana, and the application stack.
- [ansiblehospitalsystem](https://github.com/KaanMyumyun/ansiblehospitalsystem) — Terraform plus Ansible deployment. Terraform creates the AWS resources, then Ansible configures the server and manages Docker Compose, Nginx, Certbot, No-IP, monitoring, and logging in a cleaner, reusable way.
- [kubeIAchp](https://github.com/KaanMyumyun/kubeIAchp) — Kubernetes/k3s version. This is still in progress. It provisions an EC2 instance, installs k3s, and deploys the backend and frontend through Kubernetes manifests, Traefik ingress, and cert-manager.

#### Monitoring

The self-hosted deployment includes a full observability stack:

* **Prometheus** — scrapes metrics from the backend, node exporter, and cAdvisor every 60 seconds
* **Grafana** — dashboards for infrastructure and application health:
  * Node Exporter dashboard — CPU, memory, disk, and network metrics for the EC2 instance
  * cAdvisor dashboard — per-container CPU and memory usage
  * Backend dashboard — ASP.NET Core HTTP metrics (request rate, response times, status codes)
* **Alerts configured for:**
  * CPU usage above 80%
  * Disk usage above 90%
  * Frontend container health
  * Backend container health
  * Overall system status (EVERYTHING UP)
* **Backend HTTP metrics** enabled via `app.UseHttpMetrics()` (prometheus-net middleware)
* **Scrape target:** the backend serves `/metrics` on its own port, `9091`, not
  on the API port. The port is deliberately not published by compose or by the
  Kubernetes Service, so Prometheus reaches it from inside the network without
  a token while nothing outside can. Point Prometheus at
  `<backend-host>:9091/metrics`, and set `Metrics__Port` to change the port or
  `0` to turn the endpoint off.
- [Grafana Dashboards](https://github.com/KaanMyumyun/grafanadashboards) — Monitoring dashboards for Prometheus and Loki

#### Logging

- Grafana Loki — centralized log aggregation for all containers
- Promtail — log shipping agent, auto-discovers Docker containers
- Custom Grafana dashboard — backend logs, frontend logs, and error rate panels
- Full observability stack: metrics (Prometheus) + logs (Loki) in one Grafana instance

---


## Overview

The Hospital System is designed to manage hospital operations including:

* User registration and authentication
* Role-based access control
* Department management
* Doctor schedules with working hours and working days
* Appointment scheduling and cancellation, and marking visits completed or
  no-show
* Patient records for the front desk
* A day view for doctors
* An audit log of changes and failed sign-ins, for admins
* Secure API access using JWT

The system is divided into two independent layers:

* Backend – RESTful API built with ASP.NET Core
* Frontend – React application built with TypeScript and Vite

---

## Tech Stack

### Backend
* ASP.NET Core Web API
* Entity Framework Core
* PostgreSQL
* JWT Authentication
* Role-based Authorization
* Swagger / OpenAPI

### Frontend
* React
* TypeScript
* Vite

### Tooling
* .NET 10 SDK (pinned by `global.json`)
* Node.js 22.12+ (Node 20 is end-of-life)
* npm

---

## Project Structure

```text
.
├── .github/
│   ├── workflows/                  # CI, Docker Image CI, Deploy to EKS
│   ├── ISSUE_TEMPLATE/
│   ├── CODEOWNERS
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── dependabot.yml
│
├── hospital-frontend/              # Frontend (React + TypeScript + Vite)
│   ├── e2e/                        # Playwright end-to-end tests (npm run e2e)
│   ├── public/
│   ├── scripts/                    # generate-api-types.mjs (+ test)
│   ├── src/
│   │   ├── components/             # Shared UI (Sidebar, TopBar, dialogs, ui)
│   │   ├── hooks/                  # Session, data loading, actions, shared screen state
│   │   ├── screens/                # LoginScreen, ReceptionDashboard/, AdminDashboard/, ...
│   │   ├── lib/                    # format, schedule, search, validation (+ tests)
│   │   ├── test/                   # Setup and helpers for the component tests
│   │   ├── App.tsx                 # Routing; loads each role's screens when first shown
│   │   ├── api.ts                  # API client and session storage
│   │   ├── api-schema.ts           # Generated from openapi.json; do not edit
│   │   ├── types.ts
│   │   ├── main.tsx
│   │   ├── App.css
│   │   └── index.css
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── index.html
│   ├── openapi.json                # The API's OpenAPI document (API contract)
│   ├── vite.config.ts              # 404 page and Content-Security-Policy
│   ├── playwright.config.ts        # Starts the API and app for npm run e2e
│   └── package.json
│
├── HospitalSystem/                 # Backend (ASP.NET Core Web API)
│   ├── Controllers/
│   ├── Data/
│   ├── Dto/
│   ├── Entities/
│   ├── Enums/
│   ├── Interfaces/
│   ├── Migrations/
│   ├── Properties/
│   ├── Services/
│   ├── Startup/                    # Program.cs's setup: tokens, access policies, rate limits
│   ├── GlobalUsings.cs
│   ├── Program.cs
│   ├── appsettings.json
│   ├── appsettings.Development.example.json
│   ├── Dockerfile
│   └── HospitalSystem.csproj
│
├── MyApp.Tests/                    # Tests (xUnit, Moq, EF Core InMemory)
│   ├── Api/                        # Start the real app: OpenAPI contract, startup checks
│   ├── Controllers/
│   ├── Data/
│   ├── Database/                   # PostgreSQL tests (HOSPITALSYSTEM_TEST_POSTGRES)
│   ├── Services/
│   ├── Dto/
│   ├── GlobalUsings.cs
│   └── MyApp.Tests.csproj
│
├── .editorconfig
├── .env.example                    # Template for docker compose's .env
├── .gitattributes
├── CHANGELOG.md
├── CONTRIBUTING.md
├── Directory.Build.props
├── docker-compose.yml              # Local development only
├── global.json
├── HospitalSystem.sln
├── LICENSE
├── README.md
└── SECURITY.md
```

---

## Getting Started

### Prerequisites
* .NET 10 SDK
* Node.js 22.12+
* Docker, to run PostgreSQL locally (or your own PostgreSQL 16 with the
  `pg_trgm` extension available; some Linux distributions package it
  separately, as `postgresql-contrib`)
* Python 3, to create the first admin account

### Clone the Repository

```bash
git clone https://github.com/KaanMyumyun/HospitalSystem.git
cd HospitalSystem
```

---

## Backend Setup

### 1. Start PostgreSQL

```bash
docker compose up -d postgres
```

This starts PostgreSQL 16 on `127.0.0.1:5432` with database `HospitalSystemDb`,
user `hospitaluser` and password `strongpassword`. These are local development
values only. For another password, set `POSTGRES_PASSWORD` in `.env` (see
`.env.example`) before the database is first created, and use it in the
connection string below: PostgreSQL keeps the password its volume was made
with.

### 2. Create your local configuration

The API reads its database connection string and JWT signing key from
`HospitalSystem/appsettings.Development.json`. That file is gitignored, so start
from the template:

```bash
cp HospitalSystem/appsettings.Development.example.json HospitalSystem/appsettings.Development.json
```

The template's connection string matches the Postgres container from step 1.
Replace `JwtSettings:SecretKey` with your own random string of at least 32
characters. If the key is missing, the API stops at startup with
`JWT SecretKey is not configured`; if it is shorter than 32 bytes, the minimum
for the HMAC-SHA256 signature, with
`JWT SecretKey must be at least 32 bytes (256 bits) long`.

You can use user secrets instead of the file:

```bash
cd HospitalSystem
dotnet user-secrets set "JwtSettings:SecretKey" "<random string, 32+ characters>"
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Port=5432;Database=HospitalSystemDb;Username=hospitaluser;Password=strongpassword"
```

Environment variables work too, with `__` for nesting, for example
`JwtSettings__SecretKey` and `ConnectionStrings__DefaultConnection`.

When a setting is defined in more than one place, environment variables win
over user secrets, and user secrets win over `appsettings.Development.json`.
If the API connects to a database you did not expect, run
`dotnet user-secrets list` in `HospitalSystem/`.

### 3. Create the database schema

```bash
cd HospitalSystem
dotnet run -- --migrate
```

This applies the migrations compiled into the application and exits with code
`0` on success or `1` on failure. It needs only the database connection string;
it starts no HTTP or metrics listeners and requires no JWT signing key. An
invalid command line exits with code `2`. Configure the connection through
appsettings, development user secrets, or `ConnectionStrings__DefaultConnection`.
Additional command arguments are rejected to keep the migration entry point
fixed. EF's migration history makes repeated runs a no-op, and EF Core/Npgsql
serialize migration execution with a database lock.

The published backend image supports the same command without the SDK or EF
CLI installed:

```bash
docker run --rm --env ConnectionStrings__DefaultConnection <backend-image> --migrate
```

Set `Database__MigrationCommandTimeoutSeconds` to adjust the SQL command and
migration lock wait timeout (default `120`; must be positive). This is a timeout
per SQL command, not for the entire process. Migration failures log the error
type and PostgreSQL error code when available, without dumping connection
strings, SQL, or database exception details.

With `Database__RunMigrationsOnStartup=true`, the API runs the same migrations
when it starts, before it listens, with the same output, and exits with code
`1` if they fail. A start with nothing to apply only checks the history table.
`docker compose` uses it, and so can a single-instance host such as the live
demo's (see [Deployment](#live-demo-cloudflare-pages-render-and-neon-always-on)).
`ConnectionStrings__Migrations`, when set, is the connection migrations use
instead of `DefaultConnection`, for `--migrate` and at startup alike. On Neon,
give it the direct host (the endpoint name without `-pooler`), as Neon advises
for schema changes; the pooled host works too, because EF's migration lock
lasts one transaction.

In EKS, leave startup migrations disabled and run the privileged operator's
migration Job before changing Deployment images. The image-only deploy identity
must not gain permission to create Jobs or read backend secrets. The Job must
use the same reviewed backend release image that will subsequently be deployed.
See the [infrastructure runbook](https://github.com/KaanMyumyun/HospitalSystem-infrastructure)
for the operator path and release verification.

Before the first production run, rehearse the exact release on a Neon branch
and take the available manual snapshot of the production branch. Review every
pending migration's SQL and test the existing application against the upgraded
schema. Existing migrations include a date conversion and a unique appointment
index, so do not assume all historical changes are safe for existing data.
Future migrations must preserve compatibility with the running and rollback
images: add nullable columns or new tables first, backfill separately, and defer
renames, drops, type changes, and stricter constraints until older images are no
longer needed. Rolling back an image never undoes a migration; this command only
applies forward migrations. Recovery from a destructive change requires the
separately tested restore procedure.

These migrations need attention on a database that already has data:

* `CaseInsensitiveUserNames` makes usernames unique regardless of case. If
  existing usernames differ only in case, it stops with PostgreSQL error
  `P0001` and changes nothing. Find them, rename all but one in each group,
  and run the migration again:

  ```sql
  SELECT string_agg("Name", ', ') FROM "Users" GROUP BY lower("Name") HAVING count(*) > 1;
  ```

* `CaseInsensitiveDepartmentNames` also enforces uniqueness regardless of
  case. It stops if existing department names differ only by case. Find and
  rename duplicates before running it:

  ```sql
  SELECT string_agg("Department", ', ')
  FROM "Departments"
  GROUP BY lower("Department")
  HAVING count(*) > 1;
  ```

* `AddScheduleWorkingDays` gives every existing schedule Monday to Friday,
  and keeps that as the column's default, so an older image can still create
  schedules. Change the days in the Schedules tab afterwards if a doctor
  works others.

* `OneSchedulePerDoctor` lets a doctor have only one schedule. It stops with
  `P0001` and changes nothing while a doctor has more than one. Delete all but
  one for each such doctor, then run the migration again. Bookings belong to
  the doctor, not the schedule, so none are lost:

  ```sql
  SELECT "DoctorId", string_agg("Id"::text, ', ') FROM "Calendars" GROUP BY "DoctorId" HAVING count(*) > 1;
  ```

* `RepairScheduleRows` moves every schedule's hours onto 2000-01-01, the date
  new schedules use, keeping the times of day; changing a schedule used to
  store it on the day of the change. Schedules from before slot lengths
  existed have a slot length of 0, and get the 30-minute slots the reception
  calendar already showed for them.

* `LimitDepartmentNameLength` limits department names to 100 characters. It
  stops while a longer name exists; shorten it, then run the migration again.
  An older image still accepts a longer name and fails to save it once the
  migration has run.

  ```sql
  SELECT "Id", "Department" FROM "Departments" WHERE char_length("Department") > 100;
  ```

* `AddAuditLogActorUserId` keeps the acting user's id in a new column,
  `ActorUserId`, and replaces the id that `ActorName` held with the username.

### 4. Run the API

```bash
cd HospitalSystem
dotnet run
```

API available at:
```
http://localhost:5272
```

Swagger UI:
```
http://localhost:5272/swagger
```

### 5. Create the first admin account

A new database has no users, and only an Admin can create users through the
API. Create the first admin with `--create-admin`, after the schema exists. It
asks for the password twice without showing it, and applies the Users tab's
rules: a username that starts with a letter, a password of at least 8
characters.

```bash
cd HospitalSystem
dotnet run -- --create-admin admin
```

The password is read from standard input, never from the command line, so it
stays out of the shell history and can also be piped in. Like `--migrate`, the
command needs only the connection string, and the published image runs it too:

```bash
docker run --rm -it --env ConnectionStrings__DefaultConnection <backend-image> --create-admin admin
```

With docker compose, once the backend has started and applied the migrations:

```bash
docker compose run --rm backend --create-admin admin
```

The audit log records the new account with `Command line` as the actor.

Log in as `admin` with that password. New users created from the app start as
`Pending` until an admin assigns them a role.

### 6. Demo accounts (optional)

The **Demo Admin** and **Demo Reception** buttons on the sign-in page call
`POST /api/auth/demo-login`, which signs in a read-only demo account without a
password. Demo login is off by default. Turn it on only for a deployment whose
data is fake:

```bash
Demo__Enabled=true
```

It signs in the accounts named by `Demo:AdminUserName` (default `DemoAdmin`)
and `Demo:FrontDeskUserName` (default `DemoReception`), and only while they
still have the `DemoAdmin` and `DemoFrontDesk` roles. Demo accounts cannot sign
in with a password, and demo roles cannot be assigned from the app. To create a
demo account, create the user in the app, then set its role in the database:

```bash
docker compose exec postgres psql -U hospitaluser -d HospitalSystemDb \
  -c "UPDATE \"Users\" SET \"Role\" = 'DemoAdmin', \"SecurityStamp\" = gen_random_uuid()::text WHERE \"Name\" = 'DemoAdmin';"
```

Demo accounts can view departments, doctors and schedules, and Demo Reception
can view appointments and patients. Neither can view the list of user accounts
or the audit log, or change a password. The API refuses any request from a demo
account other than a read (`GET`) with `403`, whatever roles the endpoint
allows.

---

## Frontend Setup

```bash
cd hospital-frontend
npm install
npm run dev
```

Frontend available at:
```
http://localhost:5173
```

It calls the API at `http://localhost:5272/api` unless `VITE_API_URL` is set.
A production build (`npm run build`) needs `VITE_API_URL`, because the API's
address is built into the bundle; without it the build stops instead of
producing an app that calls `localhost`. In CI, where the build only checks
that the app compiles, it warns instead. The frontend Docker image takes it as
a build argument, and fails to build without one.

---

## Authentication and Authorization

* JWT-based authentication
* Protected endpoints require a Bearer token
* Role-based access restrictions, written once: `Services/Access.cs` names a
  policy for each group of roles, controllers require one by name, and the
  services check the same one
* Swagger supports authenticated testing
* Usernames are case-insensitive: `Admin` and `admin` sign in to the same
  account, and a new user cannot take a name that differs from an existing one
  only in case
* Everyone except demo accounts can change their own password from the top
  bar
* A token lasts an hour. While someone keeps using the app, the frontend
  swaps it for a new one (`POST /api/auth/refresh`) once it is ten minutes
  old, so a session in use carries on for up to 12 hours after signing in. A
  session left alone for about an hour ends, and revoking a user's tokens
  (role change, password reset, disabling a doctor) still signs them out at
  once. Demo sessions are not renewed

| Role | Screens |
| --- | --- |
| Admin | Departments, Doctors, Schedules, Users, Audit log |
| FrontDesk | Reception (the weekly calendar), Patients |
| Doctor | My day: their own appointments, one day at a time |
| DemoAdmin, DemoFrontDesk | The Admin and FrontDesk screens, read-only, without the user list or the audit log |
| Pending | None: cannot sign in until an admin assigns a role |

---

## API Endpoints

Routes are lowercase, plural resources with the record's id in the path, such
as `PATCH /api/users/{userId}/role`. They replaced the former action-named
routes (`/api/Users/change-role` and the like), which no longer answer.

### Authentication

| Method | Endpoint             | Description                      |
| -----: | -------------------- | -------------------------------- |
|   POST | /api/auth/login      | Authenticate and return JWT      |
|   POST | /api/auth/demo-login | Sign in a demo account, if enabled |
|   POST | /api/auth/change-password | Change your own password    |
|   POST | /api/auth/refresh    | A new token for the same session |

`change-password` takes `currentPassword` and `newPassword` (at least 8
characters, and not the current one) and returns a new `token`. Tokens issued
before the change stop working, so the user's other sessions are signed out.
It shares the per-IP authentication limit with demo sign-in, and demo accounts
cannot use it. Failed
sign-ins and failed password changes are recorded in the audit log.

`refresh` returns a new token for the signed-in user, like sign-in does, for
up to 12 hours after they signed in; the new token expires an hour later or
when those 12 hours are up, whichever comes first. After that it answers
`403`, as it does for tokens issued before renewal existed and for demo
accounts. Sign-in and `refresh` also return `timeZone`, the clinic's time
zone (see [Clinic time zone](#clinic-time-zone)).

### Users

| Method | Endpoint                       | Description                    |
| -----: | ------------------------------ | ------------------------------ |
|    GET | /api/users                     | One page of users (Admin only) |
|   POST | /api/users                     | Create a user (Admin only)     |
|  PATCH | /api/users/{userId}/role       | Change user role               |
|    PUT | /api/users/{userId}/password   | Reset password                 |

All user endpoints require Admin. `GET /api/users` returns users sorted by
name, one page at a time:
`?page=1&pageSize=50&search=desk`. `pageSize` is 1 to 100 (default 50), and
`search` matches part of a username or role name, ignoring case. The response
data holds `items`, `totalCount`, `page` and `pageSize`.

### Doctors

| Method | Endpoint                            | Description                   |
| -----: | ----------------------------------- | ----------------------------- |
|    GET | /api/doctors                        | List all doctors              |
|   POST | /api/doctors                        | Make an eligible user a doctor |
|  PATCH | /api/doctors/{doctorId}/status      | Activate or deactivate doctor |
|  PATCH | /api/doctors/{doctorId}/department  | Assign doctor to department   |

Taking the Doctor role away or deactivating a doctor can be refused with `409`
when the doctor has future
bookings; see
[Changes that affect future bookings](#changes-that-affect-future-bookings).

### Departments

| Method | Endpoint                                | Description                  |
| -----: | --------------------------------------- | ---------------------------- |
|    GET | /api/departments                        | View departments             |
|   POST | /api/departments                        | Create department            |
|  PATCH | /api/departments/{departmentId}/status  | Enable or disable department |

A department name is 3 to 100 characters, unique ignoring case.

Disabling a department can be refused with `409` when its doctors have future
bookings; see
[Changes that affect future bookings](#changes-that-affect-future-bookings).

### Appointments

| Method | Endpoint                                    | Description                                 |
| -----: | ------------------------------------------- | ------------------------------------------- |
|   POST | /api/appointments                           | Create appointment                          |
|    GET | /api/appointments                           | One doctor's appointments in a time window  |
|   POST | /api/appointments/{appointmentId}/cancel    | Cancel appointment                          |
|  PATCH | /api/appointments/{appointmentId}/status    | Mark an appointment completed or no-show    |
|   POST | /api/appointments/{appointmentId}/move      | Move an appointment to another time or doctor |
|    GET | /api/appointments/{appointmentId}/history   | Who booked, moved, cancelled or marked it   |
|    GET | /api/appointments/mine                      | The signed-in doctor's appointments in a time window |

`CreateAppointment` takes `appointmentTime` with its UTC offset, for example
`2026-09-22T09:00:00+03:00`. The clinic's clock at that moment
([Clinic time zone](#clinic-time-zone)) must fall on one of the doctor's
working days, inside their working hours and outside their break, not on a day
of their time off, and be the start of one of the doctor's slots, on the
minute: with 30-minute slots from 08:00, `09:30` but not `09:40`. The
appointment is stored in UTC. An appointment lasts one slot of the doctor's
schedule and cannot overlap another scheduled appointment.

The patient is matched on phone number, name and date of birth together. Phone
numbers are compared as digits, keeping a leading `+`, and names ignoring
case. When all three match a patient on file, the appointment is booked for
that patient; when nothing matches, a new patient is registered. When only the
phone number, or only the name and date of birth, match, nothing is booked:
the response is `409` with `possibleMatches`, each with `patientId`, `name`,
`dateOfBirth` and `phoneNumber`. Send the request again with `patientId` to
book for one of them, or with `createNewPatient: true` to register a new
patient.

`ListAppointments` requires `doctorId`, `from` and `to`, with offsets like
`appointmentTime`, and returns that doctor's appointments in every status that
start at or after `from` and before `to`, in time order. The window can be at
most 42 days. URL-encode the `+` of an offset as `%2B`.

`MyAppointments` takes the same `from` and `to` and returns the signed-in
doctor's own appointments. Only the Doctor role can call it.

Changing appointment status takes `status`, `Completed` or `NoShow`, once the
appointment has started. A cancelled appointment cannot be
marked, and a mark can be corrected later. The front desk can mark any
appointment and a doctor only their own. Each change is recorded in the audit
log.

`move` takes `appointmentTime` and, to change doctor, `doctorId`. The new time
is checked as a booking is, and the old slot is freed in the same save, so
nobody can take the new slot in between. Only a scheduled appointment that has
not started can be moved; it keeps its id, its patient and its history, and
the move is recorded in the audit log. In the reception screen, Move
Appointment lets the desk pick an open slot of any doctor or week.

`history` lists the appointment's audit log entries, oldest first, each with
`createdAt`, `action`, `details` and `actor`. Both are for the front desk
only; the reception screen shows the history under the selected booking.

### Patients

| Method | Endpoint                     | Description                                       |
| -----: | ---------------------------- | ------------------------------------------------- |
|    GET | /api/patients                | One page of patients, sorted by name              |
|    GET | /api/patients/{patientId}    | A patient's details and appointments              |
|    PUT | /api/patients/{patientId}    | Correct a patient's name, phone or date of birth  |

The patient list pages like the user list (`page`, `pageSize`, `search`). `search`
matches part of a name, ignoring case, or part of a phone number once it has
at least 3 digits. A patient's details include their 200 most recent
appointments. The front desk and Demo Reception can search and view patients;
only the front desk can update them. The update body takes `name`,
`phoneNumber` and `dateOfBirth`, stores the phone number the same way bookings
do, and records what changed in the audit log.

### Schedules

| Method | Endpoint                     | Description                 |
| -----: | ---------------------------- | --------------------------- |
|   POST | /api/schedules               | Create a new schedule       |
|    PUT | /api/schedules/{scheduleId}  | Modify an existing schedule |
|    GET | /api/schedules               | View all schedules          |
|   POST | /api/schedules/{scheduleId}/time-off | Give the doctor days off |
| DELETE | /api/schedules/{scheduleId}/time-off/{timeOffId} | Take time off back |

A doctor has one schedule: creating a second is refused with `409`, and
changes edit the existing one.

Schedules have `workingDays`, a list of day names such as `"Monday"`.
Creation uses Monday to Friday when it is left out. A schedule can have a
daily break, `breakStartMinute` and `breakEndMinute` in minutes after
midnight (`720` and `780` for 12:00-13:00): both or neither, inside the
working hours, and not all of them. A change replaces the break, so leaving
both out removes it.

Time off takes `firstDay` and `lastDay`, clinic dates with both included, and
an optional `reason` of up to 200 characters. It can last up to a year, cannot
end in the past, and cannot overlap the doctor's other time off (`409`).
Schedules list the time off that has not ended yet. Nothing can be booked on
those days, and the reception calendar shows them as away and the break as
such.

### Clinic time zone

Working hours, breaks, time off and bookings are times on the clinic's clock,
in the time zone `Clinic:TimeZone` names (an IANA name, `Europe/Sofia` by
default in `appsettings.json`). The API checks bookings in that zone, and the
frontend shows and enters every date and time in it, whatever zone a desk
computer is set to. It learns the zone at sign-in. The API does not start
without a zone it knows.

### Audit log

| Method | Endpoint       | Description                                          |
| -----: | -------------- | ---------------------------------------------------- |
|    GET | /api/audit-logs | One page of the audit log, newest first (Admin only) |

The audit log pages like the user list, and `search` matches part of the action
or its details. Each entry has `createdAt`, `action`, `entityType`, `entityId`,
`details` and `actor`, the username of whoever made the change, `Unknown` when
nobody was signed in, as for a failed sign-in, or `Command line` for an admin
made with `--create-admin`. The database also keeps the user's id with each
entry.

### Changes that affect future bookings

Changing a schedule's hours, slot length, working days or break, adding time
off, deactivating a doctor or a department, or taking the Doctor role away can
leave future bookings at times the doctor no longer works. Such a change is not saved. The response is
`409` with `affectedAppointmentCount` and `affectedAppointments`: the first 100
of those bookings, soonest first, each with `appointmentId`, `appointmentTime`,
`doctorName` and `patientInitials`. Either move the bookings and try again, or
send the same request again with `cancelAffectedAppointments: true` and a
`cancellationReason` of up to 500 characters. The bookings are then cancelled
in the same save as the change, and each cancellation is recorded in the audit
log with the reason. The admin screens list the bookings and ask for the
reason.

### Health

| Method | Endpoint      | Description                                              |
| -----: | ------------- | -------------------------------------------------------- |
|    GET | /health       | Liveness: the API process is up; checks nothing else     |
|    GET | /health/ready | Readiness: the API can reach the database (503 if not)   |

Both are anonymous. Point liveness probes at `/health` and readiness probes at
`/health/ready`, so a database outage takes the API out of rotation without
getting healthy containers restarted.

---

## Error Handling

* 200 OK – Successful request
* 400 Bad Request – Invalid input, or a request the current data does not
  allow, such as booking outside working hours or a time that is already
  booked
* 401 Unauthorized – Missing or invalid JWT
* 403 Forbidden – The caller's role may not do this
* 404 Not Found – The doctor, schedule, department, appointment, patient or
  user does not exist
* 409 Conflict – The request clashes with existing data: a username,
  department or schedule that already exists, a time a concurrent request
  booked first, patient details that partly match a patient on file (see
  `CreateAppointment`), or future bookings a change would strand (see
  [Changes that affect future bookings](#changes-that-affect-future-bookings))
* 429 Too Many Requests – Rate limit reached; the `Retry-After` header gives
  the number of seconds to wait
* 500 Internal Server Error – Unexpected server error

Errors the API raises itself carry a JSON body with `isSuccess: false` and an
`error` message, whatever the status code. A 401, and a 403 from an endpoint's
role check, have no body, and request validation failures use ASP.NET Core's
problem-details format.

---

## Security

* JWT-based authentication
* Role-based authorization
* Secure password hashing
* Input validation on all endpoints
* HTTPS enforced via Nginx + Let's Encrypt
* A Content-Security-Policy on the frontend: the page loads scripts, styles
  and images only from its own origin, and sends requests only to itself and
  the API it was built for (`VITE_API_URL`). The build adds the policy as a
  `<meta>` tag (`hospital-frontend/vite.config.ts`), so every host serves the
  same one; framing is blocked by the `X-Frame-Options` header instead,
  because a `<meta>` policy cannot set `frame-ancestors`
* An audit log of every change, failed sign-in and failed password change,
  readable by admins
* The API refuses to start with a JWT signing key shorter than 32 bytes

To report a vulnerability, see [SECURITY.md](SECURITY.md).

## API Rate Limiting

A global rate limiter is implemented using ASP.NET Core's built-in rate-limiting middleware:

* **Strategy:** Fixed Window Limiter
* **Limit:** 60 requests per minute per client IP globally; for password
  sign-in, 20 per minute per client IP across usernames and 5 per minute per
  client IP and username; 5 per minute per client IP for demo sign-in and
  password changes
* **Queue:** Disabled — exceeding requests are immediately rejected
* **Response:** `429 Too Many Requests` with a JSON error and `Retry-After`

Ten consecutive wrong passwords also lock that account for 15 minutes;
successful sign-in and an admin password reset clear its failure count.

Behind a reverse proxy, configure `ForwardedHeaders:KnownProxies` or
`ForwardedHeaders:KnownNetworks` so rate limits use the client's address. If
the API can be reached **only** through a proxy that controls
`X-Forwarded-For`, set `ForwardedHeaders__TrustAllProxies=true` in that
deployment and set `ForwardedHeaders__ForwardLimit` to the number of proxy hops
that append an address (normally `1`). Do not enable that option on an API
reachable directly from clients: they could then choose their own rate-limit
bucket. Without a trusted proxy configuration, clients behind the same proxy
share its 60-per-minute global bucket and the per-address sign-in limits.

Check the setting once after a deploy. Set
`ForwardedHeaders__LogClientAddress=true`, send a request with an address of
your own invention, and read the API's log:

```bash
curl -s -o /dev/null -H 'X-Forwarded-For: 203.0.113.9' https://<api-host>/health
```

The logged client address should be your real public address. If it is
`203.0.113.9`, `ForwardLimit` is too high and clients can pick their own
address; if it is one of the platform's proxies, raise `ForwardLimit` by one.
Render does not document how many entries its proxies add (reports range from
one to two, with Cloudflare in front), so measure rather than assume. Then
remove `LogClientAddress`: it logs every request's address.

`AllowedHosts` is `*`, so the API answers any `Host` header; it builds no
links from it. To restrict it, set `AllowedHosts` per deployment to the
semicolon-separated host names clients use, and include the hosts health
probes send: Kubernetes probes, for example, call the pod's own address.

---

## Testing

The backend tests in `MyApp.Tests` use xUnit, Moq and EF Core InMemory for
service tests. They also exercise the HTTP pipeline through
`WebApplicationFactory` and have an optional PostgreSQL suite:

| Area | Under test |
| --- | --- |
| Appointments | `AppointmentCreationService` (with patient matching), `AppointmentCancellationService`, `AppointmentQueryService`, `AppointmentStatusService`, `PatientRecordService`, the check for bookings a change would strand |
| Auth | `LoginService`, `UserCreationService`, `ChangePasswordService`, `SecurityStampCache`, `SignInWarmup` |
| Calendar | `ScheduleCreationService`, `ScheduleModificationService`, `ScheduleQueryService`, working days |
| Department | `DepartmentCreationService`, `DepartmentQueryService`, `DepartmentStatusService`, `DoctorDepartmentService` |
| User | `ChangeRoleService`, `CreateDoctorService`, `DoctorStatusService`, `ResetPasswordService`, `UserQueryService` |
| Audit log | `AuditLogQueryService`, `AuditLogService` |
| Data | The `--migrate` and `--create-admin` commands |
| API | Who may call each endpoint (one table), responses, read-only demo accounts, sign-in rate limiting, forwarded headers, the signing key check at startup and the [API contract](#api-contract) |

The service suite also covers `PatientService`, `ScheduleValidation` and
`CurrentUserService`. The 23 PostgreSQL tests check actual migrations,
including through the migrations connection, indexes, constraints, concurrent
account lockout updates, two schedules made for one doctor at the same time,
time off, breaks, moves and booking history, and `--create-admin`. They run only
when `HOSPITALSYSTEM_TEST_POSTGRES` holds a connection string to a PostgreSQL
server where the tests can create temporary databases, and are reported as
skipped otherwise, as in CI:

```bash
HOSPITALSYSTEM_TEST_POSTGRES='Host=localhost;Port=5432;Username=hospitaluser;Password=strongpassword;Database=postgres' dotnet test
```

The Appointments, Auth, Department and User tests share seed data through
`*TestBase` classes.

The frontend's tests run with Vitest (`npm test`). Unit tests (`*.test.ts`,
in `hospital-frontend/src` and `hospital-frontend/scripts`) run in Node and
cover schedule slots and working days, formatting, search, form validation,
time handling, HTTP error messages, the API client's booking errors and the
API type generator.

Component tests (`*.test.tsx`) render into jsdom with Testing Library and use
the app the way a person would, by role and label: the shared buttons, table
status and dialog, and the reception screen's doctor list, week calendar,
appointment panel, and booking and cancel dialogs. `src/test` holds their
setup and a helper that provides the workspace App would. Whole screens are
covered by the end-to-end tests.

### End-to-end tests

`hospital-frontend/e2e` holds Playwright tests that drive the app in Chromium
against the real API and a PostgreSQL database. They cover:

- **Sign-in:** a wrong password, then signing in and out.
- **Reception:** the week in clinic time, with the break and a day away.
  Booking an open slot, then cancelling it. Moving a booking to another
  doctor and time. The booking's history. Session renewal.
- **Admin:** editing a schedule's break. Adding and removing time off,
  including over a booking. Making a new user a doctor in a new department.
- **Phone:** "My day" and reception without sideways scrolling.

`npm run e2e` starts what the tests need on ports of their own (API on 5290,
app on 5190), so a dev server you have running is not touched:

- the API, built with `dotnet run`, on a new database `hs_e2e_<random>`,
  which it creates and migrates as it starts;
- the first admin, made with `--create-admin`;
- the production build of the app, with its content security policy.

The database is dropped when the run ends. Each test adds the departments,
doctors and bookings it needs through the API, under names no other test
uses, so tests can run in parallel. The browser runs in Asia/Tokyo, so every
date and time the tests look for also shows that the app keeps to the
clinic's zone. A test fails on any error in the browser console, which
catches requests the content security policy blocks.

Requirements:

- the .NET SDK;
- Chromium for Playwright, installed once with `npx playwright install chromium`
  (again after a Playwright update);
- `HOSPITALSYSTEM_TEST_POSTGRES`, as for the backend's PostgreSQL tests: a
  server where the tests can create databases, on PostgreSQL 13 or later.

```bash
cd hospital-frontend
HOSPITALSYSTEM_TEST_POSTGRES='Host=localhost;Port=5432;Username=hospitaluser;Password=strongpassword;Database=postgres' npm run e2e
```

A run takes about 40 seconds. For a failed test, `test-results/` keeps a
screenshot and a trace (`npx playwright show-trace <path>`), and
`npx playwright show-report` opens the HTML report. CI does not run these
tests: they need a database server and the API.

### API contract

`hospital-frontend/openapi.json` is the API's OpenAPI document, and
`hospital-frontend/src/api-schema.ts` holds TypeScript types generated from it,
which `src/api.ts` uses for requests and responses. `dotnet test` fails when
the document the API serves differs from `openapi.json`, and CI fails when
`api-schema.ts` is out of date. After changing a controller or DTO, update
both and commit them with the change:

```bash
UPDATE_OPENAPI=1 dotnet test --filter OpenApiContractTests
cd hospital-frontend
npm run generate:api
```

The generator, `scripts/generate-api-types.mjs`, is a small script of its own
because openapi-typescript needs TypeScript 5's compiler API, which TypeScript
7 does not have.

Keep `Microsoft.OpenApi` on 2.x: Swashbuckle is built against it, and with 3.x
`/swagger/v1/swagger.json` fails with a 500. Dependabot does not propose major
updates for it.

### Run Tests

```bash
dotnet test
```

The backend build treats compiler warnings, nullable warnings included, as
errors (`Directory.Build.props`). NuGet vulnerability advisories stay
warnings, so a newly published advisory does not fail unrelated builds.

Test, lint and type-check the frontend with:

```bash
cd hospital-frontend
npm run lint
npm test
VITE_API_URL=http://localhost:5272/api npm run build
```

---

## Containerization

Full Docker support:

* Multi-stage Dockerfile for ASP.NET Core backend (Alpine, with `tzdata` for
  the clinic's time zone)
* Dockerfile for React + Vite frontend (served via Nginx)
* Docker Compose for local development

### Run with Docker

Compose sets the connection string itself and takes the JWT signing key, and
optionally the database password (`POSTGRES_PASSWORD`), from a `.env` file in
the repository root. `.env` is gitignored; start from the template and replace
the key with your own random string of at least 32 characters:

```bash
cp .env.example .env
docker compose up --build
```

`appsettings.Development.json` is not used here: it is kept out of the image so
that no local secrets are built into it.

The Dockerfiles pin their base images by digest, so every build starts from
the same images until a Dependabot pull request moves the pins. Docker reuses
the cached `apk upgrade` layer, so to pick up Alpine security fixes released
since your last build, rebuild without the cache:

```bash
docker compose build --no-cache
```

The frontend is served at `http://localhost:3000` and the API at
`http://localhost:5272`, to this computer only: like PostgreSQL's, their ports
bind to `127.0.0.1`. A container that stops is restarted unless you stopped it.
The backend applies migrations on startup; create the first admin as in Backend
Setup, step 5.

---

## Project Goals

* ✅ Deployed to AWS EC2 with full CI/CD pipeline
* ✅ Containerized with Docker and Docker Compose
* ✅ HTTPS with Nginx and Let's Encrypt
* ✅ Automated testing and branch protection
* ✅ Monitoring and alerting with Prometheus and Grafana
* ✅ Serverless database with Neon (data persists independently of EC2)
* ✅ Centralized logging (Loki + Promtail)
* ✅ Refactor code so it follows solid principles and design patterns
## Roadmap

* Kubernetes orchestration
* Expanded unit and integration test coverage
* UI improvements and responsive design
* Refactor code so it follows solid principles and design patterns
