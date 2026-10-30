# Changelog

Notable changes to this project. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). The project has no
tagged releases yet, so everything is listed under Unreleased.

## [Unreleased]

### Added

- Contribution guide, security policy, code owners, and pull request and issue
  templates.
- `.editorconfig`, `.gitattributes`, `global.json` and `Directory.Build.props`
  for consistent formatting, line endings, SDK version and build settings.
- `HospitalSystem/appsettings.Development.example.json`, a template for local
  configuration.
- Frontend unit tests with Vitest (`npm test`), run by CI alongside the lint
  and build steps.
- A date of birth is recorded for every patient, and an appointment cannot be
  booked with a date of birth after the appointment date.
- `GET /health/ready`, a readiness check that fails with 503 when the API
  cannot reach the database. `/health` stays a liveness check, and
  `docker compose` now waits on readiness.
- CI audits the frontend's npm dependencies, and Dependabot now also proposes
  NuGet, npm and Docker base image updates.
- Schedules have working days. Admins choose them in the Schedules tab, and
  existing and new schedules default to Monday to Friday. Bookings on a
  doctor's day off are refused, and the reception calendar shows only the
  days the doctor works.
- Appointments can be marked completed or no-show once they have started, by
  the front desk or by the appointment's doctor
  (`POST /api/Appointments/ChangeAppointmentStatus`). The calendar shows the
  outcome on each booking.
- A Patients screen for the front desk: search patients by name or phone
  number, see their visits, and correct their name, phone number or date of
  birth (`GET /api/Patients/ListPatients`, `GET /api/Patients/{patientId}`,
  `POST /api/Patients/UpdatePatient`). Demo Reception can search and view.
- Doctors get a "My day" screen with their own appointments, one day at a
  time, where they can mark each one (`GET /api/Appointments/MyAppointments`).
  Before, the Doctor role had no screens.
- An audit log screen for admins: who did what and when, newest first, with
  search (`GET /api/AuditLogs/ListAuditLogs`).
- Users can change their own password from the top bar
  (`POST /api/Auth/change-password`). Their other sessions are signed out, and
  the current one carries on with a new token. Demo accounts cannot.
- `hospital-frontend/openapi.json` records the API's OpenAPI document, and the
  frontend's request and response types are generated from it
  (`npm run generate:api`) instead of written by hand. A backend test fails
  when the API and `openapi.json` disagree, and CI fails when the generated
  types are out of date.
- Every screen has an address after the `#` (`#/reception`, `#/patients`,
  `#/my-day`, `#/admin/users` and so on), so the back button, a refresh and a
  bookmark all work.
- The Users tab shows which accounts are locked and until when.
- Tests through the real request pipeline (requests without a token, token
  checks, rate limits, forwarded addresses, status codes, the exception
  handler), and a PostgreSQL tier for migrations, indexes, constraints and
  concurrent lockout updates. The PostgreSQL tests run when
  `HOSPITALSYSTEM_TEST_POSTGRES` names a server and are skipped otherwise.
- `dotnet HospitalSystem.dll --create-admin <username>` creates an admin,
  reading the password from standard input, so a new database no longer needs
  a hand-made password hash and an SQL insert.
- Staff are no longer signed out every hour. While someone uses the app, the
  frontend swaps the token for a new one (`POST /api/auth/refresh`) once it
  is ten minutes old, for up to 12 hours after signing in. A session left
  alone still ends after about an hour, revoking tokens works as before, and
  demo sessions are not renewed.
- Bookings can be moved to another time or doctor in one step
  (`POST /api/appointments/{appointmentId}/move`), keeping the appointment's
  id, patient and history. The reception screen's Move Appointment button
  lets the desk pick an open slot of any doctor or week.
- Schedules can have a daily break, and admins can give a doctor time off
  (`POST` and `DELETE /api/schedules/{scheduleId}/time-off`). Neither can be
  booked; time off over existing bookings lists them, as other schedule
  changes do. The reception calendar shows breaks and days away. Migration
  `AddBreaksAndTimeOff` adds two nullable columns and a `TimeOff` table.
- The reception screen shows who booked, moved, cancelled or marked the
  selected booking, and when (`GET /api/appointments/{appointmentId}/history`,
  front desk only).
