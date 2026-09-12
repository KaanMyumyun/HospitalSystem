# Contributing

## Getting set up

Follow [Getting Started](README.md#getting-started) in the README. It covers the
database, local configuration, migrations and creating the first admin account.

## Branches

- Create one branch per change, from the latest `main`.
- Name it `<type>/<short-description>`, for example `fix/login-rate-limit` or
  `docs/setup-steps`.
- GitHub deletes the branch when its pull request is merged. Start the next
  change on a new branch instead of reusing an old one.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```text
<type>: <what changed, in the imperative>
```

Common types are `feat`, `fix`, `docs`, `refactor`, `test`, `ci` and `chore`.
For example:

```text
fix: reject appointments booked in the past
```

## Before opening a pull request

Backend, from the repository root:

```bash
dotnet build
dotnet test
```

Frontend, if you changed it:

```bash
cd hospital-frontend
npm run lint
npm run build
```

## Pull requests

- `main` is protected: CI must pass, and a pull request needs one approving
  review.
- Fill in the pull request template.
- Prefer **Squash and merge**, so `main` gets one commit per change with a
  meaningful message.

## Secrets and security

- Never commit `appsettings.Development.json`, `.env` files, credentials or
  tokens. They are gitignored; keep it that way.
- This repository is public. Do not describe unfixed security weaknesses in
  issues, pull requests or committed files. Report them privately as described
  in [SECURITY.md](SECURITY.md).
