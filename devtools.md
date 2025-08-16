# Development Tools

This project includes a small set of developer-only utilities that are only available during local development.

## Database Seeding

`DbInitializer.SeedAsync` populates the application with demo data used during development. It can also reset the domain data by passing `reset: true`.

### Reset option
- Removes reservations, participants, blocked times, appointment types and resources.
- Identity users are preserved so that developer login accounts remain valid.

### Seeded data
The seeding routine creates:
- Default roles: `Manager`, `ServiceProvider` and `Client`.
- Two organizations (`Demo Organization` and `Second Demo Org`) to demonstrate tenant isolation.
- Developer login users by email (`admin@dev.local`, `provider@dev.local`, `client@dev.local`, `hybrid@dev.local`) each assigned to the first organization with appropriate roles.
- Demo users by username (`alice`, `bob`, `carla`, `dana`, `eric`, `frank`).
- Sample resources such as *Main Arena*, *Studio 2* and *Outdoor Field*.
- Appointment types (e.g. *Yoga Class*, *Therapeutic Massage*, *Youth Soccer Clinic*, *Private Training*) including duration, price and default resource.
- A variety of reservations with past, current and future dates along with different statuses.
- Blocked time entries used to show unavailable periods on the calendar.

## DevTools Controller

`DevToolsController` exposes a few helper endpoints under `/api/devtools` and is included only in debug builds. The controller requires authentication and is hidden from Swagger.

### `GET /api/devtools/whoami`
Returns the current environment, user name, user id, roles and organization id for the signed-in user.

### `POST /api/devtools/reset-db`
Requires the `Manager` role and only works when the ASP.NET environment is `Development`. Calls `DbInitializer.SeedAsync` with `reset: true` to wipe and reseed domain data.

### `GET /api/devtools/blockedtimes/all`
Available only in the `Development` environment. Returns all non-deleted blocked times for the current user's organization.

These endpoints are intended for local development and must not be exposed in production.