- "My day" fits a phone screen: the navigation and top bar take less room,
  and each appointment's status and buttons sit under the patient's name.
- Startup migrations (`Database:RunMigrationsOnStartup`) run as `--migrate`
  does: with its timeout and safe output, and through
  `ConnectionStrings:Migrations` when it is set (on Neon, the direct host).
  An API whose migrations fail exits before it listens, and a start with
  nothing to apply skips the migration lock. Turned on for Render, every
  merge brings Neon up to date as the new release starts.
- End-to-end tests with Playwright (`npm run e2e` in `hospital-frontend`). They
  start the API on a database of their own and the production build of the
  app, then drive Chromium through sign-in, the reception grid (booking,
  cancelling, moving, history, session renewal), schedule breaks and time
  off, making a doctor, and the phone layouts. The browser runs in another
  time zone than the clinic, and any console error fails a test. They need
  `HOSPITALSYSTEM_TEST_POSTGRES`, so CI does not run them.
- Component tests for the frontend (`*.test.tsx`, run by `npm test` in jsdom
  with Testing Library): the shared buttons, table status and dialog, and the
  reception screen's doctor list, week calendar, appointment panel, and
  booking and cancel dialogs.
- A backend test lists every endpoint with the roles that may call it, and
  another fails when a policy lets different roles in for the controllers and
  for the services.

### Changed

- README: setup now covers local configuration, migrations and creating the
  first admin account; the testing, project structure and deployment sections
  match the current code.
- The root `.gitignore` covers build output and local configuration for every
  project.
- The frontend's `package.json` declares the Node.js versions Vite requires.
- TypeScript strict mode is on for the frontend, and the frontend is split
  into `components/`, `screens/` and `lib/` instead of a single `App.tsx`.
- Creating a doctor, changing a role and disabling a doctor all go through one
  guarded path, which refuses to demote the last admin, to change your own
  role, or to hand out a demo role.
- Each write that spans several saves (appointment booking, doctor creation)
  now runs in one transaction, so a failure leaves no half-written rows or
  unaudited changes.
- The reception screen loads the selected doctor's visible week instead of
  every appointment ever booked. `GET /api/Appointments/ListAppointments` now
  requires `doctorId`, `from` and `to` (at most 42 days apart), and a new
  index serves it. Browser tabs opened before the update need a reload.
- The Users tab pages through users on the server, sorted by name, and its
  search runs on the server. `GET /api/Users/ListUsers` takes `page`,
  `pageSize` and `search`, and returns one page (`items`, `totalCount`,
  `page`, `pageSize`) instead of every account.
- Booking an appointment and creating or changing a schedule take fewer
  database round trips; everything a booking checks first, including whether
  the patient already exists, runs as one query.
- Most requests make fewer database round trips. The caller's security stamp
  is no longer read from the database on each request (see Security), and a
  save inside a transaction no longer sets and releases a savepoint. Listing
  users counts the total in the same query as the page; a booking that partly
  matches patients on file lists them without a second query; and creating a
  doctor, changing a role, moving a doctor to another department or changing
  a schedule read what they check in one query. Against 2 million
  appointments and 1 million patients, a list request now takes 1 round trip
  instead of 2 or 3, and a booking 4 instead of 9 (5 instead of 12 for a new
  patient).
- Two migrations change indexes. `DropUnusedAppointmentStatusIndex` drops
  `IX_Appointments_DoctorId_Status_TimeOfAppointment`, which no query uses
  (131 MB at 2 million appointments). `IndexPatientsByNameAndBirthDate`
  replaces the date-of-birth index on patients with one on the lowercased
  name and the date of birth, so matching a booking by name and date of birth
  no longer reads every patient born that day.
- The backend image is compiled ahead of time (ReadyToRun), so a new container
  is ready and answers its first requests sooner. The image is about 13 MB
  larger.
- The API prepares sign-in when it starts (database connection, the demo
  sign-in and token-check queries, token signing), so the first sign-ins after
  a deploy or restart are faster.
- Browsers may reuse the API's answer to a CORS preflight for two hours, so a
  frontend on another origin sends fewer extra `OPTIONS` requests.

- CI workflows cancel superseded runs, never run two deploys at once, time
  out instead of hanging for hours, and give jobs only the permissions they
  declare.
