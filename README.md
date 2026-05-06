# Hospital System

[![Live Demo](https://img.shields.io/badge/Live_Demo-Click_Here-success?style=for-the-badge&logo=cloudflare)](https://hospitalsystem.pages.dev/)

A full-stack **Hospital Management System** built with **ASP.NET Core Web API** and a **React + TypeScript + Vite** frontend.

---

## Deployment

### Free Cloud Hosting

This project is fully deployed using a modern, free-tier cloud infrastructure:

* **Frontend:** Hosted on [Cloudflare Pages](https://pages.cloudflare.com/)
* **Backend API:** Hosted on [Render](https://render.com/)
* **Database:** Serverless PostgreSQL hosted on [Neon](https://neon.tech/)

*(Note: The backend runs on a free cloud instance. If the system has been inactive, it may take 30-60 seconds to "spin up" during your first login attempt. Please be patient!)*


### Self-Hosted (AWS EC2)
* **Frontend:** React build served via Nginx container
* **Backend API:** ASP.NET Core container on port 8080
* **Database:** PostgreSQL container (internal network only)
* **Web Server:** Nginx reverse proxy with SSL/HTTPS via Let's Encrypt
* **Instance:** Amazon Linux 2023, Elastic IP 
*   **Live:** Coming soon!

---

## DevOps & Infrastructure

### CI/CD Pipeline (GitHub Actions)
- Branch protection on `main` — all changes require a passing pipeline before merge
- Unit tests run automatically on every pull request
- On merge to `main`: Docker images built and pushed to Docker Hub
- Images tagged with both `latest` and commit SHA for easy rollback
- Automated deployment to EC2 via SSH on successful build

### Self-Hosted (AWS EC2)

* **Frontend:** React build served via Nginx container
* **Backend API:** ASP.NET Core container on port 8080
* **Database:** Serverless PostgreSQL hosted on [Neon](https://neon.tech/) *(Shared with the free tier)*
* **Web Server:** Nginx reverse proxy with SSL/HTTPS via Let's Encrypt
* **Instance:** Amazon Linux 2023, Elastic IP 
* **Live:** [hostpitalsyst.servebeer.com](http://hostpitalsyst.servebeer.com) *(Note: The site is only accessible when the AWS EC2 instance is active).*

---

### Tech Stack
- **CI/CD:** GitHub Actions
- **Containerization:** Docker, Docker Compose
- **Web Server:** Nginx + Let's Encrypt (SSL)
- **Cloud:** AWS EC2
- **Registry:** Docker Hub

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
│   │   │   ├── appointmentApi.ts
│   │   │   ├── authApi.ts
│   │   │   ├── departmentApi.ts
│   │   │   ├── http.ts
│   │   │   ├── unwrapServiceResult.ts
│   │   │   └── userApi.ts
│   │   ├── components/             # Reusable UI components
│   │   ├── lib/                    # Shared utilities/helpers
│   │   ├── pages/                  # Application pages
│   │   │   ├── AdminPanel.tsx
│   │   │   ├── Appointmentbooking.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   └── ReceptionDashboard.tsx
│   │   ├── types/                  # TypeScript type definitions
│   │   │   ├── appointment.ts
│   │   │   ├── appointmentStatus.ts
│   │   │   ├── auth.ts
│   │   │   ├── department.ts
│   │   │   ├── serviceResult.ts
│   │   │   ├── user.ts
│   │   │   └── userRole.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── Dockerfile
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── package.json
│   └── README.md
│
├── HospitalSystem/                 # Backend (ASP.NET Core Web API)
│   ├── Controllers/
│   │   ├── AppointmentsController.cs
│   │   ├── AuthController.cs
│   │   ├── DepartmentsController.cs
│   │   └── UsersController.cs
│   ├── Entities/                   # Database entities
│   │   ├── ApointmentsEntity.cs
│   │   ├── DepartmentEntity.cs
│   │   ├── DoctorEntity.cs
│   │   ├── PatiensEntity.cs
│   │   ├── RoleEntity.cs
│   │   └── UserEntity.cs
│   ├── Enums/
│   │   ├── AppointmentStatus.cs
│   │   ├── JwtSettings.cs
│   │   └── UserRole.cs
│   ├── Interface/                  # Service interfaces
│   │   ├── IAppointmentService.cs
│   │   ├── IAuthService.cs
│   │   ├── ICurrentUserService.cs
│   │   ├── IDepartmentService.cs
│   │   └── IUserService.cs
│   ├── Services/                   # Business logic
│   │   ├── AppointmentService.cs
│   │   ├── AuthService.cs
│   │   ├── CurrentUserService.cs
│   │   ├── DepartmentService.cs
│   │   └── UserService.cs
│   ├── Migrations/
│   ├── Data/
│   ├── Program.cs
│   ├── appsettings.json
│   ├── appsettings.Development.json
│   ├── Dockerfile
│   └── HospitalSystem.csproj
│
├── MyApp.Tests/                    # Unit Tests
│   ├── Services/
│   │   ├── AppointmentServiceTests.cs
│   │   └── UserServiceTests.cs
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

---

### Clone the Repository

```bash
git clone [https://github.com/KaanMyumyun/HospitalSystem.git](https://github.com/KaanMyumyun/HospitalSystem.git)
cd HospitalSystem
```

---

## Backend Setup

```bash
cd HospitalSystem.Api
dotnet restore
dotnet run
```

API available at:

```text
http://localhost:5272
```

Swagger UI:

```text
http://localhost:5272/swagger
```

---

## Frontend Setup

```bash
cd front-end
npm install
npm run dev
```

Frontend available at:

```text
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
|   POST | /api/Auth/login      | Authenticate user and return JWT |

---

### Users

| Method | Endpoint                  | Description         |
| -----: | ------------------------- | ------------------- |
|   POST | /api/Users/change-role    | Change user role    |
|   POST | /api/Users/create-doctor  | Create doctor user  |
|   POST | /api/Users/reset-password | Reset user password |
|    GET | /api/Users/ListUsers      | List all users      |
|    GET | /api/Users/ListDoctors    | List all doctors    |

---

### Departments

| Method | Endpoint                               | Description                  |
| -----: | -------------------------------------- | ---------------------------- |
|    GET | /api/Department/ViewDepartment         | View departments             |
|   POST | /api/Department/CreateDepartment       | Create department            |
|   POST | /api/Department/ChangeDoctorDepartment | Assign doctor to department  |
|   POST | /api/Department/ChangeDepartmentStatus | Enable or disable department |

---

### Appointments

| Method | Endpoint                            | Description        |
| -----: | ----------------------------------- | ------------------ |
|   POST | /api/Appointments/CreateAppointment | Create appointment |
|    GET | /api/Appointments/ListAppointments  | List appointments  |
|   POST | /api/Appointments/CancelAppointment | Cancel appointment |

---

### Schedules

| Method | Endpoint                            | Description                 |
| -----: | ----------------------------------- | --------------------------- |
|   POST | /api/Schedule/create-schedule       | Create a new schedule       |
|   POST | /api/Schedule/change-schedule       | Modify an existing schedule |
|   GET  | /api/Schedule/list-schedule         | View all schedules          |

---

## Example Request

### Change User Role

Endpoint:

```text
POST /api/Users/change-role
```

Headers:

```text
Authorization: Bearer <JWT_TOKEN>
```

Request body:

```json
{
  "userId": 10,
  "newRole": "Doctor"
}
```

Response:

```json
{
  "isSuccess": true,
  "error": null
}
```

---

## Error Handling

* 200 OK – Successful request
* 400 Bad Request – Validation or business logic error
* 401 Unauthorized – Missing or invalid JWT
* 403 Forbidden – Insufficient permissions
* 404 Not Found – Resource not found
* 500 Internal Server Error – Unexpected server error

---

## Database

The backend uses **PostgreSQL** with **Entity Framework Core**.

Database name:

```text
HospitalSystemDb
```

Create database:

```sql
CREATE DATABASE "HospitalSystemDb";
```

---

## Security Considerations

* JWT-based authentication
* Role-based authorization
* Secure password hashing
* Input validation on all endpoints
* HTTPS recommended for production

---

## API Rate Limiting & Protection

To protect the backend from spam, brute-force attacks, and to optimize resource usage on the free-tier cloud hosting, a global rate limiter is implemented using ASP.NET Core's built-in rate-limiting middleware.

* **Strategy:** Fixed Window Limiter (Partitioned by Client IP Address)
* **Permit Limit:** 60 requests per minute per user.
* **Queueing:** Disabled (`QueueLimit = 0`). Exceeding requests are immediately rejected to conserve server RAM rather than holding them in memory.
* **Rejection Behavior:** Returns a `429 Too Many Requests` status code with a custom intervention message: *"Rate limit exceeded. API protection active. Please try again in a minute."*

---

# UserService Unit Tests

This project contains unit tests for the `UserService` class in the **HospitalSystem** application.
The tests validate business logic, role-based authorization, and database state changes using an in-memory database.

---

## Technologies Used

* .NET / C#
* xUnit (unit testing framework)
* Moq (mocking dependencies)
* Entity Framework Core InMemory (isolated test database)
* ASP.NET Core Identity (password hashing used internally by the service)

---

## Testing

Unit tests are implemented for the `UserService`, focusing on service-layer business logic and role-based authorization. Tests are written using xUnit and validate both successful "happy paths" and complex edge-case failure scenarios.

---

### Covered Methods

- `ChangeDoctorsStatusAsync`
- `ChangeRoleAsync`
- `CreateDoctorAsync`
- `ListUsersAsync`
- `ListDoctorsAsync`
- `ResetPasswordAsync`

---

### Tested Scenarios Include

- **Role-Based Access Control (RBAC):** Admin vs. non-admin authorization rules, as well as specific Front Desk permissions.
- **Entity State Management:** Dynamic entity management, such as automatically creating or deactivating Doctor profiles when a user's role is changed.
- **Edge Cases:** Handling of non-existent entities, invalid Enum states, and reactivating/updating existing profiles instead of creating duplicates.
- **Validation:** Prevention of invalid state changes and verification of business rules.

---

### What the Tests Verify

- Role-based authorization is strictly enforced.
- Business logic behaves correctly during complex edge cases.
- Database state is modified *only* on successful operations.
- Unintended side effects do not occur during read-only or failed operations.

---

## Test Design

### In-Memory Database

Each test uses a fresh EF Core InMemory database instance:

```csharp
.UseInMemoryDatabase(Guid.NewGuid().ToString())
```

---

### Mocked Dependencies

ICurrentUserService is mocked using Moq to simulate different user roles without relying on actual authentication mechanisms:

```csharp
currentUserMock
.Setup(x => x.IsInRole(UserRole.Admin))
.Returns(true);
```

---

### Example Test Flow

Thanks to the helper methods, tests follow a highly readable and concise Arrange-Act-Assert pattern:

```csharp
[Fact]
public async Task ChangeDoctorStatus_Admin_Succeeds()
{
    var db = CreateDbContext();
    await SeedStandardDoctorAsync(db, isDoctorActive: false);
    var service = CreateService(db, isAdmin: true);

    var result = await service.ChangeDoctorsStatusAsync(new ChangeDoctorsStatus { DoctorId = 1, IsActive = true });

    Assert.True(result.IsSuccess);
    Assert.True(db.Doctors.First().IsActive);
}
```

---

### Running the Tests

From the solution root directory, execute the following command in your terminal:

```bash
dotnet test
```

---

## Future Test Coverage

* DepartmentService
* AuthService
* CurrentUserService (authorization edge cases)

--- 

## Containerization

The project supports full containerization using Docker.

* Multi-stage Dockerfile for ASP.NET Core Web API
* Dockerfile for React + Vite frontend (served via Nginx)
* PostgreSQL container with persistent volume
* Docker Compose for local development and deployment parity

## Running with Docker

The application can be run fully containerized using Docker Compose.

### Prerequisites

* Docker
* Docker Compose

### Start the application

From the project root:

```bash
docker compose up --build
```

---

## UI Improvements (Planned)

* Improved layout and styling
* Enhanced form validation
* Role-based UI behavior
* Responsive design

---

## Known Limitations

* UI still under development

---

## Project Goals

* Build a secure full-stack system
* Apply authentication best practices
* Design scalable backend architecture
* ✅ Deployed to AWS EC2 with full CI/CD pipeline
* ✅ Containerized with Docker and Docker Compose
* ✅ HTTPS with Nginx and Let's Encrypt
* ✅ Automated testing and branch protection

## Roadmap

* Kubernetes orchestration
* Monitoring and alerting (Prometheus, Grafana)
* Centralized logging (ELK stack)
* Expanded unit and integration test coverage
* UI improvements and responsive design