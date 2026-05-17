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

---

## Deployment

### Free Cloud Hosting (Primary)

* **Frontend:** Hosted on [Cloudflare Pages](https://pages.cloudflare.com/)
* **Backend API:** Hosted on [Render](https://render.com/)
* **Database:** Serverless PostgreSQL hosted on [Neon](https://neon.tech/)

### Self-Hosted (AWS EC2)

* **Frontend:** React build served via Nginx container
* **Backend API:** ASP.NET Core container on port 8080
* **Database:** Serverless PostgreSQL hosted on [Neon](https://neon.tech/) *(Shared with the free tier — data persists across deployments)*
* **Web Server:** Nginx reverse proxy with SSL/HTTPS via Let's Encrypt
* **Dynamic DNS:** No-IP — hostname stays stable across EC2 restarts
* **Monitoring:** Prometheus + Grafana (see Monitoring section below)
* **Instance:** Amazon Linux 2023
* **Live:** [hostpitalsyst.servebeer.com](https://hostpitalsyst.servebeer.com) *(Note: The site is only accessible when the AWS EC2 instance is active)*

---

## DevOps & Infrastructure

### CI/CD Pipeline (GitHub Actions)
- Branch protection on `main` — all changes require a passing pipeline before merge
- Unit tests run automatically on every pull request
- On merge to `main`: Docker images built and pushed to Docker Hub
- Images tagged with both `latest` and commit SHA for easy rollback
- Automated deployment to EC2 via SSH on successful build

### Infrastructure as Code (Terraform)
- Full AWS infrastructure provisioned with Terraform (VPC, subnet, security groups, EC2)
- Automated provisioner script — spins up a fresh EC2 with Docker, Nginx, SSL, Prometheus, Grafana, and the full app stack on first boot
- Secrets managed via Terraform variables, never hardcoded
- Repository: [https://github.com/KaanMyumyun/IaC]

### Tech Stack
- **CI/CD:** GitHub Actions
- **Containerization:** Docker, Docker Compose
- **Web Server:** Nginx + Let's Encrypt (SSL)
- **Cloud:** AWS EC2 (Amazon Linux 2023)
- **Registry:** Docker Hub
- **Database:** Neon (Serverless PostgreSQL)

### Monitoring

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

### Logging

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
* .NET SDK 8+
* Node.js 18+
* npm

---

## Project Structure

```text
.
├── hospital-frontend/              # Frontend (React + TypeScript + Vite)
│   ├── public/
│   ├── src/
│   │   ├── api/                    # API communication layer
│   │   ├── components/             # Reusable UI components
│   │   ├── lib/                    # Shared utilities/helpers
│   │   ├── pages/                  # Application pages
│   │   ├── types/                  # TypeScript type definitions
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── Dockerfile
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── package.json
│
├── HospitalSystem/                 # Backend (ASP.NET Core Web API)
│   ├── Controllers/
│   ├── Entities/
│   ├── Enums/
│   ├── Interface/
│   ├── Services/
│   ├── Migrations/
│   ├── Data/
│   ├── Program.cs
│   ├── appsettings.json
│   ├── Dockerfile
│   └── HospitalSystem.csproj
│
├── MyApp.Tests/                    # Unit Tests
│   ├── Services/
│   ├── Controllers/
│   ├── GlobalUsings.cs
│   └── MyApp.Tests.csproj
│
├── docker-compose.yml
├── HospitalSystem.sln
├── .dockerignore
└── README.md
```

---

## Getting Started

### Prerequisites
* .NET SDK 8.0 or later
* Node.js 18 or later
* PostgreSQL

### Clone the Repository

```bash
git clone https://github.com/KaanMyumyun/HospitalSystem.git
cd HospitalSystem
```

---

## Backend Setup

```bash
cd HospitalSystem
dotnet restore
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
|   POST | /api/Auth/CreateUser | Register a new user              |
|   POST | /api/Auth/login      | Authenticate and return JWT      |

### Users

| Method | Endpoint                  | Description         |
| -----: | ------------------------- | ------------------- |
|   POST | /api/Users/change-role    | Change user role    |
|   POST | /api/Users/create-doctor  | Create doctor       |
|   POST | /api/Users/reset-password | Reset password      |
|    GET | /api/Users/ListUsers      | List all users      |
|    GET | /api/Users/ListDoctors    | List all doctors    |

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
|   POST | /api/Schedule/create-schedule | Create a new schedule       |
|   POST | /api/Schedule/change-schedule | Modify an existing schedule |
|    GET | /api/Schedule/list-schedule   | View all schedules          |

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

## API Rate Limiting

A global rate limiter is implemented using ASP.NET Core's built-in rate-limiting middleware:

* **Strategy:** Fixed Window Limiter (partitioned by client IP)
* **Limit:** 60 requests per minute per IP
* **Queue:** Disabled — exceeding requests are immediately rejected
* **Response:** `429 Too Many Requests` with a custom message

---

## Testing

Unit tests are implemented for `UserService` using xUnit, Moq, and EF Core InMemory.

### Covered Methods
- `ChangeDoctorsStatusAsync`
- `ChangeRoleAsync`
- `CreateDoctorAsync`
- `ListUsersAsync`
- `ListDoctorsAsync`
- `ResetPasswordAsync`

### Tested Scenarios
- Role-based access control (Admin vs non-admin)
- Entity state management during role changes
- Edge cases: non-existent entities, invalid states, reactivation logic
- Prevention of unintended side effects on failed operations

### Run Tests

```bash
dotnet test
```

---

## Containerization

Full Docker support:

* Multi-stage Dockerfile for ASP.NET Core backend
* Dockerfile for React + Vite frontend (served via Nginx)
* Docker Compose for local development and EC2 deployment

### Run with Docker

```bash
docker compose up --build
```

---

## Project Goals

* ✅ Deployed to AWS EC2 with full CI/CD pipeline
* ✅ Containerized with Docker and Docker Compose
* ✅ HTTPS with Nginx and Let's Encrypt
* ✅ Automated testing and branch protection
* ✅ Monitoring and alerting with Prometheus and Grafana
* ✅ Serverless database with Neon (data persists independently of EC2)
* ✅ Centralized logging (Loki + Promtail)
* ✅ Refactor code so it folows solid principles and design patterns
## Roadmap

* Kubernetes orchestration
* Expanded unit and integration test coverage
* UI improvements and responsive design
* Refactor code so it folows solid principles and design patterns