- Docker Image CI builds each image once with the GitHub Actions cache, scans
  that build with Trivy and pushes it only if the scan passes. The separate
  scan build in CI is gone. Every build gets a unique
  `YYYY-MM-DD-<short sha>-<run number>-<run attempt>` tag, and the deploy
  workflow reads that tag from the Docker run instead of working it out again.
- Docker Image CI rebuilds the runtime stage of both images on every build
  instead of taking it from the cache, so `apk upgrade` picks up Alpine
  security fixes on the next build rather than the next weekly run.
- `docker compose` takes the JWT signing key from a gitignored `.env` file
  (template: `.env.example`) instead of relying on
  `appsettings.Development.json` being copied into the image.
- Refusals use the status code that fits: 403 when the caller may not do it,
  404 when the doctor, schedule, department, appointment, patient or user does
  not exist, and 409 when a username, department or schedule already exists.
  Before, all of them were 400. The response body is unchanged.
- Usernames are case-insensitive: `Admin` and `admin` sign in to the same
  account, and a new user cannot take a name that differs from an existing one
  only in case. The `CaseInsensitiveUserNames` migration replaces the unique
  index on `Users.Name` with one on `lower("Name")`. If existing usernames
  differ only in case, it stops with PostgreSQL error `P0001` and changes
  nothing; the README shows how to find them.
- Schedules take `workingDays`. The backend image includes `tzdata`, so the
  API can look time zones up.
- Dates and times follow the clinic's time zone, `Clinic:TimeZone`
  (`Europe/Sofia` by default), on every screen and in every check, whatever
  zone a desk computer is set to. Sign-in returns it as `timeZone`, and
  changing a schedule no longer takes a `timeZone` of its own.
- `GET /api/Users/ListDoctors` returns `departmentId` instead of the misspelt
  `deparmentId`.
- The backend build treats warnings as errors, and its 42 nullable-reference
  warnings are fixed. NuGet vulnerability advisories stay warnings.
- API routes are lowercase plural resources with the record's id in the path,
  and the verb says what a request does, for example
  `PATCH /api/users/{userId}/role`, `PUT /api/schedules/{scheduleId}` and
  `POST /api/appointments/{appointmentId}/cancel`. The former action-named
  routes no longer answer.
- Making someone a doctor through a role change takes `departmentId`, an
  active department, and the doctor starts active. Before, the new doctor was
  filed under department 1. The Users tab asks for the department.
- Department names are unique regardless of case. The
  `CaseInsensitiveDepartmentNames` migration stops with PostgreSQL error
  `P0001`, changing nothing, while names differ only in case.
- A time that is already booked gets `409`, as when a concurrent booking wins.
- The doctor list is in name order, and the reception calendar opens on an
  active doctor who has a schedule.
- The session is kept per browser tab and ends when the tab closes.
- Confirmations use the app's own dialogs instead of `window.confirm`;
  dialogs keep keyboard focus inside them and close on Escape.
- Lint fails on warnings and checks accessibility rules, and production builds
  include source maps.
- Controllers are grouped by resource; role checks, read-only controls and
  table states are written once; services take the password hasher and the
  clock from dependency injection; misspelt folders and files are renamed.
- A doctor has one schedule, and the database enforces it: of two created at
  once, the second gets `409`. Migration `OneSchedulePerDoctor` stops while a
  doctor has more than one; see the README.
- An appointment has to start on one of the doctor's slots, on the minute.
- Department names are at most 100 characters (migration
  `LimitDepartmentNameLength`).
- Audit entries keep the id of whoever made the change as well as their
  username, and tokens carry the username. Migration
  `AddAuditLogActorUserId` converts earlier entries, which held the id where
  the name belongs.
- The audit log has an index for its newest-first pages, which keeps them
  fast as the log grows.
- When a client disconnects, the API stops that request's database work.
- A production frontend build needs `VITE_API_URL` and stops without it,
  instead of building an app that calls `localhost`; CI's check build warns.
- Frontend screens read what they share (departments, doctors, schedules,
  loading, search, read-only) from a React context instead of long prop
  lists, their callbacks keep their identity between renders, and the
  reception calendar finds each slot's appointments with one lookup.
- Who may call each endpoint is written once, as named policies in
  `Services/Access.cs`. Controllers require a policy by name and services
  check the same one, instead of role names written out in 24 attributes and
  again in the services. Every endpoint lets in the same roles as before.
