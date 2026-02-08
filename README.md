Hospital System 

A full-stack Hospital Management System built with ASP.NET Core Web API and a React + TypeScript + Vite frontend. 

The project focuses on secure authentication, role-based authorization, and clean API design, while remaining extensible for future improvements such as cloud hosting, containerization, testing, and UI enhancements. 

 

Overview 

The Hospital System is designed to manage hospital operations including: 

User registration and authentication 

Role-based access control 

Department management 

Appointment scheduling and cancellation 

Secure API access using JWT 

The system is divided into two independent layers: 

Backend – RESTful API built with ASP.NET Core 

Frontend – React application built with TypeScript and Vite 

 

Tech Stack 

Backend 

ASP.NET Core Web API 

Entity Framework Core 

PostgreSQL 

JWT Authentication 

Role-based Authorization 

Swagger / OpenAPI 

Frontend 

React 

TypeScript 

Vite 

Tooling 

.NET SDK 8+ 

Node.js 18+ 

npm 

 

Project Structure 

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
 

 

Getting Started 

Prerequisites 

.NET SDK 8.0 or later 

Node.js 18 or later 

PostgreSQL 

 

Clone the Repository 

git clone https://github.com/KaanMyumyun/HospitalSystem.git 
cd HospitalSystem 
 

 

Backend Setup 

cd HospitalSystem.Api 
dotnet restore 
dotnet run 
 

API available at: 

http://localhost:5272 
 

Swagger UI: 

http://localhost:5272/swagger 
 

 

Frontend Setup 

cd front-end 
npm install 
npm run dev 
 

Frontend available at: 

http://localhost:5173 
 

 

Authentication and Authorization 

JWT-based authentication 

Protected endpoints require a Bearer token 

Role-based access restrictions 

Swagger supports authenticated testing 

 

API Endpoints 

Authentication 

Method 

Endpoint 

Description 

POST 

/api/Auth/CreateUser 

Register a new user 

POST 

/api/Auth/login 

Authenticate user and return JWT 

 

Users 

Method 

Endpoint 

Description 

POST 

/api/Users/change-role 

Change user role 

POST 

/api/Users/create-doctor 

Create doctor user 

POST 

/api/Users/reset-password 

Reset user password 

GET 

/api/Users/ListUsers 

List all users 

GET 

/api/Users/ListDoctors 

List all doctors 

 

Departments 

Method 

Endpoint 

Description 

GET 

/api/Department/ViewDepartment 

View departments 

POST 

/api/Department/CreateDepartment 

Create department 

POST 

/api/Department/ChangeDoctorDepartment 

Assign doctor to department 

POST 

/api/Department/ChangeDepartmentStatus 

Enable or disable department 

 

Appointments 

Method 

Endpoint 

Description 

POST 

/api/Appointments/CreateAppointment 

Create appointment 

GET 

/api/Appointments/ListAppointments 

List appointments 

POST 

/api/Appointments/CancelAppointment 

Cancel appointment 

 

Example Request 

Change User Role 

Endpoint: 

POST /api/Users/change-role 
 

Headers: 

Authorization: Bearer <JWT_TOKEN> 
 

Request body: 

{ 
 "userId": 10, 
 "newRole": "Doctor" 
} 
 

Response: 

{ 
 "isSuccess": true, 
 "error": null 
} 
 

 

Error Handling 

200 OK – Successful request 

400 Bad Request – Validation or business logic error 

401 Unauthorized – Missing or invalid JWT 

403 Forbidden – Insufficient permissions 

404 Not Found – Resource not found 

500 Internal Server Error – Unexpected server error 

 

Database 

The backend uses PostgreSQL with Entity Framework Core. 

Database name: 

HospitalSystemDb 
 

Create database: 

CREATE DATABASE "HospitalSystemDb"; 
 

 

Security Considerations 

JWT-based authentication 

Role-based authorization 

Secure password hashing 

Input validation on all endpoints 

HTTPS recommended for production 

 

Planned Cloud Hosting 

Dockerized backend and frontend 

Managed PostgreSQL database 

Environment-based configuration 

Secure secrets management 

HTTPS-enabled deployment 

 

Containerization (Planned) 

Dockerfile for ASP.NET Core API 

Dockerfile for React frontend 

Docker Compose for local and cloud parity 

 

Testing (Planned) 

Unit tests for business logic 

Integration tests for API endpoints 

Frontend component tests 

 

UI Improvements (Planned) 

Improved layout and styling 

Enhanced form validation 

Role-based UI behavior 

Responsive design 

 

Known Limitations 

No automated tests yet 

UI still under development 

No Docker deployment yet 

 

Project Goals 

Build a secure full-stack system 

Apply authentication best practices 

Design scalable backend architecture 

Prepare for cloud deployment 

 

 