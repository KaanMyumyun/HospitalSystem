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

```
HospitalSystem
├── HospitalSystem.Api/
│   ├── Controllers
│   ├── DTOs
│   ├── Models
│   ├── Services
│   └── Program.cs
│
├── front-end/
│   ├── src
│   ├── public
│   └── vite.config.ts
│
└── HospitalSystem.sln
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

## What Is Being Tested

The current test suite covers the `ChangeDoctorsStatusAsync` method in `UserService`.

### Covered Scenarios

* Admin user can activate a doctor
* Admin user can deactivate a doctor
* Admin user can change doctor status successfully
* Non-admin users cannot change doctor status
* Attempting to set the same status fails
* Attempting to change status for a non-existent doctor fails

### Each test verifies:

* Authorization rules
* Correct success or failure responses
* Correct persistence of changes in the database

---

## What Is Being Tested

The current test suite covers the `ChangeRoleAsync` method in `UserService`.

### Covered Scenarios

* Non-admin users cannot change a user’s role
* Admin users can successfully change a user’s role
* Attempting to assign the same role fails
* Attempting to change the role of a non-existent user fails
* Attempting to assign an invalid role enum value fails
* Attempting to assign the Pending role fails

### Each test verifies:

* Role-based authorization rules
* Business rule validation for role changes
* Correct success or failure responses
* Correct persistence (or non-persistence) of role changes in the database

---

## What Is Being Tested

The current test suite covers the `CreateDoctorAsync` method in `UserService`.

### Covered Scenarios

* Non-admin users cannot create a doctor
* Admin users can successfully create a doctor
* Attempting to create a doctor for a non-existent user fails
* Attempting to create a doctor with a non-existent department fails
* Attempting to assign an invalid role enum value fails
* Attempting to assign the Pending role fails
* Attempting to create a doctor when the user already has the target role fails

### Each test verifies:

* Role-based authorization rules
* Business rule validation during doctor creation
* Correct success or failure responses
* Correct persistence of changes in the database:

  * User role is updated appropriately
  * Doctor entity is created only on success
  * No database changes occur on failure

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

The following `UserService` methods are implemented but currently lack unit tests:

* `ListDoctorsAsync`
* `ListUsersAsync`
* `ResetPasswordAsync`

---

## Planned Cloud Hosting

* Dockerized backend and frontend
* Managed PostgreSQL database
* Environment-based configuration
* Secure secrets management
* HTTPS-enabled deployment

---

## Containerization (Planned)

* Dockerfile for ASP.NET Core API
* Dockerfile for React frontend
* Docker Compose for local and cloud parity

---

## Testing (Planned)

* Unit tests for business logic
* Integration tests for API endpoints
* Frontend component tests

---

## UI Improvements (Planned)

* Improved layout and styling
* Enhanced form validation
* Role-based UI behavior
* Responsive design

---

## Known Limitations

* No automated tests yet
* UI still under development
* No Docker deployment yet

---

## Project Goals

* Build a secure full-stack system
* Apply authentication best practices
* Design scalable backend architecture
* Prepare for cloud deployment

---