- `Program.cs` reads as the order of startup. The token checks, access
  policies, rate limits, client addresses, error responses, OpenAPI document
  and service registrations each have a file in `HospitalSystem/Startup`.
- The frontend loads each role's screens the first time they are shown, so
  signing in no longer downloads the code of screens the account cannot use.
  A tab opened before a deploy reloads itself, once, when it asks for screen
  code the new release no longer has.
- `App.tsx` hands the session, the shared lists, running actions, recent
  activity and the front desk's actions to hooks of their own. The reception
  screen is split into its doctor list, week calendar, appointment panel and
  booking and cancel dialogs, so typing in the booking form no longer redraws
  the whole screen. The week's counts and the admin tabs' searches are worked
  out again only when what they show changes.
- The Dockerfiles pin their base images by digest as well as tag, and
  Dependabot proposes newer ones. Every build still upgrades the runtime
  image's Alpine packages.
- The frontend image runs as nginx's own user from right after its
  `apk upgrade`, before anything is copied in.
- `docker compose` restarts the backend and frontend unless they were stopped,
  as it does the database, and binds their ports to `127.0.0.1` only. The
  database password can come from `.env` (`POSTGRES_PASSWORD`); without it,
  compose keeps the local-only `strongpassword`.

### Removed

- Three migrations that did nothing. A database that applied them keeps their
  history rows, which are ignored.

### Fixed

- Appointments can only be booked inside the doctor's working hours, for a
  doctor who has a schedule and whose department is active.
- Working hours show the same on every screen for staff outside UTC: the
  calendar header and the Schedules tab no longer shift them by the browser's
  offset, and a schedule ending at 24:00 no longer shows as empty.
- Bookings are sent with the desk's UTC offset, and the API converts them to
  UTC instead of relabelling the local time as UTC.
