# Contributing to BetterSchedule

Thank you for taking the time to contribute! 
You'll note that thus far building the application, I haven't followed these guidelines- but I plan to going forward!
Please follow these guidelines to keep the project consistent and easy to maintain.

## Branching Strategy
- The `main` branch contains stable code.
- Create a feature branch for each contribution.
- Prefix branch names with the type of work, for example:
  - `feature/short-description`
  - `fix/short-description`
  - `docs/short-description`

## Commit Messages
- Follow the [Conventional Commits](https://www.conventionalcommits.org/) format.
- Use the imperative mood in the subject line, e.g., `feat: add reservation search`.
- Keep the subject line under 72 characters and reference issues where relevant.

## Code Style
- The codebase convention is to fully express models and fields instead of shortening
- Naming is intended to match with DayPilot component, followed by maximum developer clarity
- Code comments should be kept brief but descriptive of purpose


### Server (ASP.NET Core)
- Format and analyze code with:
  ```bash
  dotnet format
  ```
- Run tests before pushing:
  ```bash
  dotnet test
  ```

### Client (React/TypeScript)
- Lint the codebase:
  ```bash
  npm run lint
  ```
- Fix lint issues automatically:
  ```bash
  npm run lint -- --fix
  ```
- Execute frontend tests:
  ```bash
  npm run test
  ```

Following these guidelines helps maintain code quality and streamline reviews. We appreciate your contributions!