# Repository Guidelines

## Project Structure & Module Organization
Jobtimize uses React 18, Vite, Tailwind CSS, Express, and Microsoft SQL Server.
- `client/src/`: role-based pages, shared components, authentication context, utilities, and the Axios client in `services/api.js`.
- `client/public/`: static logos and images.
- `server/src/`: routes, controllers, middleware, services, configuration, and utilities; `server.js` is the API entry point.
- `server/scripts/`: database setup, migrations, seeds, and regression tests.
- `database/`: SQL schema and seed data. Runtime uploads belong in the ignored `server/uploads/` directory.

## Build, Test, and Development Commands
Run these commands from the repository root:
- `npm run install:all`: install server and client dependencies.
- `docker compose up -d`: start a local SQL Server container.
- `npm run db:init`: initialize the database schema and seed data after configuring the server environment.
- `npm run seed:jobs`: add sample job listings.
- `npm run dev`: start the API on port 5000 and Vite on port 3000; `dev:server` and `dev:client` run them separately.
- `npm run build`: produce the frontend bundle in `client/dist/`.
- `npm --prefix server run test:otp`: run the isolated OTP regression suite.

## Coding Style & Naming Conventions
Follow surrounding code: two-space indentation, single quotes, and semicolons. The client uses ES modules; the server uses CommonJS. Use PascalCase for React components and pages (`JobDetailPage.jsx`), camelCase for functions and variables, and descriptive backend filenames such as `jobController.js` and `jobRoutes.js`. Keep routing, request handling, and reusable service logic in their respective directories. No formatter or lint script is currently configured.

## Testing Guidelines
The OTP suite uses Node's built-in `node:test` and strict assertions with mocked database and SMTP dependencies. Additional `server/scripts/test_*.js` scripts have individual integration requirements; inspect them before running against a disposable database. Follow that naming pattern for new regression scripts. No coverage threshold or frontend test runner is configured. For relevant changes, run the OTP suite, build the client, and manually verify affected role-based flows.

## Commit & Pull Request Guidelines
History uses informal subjects such as `update logo`; no strict format is established. Write concise, action-oriented subjects. PRs should describe behavior changes, link issues, list validation, include UI screenshots, and explain database or configuration updates.

## Security & Configuration
Copy `server/.env.example` to `server/.env` and configure database, JWT, mail, and AI settings as needed. Match database credentials to your SQL Server instance. Keep secrets, uploaded CVs, dependencies, and build outputs out of commits. Preserve UTF-8 encoding for Vietnamese content.
