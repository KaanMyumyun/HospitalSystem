# Hospital System

A full-stack **Hospital Management System** built with **ASP.NET Core Web API** and a **React + TypeScript + Vite** frontend.

The project focuses on secure authentication, role-based authorization, and clean API design, while remaining extensible for future improvements such as cloud hosting, containerization, testing, and UI enhancements.

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
git clone https://github.com/KaanMyumyun/HospitalSystem.git
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
cd front-end
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

## Example Request

### Change User Role

Endpoint:

```
POST /api/Users/change-role
```

Headers:

```
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

```
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

Unit tests are implemented for the `UserService`, focusing on service-layer business logic
and role-based authorization. Tests are written using xUnit and validate both
successful flows and failure scenarios.

---

### Covered Methods

- ChangeDoctorsStatusAsync
- ChangeRoleAsync
- CreateDoctorAsync
- ListUsersAsync
- ListDoctorsAsync
- ResetPasswordAsync

---

### Tested Scenarios Include

- Admin vs non-admin authorization rules
- Validation of business rules and input data
- Handling of non-existent entities
- Prevention of invalid state changes
- Correct success and failure responses
- Correct persistence or non-persistence of database changes

---

### What the Tests Verify

- Role-based authorization is enforced
- Business logic behaves as expected in edge cases
- Database state is modified only on successful operations
- No unintended side effects occur during read-only operations

---

## Test Design

### In-Memory Database

Each test uses a fresh EF Core InMemory database instance:

```csharp
.UseInMemoryDatabase(Guid.NewGuid().ToString())
```

This ensures:

* No shared state between tests
* Deterministic and repeatable test results
* No dependency on external infrastructure

---

### Mocked Dependencies

`ICurrentUserService` is mocked using Moq to simulate different user roles:

```csharp
currentUserMock
    .Setup(x => x.IsInRole(UserRole.Admin))
    .Returns(true);
```

This allows testing authorization logic independently of authentication mechanisms.

---

## Example Test Flow

1. Arrange

   * Create the database context
   * Seed required entities (users, doctors, departments)
   * Configure mocked current user role

2. Act

   * Call `ChangeDoctorsStatusAsync`

3. Assert

   * Validate the returned result
   * Verify the doctor’s status in the database

---

## Running the Tests

From the solution root directory:

dotnet test


Alternatively, tests can be executed using Visual Studio Test Explorer.

---

## Future Test Coverage

* DepartmentService
* AuthService
* AppointmentService
* CurrentUserService (authorization edge cases)

--- 

## Planned Cloud Hosting

* Dockerized backend and frontend
* Managed PostgreSQL database
* Environment-based configuration
* Secure secrets management
* HTTPS-enabled deployment

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

---

## UI Improvements (Planned)

* Improved layout and styling
* Enhanced form validation
* Role-based UI behavior
* Responsive design

---

## Known Limitations

* UI still under development
* Limited unit test coverage (currently focused on DeparmentServices)
* No production deployment yet


---

## Project Goals

* Build a secure full-stack system
* Apply authentication best practices
* Design scalable backend architecture
* Prepare for cloud deployment

---