- Pending accounts cannot sign in until an admin gives them a role ("Account
  awaiting approval"), and roles with no screens, such as Doctor, see a
  "No access for this role" page instead of an empty reception screen.
- Only active doctors who still hold the Doctor role can be booked, and a
  doctor record can only be re-activated for a user with the Doctor role.
- Requests missing an appointment time, date of birth, appointment id or
  doctor status get a validation error instead of a default value. In
  particular, a doctor-status request without `IsActive` no longer
  deactivates the doctor.
- The schedule list returns 400 when the request is refused, and Swagger
  documents its real response type.
- The reception page fits 1280px and 1440px windows; the calendar scrolls
  inside its panel instead.
- The demo sign-in buttons say "Signing in..." and are disabled while a
  sign-in runs. Before, the Sign in button changed instead of the one that was
  clicked, and a second click sent a second request.
- Hitting a rate limit shows a readable message with how long to wait,
  instead of a JSON parse error. The API returns JSON and a `Retry-After`
  header, and the frontend no longer fails on any non-JSON response, such as
  a proxy's error page.
- Two front-desk users booking the same doctor and time at once no longer
  both succeed: a unique index on scheduled appointments makes the loser
  fail with `409 Conflict` instead of creating a double booking.
- Re-running a Docker Image CI run no longer fails on the ECR push: the tag
  now ends in the run attempt, so the re-run pushes under a new tag instead of
  the immutable one the first attempt pushed.
- A booking is no longer filed under whoever first registered the same phone
  number. Patients are matched on phone number, name and date of birth
  together, and relatives can share a phone number. When only some of the
  details match a patient on file, the booking dialog lists those patients so
  the desk can book for one of them or register a new patient. Phone numbers
  are stored as digits with an optional leading `+`, and a migration converts
  the existing ones.
- The overlap check uses the doctor's slot length instead of a fixed 15
  minutes. With 5- or 10-minute slots, the slot right after a booking can be
  booked; with longer slots, a booking can no longer start inside another one.
- The first sign-in after the demo API has been idle no longer times out. The
  sign-in page wakes the API as soon as it opens, sign-in waits up to 90
  seconds, and after 3 seconds the page says the server is starting.
- Unknown paths get a real 404: on Cloudflare Pages, missing pages and files
  no longer return the app shell with a 200 (`/robots.txt` gets Cloudflare's
  own file, which has no rules), and the API answers paths such as
  `/favicon.ico` with 404 instead of 401. nginx's `/health` sends a single
  `Content-Type`.
- Changing a schedule, deactivating a doctor or a department, or taking the
  Doctor role away no longer leaves future bookings at times the doctor no
  longer works. The change is refused with `409` and a list of those bookings,
  with patients shown by initials. Sent again with a reason, it cancels them
  in the same save and records each cancellation in the audit log; the admin
  screens ask for the reason.
- Swagger works again in development. A Dependabot update had moved
  `Microsoft.OpenApi` to 3.x, which Swashbuckle cannot use, so
  `/swagger/v1/swagger.json` failed with a 500. It is back on 2.x, and
  Dependabot no longer proposes major updates for it.
- The API refuses bookings in the past; before, only the calendar greyed them
  out.
- A department status change without `isActive` is refused instead of
  deactivating the department.
- A refresh can no longer replace newer data with an older answer that
  arrives late.
- Recent activity works when the app is served over plain HTTP, where
  `crypto.randomUUID` does not exist.
- The admin Departments tab no longer shows a search box that did nothing; the
  top bar's search filters the table.
- Every form field has a label, the sign-in form works with password managers,
  the reception calendar's slots name their day and time for screen readers,
  and several error messages are spelt correctly.
- Changing a schedule stored its hours on the day of the change instead of on
  the date new schedules use. Migration `RepairScheduleRows` moves existing
  schedules back, and gives schedules from before slot lengths existed the
  30-minute slots the reception calendar showed for them.

### Security

- Tokens carry a security stamp that is checked on every request. Changing a
  user's role, resetting their password or disabling a doctor revokes that
  user's existing tokens: at once on the API instance that made the change,
  and within 30 seconds on any other, because each instance keeps a user's
  stamp for 30 seconds. Token lifetime is one hour instead of three.
- Demo login is off unless `Demo:Enabled` is set, and signs in only the
  accounts named by `Demo:AdminUserName` and `Demo:FrontDeskUserName` while
  those accounts still hold a demo role. Demo accounts can no longer sign in
  with a password.
- Every endpoint requires an authenticated user by default; the login and
  health endpoints opt out explicitly, so a new endpoint cannot be left open
  by forgetting an attribute.
- The login endpoint is limited to 5 attempts per minute per IP address, on
  top of the 60 requests per minute that apply to the API as a whole.
- A failed login takes the same time whether or not the username exists, so
  the response cannot be used to enumerate accounts.
- Only admins can list user accounts; front-desk accounts no longer receive
  every username and role.
- Local configuration files (`appsettings.Development.json`,
  `appsettings.Local.json`) are no longer copied into the backend image, so
  locally built images do not carry a developer's secrets.
- The frontend sends `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy` and `Permissions-Policy` on every response, from nginx and
  from Cloudflare Pages (`public/_headers`), which also lets browsers keep the
  content-hashed files under `/assets/` for a year.
- The frontend has a Content-Security-Policy: the page loads scripts, styles
  and images only from its own origin, and sends requests only to itself and
  the API it was built for. The build adds it as a `<meta>` tag, so Cloudflare
  Pages and nginx serve the same policy.
- The API stops at startup if `JwtSettings:SecretKey` is shorter than 32
  bytes, instead of starting and then failing every sign-in.
- Failed sign-ins and failed password changes are recorded in the audit log,
  naming the account when the username exists. An unknown username is not
  recorded, so a password typed into the username field does not end up in
  the log.
- Ten wrong passwords in a row lock an account for 15 minutes; changing your
  own password counts too. An admin's password reset lifts the lock. Locks are
  audited, and the sign-in response is the same as for any other failure.
- Password sign-in is limited to 5 attempts a minute per client address and
  username, and 20 a minute per address across usernames.
- Behind a proxy, the API can take the client's address from
  `X-Forwarded-For` (`ForwardedHeaders:TrustAllProxies` and `ForwardLimit`),
  so rate limits apply per client; the README explains how to check it.
- The API refuses to start with a published example JWT key, and a token
  stops working 30 seconds after it expires instead of five minutes.
- Demo accounts can only read: the API refuses any other request from them,
  whatever roles an endpoint allows, instead of relying on each endpoint's
  role list.
