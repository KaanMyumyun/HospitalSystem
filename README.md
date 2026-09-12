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

> The backend runs on a free Render instance. If inactive, it may take **30–60 seconds to spin up** on first request.

This is the only deployment that runs permanently. The AWS deployments described under [Deployment](#deployment) are brought up only when needed.

---
## DevOps & Infrastructure

### CI/CD Pipeline (GitHub Actions)

The application uses a three-stage GitHub Actions pipeline:

1. `CI` workflow
   - Runs on pull requests and pushes to `main`
   - Restores, builds and tests the backend
   - Lints and builds the frontend (the build type-checks it)
   - Builds both Docker images and scans them with Trivy; a fixable `HIGH`
     or `CRITICAL` vulnerability fails the run

2. `Docker Image CI` workflow
   - Runs after the `CI` workflow succeeds on `main`
   - Builds backend and frontend Docker images
   - Tags images with `latest`, full commit SHA, and date-based short SHA tags
   - Pushes images to Docker Hub and Amazon ECR
   - Uses GitHub Actions OIDC to assume an AWS IAM role for ECR access

3. `Deploy to EKS` workflow
   - Runs after the Docker workflow succeeds
   - Waits for approval in the `production` environment
   - Assumes a separate AWS IAM deployment role through OIDC
   - Updates kubeconfig for the EKS cluster
   - Sets backend and frontend Deployment images to the date-based short SHA
     tag (`YYYY-MM-DD-<short sha>`)
   - Waits for rollout completion when the app is scaled up

If the Kubernetes deployments are scaled to `0`, the deploy workflow skips the
rollout wait, but still updates the Deployment image fields. The next manual
scale-up runs the exact image tag built from the commit that passed CI.

Every action is pinned to a full commit SHA, because a version tag can be
moved to different code. Dependabot (`.github/dependabot.yml`) opens a weekly
pull request that updates the pins.

The workflows read these repository variables. All but the last two can be
secrets instead. Docker Image CI also needs the `DOCKER_USERNAME` and
`DOCKER_PASSWORD` secrets.

| Variable | Used by | Value |
| --- | --- | --- |
| `AWS_REGION` | Docker Image CI, Deploy | AWS region of the ECR registry and EKS cluster |
| `AWS_ROLE_TO_ASSUME` | Docker Image CI | `github_actions_ecr_push_role_arn` Terraform output |
| `AWS_DEPLOY_ROLE_TO_ASSUME` | Deploy | `github_actions_deploy_role_arn` Terraform output |
| `ECR_REGISTRY` | Docker Image CI, Deploy | `ecr_registry` Terraform output |
| `ECR_BACKEND_REPOSITORY` | Docker Image CI, Deploy | `hospital-backend` |
| `ECR_FRONTEND_REPOSITORY` | Docker Image CI, Deploy | `hospital-frontend` |
| `VITE_API_URL` | Docker Image CI | Public API URL baked into the frontend |
| `EKS_CLUSTER_NAME` | Deploy | `cluster_name` Terraform output |
| `K8S_NAMESPACE` | Deploy | `hospitalsystem` |

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
* Appointment scheduling and cancellation
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
* .NET 8 SDK (pinned by `global.json`)
* Node.js 20.19+ or 22.12+ (required by Vite 8)
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
│   ├── public/
│   ├── src/
│   │   ├── App.tsx                 # Screens and UI components
│   │   ├── api.ts                  # API client and session storage
│   │   ├── main.tsx
│   │   ├── App.css
│   │   └── index.css
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
│
├── HospitalSystem/                 # Backend (ASP.NET Core Web API)
│   ├── Controllers/
│   ├── Data/
│   ├── Dto/
│   ├── Entities/
│   ├── Enums/
│   ├── Interface/
│   ├── Migrations/
│   ├── Properties/
│   ├── Services/
│   ├── Program.cs
│   ├── appsettings.json
│   ├── appsettings.Development.example.json
│   ├── Dockerfile
│   └── HospitalSystem.csproj
│
├── MyApp.Tests/                    # Unit tests (xUnit, Moq, EF Core InMemory)
│   ├── Services/
│   ├── TestAuditLogService.cs
│   ├── GlobalUsings.cs
│   └── MyApp.Tests.csproj
│
├── .editorconfig
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
* .NET 8 SDK
* Node.js 20.19+ or 22.12+
* Docker, to run PostgreSQL locally (or your own PostgreSQL 16)
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
values only.

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
`JWT SecretKey is not configured`.

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
dotnet tool install --global dotnet-ef --version "8.*"   # once
cd HospitalSystem
dotnet ef database update
```

Alternatively, set `Database__RunMigrationsOnStartup=true` and the API applies
the migrations when it starts.

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
API, so the first admin has to be inserted directly.

Generate a password hash in the format ASP.NET Core Identity uses. The command
prompts for the password:

```bash
python3 -c 'import base64,getpass,hashlib,os,struct; p=getpass.getpass().encode(); s=os.urandom(16); print(base64.b64encode(b"\x01"+struct.pack(">III",2,100000,16)+s+hashlib.pbkdf2_hmac("sha512",p,s,100000,32)).decode())'
```

Insert the admin, replacing `<hash>` with the output:

```bash
docker compose exec postgres psql -U hospitaluser -d HospitalSystemDb \
  -c "INSERT INTO \"Users\" (\"Name\", \"PasswordHash\", \"Role\") VALUES ('admin', '<hash>', 'Admin');"
```

Log in as `admin` with that password. New users created from the app start as
`Pending` until an admin assigns them a role.

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

---

## Authentication and Authorization

* JWT-based authentication
* Protected endpoints require a Bearer token
* Role-based access restrictions
* Swagger supports authenticated testing

---

## API Endpoints

### Authentication

| Method | Endpoint             | Description                      |
| -----: | -------------------- | -------------------------------- |
|   POST | /api/Auth/CreateUser | Create a user (Admin only)       |
|   POST | /api/Auth/login      | Authenticate and return JWT      |

### Users

| Method | Endpoint                         | Description                    |
| -----: | -------------------------------- | ------------------------------ |
|   POST | /api/Users/change-role           | Change user role               |
|   POST | /api/Users/create-doctor         | Create doctor                  |
|   POST | /api/Users/change-doctor-status  | Activate or deactivate doctor  |
|   POST | /api/Users/reset-password        | Reset password                 |
|    GET | /api/Users/ListUsers             | List all users                 |
|    GET | /api/Users/ListDoctors           | List all doctors               |

### Departments

| Method | Endpoint                               | Description                  |
| -----: | -------------------------------------- | ---------------------------- |
|    GET | /api/Department/ViewDepartment         | View departments             |
|   POST | /api/Department/CreateDepartment       | Create department            |
|   POST | /api/Department/ChangeDoctorDepartment | Assign doctor to department  |
|   POST | /api/Department/ChangeDepartmentStatus | Enable or disable department |

### Appointments

| Method | Endpoint                            | Description        |
| -----: | ----------------------------------- | ------------------ |
|   POST | /api/Appointments/CreateAppointment | Create appointment |
|    GET | /api/Appointments/ListAppointments  | List appointments  |
|   POST | /api/Appointments/CancelAppointment | Cancel appointment |

### Schedules

| Method | Endpoint                      | Description                 |
| -----: | ----------------------------- | --------------------------- |
|   POST | /api/schedule/create-schedule | Create a new schedule       |
|   POST | /api/schedule/change-schedule | Modify an existing schedule |
|    GET | /api/schedule/list-schedule   | View all schedules          |

---

## Error Handling

* 200 OK – Successful request
* 400 Bad Request – Validation or business logic error
* 401 Unauthorized – Missing or invalid JWT
* 403 Forbidden – Insufficient permissions
* 404 Not Found – Resource not found
* 500 Internal Server Error – Unexpected server error

---

## Security

* JWT-based authentication
* Role-based authorization
* Secure password hashing
* Input validation on all endpoints
* HTTPS enforced via Nginx + Let's Encrypt

To report a vulnerability, see [SECURITY.md](SECURITY.md).

## API Rate Limiting

A global rate limiter is implemented using ASP.NET Core's built-in rate-limiting middleware:

* **Strategy:** Fixed Window Limiter (partitioned by client IP)
* **Limit:** 60 requests per minute per IP
* **Queue:** Disabled — exceeding requests are immediately rejected
* **Response:** `429 Too Many Requests` with a custom message

---

## Testing

The backend has unit tests in `MyApp.Tests`, written with xUnit, Moq and EF Core
InMemory. They cover 17 services across five areas:

| Area | Services under test |
| --- | --- |
| Appointments | `AppointmentCreationService`, `AppointmentCancellationService`, `AppointmentQueryService` |
| Auth | `LoginService`, `UserCreationService` |
| Calendar | `ScheduleCreationService`, `ScheduleModificationService`, `ScheduleQueryService` |
| Department | `DepartmentCreationService`, `DepartmentQueryService`, `DepartmentStatusService`, `DoctorDepartmentService` |
| User | `ChangeRoleService`, `CreateDoctorService`, `DoctorStatusService`, `ResetPasswordService`, `UserQueryService` |

The Appointments, Auth, Department and User tests share seed data through
`*TestBase` classes.

Not covered yet: `PatientService`, `ScheduleValidation`, `AuditLogService`,
`CurrentUserService`, the controllers, and the frontend.

### Run Tests

```bash
dotnet test
```

The frontend has no tests yet. Lint and type-check it with:

```bash
cd hospital-frontend
npm run lint
npm run build
```

---

## Containerization

Full Docker support:

* Multi-stage Dockerfile for ASP.NET Core backend
* Dockerfile for React + Vite frontend (served via Nginx)
* Docker Compose for local development

### Run with Docker

Create `HospitalSystem/appsettings.Development.json` first (Backend Setup, step 2).
The compose file sets the connection string but not the JWT signing key, so the
backend container reads the key from that file.

```bash
docker compose up --build
```

The frontend is served at `http://localhost:3000` and the API at
`http://localhost:5272`. The backend applies migrations on startup; create the
first admin as in Backend Setup, step 5.

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
