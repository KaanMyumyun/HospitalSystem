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

### Changed

- README: setup now covers local configuration, migrations and creating the
  first admin account; the testing, project structure and deployment sections
  match the current code.
- The root `.gitignore` covers build output and local configuration for every
  project.
- The frontend's `package.json` declares the Node.js versions Vite requires.
