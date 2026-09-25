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

- CI workflows cancel superseded runs, never run two deploys at once, time
  out instead of hanging for hours, and give jobs only the permissions they
  declare.
- Docker Image CI builds each image once with the GitHub Actions cache, scans
  that build with Trivy and pushes it only if the scan passes. The separate
  scan build in CI is gone. Every build gets a unique
  `YYYY-MM-DD-<short sha>-<run number>` tag, and the deploy workflow reads
  that tag from the Docker run instead of working it out again.
- `docker compose` takes the JWT signing key from a gitignored `.env` file
  (template: `.env.example`) instead of relying on
  `appsettings.Development.json` being copied into the image.

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
- Hitting a rate limit shows a readable message with how long to wait,
  instead of a JSON parse error. The API returns JSON and a `Retry-After`
  header, and the frontend no longer fails on any non-JSON response, such as
  a proxy's error page.
- Two front-desk users booking the same doctor and time at once no longer
  both succeed: a unique index on scheduled appointments makes the loser
  fail with `409 Conflict` instead of creating a double booking.

### Security

- Tokens carry a security stamp that is checked on every request. Changing a
  user's role, resetting their password or disabling a doctor now revokes
  that user's existing tokens immediately, and token lifetime is one hour
  instead of three.
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
